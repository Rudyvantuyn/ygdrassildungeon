import { describe, expect, it } from 'vitest';
import { DEEDS, checkDeeds, earnedDeeds, mergeDeeds } from './deeds';
import { Game } from './game';
import { relCell, tileAt } from './dungeon';

function fresh(): Game {
  const g = Game.newGame(7);
  return g;
}

describe('Book of Deeds', () => {
  it('every deed has a unique id, a name, a text and a sign', () => {
    const ids = new Set(DEEDS.map((d) => d.id));
    expect(ids.size).toBe(DEEDS.length);
    for (const d of DEEDS) {
      expect(d.name && d.text && d.icon).toBeTruthy();
      expect(d.id).toMatch(/^[A-Za-z]{1,40}$/);
    }
  });

  it('a new game has earned nothing; a deed is earned once', () => {
    const g = fresh();
    expect(checkDeeds(g, 1)).toEqual([]);
    g.state.deepest = 1;
    expect(checkDeeds(g, 2).map((d) => d.id)).toContain('firstSteps');
    expect(checkDeeds(g, 3)).toEqual([]);
    expect(earnedDeeds(g)[0].earned.at).toBe(2);
  });

  it('walking into the same wall twenty times in a row is a deed; another wall starts over', () => {
    const g = fresh();
    g.enterFloor(0);
    // Turn until a wall is straight ahead.
    for (let i = 0; i < 4; i++) {
      const ahead = relCell(g.state.x, g.state.y, g.state.dir, 1, 0);
      if (tileAt(g.map, ahead.x, ahead.y) === 'wall') break;
      g.turn(1);
    }
    for (let i = 0; i < 19; i++) g.step(1, 0);
    expect(checkDeeds(g, 1).map((d) => d.id)).not.toContain('stubborn');
    g.step(1, 0);
    expect(checkDeeds(g, 2).map((d) => d.id)).toContain('stubborn');
  });

  it('deeds kept with the account come back without overwriting dates', () => {
    const g = fresh();
    g.state.deeds = { firstSteps: { at: 5 } };
    mergeDeeds(g, { firstSteps: { at: 9 }, carver: { at: 7, by: 'Bram' }, gone: { at: 1 } });
    expect(g.state.deeds).toEqual({ firstSteps: { at: 5 }, carver: { at: 7, by: 'Bram' } });
  });
});
