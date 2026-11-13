/**
 * The drafting table: floors drawn by hand, checked against the same rules as the
 * Rootdeep's own floors, and turned into a FloorDef the game can play.
 * Pure logic; the screen lives in ui/designer.ts.
 */
import { DX, DY } from './dungeon';
import { ENEMIES } from './data/enemies';
import type { FloorDef, Palette } from './data/floors';
import { DESIGN_FLOORS as FLOORS } from './data/marrowdeep';
import type { Dir } from './types';

export const DESIGN_VERSION = 1;
export const MIN_SIZE = 8;
export const MAX_SIZE = 30;
export const MAX_CHESTS = 6;
export const MAX_SPRINGS = 2;
export const MAX_GATHER = 6;
export const MAX_PROWLERS = 4;
export const MAX_ROUTE = 8;
export const NAME_MAX = 24;

/** The characters a design's rows are made of (the same legend as FloorDef). */
export type Cell = '#' | '.' | 'S' | '>' | 'T' | '~' | 'B' | 'P' | 'O' | 'W' | 'F' | LinkCell | GateCell;
/** Numbered stairs: the same number on two floors of a chapter joins them. */
export type LinkCell = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
/** A root gate that opens only from its north, east, south or west side. */
export type GateCell = 'n' | 'e' | 's' | 'w';
export const LINK_CELLS: LinkCell[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
export const GATE_CELLS: GateCell[] = ['n', 'e', 's', 'w'];
const CELLS = new Set<string>(['#', '.', 'S', '>', 'T', '~', 'B', 'P', 'O', 'W', 'F', ...LINK_CELLS, ...GATE_CELLS]);
export const isLink = (c: string): c is LinkCell => (LINK_CELLS as string[]).includes(c);
export const isGate = (c: string): c is GateCell => (GATE_CELLS as string[]).includes(c);
/** The most floors a chapter has. */
export const CHAPTER_FLOORS = 5;

export interface ProwlerDesign {
  enemy: string;
  route: [number, number][];
  /** Hunters chase the party within this many steps (0 = only patrols). */
  hunt: number;
}

export interface FloorDesign {
  version: number;
  name: string;
  rows: string[];
  theme: string;
  /** Index of the Rootdeep floor whose monsters, chests and pace this floor borrows. */
  monsters: number;
  boss: string | null;
  prowlers: ProwlerDesign[];
}

export interface ThemeDef {
  id: string;
  name: string;
  palette: Palette;
}

/** The looks a drawn floor can have: one per painted texture set in the Rootdeep. */
export const THEMES: ThemeDef[] = (() => {
  const names: Record<string, string> = {
    forest: 'Greenwood',
    frostwood: 'Frostwood',
    emberroot: 'Emberroot',
    tidewater: 'Tidewater',
    coral: 'Coral',
    abyss: 'Abyss',
    marrow: 'Marrowdeep',
  };
  const seen = new Map<string, ThemeDef>();
  for (const f of FLOORS) {
    const id = f.palette.textures;
    if (id && !seen.has(id)) seen.set(id, { id, name: names[id] ?? id, palette: f.palette });
  }
  return [...seen.values()];
})();

/** Bosses and prowlers that already live somewhere in the Rootdeep. */
export const BOSS_CHOICES: string[] = [...new Set(FLOORS.flatMap((f) => f.boss ?? []))];
export const PROWLER_CHOICES: string[] = [...new Set(FLOORS.flatMap((f) => f.prowlers.flatMap((p) => p.enemies)))];

export function blankDesign(width = 14, height = 12): FloorDesign {
  const rows = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? '#' : '.')).join(''),
  );
  rows[1] = '#S' + rows[1].slice(2);
  return { version: DESIGN_VERSION, name: 'My Floor', rows, theme: THEMES[0].id, monsters: 0, boss: null, prowlers: [] };
}

export function cellAt(d: FloorDesign, x: number, y: number): Cell {
  return (d.rows[y]?.[x] ?? '#') as Cell;
}

function isBorder(d: FloorDesign, x: number, y: number): boolean {
  return x <= 0 || y <= 0 || y >= d.rows.length - 1 || x >= d.rows[0].length - 1;
}

