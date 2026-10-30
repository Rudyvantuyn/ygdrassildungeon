/**
 * The Hornstone: Lindholm's meeting place for expeditions with other players.
 * Handles signing in, the cloud save, and gathering a party in a lobby.
 */
import { CLASSES } from '../core/data/classes';
import { chapterOf, startFloors } from '../core/data/chapters';
import { FLOORS } from '../core/data/floors';
import { claimShare, MAX_SEATS, type ExpeditionState, type Share } from '../core/expedition';
import type { Game } from '../core/game';
import { isAlive } from '../core/party';
import type { Member } from '../core/types';
import { MATERIALS } from '../core/data/materials';
import { online, OnlineError, type ExpeditionRow } from '../net/online';
import { el } from './dom';
import { ListMenu, type MenuItem } from './menu';
import { npcSays } from './npc';

export interface HornstoneHost {
  game: Game;
  openOverlay(content: HTMLElement, menu: ListMenu): void;
  closeOverlay(): void;
  toast(text: string): void;
  save(): void;
  enterTown(): void;
  updateHud(): void;
  /** Replaces the current game with a save (from the cloud). */
  loadSaveData(data: string): boolean;
  /** Sets out (or returns) on an expedition that has started. */
  startExpedition(row: ExpeditionRow): void;
}

interface Field {
  label: string;
  type?: 'text' | 'email' | 'password';
  value?: string;
  max?: number;
}

export class Hornstone {
  private unwatch: (() => void) | null = null;

  constructor(private readonly host: HornstoneHost) {}

  private get game(): Game {
    return this.host.game;
  }

  async open(): Promise<void> {
    this.message('The Hornstone', 'Reaching out to the other halls...', false);
    try {
      await online.init();
    } catch (e) {
      return this.message('The Hornstone', errorText(e));
    }
    if (!online.signedIn) return this.account();
    return this.main();
  }

  // ── Main menu ──────────────────────────────────────────────────────────────

  private async main(): Promise<void> {
    this.stopWatching();
    let rows: ExpeditionRow[] = [];
    try {
      rows = await online.mine();
    } catch {
      // Listing is a convenience; the rest still works.
    }
    const active = rows.find((r) => r.state.phase !== 'ended');
    const claimed = new Set(this.game.state.claimed ?? []);
    const unclaimed = rows.filter((r) => r.state.phase === 'ended' && r.state.result && !claimed.has(r.id));
    const back = () => this.leave();
    const items: MenuItem[] = [];
    if (active) {
      items.push({
        label: active.state.phase === 'lobby' ? `Back to the gathering (${active.code})` : `Rejoin your expedition (${active.code})`,
        description: 'Your expedition is waiting for you.',
        onSelect: () => (active.state.phase === 'lobby' ? this.lobby(active) : this.host.startExpedition(active)),
      });
    }
    if (unclaimed.length) {
      items.push({
        label: 'Collect your share',
        detail: `${unclaimed.length}`,
        description: 'Bring home what your adventurers earned on expeditions.',
        onSelect: () => this.collect(unclaimed),
      });
    }
    items.push(
      {
        label: 'Sound the Horn',
        description: 'Start an expedition and wait for up to three other players to join.',
        disabled: !!active,
        onSelect: () => this.chooseMember('Who answers your horn?', (m) => this.chooseFloor(m)),
      },
      {
        label: 'Answer a Horn',
        description: 'Join an expedition that is gathering right now.',
        disabled: !!active,
        onSelect: () => void this.browse(),
      },
      { label: 'Join by code', description: 'Join a friend’s expedition with its four-letter code.', disabled: !!active, onSelect: () => this.joinByCode() },
      { label: 'Account', detail: online.playerName, description: 'Your name, the cloud save, and signing out.', onSelect: () => this.accountMenu() },
      { label: 'Back', onSelect: back },
    );
    const menu = new ListMenu(items, { onCancel: back });
    this.dialog(
      'The Hornstone',
      [npcSays('ketil', '"Blow the horn, and adventurers from other halls will come to share the descent. I have heard it answered for forty winters."')],
      menu,
      true,
    );
  }

