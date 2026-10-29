import type { FloorDef } from './data/floors';
import type { Dir } from './types';

export type Tile = 'wall' | 'floor' | 'up' | 'stairs' | 'chest' | 'spring' | 'boss';

export interface FloorMap {
  width: number;
  height: number;
  tiles: Tile[];
  start: { x: number; y: number; dir: Dir };
  /** Chest positions in reading order; index matches FloorDef.chests. */
  chests: { x: number; y: number }[];
}

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
};

export function parseFloor(def: FloorDef): FloorMap {
  const height = def.rows.length;
  const width = def.rows[0].length;
  const tiles: Tile[] = [];
  const chests: { x: number; y: number }[] = [];
  let start: { x: number; y: number; dir: Dir } | null = null;

  def.rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`${def.name}: row ${y} has length ${row.length}, expected ${width}`);
    [...row].forEach((ch, x) => {
      const tile = LEGEND[ch];
      if (!tile) throw new Error(`${def.name}: unknown map character "${ch}" at ${x},${y}`);
      if (ch === 'S') start = { x, y, dir: def.startDir };
      if (tile === 'chest') chests.push({ x, y });
      tiles.push(tile);
    });
  });

  if (!start) throw new Error(`${def.name}: map has no start (S)`);
  return { width, height, tiles, start, chests };
}

export function tileAt(map: FloorMap, x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return 'wall';
  return map.tiles[y * map.width + x];
}

/** Walls and chests block movement; chests are opened from the cell in front of them. */
export function isPassable(map: FloorMap, x: number, y: number): boolean {
  const tile = tileAt(map, x, y);
  return tile !== 'wall' && tile !== 'chest';
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