/**
 * Paints one cell. The border always stays wall, and the start, stairs and boss
 * exist at most once: placing one moves it. Returns whether anything changed.
 */
export function paint(d: FloorDesign, x: number, y: number, cell: Cell): boolean {
  if (isBorder(d, x, y) || cellAt(d, x, y) === cell) return false;
  if (cellAt(d, x, y) === 'S') return false; // the start can be moved, not erased
  if (cell === 'S' || cell === '>' || cell === 'B' || isLink(cell)) {
    d.rows = d.rows.map((row) => row.split(cell).join('.'));
  }
  const row = d.rows[y];
  d.rows[y] = row.slice(0, x) + cell + row.slice(x + 1);
  if (cell === '#' || cell === 'T') {
    // Prowlers cannot walk through walls or chests.
    for (const p of d.prowlers) p.route = p.route.filter(([rx, ry]) => rx !== x || ry !== y);
  }
  return true;
}

/** Changes the size, keeping what fits and walling the new edge. */
export function resize(d: FloorDesign, width: number, height: number): void {
  width = Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(width)));
  height = Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(height)));
  const old = d;
  const rows: string[] = [];
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const inside = y < old.rows.length - 1 && x < old.rows[0].length - 1;
      row += border ? '#' : inside ? cellAt(old, x, y) : '.';
    }
    rows.push(row);
  }
  d.rows = rows;
  if (!d.rows.some((r) => r.includes('S'))) d.rows[1] = '#S' + d.rows[1].slice(2);
  for (const p of d.prowlers) p.route = p.route.filter(([x, y]) => !isBorder(d, x, y));
}

function passable(d: FloorDesign, x: number, y: number): boolean {
  const c = cellAt(d, x, y);
  return c !== '#' && c !== 'T' && !isGate(c);
}

