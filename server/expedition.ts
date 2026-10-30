/**
 * The expedition server: a Supabase Edge Function (Deno) that runs the rules in
 * src/core/expedition.ts. Clients call it to create, join and play expeditions;
 * only this function writes the `expeditions` table (with the service role), so
 * nobody can change an expedition except by playing by the rules.
 *
 * Build with `npm run build:server`, which bundles it into one file for deploying.
 */
import { applyAction, cleanPlayerName, createExpedition, players, validMember, type Action, type ExpeditionState } from '../src/core/expedition';
import { startFloorFor } from '../src/core/data/chapters';
import { FLOORS } from '../src/core/data/floors';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_RETRIES = 5;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Row {
  id: string;
  code: string;
  seq: number;
  members: string[];
  state: ExpeditionState;
}

class Refusal extends Error {}

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

const b64 = (text: string) => text.replace(/-/g, '+').replace(/_/g, '/');
const bytes = (text: string) => Uint8Array.from(atob(b64(text)), (c) => c.charCodeAt(0));

let keys: Promise<Record<string, CryptoKey>> | null = null;

/** The project's public signing keys, fetched once per function instance. */
function signingKeys(): Promise<Record<string, CryptoKey>> {
  keys ??= (async () => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
    const { keys: list } = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };
    const out: Record<string, CryptoKey> = {};
    for (const jwk of list) {
      out[jwk.kid] = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    }
    return out;
  })().catch((e) => {
    keys = null;
    throw e;
  });
  return keys;
}

/** Checks the access token's signature and expiry; returns the signed-in account id. */
async function userFrom(req: Request): Promise<string | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const [head, body, sig] = token.split('.');
  if (!head || !body || !sig) return null;
  try {
    const header = JSON.parse(atob(b64(head))) as { alg?: string; kid?: string };
    const key = header.alg === 'ES256' && header.kid ? (await signingKeys())[header.kid] : undefined;
    if (!key) return null;
    const signed = new TextEncoder().encode(`${head}.${body}`);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, bytes(sig), signed);
    if (!ok) return null;
    const claims = JSON.parse(atob(b64(body))) as { sub?: string; role?: string; exp?: number };
    if (!claims.exp || claims.exp * 1000 < Date.now()) return null;
    return claims.role === 'authenticated' && claims.sub ? claims.sub : null;
  } catch {
    return null;
  }
}

async function rest(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`database ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const COLUMNS = 'id,code,seq,members,state';

async function fetchRow(filter: string): Promise<Row | null> {
  const rows = (await rest(`expeditions?${filter}&select=${COLUMNS}`)) as Row[];
  return rows[0] ?? null;
}

/** An expedition this player is still part of, if any (one at a time). */
async function activeFor(user: string): Promise<Row | null> {
  return fetchRow(`members=cs.{${user}}&phase=neq.ended&order=updated_at.desc&limit=1`);
}

function columns(state: ExpeditionState, members: string[]) {
  return {
    phase: state.phase,
    seats: state.seats.length,
    members: [...new Set([...members, ...players(state)])],
    state,
    seq: state.seq,
    updated_at: new Date().toISOString(),
  };
}

function newCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  return code;
}

async function create(user: string, body: Record<string, unknown>): Promise<Row> {
  const active = await activeFor(user);
  if (active) throw new Refusal('You are already part of an expedition.');
  const member = validMember(body.member);
  if (!member) throw new Refusal('That adventurer cannot join.');
  const deepest = Math.max(0, Math.min(FLOORS.length - 1, Number(body.deepest) || 0));
  // Expeditions, too, may only begin at the start of a chapter the host has reached.
  const startFloor = startFloorFor(Math.max(0, Math.min(deepest, Number(body.startFloor) || 0)), deepest);
  const player = cleanPlayerName(body.player);
  const state = createExpedition(user, player, member, startFloor);
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const rows = (await rest('expeditions', {
        method: 'POST',
        body: JSON.stringify({ code: newCode(), host: user, host_name: player, start_floor: startFloor, ...columns(state, [user]) }),
      })) as Row[];
      return rows[0];
    } catch (e) {
      // A code that is already taken: try another one.
      if (!String(e).includes('23505')) throw e;
    }
  }
  throw new Error('Could not find a free expedition code.');
}

/** Loads the row, applies the action and writes it back, retrying if someone else wrote first. */
async function act(user: string, filter: string, action: Action): Promise<Row> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const row = await fetchRow(filter);
    if (!row) throw new Refusal('That expedition does not exist.');
    if (action.type !== 'join' && !row.members.includes(user)) throw new Refusal('You are not part of this expedition.');
    if (action.type === 'join') {
      const active = await activeFor(user);
      if (active && active.id !== row.id) throw new Refusal('You are already part of another expedition.');
    }
    const state = row.state;
    const seq = state.seq;
    const error = applyAction(state, user, action, Date.now(), Math.floor(Math.random() * 0x7fffffff));
    if (error) throw new Refusal(error);
    if (state.seq === seq) return row;
    const updated = (await rest(`expeditions?id=eq.${row.id}&seq=eq.${seq}&select=${COLUMNS}`, {
      method: 'PATCH',
      body: JSON.stringify(columns(state, row.members)),
    })) as Row[];
    if (updated[0]) return updated[0];
  }
  throw new Error('The expedition is busy, please try again.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply({ error: 'Use POST.' }, 405);
  const user = await userFrom(req);
  if (!user) return reply({ error: 'Please sign in first.' }, 401);
  try {
    const body = (await req.json()) as Record<string, unknown>;
    let row: Row;
    switch (body.op) {
      case 'create':
        row = await create(user, body);
        break;
      case 'join': {
        const code = String(body.code ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
        const action: Action = { type: 'join', player: String(body.player ?? ''), member: body.member as never };
        row = await act(user, `code=eq.${code}`, action);
        break;
      }
      case 'act': {
        const id = String(body.id ?? '').replace(/[^0-9a-f-]/gi, '');
        row = await act(user, `id=eq.${id}`, body.action as Action);
        break;
      }
      default:
        return reply({ error: 'Unknown request.' }, 400);
    }
    return reply({ id: row.id, code: row.code, state: row.state });
  } catch (e) {
    if (e instanceof Refusal) return reply({ error: e.message }, 409);
    console.error(e);
    return reply({ error: 'Something went wrong on the server.' }, 500);
  }
});
