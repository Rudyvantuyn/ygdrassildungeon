/**
 * The drafting table: floors drawn by hand, checked against the same rules as the
 * Rootdeep's own floors, and turned into a FloorDef the game can play.
 * Pure logic; the screen lives in ui/designer.ts.
 */
import { DX, DY } from './dungeon';
import { ENEMIES } from './data/enemies';
import { FLOORS, type FloorDef, type Palette } from './data/floors';
import type { Dir } from './types';

export const DESIGN_VERSION = 1;
export const MIN_SIZE = 8;
export const MAX_SIZE = 30;
export const MAX_CHESTS = 6;
export const MAX_SPRINGS = 2;
export const MAX_PROWLERS = 4;
export const MAX_ROUTE = 8;
export const NAME_MAX = 24;

/** The characters a design's rows are made of (the same legend as FloorDef). */
export type Cell = '#' | '.' | 'S' | '>' | 'T' | '~' | 'B';
const CELLS = new Set<string>(['#', '.', 'S', '>', 'T', '~', 'B']);

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
  if (cell === 'S' || cell === '>' || cell === 'B') {
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
  return c !== '#' && c !== 'T';
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
export function problems(d: FloorDesign): string[] {
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
  if (starts.length !== 1) {
    out.push('Place exactly one start (the stairs up).');
    return [...new Set(out)];
  }
  const stairs = find(d, '>');
  const bossCells = find(d, 'B');
  if (stairs.length + bossCells.length === 0) out.push('Give the floor a goal: stairs down, a boss, or both.');
  if (bossCells.length && !d.boss) out.push('Choose which boss waits on the boss sigil.');
  if (d.boss && !bossCells.length) out.push('Place the boss sigil, or choose no boss.');
  if (d.boss && !BOSS_CHOICES.includes(d.boss)) out.push('That boss does not exist.');
  if (find(d, 'T').length > MAX_CHESTS) out.push(`At most ${MAX_CHESTS} chests per floor.`);
  if (find(d, '~').length > MAX_SPRINGS) out.push(`At most ${MAX_SPRINGS} springs per floor.`);

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
    if (p.route.some(([x, y]) => !reachable.has(`${x},${y}`))) out.push(`The ${label}'s route must be on open, reachable floor.`);
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
  const [[x, y]] = find(d, 'S');
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
