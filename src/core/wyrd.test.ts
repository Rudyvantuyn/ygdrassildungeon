import { describe, expect, it } from 'vitest';
import { EQUIPMENT } from './data/equipment';
import { parseFloor, isPassable } from './dungeon';
import { Game } from './game';
import { canHoldStone } from './runestones';
import {
  DAY_MS,
  WYRD_COSTS,
  WYRD_GEAR,
  WYRD_OPENS_AFTER,
  bringWyrdHome,
  markWyrdStarted,
  nextWeaveCost,
  threadsFor,
  wearWyrd,
  weave,
  wyrdDay,
  wyrdDayNumber,
  wyrdDoneToday,
  wyrdFloorCode,
  wyrdFloors,
  wyrdLayout,
  wyrdOpen,
} from './wyrd';

const NOW = Date.UTC(2026, 10, 14, 12);
const TODAY = wyrdDayNumber(NOW);

function home(): Game {
  const g = Game.newGame(7);
  g.state.progress[WYRD_OPENS_AFTER].bossDefeated = true;
  g.state.deepest = 4;
  return g;
}

/** Squares reachable from (x, y) over passable squares. */
function reach(rows: string[], x: number, y: number): Set<string> {
  const map = parseFloor({ name: '', rows, startDir: 1, encounterSteps: 10, encounters: [], chests: [], prowlers: [], palette: {} as never });
  const seen = new Set([`${x},${y}`]);
  const todo = [[x, y]];
  while (todo.length) {
    const [cx, cy] = todo.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height || seen.has(`${nx},${ny}`) || !isPassable(map, nx, ny)) continue;
      seen.add(`${nx},${ny}`);
      todo.push([nx, ny]);
    }
  }
  return seen;
}