  private leave(): void {
    this.stopWatching();
    this.host.closeOverlay();
    this.host.enterTown();
  }

  // ── Setting out ────────────────────────────────────────────────────────────

  /** Members of the home roster who can go, the party first. */
  private roster(): Member[] {
    return [...this.game.state.party, ...this.game.state.reserve];
  }

  private chooseMember(title: string, pick: (m: Member) => void): void {
    const back = () => void this.main();
    const items: MenuItem[] = this.roster().map((m) => ({
      label: m.name,
      detail: `Lv ${m.level} ${CLASSES[m.classId].name}`,
      description: isAlive(m) ? 'Everyone sets out rested.' : 'Fallen. Rest at the Inn first.',
      disabled: !isAlive(m),
      onSelect: () => pick(m),
    }));
    items.push({ label: 'Back', onSelect: back });
    this.dialog(title, [el('p', { text: 'Each player brings one adventurer. The host leads the way.' })], new ListMenu(items, { onCancel: back }), true);
  }

  private chooseFloor(member: Member): void {
    const deepest = this.game.state.deepest;
    const back = () => this.chooseMember('Who answers your horn?', (m) => this.chooseFloor(m));
    const starts = startFloors(deepest);
    const items: MenuItem[] = starts.map((i) => ({
      label: `Chapter ${chapterOf(i).numeral}: ${chapterOf(i).name}`,
      detail: FLOORS[i].name,
      onSelect: () => void this.run(() => online.create(member, i, deepest), (row) => this.lobby(row)),
    }));
    items.push({ label: 'Back', onSelect: back });
    this.dialog('Where to?', [el('p', { text: 'An expedition starts at the beginning of a chapter you have reached.' })], new ListMenu(items, { onCancel: back, startIndex: starts.length - 1 }));
  }

  private async browse(): Promise<void> {
    const back = () => void this.main();
    this.message('Answer a Horn', 'Listening for horns...', false);
    let lobbies;
    try {
      lobbies = await online.lobbies();
    } catch (e) {
      return this.message('Answer a Horn', errorText(e), true, back);
    }
    const items: MenuItem[] = lobbies.map((l) => ({
      label: `${l.host_name}`,
      detail: `${l.seats}/${MAX_SEATS} · ${FLOORS[l.start_floor]?.name ?? ''}`,
      onSelect: () => this.chooseMember('Who answers the horn?', (m) => void this.run(() => online.join(l.code, m), (row) => this.lobby(row))),
    }));
    if (!items.length) items.push({ label: 'No horns are sounding right now', disabled: true, onSelect: () => {} });
    items.push({ label: 'Listen again', onSelect: () => void this.browse() }, { label: 'Back', onSelect: back });
    this.dialog('Answer a Horn', [], new ListMenu(items, { onCancel: back }), true);
  }

