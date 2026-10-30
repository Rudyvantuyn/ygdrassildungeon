/**
 * Bug reports, ideas and crash reports from players. They go straight into the `reports` table,
 * which players can write to but not read. Works without an account and without loading the client library.
 */
import { SUPABASE_KEY, SUPABASE_URL } from './online';

export type ReportKind = 'bug' | 'idea' | 'other' | 'error';

export async function sendReport(kind: ReportKind, message: string, context: Record<string, unknown> = {}): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reports`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ kind, message: message.slice(0, 4000), context, version: __BUILD__ }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** At most this many crash reports per session, and each message only once. */
const MAX_ERRORS = 5;
const sent = new Set<string>();

/** Reports uncaught errors automatically. `context` describes where the player was. */
export function watchErrors(context: () => Record<string, unknown>): void {
  if (__BUILD__ === 'dev') return;
  const report = (message: string, stack?: string) => {
    if (sent.size >= MAX_ERRORS || sent.has(message)) return;
    sent.add(message);
    let where: Record<string, unknown> = {};
    try {
      where = context();
    } catch {
      // The error may have broken the game state too; send what we have.
    }
    void sendReport('error', message, { stack: stack?.slice(0, 3000), ua: navigator.userAgent, ...where });
  };
  window.addEventListener('error', (e) => report(String(e.message), e.error instanceof Error ? e.error.stack : undefined));
  window.addEventListener('unhandledrejection', (e) => {
    const r: unknown = e.reason;
    report(r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : undefined);
  });
}
