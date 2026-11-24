import { describe, expect, it } from 'vitest';
import { MAP_SHARE, mapPrice, mapped, mapsToSell, sellMaps } from './charting';
import { FLOORS } from './data/floors';
import { DX, DY, isPassable, parseFloor, tileAt } from './dungeon';
import { Game } from './game';

describe("Sigrid's maps", () => {
  it('every floor can be walked far enough for its map: the open squares nobody can reach stay under a tenth', () => {
    for (const def of FLOORS) {
      const m = parseFloor(def);
      // Squares reachable from any way in (the start, stairs either way, linked stairs), with root gates opened.
      const open = (x: number, y: number) => isPassable(m, x, y) || tileAt(m, x, y) === 'gate';
      const seen = new Set<number>();
      const queue: number[] = [];
      m.tiles.forEach((t, i) => {
        if (t === 'up' || t === 'stairs' || m.links[i] !== undefined || i === m.start.y * m.width + m.start.x) queue.push(i);
      });
      for (const i of queue) seen.add(i);
      while (queue.length) {
        const i = queue.pop()!;
        const x = i % m.width;
        const y = Math.floor(i / m.width);
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d];
          const ny = y + DY[d];
          const n = ny * m.width + nx;
          if (nx < 0 || ny < 0 || nx >= m.width || ny >= m.height || seen.has(n) || !open(nx, ny)) continue;
          seen.add(n);
          queue.push(n);
        }
      }
      let total = 0;
      let reach = 0;
      for (let i = 0; i < m.tiles.length; i++) {
        const x = i % m.width;
        const y = Math.floor(i / m.width);
        if (!isPassable(m, x, y)) continue;
        total++;
        if (seen.has(i)) reach++;
      }
      expect(reach / total, def.name).toBeGreaterThanOrEqual(MAP_SHARE + 0.05);
    }
  });

  it('pays more the deeper the floor, and about half a request at that depth', () => {
    for (let f = 1; f < FLOORS.length; f++) expect(mapPrice(f)).toBeGreaterThan(mapPrice(f - 1));
    expect(mapPrice(0)).toBe(60);
    expect(mapPrice(10)).toBe(3500);
  });

  it('buys a walked floor once, and only once it is nearly all seen', () => {
    const game = Game.newGame(1);
    const p = game.state.progress[0];
    const half = Math.floor(p.explored.length / 2);
    p.explored = '1'.repeat(half) + '0'.repeat(p.explored.length - half);
    expect(mapped(game, 0)).toBeLessThan(MAP_SHARE);
    expect(mapsToSell(game)).toEqual([]);
    p.explored = '1'.repeat(p.explored.length);
    expect(mapped(game, 0)).toBe(1);
    const gold = game.state.gold;
    expect(sellMaps(game)).toEqual({ floors: [0], gold: 60 });
    expect(game.state.gold).toBe(gold + 60);
    expect(sellMaps(game).floors).toEqual([]);
  });

  it('a save from before counts the earlier chapters as sold, so a deep party is not paid for all at once', () => {
    const game = Game.newGame(1);
    const state = structuredClone(game.state);
    delete state.mapsSold;
    state.deepest = 12;
    const loaded = Game.fromState(state);
    expect(loaded.state.mapsSold).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