  private joinByCode(): void {
    const back = () => void this.main();
    this.form('Join by code', 'Ask the host for the four letters on their screen.', [{ label: 'Code', max: 4 }], 'Next', ([code]) => {
      this.chooseMember('Who answers the horn?', (m) => void this.run(() => online.join(code, m), (row) => this.lobby(row)));
    }, back);
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────

  private lobby(row: ExpeditionRow, index = 0): void {
    const state = row.state;
    if (state.phase === 'ended') {
      this.stopWatching();
      return this.message('The Hornstone', state.result?.reason === 'disbanded' ? 'The host called off the expedition.' : 'This expedition is over.', true, () => void this.main());
    }
    if (state.phase !== 'lobby') {
      this.stopWatching();
      this.host.startExpedition(row);
      return;
    }
    if (!this.unwatch) this.unwatch = online.watch(row.id, (r) => this.lobby(r, menu.selectedIndex));

    const me = online.userId;
    const isHost = state.host === me;
    const seats = state.seats.map((s) =>
      el('div', { className: 'seat' }, [
        el('span', { className: 'seat-player', text: s.player }),
        el('span', { text: `${s.member.name} · Lv ${s.member.level} ${CLASSES[s.member.classId].name}` }),
      ]),
    );
    for (let i = state.seats.length; i < MAX_SEATS; i++) seats.push(el('div', { className: 'seat empty' }, [el('span', { text: 'Waiting for an adventurer...' })]));

    const leave = () =>
      void this.run(
        () => online.act(row.id, { type: 'leave' }),
        () => void this.main(),
      );
    const items: MenuItem[] = [];
    if (isHost) {
      // Classes the party still lacks come first.
      const classes = new Set(state.seats.map((s) => s.member.classId));
      const fill = this.roster()
        .filter((m) => isAlive(m) && !state.seats.some((s) => s.user === me && s.member.name === m.name))
        .sort((x, y) => Number(classes.has(x.classId)) - Number(classes.has(y.classId)));
      const free = MAX_SEATS - state.seats.length;
      items.push({
        label: 'Set out',
        description: state.seats.length > 1 ? 'Lead the expedition into the Rootdeep.' : 'Set out on your own (others can no longer join).',
        onSelect: () => void this.run(() => online.act(row.id, { type: 'start' }), (r) => this.lobby(r)),
      });
      if (free > 0 && fill.length > 0) {
        items.push({
          label: 'Set out, filling the empty seats',
          description: `Bring ${Math.min(free, fill.length)} more of your own adventurers (${fill
            .slice(0, free)
            .map((m) => m.name)
            .join(', ')}).`,
          onSelect: () => void this.run(() => online.act(row.id, { type: 'start', fill: fill.slice(0, free) }), (r) => this.lobby(r)),
        });
      }
    }
    items.push({ label: isHost ? 'Call it off' : 'Leave', description: isHost ? 'Everyone returns home.' : 'Leave this gathering.', onSelect: leave });
    const menu = new ListMenu(items, { onCancel: leave, startIndex: index });
    this.dialog(
      'Gathering at the Hornstone',
      [
        el('div', { className: 'lobby-code' }, [el('span', { text: 'Code' }), el('b', { text: row.code })]),
        el('p', { text: isHost ? 'Share the code with your friends. Set out when everyone is here.' : `Waiting for ${state.seats[0].player} to set out...` }),
        el('div', { className: 'seats' }, seats),
      ],
      menu,
      true,
    );
  }

  private stopWatching(): void {
    this.unwatch?.();
    this.unwatch = null;
  }

  // ── Rewards ────────────────────────────────────────────────────────────────

  private collect(rows: ExpeditionRow[]): void {
    const lines: HTMLElement[] = [];
    for (const row of rows) {
      const share = row.state.result?.shares.find((s) => s.user === online.userId);
      this.game.state.claimed = [...(this.game.state.claimed ?? []), row.id];
      if (!share) continue;
      lines.push(...shareLines(this.game, share, row.state));
    }
    this.host.save();
    this.host.updateHud();
    const back = () => void this.main();
    this.dialog('Your share', lines.length ? lines : [el('p', { text: 'Nothing to bring home.' })], new ListMenu([{ label: 'Continue', onSelect: back }], { onCancel: back }));
  }

  // ── Account ────────────────────────────────────────────────────────────────

  private account(): void {
    const back = () => this.leave();
    const menu = new ListMenu(
      [
        { label: 'Sign in', description: 'With the e-mail and password of your account.', onSelect: () => this.signIn() },
        { label: 'Create an account', description: 'Free. Lets you play with others and keep your save in the cloud.', onSelect: () => this.signUp() },
        { label: 'Play as a guest', description: 'Try it without an account. You can add an e-mail later.', onSelect: () => this.guest() },
        { label: 'Back', onSelect: back },
      ],
      { onCancel: back },
    );
    this.dialog('The Hornstone', [npcSays('ketil', '"Before you sound the horn, tell me who you are, so the other halls know whom they answer."')], menu, true);
  }

  private signIn(): void {
    this.form('Sign in', '', [{ label: 'E-mail', type: 'email' }, { label: 'Password', type: 'password' }], 'Sign in', ([email, password], fail) => {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return fail('Please fill in your e-mail address.');
      if (!password) return fail('Please fill in your password.');
      void online
        .signIn(email, password)
        .then(() => this.main())
        .catch((e) => fail(errorText(e)));
    }, () => this.account());
  }

  private signUp(): void {
    this.form(
      'Create an account',
      'Your player name is what others see at the Hornstone. By creating an account you agree to Privacy & Terms (on the title screen and under System).',
      [{ label: 'Player name', max: 16 }, { label: 'E-mail', type: 'email' }, { label: 'Password (6+ characters)', type: 'password' }],
      'Create',
      ([name, email, password], fail) => {
        if (!name.trim()) return fail('Choose a player name.');
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) return fail('Please fill in a valid e-mail address.');
        if (password.length < 6) return fail('The password needs at least 6 characters.');
        void online
          .signUp(email, password, name)
          .then((confirm) =>
            confirm
              ? this.message('Almost there', `We sent a confirmation link to ${email}. Open it, then sign in here.`, true, () => this.signIn())
              : this.main(),
          )
          .catch((e) => fail(errorText(e)));
      },
      () => this.account(),
    );
  }