/** Cells reachable from `from` without entering `avoid`. */
function reach(d: FloorDesign, from: [number, number], avoid: Set<string> = new Set()): Set<string> {
  const key = (x: number, y: number) => `${x},${y}`;
  const seen = new Set([key(...from)]);
  const queue = [from];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (let dir = 0; dir < 4; dir++) {
      const nx = x + DX[dir];
      const ny = y + DY[dir];
      const k = key(nx, ny);
      if (seen.has(k) || avoid.has(k) || !passable(d, nx, ny)) continue;
      seen.add(k);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

/** The cells a prowler walks on: shortest paths between its route points, looping. */
export function patrolCells(d: FloorDesign, p: ProwlerDesign): Set<string> {
  const cells = new Set(p.route.map(([x, y]) => `${x},${y}`));
  for (let i = 0; i < p.route.length && p.route.length > 1; i++) {
    const from = p.route[i];
    const to = p.route[(i + 1) % p.route.length];
    const prev = new Map<string, string>();
    const start = `${from[0]},${from[1]}`;
    const goal = `${to[0]},${to[1]}`;
    const queue = [from];
    const seen = new Set([start]);
    while (queue.length) {
      const [x, y] = queue.shift()!;
      if (`${x},${y}` === goal) break;
      for (let dir = 0; dir < 4; dir++) {
        const nx = x + DX[dir];
        const ny = y + DY[dir];
        const k = `${nx},${ny}`;
        if (seen.has(k) || !passable(d, nx, ny)) continue;
        seen.add(k);
        prev.set(k, `${x},${y}`);
        queue.push([nx, ny]);
      }
    }
    for (let k = goal; prev.has(k); k = prev.get(k)!) cells.add(k);
  }
  return cells;
}

function find(d: FloorDesign, cell: Cell): [number, number][] {
  const out: [number, number][] = [];
  d.rows.forEach((row, y) => [...row].forEach((c, x) => c === cell && out.push([x, y])));
  return out;
}

/** Everything that keeps this design from being played, in plain words. Empty means it is ready. */
/**
 * `role` says where the floor sits in a chapter: only the first floor has the entrance (S), only the last the
 * stairs on to the next chapter; reachability across the floors is checked by chapterProblems().
 */
export function problems(d: FloorDesign, role: { index: number; count: number } = { index: 0, count: 1 }): string[] {
  const inChapter = role.count > 1;
  const out: string[] = [];
  const h = d.rows.length;
  const w = d.rows[0]?.length ?? 0;
  if (!d.name.trim()) out.push('Give the floor a name.');
  if (h < MIN_SIZE || h > MAX_SIZE || w < MIN_SIZE || w > MAX_SIZE || d.rows.some((r) => r.length !== w)) {
    out.push(`The floor must be a rectangle between ${MIN_SIZE} and ${MAX_SIZE} cells on each side.`);
    return out;
  }
  if (d.rows.some((r) => [...r].some((c) => !CELLS.has(c)))) out.push('The floor contains unknown cells.');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (isBorder(d, x, y) && cellAt(d, x, y) !== '#') out.push('The outer edge must be wall.');
  if (!THEMES.some((t) => t.id === d.theme)) out.push('Choose a look for the floor.');
  if (!FLOORS[d.monsters]) out.push('Choose which monsters live here.');

  const starts = find(d, 'S');
  const stairs = find(d, '>');
  const bossCells = find(d, 'B');
  if (inChapter) {
    if (role.index === 0 && starts.length !== 1) out.push('Place exactly one entrance (the stairs up to town) on the first floor.');
    if (role.index > 0 && starts.length) out.push('Only the first floor has the entrance: link this floor with numbered stairs.');
    if (stairs.length && role.index !== role.count - 1) out.push('Stairs on to the next chapter belong on the last floor; use numbered stairs between floors.');
    if (role.index === role.count - 1 && !bossCells.length) out.push('A chapter ends with a guardian: place the boss sigil on the last floor.');
  } else {
    if (LINK_CELLS.some((c) => find(d, c).length)) out.push('Numbered stairs only work in a chapter of two floors or more.');
    if (starts.length !== 1) {
      out.push('Place exactly one start (the stairs up).');
      return [...new Set(out)];
    }
    if (stairs.length + bossCells.length === 0) out.push('Give the floor a goal: stairs down, a boss, or both.');
  }
  if (bossCells.length && !d.boss) out.push('Choose which boss waits on the boss sigil.');
  if (d.boss && !bossCells.length) out.push('Place the boss sigil, or choose no boss.');
  if (d.boss && !BOSS_CHOICES.includes(d.boss)) out.push('That boss does not exist.');
  if (find(d, 'T').length > MAX_CHESTS) out.push(`At most ${MAX_CHESTS} chests per floor.`);
  if (find(d, '~').length > MAX_SPRINGS) out.push(`At most ${MAX_SPRINGS} springs per floor.`);
  if ((['P', 'O', 'W', 'F'] as Cell[]).reduce((n, c) => n + find(d, c).length, 0) > MAX_GATHER) out.push(`At most ${MAX_GATHER} gathering spots per floor.`);

  // In a chapter, reachability and the way around prowlers are checked over all floors at once.
  if (inChapter || !starts.length) {
    if (d.prowlers.length > MAX_PROWLERS) out.push(`At most ${MAX_PROWLERS} prowlers per floor.`);
    d.prowlers.forEach((p, i) => {
      const label = ENEMIES[p.enemy]?.name ?? `Prowler ${i + 1}`;
      if (!PROWLER_CHOICES.includes(p.enemy)) out.push(`Prowler ${i + 1} is not a known prowler.`);
      if (!p.route.length) out.push(`Give the ${label} a patrol route.`);
      if (p.route.length > MAX_ROUTE) out.push(`The ${label}'s route has more than ${MAX_ROUTE} points.`);
      if (p.route.some(([x, y]) => cellAt(d, x, y) !== '.')) out.push(`The ${label}'s route must be on plain floor.`);
    });
    return [...new Set(out)];
  }
  const reachable = reach(d, starts[0]);
  let stranded = 0;
  d.rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === '#') return;
      if (c === 'T') {
        if (![0, 1, 2, 3].some((dir) => reachable.has(`${x + DX[dir]},${y + DY[dir]}`))) out.push(`The chest at ${x},${y} cannot be reached.`);
      } else if (!reachable.has(`${x},${y}`)) stranded++;
    }),
  );
  if (stranded) out.push(`${stranded} open ${stranded === 1 ? 'cell cannot' : 'cells cannot'} be reached from the start (chests block the way).`);

  if (d.prowlers.length > MAX_PROWLERS) out.push(`At most ${MAX_PROWLERS} prowlers per floor.`);
  d.prowlers.forEach((p, i) => {
    const label = ENEMIES[p.enemy]?.name ?? `Prowler ${i + 1}`;
    if (!PROWLER_CHOICES.includes(p.enemy)) out.push(`Prowler ${i + 1} is not a known prowler.`);
    if (!p.route.length) out.push(`Give the ${label} a patrol route.`);
    if (p.route.length > MAX_ROUTE) out.push(`The ${label}'s route has more than ${MAX_ROUTE} points.`);
    if (p.route.some(([x, y]) => cellAt(d, x, y) !== '.' || !reachable.has(`${x},${y}`))) out.push(`The ${label}'s route must be on plain, reachable floor.`);
  });
  // House rule: every prowler floor has a way around them.
  if (d.prowlers.length && !out.some((p) => p.includes('route'))) {
    const avoid = new Set(d.prowlers.flatMap((p) => [...patrolCells(d, p)]));
    const safe = reach(d, starts[0], avoid);
    for (const [x, y] of [...stairs, ...bossCells]) {
      if (!safe.has(`${x},${y}`)) out.push(`There must be a way to the ${cellAt(d, x, y) === '>' ? 'stairs' : 'boss'} that avoids every prowler's patrol.`);
    }
  }
  return [...new Set(out)];
}

