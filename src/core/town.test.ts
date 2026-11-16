import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { gearFor } from './town';

describe('the equipment shop, seen per adventurer', () => {
  it('only offers what that adventurer can wear, weapons first, best gain first, and marks upgrades', () => {
    const game = Game.newGame(1);
    game.state.deepest = 6;
    const m = game.state.party[0];
    const offers = gearFor(game, m);
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((o) => o.gear.classes.includes(m.classId))).toBe(true);
    const firstArmour = offers.findIndex((o) => o.gear.slot === 'armor');
    expect(offers.slice(firstArmour).every((o) => o.gear.slot === 'armor')).toBe(true);
    for (const slot of ['weapon', 'armor'] as const) {
      const gains = offers.filter((o) => o.gear.slot === slot).map((o) => o.gain);
      expect(gains).toEqual([...gains].sort((a, b) => b - a));
    }
    expect(offers.filter((o) => o.upgrade).every((o) => o.gain > 0 && !o.worn)).toBe(true);
  });

  it('what is worn is never an upgrade over itself', () => {
    const game = Game.newGame(1);
    game.state.deepest = 6;
    const m = game.state.party[0];
    const best = gearFor(game, m).find((o) => o.gear.slot === 'weapon')!;
    m.weapon = best.gear.id;
    const again = gearFor(game, m).find((o) => o.gear.id === best.gear.id)!;
    expect(again.worn).toBe(true);
    expect(again.upgrade).toBe(false);
  });
});
