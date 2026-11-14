/**
 * Runestones and shades in the dungeon: loading what other players left on this floor, reading a stone when the
 * party steps on it (Heed / False), carving one (once per descent), and reporting a fallen party as a shade.
 */
import { ENEMIES } from '../core/data/enemies';
import type { Game } from '../core/game';
import {
  RUNE_ADVICE,
  RUNE_WHAT,
  RUNE_WHERE,
  runeDir,
  runeText,
  visibleMarks,
  type FloorMarks,
  type RuneAdvice,
  type RuneWhat,
  type RuneWhere,
  type Runestone,
} from '../core/runestones';
import type { CorridorRenderer } from '../render/corridor';
import { online } from '../net/online';
import { el } from './dom';
import { ListMenu, type MenuItem } from './menu';

export interface RuneHost {
  game: Game;
  readonly corridor: CorridorRenderer;
  openOverlay(content: HTMLElement, menu: ListMenu): void;
  closeOverlay(): void;
  /** Back to walking after a dialog. */
  resume(): void;
  toast(text: string, ms?: number): void;
  tips(ids: string[], then: () => void): void;
}

const READ_KEEP = 400;
const EMPTY: FloorMarks = { stones: [], shades: [] };

export class RuneMarks {
  private floor = -1;
  private marks: FloorMarks = EMPTY;
  private lastCell = -1;
  private request = 0;

  constructor(private readonly host: RuneHost) {}

  private get game(): Game {
    return this.host.game;
  }

  /** Every frame: follow the floor the party is on (and forget everything outside the Rootdeep or in a test). */
  sync(active: boolean): void {
    const g = this.game;
    if (!active || g.state.location !== 'dungeon') {
      this.floor = -1;
      this.marks = EMPTY;
      this.host.corridor.marks = null;
      return;
    }
    if (g.state.floor === this.floor) return;
    this.floor = g.state.floor;
    this.marks = EMPTY;
    this.host.corridor.marks = null;
    this.lastCell = g.state.y * g.map.width + g.state.x;
    void this.reload();
  }

  async reload(): Promise<void> {
    const floor = this.floor;
    const ticket = ++this.request;
    const marks = await online.floorMarks(floor);
    if (ticket !== this.request || floor !== this.floor || !marks) return;
    this.marks = visibleMarks(floor, marks);
    const w = this.game.map.width;
    this.host.corridor.marks = {
      stones: new Set(this.marks.stones.map((s) => s.y * w + s.x)),
      shades: new Set(this.marks.shades.map((s) => s.y * w + s.x)),
    };
  }

  /** Stones on this floor the player has read: shown on the map. */
  readHere(): { x: number; y: number }[] {
    const read = new Set(this.game.state.runesRead ?? []);
    return this.marks.stones.filter((s) => read.has(s.id) || s.mine);
  }

  private stoneAt(x: number, y: number): Runestone | undefined {
    return this.marks.stones.find((s) => s.x === x && s.y === y);
  }

  /**
   * After the party moved: a shade tells how a party fell, a stone shows its message. On an expedition only a
   * short note (no dialog that would hold the others up). Returns true when a dialog opened.
   */
  stepped(dialog: boolean): boolean {
    const g = this.game;
    const cell = g.state.y * g.map.width + g.state.x;
    if (cell === this.lastCell) return false;
    this.lastCell = cell;
    const shade = this.marks.shades.find((s) => s.x === g.state.x && s.y === g.state.y);
    if (shade) this.host.toast(`A shade lingers here. A party fell to ${fellTo(shade.enemy)}.`, 3200);
    const stone = this.stoneAt(g.state.x, g.state.y);
    if (!stone) return false;
    const text = runeText(stone, g.state.dir);
    const read = (g.state.runesRead ??= []);
    const first = !read.includes(stone.id);
    if (first) {
      read.push(stone.id);
      if (read.length > READ_KEEP) read.splice(0, read.length - READ_KEEP);
    }
    if (!dialog || !first || stone.mine || stone.voted) {
      this.host.toast(`${stone.mine ? 'Your stone' : `A runestone by ${stone.author}`}: “${text}”`, 3200);
      return false;
    }
    this.host.tips(['runestones'], () => this.read(stone));
    return true;
  }

  private read(stone: Runestone): void {
    const g = this.game;
    const done = () => {
      this.host.closeOverlay();
      this.host.resume();
    };
    const vote = (v: 'heed' | 'false') => async () => {
      done();
      const error = await online.voteStone(stone.id, v);
      if (error) return this.host.toast(error);
      stone.voted = v;
      if (v === 'heed') stone.heeds += 1;
      else stone.falses += 1;
      this.host.toast(v === 'heed' ? `You heed ${stone.author}'s stone. They will hear of it.` : 'You mark the stone as false.');
    };
    const items: MenuItem[] = [
      { label: 'Heed', description: 'It was right, or it helped: thank the carver.', onSelect: vote('heed') },
      { label: 'False', description: 'It is wrong. Stones marked false often enough crumble.', onSelect: vote('false') },
      { label: 'Walk on', description: 'Judge it later: you will find it on your map.', onSelect: done },
    ];
    const menu = new ListMenu(items, { onCancel: done });
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.host.openOverlay(
      el('div', { className: 'panel dialog runestone' }, [
        el('h2', { text: 'A runestone' }),
        el('p', { className: 'rune-text', text: `“${runeText(stone, g.state.dir)}”` }),
        el('p', { className: 'rune-by', text: `Carved by ${stone.author}${stone.heeds ? ` · heeded ${stone.heeds} time${stone.heeds === 1 ? '' : 's'}` : ''}` }),
        menu.el,
        desc,
      ]),
      menu,
    );
  }