/** The first open direction around the start, so the party does not begin facing a wall. */
function startDir(d: FloorDesign): Dir {
  const start = find(d, 'S')[0];
  if (!start) return 1;
  const [x, y] = start;
  for (const dir of [1, 2, 0, 3] as Dir[]) if (passable(d, x + DX[dir], y + DY[dir])) return dir;
  return 1;
}

/** The playable floor. Call only when problems() is empty. */
export function toFloorDef(d: FloorDesign): FloorDef {
  const src = FLOORS[d.monsters];
  const chestCount = find(d, 'T').length;
  return {
    name: d.name.trim(),
    rows: [...d.rows],
    startDir: startDir(d),
    encounterSteps: src.encounterSteps,
    encounters: src.encounters,
    chests: Array.from({ length: chestCount }, (_, i) => src.chests[i % src.chests.length]),
    boss: d.boss ? [d.boss] : undefined,
    prowlers: d.prowlers.map((p) => ({ enemies: [p.enemy], route: p.route.map(([x, y]) => [x, y] as [number, number]), hunt: p.hunt })),
    palette: THEMES.find((t) => t.id === d.theme)!.palette,
    depth: d.monsters,
  };
}

// ── Share codes ──────────────────────────────────────────────────────────────

const PREFIX = 'YGF1.';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = Math.min(4, Math.ceil(((bytes.length - i) * 8) / 6));
    for (let j = 0; j < chars; j++) out += B64[(n >> (18 - 6 * j)) & 63];
  }
  return out;
}

function fromBase64(text: string): Uint8Array {
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of text) {
    const v = B64.indexOf(ch);
    if (v < 0) throw new Error('bad code');
    value = (value << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 255);
    }
  }
  return new Uint8Array(bytes);
}

/** A short text that holds the whole design, to share or to send to the game's makers. */
export function encodeDesign(d: FloorDesign): string {
  const json = JSON.stringify({ v: d.version, n: d.name, r: d.rows, t: d.theme, m: d.monsters, b: d.boss, p: d.prowlers.map((p) => [p.enemy, p.hunt, p.route]) });
  return PREFIX + toBase64(new TextEncoder().encode(json));
}