  private guest(): void {
    this.form('Play as a guest', 'Your player name is what others see at the Hornstone.', [{ label: 'Player name', max: 16 }], 'Continue', ([name], fail) => {
      if (!name.trim()) return fail('Choose a player name.');
      void online
        .signInAsGuest(name)
        .then(() => this.main())
        .catch((e) => fail(errorText(e)));
    }, () => this.account());
  }

  private accountMenu(): void {
    const back = () => void this.main();
    const menu = new ListMenu(
      [
        {
          label: 'Change player name',
          detail: online.playerName,
          onSelect: () =>
            this.form('Player name', '', [{ label: 'Player name', max: 16, value: online.playerName }], 'Save', ([name], fail) => {
              if (!name.trim()) return fail('Choose a player name.');
              void online.setName(name).then(() => this.accountMenu()).catch((e) => fail(errorText(e)));
            }, () => this.accountMenu()),
        },
        {
          label: 'Upload save to the cloud',
          description: 'Store this game online, to continue on another device.',
          onSelect: () => {
            this.host.save();
            void this.run(
              () => online.uploadSave(this.game.serialize()),
              () => this.message('Cloud save', 'Your game is safe in the cloud.', true, () => this.accountMenu()),
            );
          },
        },
        {
          label: 'Load save from the cloud',
          description: 'Replace the game on this device with the one in the cloud.',
          onSelect: () => void this.cloudLoad(),
        },
        {
          label: 'Sign out',
          description: online.isGuest ? 'Guest progress online is lost when you sign out.' : 'Sign out on this device.',
          onSelect: () => void online.signOut().then(() => this.leave()),
        },
        { label: 'Back', onSelect: back },
      ],
      { onCancel: back },
    );
    const who = online.isGuest ? `Playing as guest ${online.playerName}.` : `Signed in as ${online.playerName} (${online.email}).`;
    this.dialog('Account', [el('p', { text: who })], menu, true);
  }