describe('the Wyrdweave', () => {
  it('weaves the same day for everyone, and a new one at midnight', () => {
    expect(wyrdDay(TODAY)).toEqual(wyrdDay(TODAY));
    expect(wyrdLayout(TODAY, 1)).toEqual(wyrdLayout(TODAY, 1));
    expect(wyrdDayNumber(NOW + DAY_MS)).toBe(TODAY + 1);
    const days = new Set(Array.from({ length: 20 }, (_, i) => wyrdLayout(TODAY + i, 0).join('')));
    expect(days.size).toBeGreaterThan(15);
  });

  it('rules get harder floor by floor', () => {
    for (let d = 0; d < 50; d++) expect(wyrdDay(TODAY + d).rules.map((r) => r.tier)).toEqual([1, 2, 3]);
  });

  it('every floor can be walked from the way in to the way down', () => {
    for (let d = 0; d < 40; d++) {
      for (let k = 0; k < 3; k++) {
        const rows = wyrdLayout(TODAY + d, k);
        expect(rows[1][1]).toBe('S');
        let down: [number, number] | null = null;
        rows.forEach((r, y) => [...r].forEach((c, x) => c === '>' && (down = [x, y])));
        expect(down).not.toBeNull();
        expect(reach(rows, 1, 1).has(`${down![0]},${down![1]}`)).toBe(true);
      }
    }
  });

  it('floors use the monsters of the deepest chapter reached, and the rules show', () => {
    for (let d = 0; d < 30; d++) {
      const floors = wyrdFloors(TODAY + d, 0);
      expect(floors).toHaveLength(3);
      wyrdDay(TODAY + d).rules.forEach((rule, k) => {
        if (rule.id === 'emptyHands') expect(floors[k].chests).toHaveLength(0);
        if (rule.id === 'theHunt') expect(floors[k].prowlers.length).toBe(1);
      });
    }
  });

  it('opens after the Blighted Elder, once a day', () => {
    const fresh = Game.newGame(3);
    expect(wyrdOpen(fresh)).toBe(false);
    const g = home();
    expect(wyrdOpen(g)).toBe(true);
    expect(wyrdDoneToday(g, NOW)).toBe(false);
    markWyrdStarted(g, NOW);
    expect(wyrdDoneToday(g, NOW)).toBe(true);
    expect(wyrdDoneToday(g, NOW + DAY_MS)).toBe(false);
  });

  it('threads are scarce: at most 4 a day, half after a fall, gear takes weeks', () => {
    expect(threadsFor(3, false)).toBe(4);
    expect(threadsFor(1, false)).toBe(1);
    expect(threadsFor(3, true)).toBe(2);
    expect(threadsFor(1, true)).toBe(0);
    const total = WYRD_COSTS.reduce((a, b) => a + b, 0);
    // Even a perfect run every day takes over a week for the first piece and over a month for all three.
    expect(WYRD_COSTS[0] / 4).toBeGreaterThan(7);
    expect(total / 4).toBeGreaterThan(30);
  });

  it('a run brings its party, finds and threads home, and pays half', () => {
    const g = home();
    const gold = g.state.gold;
    const run = Game.wyrdRun(g, TODAY, 11);
    expect(run.rewardScale).toBe(0.5);
    expect(run.runeFloor).toBe(wyrdFloorCode(TODAY, 0));
    run.state.party[0].xp += 100;
    run.state.party[0].level += 1;
    run.state.gold = 40;
    run.state.materials.ironOre = 2;
    const r = bringWyrdHome(g, run, 2, false);
    expect(r.threads).toBe(2);
    expect(g.state.wyrd?.threads).toBe(2);
    expect(g.state.gold).toBe(gold + 40);
    expect(g.state.party[0].level).toBe(run.state.party[0].level);
    expect(g.state.materials.ironOre).toBe(2);
    expect(g.state.wyrd?.best).toBe(2);
    const g2 = home();
    bringWyrdHome(g2, Game.wyrdRun(g2, TODAY, 12), 3, true);
    expect(g2.state.wyrd?.threads).toBe(2);
    expect(g2.state.party.every((m) => m.hp === 0)).toBe(true);
  });

  it('Hilde weaves for threads at a rising cost, and woven gear is worn for free', () => {
    const g = home();
    g.state.wyrd = { lastDay: 0, threads: 29 };
    expect(weave(g, WYRD_GEAR[0])).not.toBeNull();
    g.state.wyrd.threads = 30;
    expect(weave(g, WYRD_GEAR[0])).toBeNull();
    expect(g.state.wyrd.threads).toBe(0);
    expect(nextWeaveCost(g)).toBe(50);
    expect(weave(g, WYRD_GEAR[0])).toBe('Already woven.');
    expect(weave(g, 'bronzeSword')).not.toBeNull();
    const m = g.state.party[0];
    const goldBefore = g.state.gold;
    const old = m.armor ? EQUIPMENT[m.armor].price : 0;
    expect(wearWyrd(g, WYRD_GEAR[0], 0)).toBe(true);
    expect(m.armor).toBe(WYRD_GEAR[0]);
    expect(g.state.gold).toBe(goldBefore + Math.floor(old / 2));
    // Moving it to someone else takes it off the first.
    expect(wearWyrd(g, WYRD_GEAR[0], 1)).toBe(true);
    expect(m.armor).toBeUndefined();
    expect(g.state.party[1].armor).toBe(WYRD_GEAR[0]);
    expect(wearWyrd(g, WYRD_GEAR[1], 0)).toBe(false);
  });

  it('runestones can stand on the floors of the Wyrdweave', () => {
    const rows = wyrdLayout(TODAY, 0);
    const code = wyrdFloorCode(TODAY, 0);
    expect(canHoldStone(code, 1, 1, NOW)).toBe(true);
    expect(canHoldStone(code, 0, 0, NOW)).toBe(false);
    expect(rows[0][0]).toBe('#');
    expect(canHoldStone(99, 1, 1, NOW)).toBe(false);
  });
});