/** Reads a share code back; null if it is not a valid one. */
export function decodeDesign(code: string): FloorDesign | null {
  const text = code.trim().replace(/\s+/g, '');
  if (!text.startsWith(PREFIX)) return null;
  try {
    const raw = JSON.parse(new TextDecoder().decode(fromBase64(text.slice(PREFIX.length))));
    if (raw.v !== DESIGN_VERSION || !Array.isArray(raw.r) || !raw.r.every((r: unknown) => typeof r === 'string')) return null;
    const design: FloorDesign = {
      version: DESIGN_VERSION,
      name: String(raw.n ?? '').slice(0, NAME_MAX),
      rows: raw.r,
      theme: String(raw.t),
      monsters: Number(raw.m) || 0,
      boss: typeof raw.b === 'string' ? raw.b : null,
      prowlers: (Array.isArray(raw.p) ? raw.p : []).slice(0, MAX_PROWLERS).map((p: unknown) => {
        const [enemy, hunt, route] = p as [unknown, unknown, unknown];
        return {
          enemy: String(enemy),
          hunt: Math.max(0, Math.min(4, Number(hunt) || 0)),
          route: (Array.isArray(route) ? route : []).slice(0, MAX_ROUTE).map((c: unknown) => [Number((c as number[])[0]) | 0, Number((c as number[])[1]) | 0] as [number, number]),
        };
      }),
    };
    if (design.rows.length < MIN_SIZE || design.rows.length > MAX_SIZE) return null;
    return design;
  } catch {
    return null;
  }
}

// ── Chapters ─────────────────────────────────────────────────────────────────

/** A chapter: up to five floors drawn together, joined by numbered stairs, with root-gate shortcuts. */
export interface ChapterDesign {
  version: number;
  name: string;
  floors: FloorDesign[];
}

export const CHAPTER_VERSION = 2;
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export function blankChapter(): ChapterDesign {
  return { version: CHAPTER_VERSION, name: 'My Chapter', floors: [blankDesign()] };
}

/** A new floor for the chapter: walled, with no entrance of its own (it is reached by numbered stairs). */
export function blankChapterFloor(like: FloorDesign): FloorDesign {
  const d = blankDesign(like.rows[0].length, like.rows.length);
  d.rows = d.rows.map((row) => row.replace('S', '.'));
  d.theme = like.theme;
  d.monsters = like.monsters;
  return d;
}

/**
 * Places numbered stairs `id` at (x, y) on floor `from` and on floor `to`, on the same square (stairs go
 * straight up or down). Any earlier stairs with that number are removed first. Returns false if a square is
 * on the border.
 */
export function placeLink(c: ChapterDesign, id: LinkCell, from: number, to: number, x: number, y: number): boolean {
  if (from === to || !c.floors[from] || !c.floors[to]) return false;
  if (isBorder(c.floors[from], x, y) || isBorder(c.floors[to], x, y)) return false;
  removeLink(c, id);
  paint(c.floors[from], x, y, id);
  paint(c.floors[to], x, y, id);
  return true;
}

/** Removes numbered stairs `id` from every floor. */
export function removeLink(c: ChapterDesign, id: LinkCell): void {
  for (const d of c.floors) d.rows = d.rows.map((row) => row.split(id).join('.'));
}

/** Resizes every floor of the chapter alike, so stairs keep lining up. */
export function resizeChapter(c: ChapterDesign, width: number, height: number): void {
  for (const d of c.floors) resize(d, width, height);
  // A floor without its own entrance must not get one from resize().
  c.floors.forEach((d, i) => {
    if (i > 0 && c.floors.length > 1) d.rows = d.rows.map((row) => row.replace('S', '.'));
  });
}

/** The floor names a chapter gets in the game: "Name I", "Name II", … */
export function floorName(c: ChapterDesign, i: number): string {
  return `${c.name.trim() || 'My Chapter'} ${ROMAN[i] ?? i + 1}`;
}

/** Gate character → the side it opens from (0 north, 1 east, 2 south, 3 west). */
const GATE_DIRS: Record<GateCell, number> = { n: 0, e: 1, s: 2, w: 3 };

type Spot = [number, number, number]; // floor, x, y

/**
 * Where the party can walk from the entrance on the first floor, over all floors: numbered stairs join floors,
 * root gates can only be passed coming from their opening side (the first time through), and cells in
 * `avoid` (per floor) are never entered.
 */
