/**
 * Real time for Raven Runs and wounds. When the server can be reached its clock counts (so turning the device clock
 * forward does not bring scouts home early); offline the device clock is used.
 */
import { SUPABASE_KEY, SUPABASE_URL } from './online';

let offset = 0;

/** Asks the server for the time once; keeps the device clock if it cannot be reached. */
export async function syncClock(): Promise<void> {
  try {
    const sent = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/server_now`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) return;
    const server = Date.parse((await res.json()) as string);
    if (Number.isFinite(server)) offset = server - (sent + Date.now()) / 2;
  } catch {
    // Offline: the device clock it is.
  }
}

export function clockNow(): number {
  return Date.now() + offset;
}
