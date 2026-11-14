import { describe, expect, it } from 'vitest';
import { DEEDS, checkDeeds, earnedDeeds, mergeDeeds } from './deeds';
import { Game } from './game';
import { relCell, tileAt } from './dungeon';
import { addToSaga } from './sagas';
import { DAY_MS, markWyrdStarted } from './wyrd';

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

  it('the newer deeds: walking home, the Wyrdweave streak, bynames', () => {
    const g = fresh();
    g.enterFloor(0);
    const stand = (tile: string) => {
      const i = g.map.tiles.indexOf(tile as never);
      g.state.x = i % g.map.width;
      g.state.y = Math.floor(i / g.map.width);
    };
    // Down three stairs without a win on those floors, then all the way back up.
    for (let f = 0; f < 3; f++) {
      stand('stairs');
      g.descend();
    }
    expect(g.state.floor).toBe(3);
    for (let f = 3; f > 0; f--) {
      stand('up');
      g.ascend();
      expect(g.state.floor).toBe(f - 1);
    }
    stand('up');
    g.ascend();
    expect(g.state.location).toBe('town');
    const ids = checkDeeds(g, 1).map((d) => d.id);
    expect(ids).toContain('pacifist');
    expect(ids).toContain('longWayHome');

    const day = Date.UTC(2026, 10, 1);
    for (let d = 0; d < 6; d++) markWyrdStarted(g, day + d * DAY_MS);
    expect(checkDeeds(g, 2).map((x) => x.id)).not.toContain('sevenDays');
    markWyrdStarted(g, day + 6 * DAY_MS);
    expect(checkDeeds(g, 3).map((x) => x.id)).toContain('sevenDays');
    markWyrdStarted(g, day + 8 * DAY_MS);
    expect(g.state.wyrd?.streak).toBe(1);

    addToSaga(g.state.party[0], { kills: 50 });
    expect(checkDeeds(g, 4).map((x) => x.id)).toContain('sungOf');
  });
});