function chapterReach(c: ChapterDesign, avoid: Set<string>[] = []): Set<string> {
  const key = (f: number, x: number, y: number) => `${f}:${x},${y}`;
  const start = find(c.floors[0], 'S')[0];
  if (!start) return new Set();
  const partner = new Map<string, Spot>();
  for (const id of LINK_CELLS) {
    const ends: Spot[] = [];
    c.floors.forEach((d, f) => find(d, id).forEach(([x, y]) => ends.push([f, x, y])));
    if (ends.length === 2 && ends[0][0] !== ends[1][0]) {
      partner.set(key(...ends[0]), ends[1]);
      partner.set(key(...ends[1]), ends[0]);
    }
  }
  const seen = new Set([key(0, ...start)]);
  const queue: Spot[] = [[0, ...start]];
  const visit = (n: Spot) => {
    const k = key(...n);
    if (seen.has(k) || avoid[n[0]]?.has(`${n[1]},${n[2]}`)) return;
    seen.add(k);
    queue.push(n);
  };
  while (queue.length) {
    const [f, x, y] = queue.shift()!;
    const jump = partner.get(key(f, x, y));
    if (jump) visit(jump);
    for (let dir = 0; dir < 4; dir++) {
      const nx = x + DX[dir];
      const ny = y + DY[dir];
      const next = cellAt(c.floors[f], nx, ny);
      if (next === '#' || next === 'T') continue;
      // A gate opens only for someone standing on its opening side, i.e. stepping in from there.
      if (isGate(next) && GATE_DIRS[next] !== (dir + 2) % 4) continue;
      visit([f, nx, ny]);
    }
  }
  return seen;
}

/** Everything that keeps the chapter from being played. Empty means it is ready. */
export function chapterProblems(c: ChapterDesign): string[] {
  const out: string[] = [];
  const n = c.floors.length;
  if (!c.name.trim()) out.push('Give the chapter a name.');
  if (n < 1 || n > CHAPTER_FLOORS) out.push(`A chapter has 1 to ${CHAPTER_FLOORS} floors.`);
  if (n === 1) return [...out, ...problems({ ...c.floors[0], name: c.name || c.floors[0].name })];
  c.floors.forEach((d, i) => {
    for (const p of problems({ ...d, name: floorName(c, i) }, { index: i, count: n })) out.push(`Floor ${i + 1}: ${p}`);
  });
  if (out.length) return [...new Set(out)];

  const w = c.floors[0].rows[0].length;
  const h = c.floors[0].rows.length;
  if (c.floors.some((d) => d.rows.length !== h || d.rows[0].length !== w)) return ['All floors of a chapter must be the same size.'];
  for (const id of LINK_CELLS) {
    const ends = c.floors.flatMap((d, f) => find(d, id).map(([x, y]) => ({ f, x, y })));
    if (!ends.length) continue;
    if (ends.length !== 2 || ends[0].f === ends[1].f) out.push(`Stairs ${id} must appear once on exactly two different floors.`);
    else if (ends[0].x !== ends[1].x || ends[0].y !== ends[1].y) out.push(`Stairs ${id} must sit on the same square on both floors.`);
  }
  if (out.length) return out;

  const reachable = chapterReach(c);
  c.floors.forEach((d, f) => {
    let stranded = 0;
    d.rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '#') return;
        if (ch === 'T') {
          if (![0, 1, 2, 3].some((dir) => reachable.has(`${f}:${x + DX[dir]},${y + DY[dir]}`))) out.push(`Floor ${f + 1}: the chest at ${x},${y} cannot be reached.`);
        } else if (!reachable.has(`${f}:${x},${y}`)) stranded++;
      }),
    );
    if (stranded) out.push(`Floor ${f + 1}: ${stranded} open ${stranded === 1 ? 'cell cannot' : 'cells cannot'} be reached from the entrance.`);
  });
  // House rule: there is always a way to the guardian that avoids every prowler.
  const last = n - 1;
  const boss = find(c.floors[last], 'B')[0];
  if (boss && !reachable.has(`${last}:${boss[0]},${boss[1]}`)) out.push('The guardian on the last floor cannot be reached from the entrance.');
  else if (boss) {
    const avoid = c.floors.map((d) => new Set(d.prowlers.flatMap((p) => [...patrolCells(d, p)])));
    if (!chapterReach(c, avoid).has(`${last}:${boss[0]},${boss[1]}`)) out.push("There must be a way to the guardian that avoids every prowler's patrol.");
  }
  return [...new Set(out)];
}

