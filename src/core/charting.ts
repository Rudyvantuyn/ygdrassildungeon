/**
 * Sigrid's maps: Lindholm's warden buys a map of every floor the party has walked nearly all of, once per floor,
 * paid on coming home. Mapping is the heart of a crawler; this makes walking a floor to its corners worth it.
 */
import { FLOORS } from './data/floors';
import { isPassable, parseFloor, type FloorMap } from './dungeon';
import type { Game } from './game';

/** Share of a floor's open squares the party must have seen before Sigrid buys its map. */
export const MAP_SHARE = 0.9;

const maps = new Map<number, FloorMap>();
function mapOf(floor: number): FloorMap {
  let m = maps.get(floor);
  if (!m) maps.set(floor, (m = parseFloor(FLOORS[floor])));
  return m;
}

/** Share (0–1) of a floor's open squares the party has seen. */
export function mapped(game: Game, floor: number): number {
  const explored = game.state.progress[floor]?.explored;
  if (!explored || !FLOORS[floor]) return 0;
  const m = mapOf(floor);
  let open = 0;
  let seen = 0;
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      if (!isPassable(m, x, y)) continue;
      open++;
      if (explored[y * m.width + x] === '1') seen++;
    }
  }
  return open ? seen / open : 0;
}

/**
 * What Sigrid pays for a floor's map: about half a request from the Notice Board at that depth.
 * Points along the way, straight lines between them.
 */
const PAY: [floor: number, gold: number][] = [[0, 60], [5, 500], [10, 3500], [15, 7500], [20, 13000], [25, 22000], [29, 30000]];
export function mapPrice(floor: number): number {
  for (let i = 1; i < PAY.length; i++) {
    const [f1, g1] = PAY[i];
    const [f0, g0] = PAY[i - 1];
    if (floor <= f1) return Math.round((g0 + ((g1 - g0) * (floor - f0)) / (f1 - f0)) / 10) * 10;
  }
  return PAY[PAY.length - 1][1];
}

/** Floors whose map Sigrid would buy now (walked far enough, not sold yet). Only in the party's own game. */
export function mapsToSell(game: Game): number[] {
  const s = game.state;
  if (s.expedition || game.floors !== FLOORS) return [];
  const sold = s.mapsSold ?? [];
  return FLOORS.map((_, f) => f).filter((f) => f <= s.deepest && !sold.includes(f) && mapped(game, f) >= MAP_SHARE);
}

/** Sells every map that is ready: returns the floors and the gold paid. */
export function sellMaps(game: Game): { floors: number[]; gold: number } {
  const floors = mapsToSell(game);
  const gold = floors.reduce((sum, f) => sum + mapPrice(f), 0);
  if (!floors.length) return { floors, gold };
  game.state.mapsSold = [...(game.state.mapsSold ?? []), ...floors];
  game.state.gold += gold;
  return { floors, gold };
}
