/**
 * Posts today's Wyrdweave (its name and the rule of each floor) to the #wyrdweave channel on Discord, through a
 * webhook. A Supabase Edge Function (Deno), called once a day by a cron job just after midnight UTC
 * (server/sql/wyrd-discord.sql).
 *
 * The webhook address is a secret: it lives only in the function's secret DISCORD_WYRD_WEBHOOK (set in the Supabase
 * dashboard), never in the code. Every day is posted at most once (the table `wyrd_posts` is claimed first), so
 * calling the function again does nothing.
 *
 * Build with `npm run build:server`.
 */
import { wyrdDay, wyrdDayNumber } from '../src/core/wyrd';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

/** A setting of the function (empty outside Deno, e.g. in the tests). */
const env = (key: string): string => (typeof Deno !== 'undefined' ? (Deno.env.get(key) ?? '') : '');
const SUPABASE_URL = env('SUPABASE_URL');
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const WEBHOOK = env('DISCORD_WYRD_WEBHOOK');
const NUMERALS = ['I', 'II', 'III'];
const GOLD = 0xf0cf6a;

/** The Discord message for a day (exported for testing). */
export function wyrdMessage(day: number): { username: string; embeds: unknown[] } {
  const d = wyrdDay(day);
  const date = new Date(day * 86_400_000).toISOString().slice(0, 10);
  return {
    username: 'The Norns',
    embeds: [
      {
        title: `Today's Wyrdweave: ${d.name}`,
        description: `Three floors, the same for every Wayfinder, until midnight UTC. One try each. How far will you get?`,
        color: GOLD,
        fields: d.rules.map((r, k) => ({ name: `Floor ${NUMERALS[k]}: ${r.name}`, value: r.text })),
        footer: { text: `${date} · Play at ygdrassilgame.com/play · post your run below` },
      },
    ],
  };
}

/** Claims the day in `wyrd_posts`; false when it was already posted. */
async function claim(day: number): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/wyrd_posts`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ day }),
  });
  return res.ok;
}

if (typeof Deno !== 'undefined') {
  Deno.serve(async () => {
    if (!WEBHOOK) return new Response('No webhook set.', { status: 503 });
    const day = wyrdDayNumber(Date.now());
    if (!(await claim(day))) return new Response('Already posted today.', { status: 200 });
    const res = await fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(wyrdMessage(day)) });
    // Discord did not take it: give the day back, so a retry can post it.
    if (!res.ok) await fetch(`${SUPABASE_URL}/rest/v1/wyrd_posts?day=eq.${day}`, { method: 'DELETE', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    return new Response(res.ok ? 'Posted.' : `Discord said ${res.status}.`, { status: res.ok ? 200 : 502 });
  });
}