  private async cloudLoad(): Promise<void> {
    const back = () => this.accountMenu();
    let save;
    try {
      save = await online.downloadSave();
    } catch (e) {
      return this.message('Cloud save', errorText(e), true, back);
    }
    if (!save) return this.message('Cloud save', 'There is no save in the cloud yet.', true, back);
    const when = new Date(save.savedAt).toLocaleString();
    const data = save.data;
    const menu = new ListMenu(
      [
        {
          label: 'Load it',
          onSelect: () => {
            if (!this.host.loadSaveData(data)) return this.message('Cloud save', 'That save is from an older version and cannot be loaded.', true, back);
            this.host.save();
            this.leave();
            this.host.toast('Cloud save loaded.');
          },
        },
        { label: 'Keep this one', onSelect: back },
      ],
      { onCancel: back },
    );
    this.dialog('Load from the cloud?', [el('p', { text: `Saved ${when}. The game on this device will be replaced.` })], menu);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Runs a request with a waiting message; shows its error, or passes the result on. */
  private async run<T>(request: () => Promise<T>, then: (result: T) => void): Promise<void> {
    this.message('The Hornstone', 'One moment...', false);
    try {
      then(await request());
    } catch (e) {
      this.message('The Hornstone', errorText(e), true, () => void this.main());
    }
  }

  private message(title: string, text: string, withButton = true, then?: () => void): void {
    const done = then ?? (() => this.leave());
    const menu = new ListMenu(withButton ? [{ label: 'OK', onSelect: done }] : [], { onCancel: done });
    this.dialog(title, [el('p', { text })], menu);
  }

  private form(title: string, intro: string, fields: Field[], submitLabel: string, submit: (values: string[], fail: (text: string) => void) => void, back: () => void): void {
    const error = el('p', { className: 'form-error' });
    const inputs = fields.map((f) => {
      const input = el('input', { className: 'name-input' });
      input.type = f.type ?? 'text';
      input.placeholder = f.label;
      input.setAttribute('aria-label', f.label);
      if (f.max) input.maxLength = f.max;
      if (f.value) input.value = f.value;
      if (f.type === 'password') input.autocomplete = 'current-password';
      return input;
    });
    const fail = (text: string) => {
      error.textContent = text;
      inputs[0]?.focus();
    };
    const go = () => {
      error.textContent = 'One moment...';
      submit(
        inputs.map((i) => i.value),
        fail,
      );
    };
    inputs.forEach((input, i) => {
      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          if (i < inputs.length - 1) inputs[i + 1].focus();
          else go();
        }
        if (e.key === 'Escape') back();
      });
    });
    const menu = new ListMenu(
      [
        { label: submitLabel, onSelect: go },
        { label: 'Back', onSelect: back },
      ],
      { onCancel: back },
    );
    this.dialog(title, [...(intro ? [el('p', { text: intro })] : []), ...inputs, error], menu);
    inputs[0]?.focus();
  }

  private dialog(title: string, body: HTMLElement[], menu: ListMenu, withDesc = false): void {
    const children: HTMLElement[] = [el('h2', { text: title }), ...body, menu.el];
    if (withDesc) {
      const desc = el('div', { className: 'menu-desc' });
      menu.describeInto(desc);
      children.push(desc);
    }
    this.host.openOverlay(el('div', { className: 'panel dialog wide' }, children), menu);
  }
}

/** Brings a share into the home game and describes what came home. */
export function shareLines(game: Game, share: Share, state: ExpeditionState): HTMLElement[] {
  const before = new Map([...game.state.party, ...game.state.reserve].map((m) => [m.name, m.level]));
  const updated = claimShare(game.state, share);
  const lines: HTMLElement[] = [];
  const reason = state.result?.reason;
  lines.push(el('p', { text: reason === 'wiped' ? 'The expedition fell. The Rootdeep kept the loot, but the lessons stay with you.' : 'The expedition made it home.' }));
  const rows: HTMLElement[] = [el('span', { text: 'Gold' }), el('span', { className: 'v', text: `+${share.gold} G` })];
  for (const [id, n] of Object.entries(share.materials)) rows.push(el('span', { text: 'Material' }), el('span', { className: 'v', text: `${MATERIALS[id]?.name ?? id} ×${n}` }));
  for (const m of share.members) {
    if (!updated.includes(m.name)) continue;
    const was = before.get(m.name) ?? m.level;
    rows.push(el('span', { text: m.name }), el('span', { className: 'v', text: m.level > was ? `Lv ${was} → ${m.level}` : `Lv ${m.level}` }));
  }
  lines.push(el('div', { className: 'rewards' }, rows));
  return lines;
}

function errorText(e: unknown): string {
  if (e instanceof OnlineError) return e.message;
  return 'Something went wrong. Please try again.';
}
