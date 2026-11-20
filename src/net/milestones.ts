/**
 * Anonymous counts of how far new players get (a new game, the party founded, the first win, the first guardians),
 * so the makers can see where players stop. Each step is counted once per browser, as a plain tally per day in the
 * `milestones` table: no account, name, save or address goes with it. See the privacy page.
 */
import { SUPABASE_KEY, SUPABASE_URL } from './online';

export type Milestone = 'newGame' | 'partyFounded' | 'firstDescent' | 'firstWin' | 'elder' | 'rootgnawer' | 'chapter2' | 'carriedHome';

export function milestone(step: Milestone): void {
  if (__BUILD__ === 'dev') return;
  const key = `ygdrassil-step-${step}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch {
    return; // no storage: we cannot tell whether it was counted before, so it is not counted
  }
  void fetch(`${SUPABASE_URL}/rest/v1/rpc/bump_milestone`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ step }),
    keepalive: true,
  }).catch(() => {});
}
