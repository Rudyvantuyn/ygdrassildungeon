/**
 * The owner's feedback inbox (inbox.html): read and delete what players sent from the game.
 * Only the owner's account can read or delete reports; the database enforces this, not this page.
 */
import { createClient, type Session } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '../net/online';
import './inbox.css';

const OWNER = 'rudyvantuyn@gmail.com';
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, storageKey: 'ygdrassil-inbox-auth' } });

interface Report {
  id: number;
  created_at: string;
  kind: 'bug' | 'idea' | 'other' | 'error';
  message: string;
  context: Record<string, unknown>;
  version: string | null;
  contact: string | null;
}

const KIND_NAMES: Record<Report['kind'], string> = { bug: 'Bug', idea: 'Idee', other: 'Overig', error: 'Crash' };
const root = document.getElementById('inbox')!;
let filter: Report['kind'] | 'all' = 'all';

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, children: (Node | string)[] = []): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function loginForm(message = ''): void {
  const email = h('input', { type: 'email', value: OWNER, autocomplete: 'username' });
  const password = h('input', { type: 'password', placeholder: 'Wachtwoord', autocomplete: 'current-password' });
  const status = h('p', { className: 'status', textContent: message });
  const signIn = h('button', { textContent: 'Inloggen' });
  const signUp = h('button', { className: 'quiet', textContent: 'Eerste keer? Account aanmaken' });
  signIn.onclick = async () => {
    status.textContent = 'Bezig...';
    const { error } = await db.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
    if (error) status.textContent = error.message.includes('confirm') ? 'Bevestig eerst je e-mailadres (kijk in je Gmail).' : 'Inloggen mislukt. Klopt het wachtwoord?';
    else void show();
  };
  signUp.onclick = async () => {
    if (password.value.length < 8) return void (status.textContent = 'Kies een wachtwoord van minstens 8 tekens.');
    status.textContent = 'Bezig...';
    const { error } = await db.auth.signUp({
      email: email.value.trim(),
      password: password.value,
      options: { emailRedirectTo: `${location.origin}/inbox.html` },
    });
    status.textContent = error
      ? `Dat lukte niet: ${error.message}`
      : 'Je krijgt een mail in je Gmail. Klik op de link om je adres te bevestigen, kom dan terug en log in.';
  };
  password.onkeydown = (e) => {
    if (e.key === 'Enter') signIn.click();
  };
  root.replaceChildren(
    h('main', { className: 'login' }, [
      h('h1', { textContent: 'Feedback' }),
      h('p', { textContent: 'Alleen voor de eigenaar van Ygdrassil.' }),
      email,
      password,
      signIn,
      signUp,
      status,
    ]),
  );
  password.focus();
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function contextLine(r: Report): string {
  const c = r.context ?? {};
  const parts: string[] = [];
  if (c.location === 'title') parts.push('op het titelscherm');
  else if (c.location === 'town') parts.push('in Lindholm');
  else if (typeof c.floor === 'number') parts.push(`verdieping ${c.floor + 1}`);
  if (Array.isArray(c.levels)) parts.push(c.levels.join(', '));
  if (typeof c.battles === 'number') parts.push(`${c.battles} gevechten`);
  if (typeof c.minutesPlayed === 'number') parts.push(`${Math.floor(c.minutesPlayed / 60)}u ${c.minutesPlayed % 60}m gespeeld`);
  if (c.coop) parts.push('expeditie');
  if (c.screen) parts.push(`scherm ${c.screen}`);
  if (r.version) parts.push(`versie ${r.version}`);
  return parts.join(' · ');
}

async function show(): Promise<void> {
  const { data: session } = await db.auth.getSession();
  if (!session.session) return loginForm();
  if (session.session.user.email?.toLowerCase() !== OWNER) {
    await db.auth.signOut();
    return loginForm('Dit account heeft geen toegang.');
  }
  await render(session.session);
}

async function render(session: Session): Promise<void> {
  root.replaceChildren(h('main', {}, [h('p', { className: 'status', textContent: 'Laden...' })]));
  let query = db.from('reports').select('id, created_at, kind, message, context, version, contact').order('created_at', { ascending: false }).limit(500);
  if (filter !== 'all') query = query.eq('kind', filter);
  const { data, error } = await query;
  if (error) return loginForm(`Kon de feedback niet laden: ${error.message}`);
  const reports = (data ?? []) as Report[];

  const remove = async (ids: number[]) => {
    if (!ids.length || !confirm(ids.length === 1 ? 'Dit bericht verwijderen?' : `${ids.length} berichten verwijderen?`)) return;
    const { error: err } = await db.from('reports').delete().in('id', ids);
    if (err) alert(`Verwijderen mislukt: ${err.message}`);
    void render(session);
  };

  // The Wayfinders' Stone in Lindholm: names the owner chose to thank, visible to every player.
  const carve = async (suggested: string, r?: Report) => {
    const name = prompt('Naam op het erebord (zoals spelers hem zien, max. 40 tekens):', suggested)?.trim();
    if (!name) return;
    // Suggest the playtime and battles from the report, so the stone shows them as a badge.
    const c = r?.context ?? {};
    const bits = [
      typeof c.minutesPlayed === 'number' && c.minutesPlayed > 0 ? `${Math.max(1, Math.round(c.minutesPlayed / 60))}h played` : '',
      typeof c.battles === 'number' && c.battles > 0 ? `${c.battles} battles` : '',
    ].filter(Boolean);
    const note = prompt('Korte regel erbij, in het Engels (mag leeg):', bits.join(', '))?.trim();
    const { error: err } = await db.from('honors').insert({ name: name.slice(0, 40), note: note ? note.slice(0, 160) : null });
    if (err) alert(`Toevoegen mislukt: ${err.message}`);
    void render(session);
  };
  const { data: honorRows } = await db.from('honors').select('id, name, note').order('created_at', { ascending: true });
  const stone = h('details', { className: 'stone' }, [
    h('summary', { textContent: `Erebord in de stad (${honorRows?.length ?? 0} namen)` }),
    ...((honorRows ?? []) as { id: number; name: string; note: string | null }[]).map((row) => {
      const off = h('button', { className: 'danger small', textContent: 'Haal weg' });
      off.onclick = async () => {
        if (!confirm(`${row.name} van het erebord halen?`)) return;
        const { error: err } = await db.from('honors').delete().eq('id', row.id);
        if (err) alert(`Weghalen mislukt: ${err.message}`);
        void render(session);
      };
      return h('p', {}, [h('b', { textContent: row.name }), row.note ? ` — ${row.note} ` : ' ', off]);
    }),
    (() => {
      const add = h('button', { className: 'quiet small', textContent: 'Naam toevoegen' });
      add.onclick = () => void carve('');
      return add;
    })(),
  ]);

  const filters = h('nav', {}, (['all', 'bug', 'idea', 'other', 'error'] as const).map((k) => {
    const b = h('button', { className: k === filter ? 'chip on' : 'chip', textContent: k === 'all' ? 'Alles' : KIND_NAMES[k] });
    b.onclick = () => {
      filter = k;
      void render(session);
    };
    return b;
  }));
  const checked = new Set<number>();
  const bulk = h('button', { className: 'danger', textContent: 'Verwijder geselecteerde', disabled: true });
  bulk.onclick = () => void remove([...checked]);
  const signOut = h('button', { className: 'quiet', textContent: 'Uitloggen' });
  signOut.onclick = async () => {
    await db.auth.signOut();
    loginForm();
  };

  const list = reports.map((r) => {
    const box = h('input', { type: 'checkbox' });
    box.onchange = () => {
      if (box.checked) checked.add(r.id);
      else checked.delete(r.id);
      bulk.disabled = checked.size === 0;
      bulk.textContent = checked.size ? `Verwijder geselecteerde (${checked.size})` : 'Verwijder geselecteerde';
    };
    const del = h('button', { className: 'danger small', textContent: 'Verwijder' });
    del.onclick = () => void remove([r.id]);
    const honor = h('button', { className: 'quiet small', textContent: 'Op het erebord' });
    honor.onclick = () => void carve(r.contact ?? '', r);
    const stack = typeof r.context?.stack === 'string' ? h('details', {}, [h('summary', { textContent: 'Technische details' }), h('pre', { textContent: r.context.stack })]) : '';
    return h('article', { className: `report ${r.kind}` }, [
      h('header', {}, [box, h('span', { className: `tag ${r.kind}`, textContent: KIND_NAMES[r.kind] }), h('time', { textContent: when(r.created_at) }), honor, del]),
      r.contact ? h('p', { className: 'contact', textContent: `Van: ${r.contact}` }) : '',
      h('p', { className: 'message', textContent: r.message }),
      h('p', { className: 'context', textContent: contextLine(r) }),
      stack,
    ]);
  });

  root.replaceChildren(
    h('main', {}, [
      h('div', { className: 'top' }, [h('h1', { textContent: 'Feedback' }), signOut]),
      stone,
      filters,
      h('div', { className: 'bar' }, [h('span', { textContent: `${reports.length} bericht${reports.length === 1 ? '' : 'en'}` }), bulk]),
      ...(list.length ? list : [h('p', { className: 'status', textContent: 'Geen berichten. Mooi zo.' })]),
    ]),
  );
}

void show();
