/**
 * Everything that talks to the online service: accounts, cloud saves and expeditions.
 * The game works fully offline; this is only used from the Hornstone and the account menu.
 */
import type { RealtimeChannel, Session, SupabaseClient } from '@supabase/supabase-js';
import type { Action, ExpeditionState } from '../core/expedition';
import type { Member } from '../core/types';
import type { CarveRequest, FloorMarks } from '../core/runestones';
import type { EarnedDeed } from '../core/deeds';

/** Public project settings (safe to ship: access is enforced by the database's row rules). */
export const SUPABASE_URL = 'https://prcwekmvndxddqbgdnbf.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_yll4mETh0joHMteo8EtIkw_KRYY-gUp';
/** Open lobbies older than this are no longer listed. */
const LOBBY_MAX_AGE_MS = 3 * 60 * 60 * 1000;

export interface Lobby {
  id: string;
  code: string;
  host_name: string;
  start_floor: number;
  seats: number;
  /** Private: joining takes a password. */
  locked: boolean;
}

export interface ExpeditionRow {
  id: string;
  code: string;
  state: ExpeditionState;
  locked?: boolean;
}

export class OnlineError extends Error {
  /** The expedition is private and the password was missing or wrong. */
  needsPassword = false;
}

class Online {
  private client: SupabaseClient | null = null;
  private session: Session | null = null;
  private ready: Promise<void> | null = null;

  /** The client library is only downloaded once the player goes online. */
  private get db(): SupabaseClient {
    if (!this.client) throw new OnlineError('Not connected yet.');
    return this.client;
  }

