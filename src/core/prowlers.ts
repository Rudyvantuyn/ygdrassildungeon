import type { FloorDef } from './data/floors';
import { DX, DY, tileAt, type FloorMap } from './dungeon';

export interface ProwlerState {
  x: number;
  y: number;
  /** Index in the route of the cell it is walking towards. */
  target: number;
  /** Steps left before it can move again (set after the party flees from it). */
  stun: number;
  defeated: boolean;
  chasing: boolean;
}

/** Prowlers only walk on plain floor, so they never block stairs, chests or springs. */
export function prowlerCanEnter(map: FloorMap, x: number, y: number): boolean {
  return tileAt(map, x, y) === 'floor';
}

export function initProwlers(def: FloorDef): ProwlerState[] {
  return def.prowlers.map((p) => ({
    x: p.route[0][0],
    y: p.route[0][1],
    target: p.route.length > 1 ? 1 : 0,
    stun: 0,
    defeated: false,
    chasing: false,
  }));
}

/**
 * Breadth-first search from `from` towards `to` over cells a prowler may enter
 * (the goal itself is always allowed, so it can reach the party).
 * Returns the first step and the path length, or null when unreachable.
 */
export function nextStep(
  map: FloorMap,
  from: { x: number; y: number },
  to: { x: number; y: number },
  blocked: Set<number>,
): { x: number; y: number; distance: number } | null {
  if (from.x === to.x && from.y === to.y) return { x: from.x, y: from.y, distance: 0 };
  const key = (x: number, y: number) => y * map.width + x;
  const goal = key(to.x, to.y);
  const first = new Map<number, number>();
  const dist = new Map<number, number>([[key(from.x, from.y), 0]]);
  const queue: number[] = [key(from.x, from.y)];
  while (queue.length) {
    const k = queue.shift()!;
    const x = k % map.width;
    const y = Math.floor(k / map.width);
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      const nk = key(nx, ny);
      if (dist.has(nk)) continue;
      if (nk !== goal && (!prowlerCanEnter(map, nx, ny) || blocked.has(nk))) continue;
      dist.set(nk, dist.get(k)! + 1);
      first.set(nk, k === key(from.x, from.y) ? nk : first.get(k)!);
      if (nk === goal) {
        const f = first.get(nk)!;
        return { x: f % map.width, y: Math.floor(f / map.width), distance: dist.get(nk)! };
      }
      queue.push(nk);
    }
  }
  return null;
}

/**
 * Moves every active prowler one step: hunters within range chase the party,
 * everyone else follows their patrol route. Returns the indices of hunters
 * that just started chasing.
 */
export function moveProwlers(map: FloorMap, def: FloorDef, states: ProwlerState[], party: { x: number; y: number }): number[] {
  const alerts: number[] = [];
  const key = (x: number, y: number) => y * map.width + x;
  states.forEach((p, i) => {
    if (p.defeated) return;
    if (p.stun > 0) {
      p.stun -= 1;
      return;
    }
    const others = new Set(states.filter((o, j) => j !== i && !o.defeated).map((o) => key(o.x, o.y)));
    const spec = def.prowlers[i];

    if (spec.hunt > 0) {
      const toParty = nextStep(map, p, party, others);
      const inRange = toParty !== null && toParty.distance <= spec.hunt;
      if (inRange && !p.chasing) alerts.push(i);
      p.chasing = inRange;
      if (inRange && toParty) {
        p.x = toParty.x;
        p.y = toParty.y;
        return;
      }
    }

    const [tx, ty] = spec.route[p.target];
    if (p.x === tx && p.y === ty) p.target = (p.target + 1) % spec.route.length;
    const [gx, gy] = spec.route[p.target];
    const step = nextStep(map, p, { x: gx, y: gy }, others);
    if (step) {
      p.x = step.x;
      p.y = step.y;
    }
  });
  return alerts;
}
