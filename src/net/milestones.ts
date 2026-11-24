/**
 * Anonymous counts of how far new players get (a new game, the party founded, the first win, the first guardians),
 * so the makers can see where players stop. Each step is counted once per browser, as a plain tally per day in the
 * `milestones` table: no account, name, save or address goes with it. See the privacy page.
 */
import { SUPABASE_KEY, SUPABASE_URL } from './online';

export type Milestone =
  | 'newGame'
  | 'partyFounded'
  | 'firstDescent'
  | 'firstWin'
  | 'elder'
  | 'rootgnawer'
  | 'chapter2'
  | 'carriedHome'
  // Between the first win and the first guardian (added November 2026, to see where players stop there).
  | 'firstFight'
  | 'floor2'
  | 'floor3'
  | 'level3'
  | 'level6'
  | 'innRest'
  | 'returned'
  // Phones that arrive held upright, and what they do then.
  | 'phoneUpright'
  | 'phoneTurned'
  | 'phoneAnyway';

const FIRST_DAY = 'ygdrassil-first-day';

/** The UTC day, as the milestones table counts it. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Notes the day this browser started its first game (for `returned`). */
export function noteFirstDay(): void {
  try {
    if (!localStorage.getItem(FIRST_DAY)) localStorage.setItem(FIRST_DAY, today());
  } catch {
    // no storage: nothing to compare later
  }
}

/** Counts `returned` once, when a save is continued on a later day than the first game was started. */
export function noteReturn(): void {
  try {
    const first = localStorage.getItem(FIRST_DAY);
    if (!first) return void localStorage.setItem(FIRST_DAY, today());
    if (first !== today()) milestone('returned');
  } catch {
    // no storage
  }
}

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