  /** Whether a stone can be carved right here, right now; else why not. */
  carveProblem(): string | null {
    const g = this.game;
    if (g.state.carvedOn && g.state.carvedOn === g.state.descent) return 'You already carved a stone on this descent.';
    if (this.stoneAt(g.state.x, g.state.y)) return 'A stone already stands here.';
    return null;
  }

  /** Carving: pick what, where and (maybe) advice, then carve. `back` returns to the menu. */
  async carve(back: () => void): Promise<void> {
    if (!(await online.connected())) {
      return this.dialog('Runestones', [el('p', { text: 'Runestones are shared through the Hornstone. Sound it once in Lindholm and sign in (as a guest is fine) to see and carve them.' })], [{ label: 'Back', onSelect: back }], back);
    }
    const problem = this.carveProblem();
    if (problem) return this.dialog('Runestones', [el('p', { text: problem })], [{ label: 'Back', onSelect: back }], back);
    this.host.tips(['runestones'], () => this.pickWhat(back));
  }

  private pickWhat(back: () => void): void {
    const items: MenuItem[] = (Object.keys(RUNE_WHAT) as RuneWhat[]).map((what) => ({ label: RUNE_WHAT[what], onSelect: () => this.pickWhere(what, back) }));
    items.push({ label: 'Back', onSelect: back });
    this.dialog('Carve a runestone', [el('p', { text: 'What do you want to tell those who come after you?' })], items, back);
  }

  private pickWhere(what: RuneWhat, back: () => void): void {
    const again = () => this.pickWhat(back);
    const items: MenuItem[] = (Object.keys(RUNE_WHERE) as RuneWhere[]).map((where) => ({
      label: `${RUNE_WHAT[what]} ${RUNE_WHERE[where]}`,
      description: where === 'here' ? 'Right on this square.' : `Seen from where you face now; others read it from their own facing.`,
      onSelect: () => this.pickAdvice(what, where, back),
    }));
    items.push({ label: 'Back', onSelect: again });
    this.dialog('Where?', [], items, again);
  }

  private pickAdvice(what: RuneWhat, where: RuneWhere, back: () => void): void {
    const again = () => this.pickWhere(what, back);
    const items: MenuItem[] = [
      { label: 'No advice', onSelect: () => this.confirmCarve(what, where, null, back) },
      ...(Object.keys(RUNE_ADVICE) as RuneAdvice[]).map((advice) => ({ label: RUNE_ADVICE[advice], onSelect: () => this.confirmCarve(what, where, advice, back) })),
    ];
    items.push({ label: 'Back', onSelect: again });
    this.dialog('Any advice?', [], items, again);
  }

  private confirmCarve(what: RuneWhat, where: RuneWhere, advice: RuneAdvice | null, back: () => void): void {
    const g = this.game;
    const stone = { what, dir: runeDir(where, g.state.dir), advice };
    const again = () => this.pickAdvice(what, where, back);
    const items: MenuItem[] = [
      { label: 'Carve it', description: 'One stone per descent. Your 21st stone makes your oldest crumble.', onSelect: () => void this.doCarve(stone, back) },
      { label: 'Back', onSelect: again },
    ];
    this.dialog('Carve this?', [el('p', { className: 'rune-text', text: `“${runeText(stone, g.state.dir)}”` }), el('p', { className: 'rune-by', text: `Signed: ${online.playerName}` })], items, again);
  }

  private async doCarve(stone: { what: RuneWhat; dir: ReturnType<typeof runeDir>; advice: RuneAdvice | null }, back: () => void): Promise<void> {
    const g = this.game;
    const descent = g.state.descent ?? '';
    const error = await online.carveStone({ floor: g.state.floor, x: g.state.x, y: g.state.y, ...stone, descent });
    if (error) return this.dialog('Runestones', [el('p', { text: error })], [{ label: 'Back', onSelect: back }], back);
    g.state.carvedOn = descent;
    this.host.closeOverlay();
    this.host.resume();
    this.host.toast('You carve the stone. Those who come after you will find it here.', 3200);
    await this.reload();
  }

  private dialog(title: string, body: HTMLElement[], items: MenuItem[], cancel: () => void): void {
    const menu = new ListMenu(items, { onCancel: cancel });
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.host.openOverlay(el('div', { className: 'panel dialog runestone' }, [el('h2', { text: title }), ...body, menu.el, desc]), menu);
  }
}

function fellTo(enemy: string): string {
  const def = ENEMIES[enemy];
  return def ? `the ${def.name}`.replace(/^the The /, 'The ') : 'something in the dark';
}

/** A whole party fell here: leave a shade for others (only when signed in; quietly does nothing otherwise). */
export function reportShade(game: Game, enemy: string): void {
  if (!online.mayBeSignedIn || !/^[A-Za-z]{1,40}$/.test(enemy)) return;
  void online.reportShade(game.state.floor, game.state.x, game.state.y, enemy).catch(() => {});
}

/** In town: heeds received since last time, and their gold. */
export async function claimRenown(game: Game): Promise<{ heeds: number; gold: number } | null> {
  if (!online.mayBeSignedIn) return null;
  const r = await online.claimRenown().catch(() => null);
  if (!r || r.heeds <= 0) return null;
  game.state.gold += r.gold;
  return r;
}
