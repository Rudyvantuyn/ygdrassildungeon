import type { FloorDef } from './data/floors';
import type { GatherKind } from './data/gathering';
import type { Dir } from './types';

/**
 * `link`: numbered stairs joining two floors of a chapter (the cell with the same number on the other floor).
 * `gate`: a root gate that opens only from one side and then stays open (`gateOpen`) — a shortcut.
 */
export type Tile = 'wall' | 'floor' | 'up' | 'stairs' | 'chest' | 'spring' | 'boss' | 'link' | 'gate' | 'gateOpen' | GatherKind;

export interface FloorMap {
  width: number;
  height: number;
  tiles: Tile[];
  start: { x: number; y: number; dir: Dir };
  /** Chest positions in reading order; index matches FloorDef.chests. */
  chests: { x: number; y: number }[];
  /** Linked stairs: cell index → link number ('1'–'9'). */
  links: Record<number, string>;
  /** Root gates: cell index → the side (direction from the gate) the party must stand on to open it. */
  gates: Record<number, Dir>;
}

/** Gate characters: the side it opens from (n = from the north, …). */
export const GATE_SIDES: Record<string, Dir> = { n: 0, e: 1, s: 2, w: 3 };

export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;
export const DIR_NAMES = ['N', 'E', 'S', 'W'] as const;

const LEGEND: Record<string, Tile> = {
  '#': 'wall',
  '.': 'floor',
  S: 'up',
  '>': 'stairs',
  T: 'chest',
  '~': 'spring',
  B: 'boss',
  P: 'forage',
  O: 'mine',
  W: 'fell',
  F: 'fish',
  n: 'gate',
  e: 'gate',
  s: 'gate',
  w: 'gate',
  ...Object.fromEntries('123456789'.split('').map((d) => [d, 'link' as Tile])),
};

export function isGatherTile(tile: Tile): tile is GatherKind {
  return tile === 'forage' || tile === 'mine' || tile === 'fell' || tile === 'fish';
}

export function parseFloor(def: FloorDef): FloorMap {
  const height = def.rows.length;
  const width = def.rows[0].length;
  const tiles: Tile[] = [];
  const chests: { x: number; y: number }[] = [];
  const links: Record<number, string> = {};
  const gates: Record<number, Dir> = {};
  let firstOpen: { x: number; y: number } | null = null;
  let start: { x: number; y: number; dir: Dir } | null = null;

  def.rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`${def.name}: row ${y} has length ${row.length}, expected ${width}`);
    [...row].forEach((ch, x) => {
      const tile = LEGEND[ch];
      if (!tile) throw new Error(`${def.name}: unknown map character "${ch}" at ${x},${y}`);
      if (ch === 'S') start = { x, y, dir: def.startDir };
      if (tile === 'chest') chests.push({ x, y });
      if (tile === 'link') links[y * width + x] = ch;
      if (tile === 'gate') gates[y * width + x] = GATE_SIDES[ch];
      if (!firstOpen && tile === 'floor') firstOpen = { x, y };
      tiles.push(tile);
    });
  });

  // Inner floors of a drawn chapter have no start of their own: they are reached by linked stairs.
  if (!start && Object.keys(links).length && firstOpen) start = { ...(firstOpen as { x: number; y: number }), dir: def.startDir };
  if (!start) throw new Error(`${def.name}: map has no start (S)`);
  return { width, height, tiles, start, chests, links, gates };
}

export function tileAt(map: FloorMap, x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return 'wall';
  return map.tiles[y * map.width + x];
}

/** Walls, chests and closed gates block movement; chests and gates are opened from the cell in front of them. */
export function isPassable(map: FloorMap, x: number, y: number): boolean {
  const tile = tileAt(map, x, y);
  return tile !== 'wall' && tile !== 'chest' && tile !== 'gate';
}

export function turnDir(dir: Dir, delta: number): Dir {
  return (((dir + delta) % 4) + 4) % 4 as Dir;
}

/** Cell `forward` steps ahead and `right` steps to the right of (x, y) when facing `dir`. */
export function relCell(x: number, y: number, dir: Dir, forward: number, right: number): { x: number; y: number } {
  const r = turnDir(dir, 1);
  return {
    x: x + DX[dir] * forward + DX[r] * right,
    y: y + DY[dir] * forward + DY[r] * right,
  };
}