/** The playable floors of the chapter. Call only when chapterProblems() is empty. */
export function toFloorDefs(c: ChapterDesign): FloorDef[] {
  return c.floors.map((d, i) => ({ ...toFloorDef(d), name: c.floors.length === 1 ? c.name.trim() || d.name : floorName(c, i) }));
}

/** A chapter of the Rootdeep as a design (floors `first`..`first`+4), to look at or learn from at the drafting table. */
export function rootdeepChapter(first: number, name: string): ChapterDesign {
  const floors = FLOORS.slice(first, first + CHAPTER_FLOORS).map((f, i): FloorDesign => ({
    version: DESIGN_VERSION,
    name: f.name,
    rows: [...f.rows],
    theme: f.palette.textures ?? THEMES[0].id,
    monsters: first + i,
    boss: f.boss?.[0] ?? null,
    prowlers: f.prowlers.map((p) => ({ enemy: p.enemies[0], route: p.route.map(([x, y]) => [x, y] as [number, number]), hunt: p.hunt })),
  }));
  return { version: CHAPTER_VERSION, name, floors };
}

/**
 * Where chapter III begins: five empty floors of one size, with the Marrowdeep's look, monsters and guardians
 * already chosen (the Ribwarden on the third floor, Hrungnir on the fifth). Only the first floor has an entrance.
 */
export function marrowdeepTemplate(width = 20, height = 16): ChapterDesign {
  const first = blankDesign(width, height);
  first.theme = 'marrow';
  first.monsters = 10;
  const floors = [first, ...[1, 2, 3, 4].map((i) => ({ ...blankChapterFloor(first), monsters: 10 + i }))];
  floors[2].boss = 'ribwarden';
  floors[4].boss = 'hrungnir';
  return { version: CHAPTER_VERSION, name: 'The Marrowdeep', floors };
}

const CHAPTER_PREFIX = 'YGC1.';

/** A short text that holds the whole chapter, to share or to send to the game's makers. */
export function encodeChapter(c: ChapterDesign): string {
  const floor = (d: FloorDesign) => ({ r: d.rows, t: d.theme, m: d.monsters, b: d.boss, p: d.prowlers.map((p) => [p.enemy, p.hunt, p.route]) });
  const json = JSON.stringify({ v: c.version, n: c.name, f: c.floors.map(floor) });
  return CHAPTER_PREFIX + toBase64(new TextEncoder().encode(json));
}

/** Reads a chapter code (or an older single-floor code) back; null if it is not a valid one. */
export function decodeChapter(code: string): ChapterDesign | null {
  const text = code.trim().replace(/\s+/g, '');
  if (text.startsWith(PREFIX)) {
    const d = decodeDesign(text);
    return d ? { version: CHAPTER_VERSION, name: d.name, floors: [d] } : null;
  }
  if (!text.startsWith(CHAPTER_PREFIX)) return null;
  try {
    const raw = JSON.parse(new TextDecoder().decode(fromBase64(text.slice(CHAPTER_PREFIX.length))));
    if (raw.v !== CHAPTER_VERSION || !Array.isArray(raw.f) || !raw.f.length || raw.f.length > CHAPTER_FLOORS) return null;
    const floors: FloorDesign[] = [];
    for (const f of raw.f) {
      const prowlers = (Array.isArray(f.p) ? f.p : []).map((p: [string, number, [number, number][]]) => ({ enemy: p[0], hunt: p[1], route: p[2] }));
      const d = decodeDesign(encodeDesign({ version: DESIGN_VERSION, name: String(raw.n ?? ''), rows: f.r, theme: f.t, monsters: f.m, boss: f.b, prowlers }));
      if (!d) return null;
      floors.push(d);
    }
    return { version: CHAPTER_VERSION, name: String(raw.n ?? '').slice(0, NAME_MAX), floors };
  } catch {
    return null;
  }
}
