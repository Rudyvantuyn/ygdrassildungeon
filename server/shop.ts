/**
 * The shop: a Supabase Edge Function (Deno) for donations and cosmetic packs, paid through Stripe Checkout.
 *
 * - POST {action:'checkout', pack} with the player's session token: a Stripe Checkout page for that pack, tied to
 *   their account (client_reference_id). Only accounts with Google or e-mail can buy (a guest could lose it).
 * - POST {action:'donate', amount}: a Checkout page for a one-off donation; signed in, it also brings the Supporter
 *   badge.
 * - POST from Stripe (header Stripe-Signature): the webhook. Only checkout.session.completed with payment_status
 *   'paid' counts. The signature is checked with STRIPE_WEBHOOK_SECRET; each session is recorded once in `payments`,
 *   and the items go into `entitlements` (server/sql/shop.sql). Only this function writes those tables.
 *
 * Secrets (Supabase dashboard, Edge Functions → Secrets): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
 * Prices live in src/core/data/cosmetics.ts, so a pack costs the same everywhere it is shown.
 * Build with `npm run build:server`.
 */
import { DONATIONS, itemsFor, PACK_BY_ID } from '../src/core/data/cosmetics';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const env = (key: string): string => (typeof Deno !== 'undefined' ? (Deno.env.get(key) ?? '') : '');
const SUPABASE_URL = env('SUPABASE_URL');
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const STRIPE_KEY = env('STRIPE_SECRET_KEY');
const WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET');
const SITE = 'https://www.ygdrassilgame.com';
const TOLERANCE_S = 300;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/** The signed-in account behind a session token, or null. */
async function accountOf(req: Request): Promise<{ id: string; anonymous: boolean } | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string; is_anonymous?: boolean };
  return user.id ? { id: user.id, anonymous: !!user.is_anonymous } : null;
}

/** Form-encodes nested Stripe parameters: {a: {b: 1}} → a[b]=1. */
export function stripeForm(params: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(params).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) return [];
    if (typeof v === 'object') return stripeForm(v as Record<string, unknown>, key);
    return [`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`];
  });
}

/** The Checkout session parameters for a pack or a donation (exported for testing). */
export function checkoutParams(kind: 'pack' | 'donation', id: string, amount: number, name: string, userId: string | null): Record<string, unknown> {
  return {
    mode: 'payment',
    'line_items': { 0: { quantity: 1, price_data: { currency: 'eur', unit_amount: amount, product_data: { name } } } },
    client_reference_id: userId ?? undefined,
    metadata: { kind, id },
    success_url: `${SITE}/support.html?thanks=${kind}`,
    cancel_url: `${SITE}/support.html`,
    custom_text: {
      submit: {
        message:
          kind === 'pack'
            ? 'Cosmetic only: it changes how the game looks, never how it plays. By paying you ask for the pack to be added to your account right away, and agree that your right of withdrawal ends once it is delivered.'
            : 'Thank you for supporting Ygdrassil.',
      },
    },
  };
}

async function checkout(kind: 'pack' | 'donation', id: string, amount: number, name: string, userId: string | null): Promise<Response> {
  if (!STRIPE_KEY) return json({ error: 'The shop is not open yet.' }, 503);
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: stripeForm(checkoutParams(kind, id, amount, name, userId)).join('&'),
  });
  const session = (await res.json()) as { url?: string };
  if (!res.ok || !session.url) return json({ error: 'Could not open the payment page. Please try again later.' }, 502);
  return json({ url: session.url });
}

/** Checks a Stripe-Signature header against the raw body (exported for testing). */
export async function validSignature(body: string, header: string, secret: string, now = Date.now()): Promise<boolean> {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!t || !parts.v1 || Math.abs(now / 1000 - t) > TOLERANCE_S) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
  const signatures = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  return signatures.some((s) => s.length === hex.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0);
}

async function rest(path: string, body: unknown, prefer: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: prefer },
    body: JSON.stringify(body),
  });
}

async function webhook(req: Request): Promise<Response> {
  const body = await req.text();
  if (!WEBHOOK_SECRET || !(await validSignature(body, req.headers.get('Stripe-Signature') ?? '', WEBHOOK_SECRET))) return new Response('Bad signature.', { status: 400 });
  const event = JSON.parse(body) as { type: string; data: { object: { id: string; payment_status?: string; amount_total?: number; client_reference_id?: string | null; metadata?: { kind?: string; id?: string } } } };
  if (event.type !== 'checkout.session.completed') return new Response('Ignored.');
  const s = event.data.object;
  if (s.payment_status !== 'paid') return new Response('Not paid yet.');
  const kind = s.metadata?.kind === 'pack' ? 'pack' : 'donation';
  const user = s.client_reference_id ?? null;
  // Each session counts once: Stripe may send the same event again.
  const recorded = await rest('payments', { session_id: s.id, user_id: user, kind, item: s.metadata?.id ?? '', amount: s.amount_total ?? 0 }, 'return=minimal');
  if (recorded.status === 409) return new Response('Already done.');
  if (!recorded.ok) return new Response('Could not record the payment.', { status: 500 });
  if (user) {
    const rows = itemsFor(kind, s.metadata?.id ?? '').map((item) => ({ user_id: user, item, source: s.id }));
    if (rows.length) await rest('entitlements?on_conflict=user_id,item', rows, 'return=minimal,resolution=ignore-duplicates');
  }
  return new Response('Done.');
}

if (typeof Deno !== 'undefined') {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method !== 'POST') return json({ error: 'Not here.' }, 405);
    if (req.headers.get('Stripe-Signature')) return webhook(req);
    const input = (await req.json().catch(() => ({}))) as { action?: string; pack?: string; amount?: number };
    const account = await accountOf(req);
    if (input.action === 'checkout') {
      const pack = PACK_BY_ID[input.pack ?? ''];
      if (!pack) return json({ error: 'There is no such pack.' }, 400);
      if (!account) return json({ error: 'Please sign in first, so the pack is kept with your account.' }, 401);
      if (account.anonymous) return json({ error: 'Link Google or an e-mail address first, so your pack is never lost.' }, 403);
      return checkout('pack', pack.id, pack.price, `Ygdrassil: ${pack.name}`, account.id);
    }
    if (input.action === 'donate') {
      const amount = Number(input.amount);
      if (!DONATIONS.includes(amount)) return json({ error: 'Please pick one of the amounts.' }, 400);
      return checkout('donation', String(amount), amount, 'Support Ygdrassil', account && !account.anonymous ? account.id : null);
    }
    return json({ error: 'Unknown action.' }, 400);
  });
}
