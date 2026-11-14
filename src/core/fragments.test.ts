import { describe, expect, it } from 'vitest';
import { FRAGMENTS, fragmentAt } from './data/fragments';
import { FLOORS } from './data/floors';
import { Game } from './game';

describe('fragments', () => {
  it('each lies somewhere that exists, once', () => {
    expect(new Set(FRAGMENTS.map((f) => f.id)).size).toBe(FRAGMENTS.length);
    for (const f of FRAGMENTS) {
      if ('chest' in f.where) expect(FLOORS[f.where.chest].chests.length).toBeGreaterThan(0);
      else expect(FLOORS[f.where.guardian].boss?.length).toBeGreaterThan(0);
      expect(f.text.length).toBeLessThan(300);
    }
  });

  it('the first chest of a floor gives its fragment once, and only in the Rootdeep', () => {
    const g = Game.newGame(4);
    g.enterFloor(0, true);
    expect(g.findFragment('chest')?.id).toBe(fragmentAt(0, 'chest')!.id);
    expect(g.findFragment('chest')).toBeUndefined();
    expect(g.state.fragments).toEqual([fragmentAt(0, 'chest')!.id]);
  });
});
