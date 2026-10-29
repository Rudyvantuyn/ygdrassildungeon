/**
 * Everything that talks to the online service: accounts, cloud saves and expeditions.
 * The game works fully offline; this is only used from the Hornstone and the account menu.
 */
import type { RealtimeChannel, Session, SupabaseClient } from '@supabase/supabase-js';
import type { Action, ExpeditionState } from '../core/expedition';
import type { Member } from '../core/types';

/** Public project settings (safe to ship: access is enforced by the database's row rules). */
const SUPABASE_URL = 'https://prcwekmvndxddqbgdnbf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yll4mETh0joHMteo8EtIkw_KRYY-gUp';
/** Open lobbies older than this are no longer listed. */
const LOBBY_MAX_AGE_MS = 3 * 60 * 60 * 1000;

export interface Lobby {
  id: string;
  code: string;
  host_name: string;
  start_floor: number;
  seats: number;
}

export interface ExpeditionRow {
  id: string;
  code: string;
  state: ExpeditionState;
}

export class OnlineError extends Error {}

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
    const meta = this.session?.user.user_metadata as { name?: string } | undefined;
    return meta?.name || this.email?.split('@')[0] || 'Adventurer';
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
    const { error } = await this.db.auth.updateUser({ data: { name: name.trim() } });
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
    const json = (await res.json().catch(() => ({}))) as Partial<ExpeditionRow> & { error?: string };
    if (!res.ok || !json.state) throw new OnlineError(json.error ?? 'Something went wrong.');
    return json as ExpeditionRow;
  }

  create(member: Member, startFloor: number, deepest: number): Promise<ExpeditionRow> {
    return this.call({ op: 'create', player: this.playerName, member, startFloor, deepest });
  }

  join(code: string, member: Member): Promise<ExpeditionRow> {
    return this.call({ op: 'join', code, player: this.playerName, member });
  }

  act(id: string, action: Action): Promise<ExpeditionRow> {
    return this.call({ op: 'act', id, action });
  }

  async lobbies(): Promise<Lobby[]> {
    const since = new Date(Date.now() - LOBBY_MAX_AGE_MS).toISOString();
    const { data, error } = await this.db
      .from('expeditions')
      .select('id, code, host_name, start_floor, seats')
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
    const { data } = await this.db.from('expeditions').select('id, code, state').eq('id', id).maybeSingle();
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
  return message;
}

export const online = new Online();