  /** Connects and loads any stored session. Safe to call often. */
  init(): Promise<void> {
    this.ready ??= (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      this.client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, storageKey: 'ygdrassil-auth' } });
      const { data } = await this.client.auth.getSession();
      this.session = data.session;
      this.client.auth.onAuthStateChange((_event, session) => {
        this.session = session;
      });
    })().catch((e: unknown) => {
      this.ready = null;
      throw new OnlineError(e instanceof OnlineError ? e.message : 'Could not reach the Hornstone. Check your connection.');
    });
    return this.ready;
  }

  /** True when a stored session exists, without connecting (to skip loading the client library). */
  get mayBeSignedIn(): boolean {
    try {
      return localStorage.getItem('ygdrassil-auth') !== null;
    } catch {
      return false;
    }
  }

  get signedIn(): boolean {
    return !!this.session;
  }

  get userId(): string | null {
    return this.session?.user.id ?? null;
  }

  get isGuest(): boolean {
    return !!this.session?.user.is_anonymous;
  }

  get email(): string | null {
    return this.session?.user.email ?? null;
  }

  get playerName(): string {
    const meta = this.session?.user.user_metadata as { player?: string; name?: string; full_name?: string; given_name?: string } | undefined;
    // The player name chosen in the game first. A Google account brings the person's full name: other players only
    // ever see the first name, until a player name is chosen.
    if (meta?.player) return meta.player;
    if (this.hasGoogle) return (meta?.given_name || (meta?.full_name ?? meta?.name ?? '').split(' ')[0] || 'Wayfinder').slice(0, 16);
    return meta?.name || this.email?.split('@')[0] || 'Adventurer';
  }

  /** Signed in with Google (or a guest who linked Google). */
  get hasGoogle(): boolean {
    return !!this.session?.user.identities?.some((i) => i.provider === 'google');
  }

  /**
   * Sign in with Google. A guest links Google to the account they already have, so nothing is lost. The page goes to
   * Google and comes back to `returnTo`. Inside the itch.io frame Google cannot open, so the website opens instead.
   */
  async signInWithGoogle(returnTo = location.href.split('#')[0]): Promise<void> {
    if (__BUILD__.endsWith('-itch')) {
      window.open('https://www.ygdrassilgame.com/wayfinder?from=itch', '_blank', 'noopener');
      return;
    }
    await this.init();
    const options = { redirectTo: returnTo };
    const { error } = this.session?.user.is_anonymous
      ? await this.db.auth.linkIdentity({ provider: 'google', options })
      : await this.db.auth.signInWithOAuth({ provider: 'google', options });
    if (error) throw new OnlineError(friendly(error.message));
  }

  /** Coming back from Google: the address holds the sign-in, so connect now to take it in. */
  get returningFromSignIn(): boolean {
    return /[?&#](code|access_token|error_description)=/.test(location.href);
  }

  async signIn(email: string, password: string): Promise<void> {
    const { data, error } = await this.db.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new OnlineError(friendly(error.message));
    this.session = data.session;
  }

  /** Returns true when the account still has to be confirmed by e-mail. */
  async signUp(email: string, password: string, name: string): Promise<boolean> {
    const { data, error } = await this.db.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } });
    if (error) throw new OnlineError(friendly(error.message));
    this.session = data.session;
    return !data.session;
  }

  async signInAsGuest(name: string): Promise<void> {
    const { data, error } = await this.db.auth.signInAnonymously({ options: { data: { name: name.trim() } } });
    if (error) throw new OnlineError(friendly(error.message));
    this.session = data.session;
  }

  async setName(name: string): Promise<void> {
    const { error } = await this.db.auth.updateUser({ data: { name: name.trim(), player: name.trim() } });
    if (error) throw new OnlineError(friendly(error.message));
    const { data } = await this.db.auth.getSession();
    this.session = data.session;
  }

  async signOut(): Promise<void> {
    await this.db.auth.signOut();
    this.session = null;
  }

  // ── Cloud save ─────────────────────────────────────────────────────────────

  async uploadSave(data: string): Promise<void> {
    const user = this.userId;
    if (!user) throw new OnlineError('Please sign in first.');
    const { error } = await this.db.from('saves').upsert({ user_id: user, data, saved_at: new Date().toISOString() });
    if (error) throw new OnlineError('The save could not be uploaded.');
  }

  async downloadSave(): Promise<{ data: string; savedAt: string } | null> {
    const user = this.userId;
    if (!user) throw new OnlineError('Please sign in first.');
    const { data, error } = await this.db.from('saves').select('data, saved_at').eq('user_id', user).maybeSingle();
    if (error) throw new OnlineError('The cloud save could not be loaded.');
    return data ? { data: data.data as string, savedAt: data.saved_at as string } : null;
  }

  // ── Expeditions ────────────────────────────────────────────────────────────

  private async call(body: Record<string, unknown>): Promise<ExpeditionRow> {
    if (!this.session) throw new OnlineError('Please sign in first.');
    // Refreshes the token if it is about to run out.
    const { data } = await this.db.auth.getSession();
    this.session = data.session;
    if (!this.session) throw new OnlineError('Please sign in again.');
    let res: Response;
    try {
      res = await fetch(`${SUPABASE_URL}/functions/v1/expedition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${this.session.access_token}` },
        body: JSON.stringify(body),
      });
    } catch {
      throw new OnlineError('Could not reach the Hornstone. Check your connection.');
    }
    const json = (await res.json().catch(() => ({}))) as Partial<ExpeditionRow> & { error?: string; needsPassword?: boolean };
    if (!res.ok || !json.state) {
      const error = new OnlineError(json.error ?? 'Something went wrong.');
      error.needsPassword = !!json.needsPassword;
      throw error;
    }
    return json as ExpeditionRow;
  }

  // ── Runestones ─────────────────────────────────────────────────────────────

  /** Connects only when a session may exist; true when signed in (a guest counts). */
  async connected(): Promise<boolean> {
    if (!this.mayBeSignedIn && !this.client) return false;
    try {
      await this.init();
    } catch {
      return false;
    }
    return this.signedIn;
  }

  async floorMarks(floor: number): Promise<FloorMarks | null> {
    if (!(await this.connected())) return null;
    const { data, error } = await this.db.rpc('floor_marks', { p_floor: floor });
    return error ? null : (data as FloorMarks);
  }

  /** Returns an error message, or null when the vote counted. */
  async voteStone(id: number, vote: 'heed' | 'false'): Promise<string | null> {
    if (!(await this.connected())) return 'Please sign in first.';
    const { data, error } = await this.db.rpc('vote_runestone', { p_stone: id, p_vote: vote });
    if (error) return 'The Hornstone did not answer.';
    return (data as { error?: string }).error ?? null;
  }

  async reportShade(floor: number, x: number, y: number, enemy: string): Promise<void> {
    if (!(await this.connected())) return;
    await this.db.rpc('report_shade', { p_floor: floor, p_x: x, p_y: y, p_enemy: enemy });
  }

  /** Heeds received since the last time, and the gold they bring. */
  async claimRenown(): Promise<{ heeds: number; gold: number; total: number } | null> {
    if (!(await this.connected())) return null;
    const { data, error } = await this.db.rpc('claim_renown');
    return error ? null : (data as { heeds: number; gold: number; total: number });
  }

  /** Returns an error message, or null when the stone stands. */
  async carveStone(stone: Omit<CarveRequest, 'advice'> & { advice: string | null }): Promise<string | null> {
    if (!(await this.connected())) return 'Please sign in first.';
    const { data } = await this.db.auth.getSession();
    this.session = data.session;
    if (!this.session) return 'Please sign in again.';
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/expedition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${this.session.access_token}` },
        body: JSON.stringify({ op: 'carve', player: this.playerName, ...stone }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return res.ok ? null : (json.error ?? 'Something went wrong.');
    } catch {
      return 'Could not reach the Hornstone. Check your connection.';
    }
  }

  // ── Book of Deeds ──────────────────────────────────────────────────────────

  /** Deeds kept with the account, by id; null when not signed in or unreachable. */
  async loadDeeds(): Promise<Record<string, EarnedDeed> | null> {
    if (!(await this.connected()) || !this.userId) return null;
    const { data, error } = await this.db.from('deeds').select('deed_id, earned_at, hero').eq('user_id', this.userId);
    if (error) return null;
    return Object.fromEntries((data ?? []).map((r) => [r.deed_id as string, { at: Date.parse(r.earned_at as string), by: (r.hero as string | null) ?? undefined }]));
  }

  async saveDeeds(deeds: Record<string, EarnedDeed>): Promise<void> {
    if (!(await this.connected()) || !this.userId) return;
    const rows = Object.entries(deeds).map(([id, e]) => ({ user_id: this.userId, deed_id: id, earned_at: new Date(e.at).toISOString(), hero: e.by ?? null }));
    if (rows.length) await this.db.from('deeds').upsert(rows, { onConflict: 'user_id,deed_id', ignoreDuplicates: true });
  }

  /** `password`: makes the expedition private. */
  create(member: Member, startFloor: number, deepest: number, password?: string): Promise<ExpeditionRow> {
    return this.call({ op: 'create', player: this.playerName, member, startFloor, deepest, password });
  }

  join(code: string, member: Member, password?: string): Promise<ExpeditionRow> {
    return this.call({ op: 'join', code, player: this.playerName, member, password });
  }

  act(id: string, action: Action): Promise<ExpeditionRow> {
    return this.call({ op: 'act', id, action });
  }

  async lobbies(): Promise<Lobby[]> {
    const since = new Date(Date.now() - LOBBY_MAX_AGE_MS).toISOString();
    const { data, error } = await this.db
      .from('expeditions')
      .select('id, code, host_name, start_floor, seats, locked')
      .eq('phase', 'lobby')
      .gt('updated_at', since)
      .lt('seats', 4)
      .order('updated_at', { ascending: false })
      .limit(12);
    if (error) throw new OnlineError('Could not look for expeditions.');
    return (data ?? []) as Lobby[];
  }

  /** Expeditions this player is (or was) part of, newest first. */
  async mine(): Promise<ExpeditionRow[]> {
    const user = this.userId;
    if (!user) return [];
    const { data, error } = await this.db
      .from('expeditions')
      .select('id, code, state')
      .contains('members', [user])
      .order('updated_at', { ascending: false })
      .limit(10);
    if (error) throw new OnlineError('Could not load your expeditions.');
    return (data ?? []) as ExpeditionRow[];
  }

  async fetch(id: string): Promise<ExpeditionRow | null> {
    const { data } = await this.db.from('expeditions').select('id, code, state, locked').eq('id', id).maybeSingle();
    return (data as ExpeditionRow | null) ?? null;
  }

  /** Calls `onChange` whenever the expedition changes. Returns a function that stops listening. */
  watch(id: string, onChange: (row: ExpeditionRow) => void): () => void {
    let channel: RealtimeChannel | null = this.db
      .channel(`expedition-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'expeditions', filter: `id=eq.${id}` }, (payload) => {
        const row = payload.new as Partial<ExpeditionRow>;
        if (row.state) onChange(row as ExpeditionRow);
        else void this.fetch(id).then((r) => r && onChange(r));
      })
      .subscribe();
    return () => {
      if (channel) void this.db.removeChannel(channel);
      channel = null;
    };
  }
}

function friendly(message: string): string {
  if (/invalid login/i.test(message)) return 'That e-mail and password do not match.';
  if (/anonymous sign-ins are disabled/i.test(message)) return 'Playing as a guest is not available yet. Please create an account.';
  if (/already registered/i.test(message)) return 'There is already an account with that e-mail.';
  if (/password/i.test(message) && /6|characters|short/i.test(message)) return 'The password needs at least 6 characters.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your e-mail first (check your inbox).';
  if (/rate limit/i.test(message)) return 'Too many attempts. Please wait a few minutes.';
  if (/failed to fetch|network|load failed/i.test(message)) return 'Could not reach the Hornstone. Check your connection and try again.';
  if (/missing email|email.*required|validate email|invalid.*email/i.test(message)) return 'Please fill in a valid e-mail address.';
  if (/password.*(required|missing)|missing password/i.test(message)) return 'Please fill in your password.';
  return 'Something went wrong at the Hornstone. Please try again in a moment.';
}

export const online = new Online();
