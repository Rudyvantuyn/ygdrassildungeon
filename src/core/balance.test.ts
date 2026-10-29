import { describe, expect, it } from 'vitest';
import { autoplay, chooseCommands } from './autoplay';
import { Combat } from './combat';
import { EQUIPMENT_LIST } from './data/equipment';
import { createStartingParty, fullRestore, xpForLevel } from './party';
import { Rng } from './rng';

/** A party at `level` wearing the best gear the shop sells. */
function trainedParty(level: number) {
  const party = createStartingParty();
  for (const m of party) {
    m.level = level;
    m.xp = xpForLevel(level);
    for (const slot of ['weapon', 'armor'] as const) {
      m[slot] = EQUIPMENT_LIST.filter((e) => e.slot === slot && e.classes.includes(m.classId)).sort((a, b) => b.price - a.price)[0]?.id;
    }
  }
  fullRestore(party);
  return party;
}

function prowlerWinRate(id: string, level: number, fights = 100): number {
  let wins = 0;
  for (let seed = 1; seed <= fights; seed++) {
    const combat = new Combat(trainedParty(level), [id], { sapTonic: 3, spiritDew: 1, homingFeather: 0 }, new Rng(seed), { prowler: true });
    for (let r = 0; r < 100 && !combat.outcome; r++) combat.resolveRound(chooseCommands(combat));
    if (combat.outcome === 'victory') wins++;
  }
  return wins / fights;
}

// Deterministic seeds, so these are stable. If a balance change breaks them,
// re-check the numbers on purpose rather than loosening the bounds blindly.
describe('balance (computer player)', () => {
  const seeds = Array.from({ length: 20 }, (_, i) => 1000 + i);

  it('a careful party that grinds a little can clear the game', () => {
    const results = seeds.map((s) => autoplay(s, { grindBattles: 5 }));
    expect(results.filter((r) => r.cleared).length).toBeGreaterThanOrEqual(16);
  });

  it('shopping in town between floors helps', () => {
    const plain = seeds.filter((s) => autoplay(s, { grindBattles: 5 }).cleared).length;
    const town = seeds.filter((s) => autoplay(s, { grindBattles: 5, town: true }).cleared).length;
    expect(town).toBeGreaterThanOrEqual(plain);
    expect(town).toBeGreaterThanOrEqual(18);
  });

  it('the boss is a real threat without grinding', () => {
    const results = seeds.map((s) => autoplay(s));
    const cleared = results.filter((r) => r.cleared).length;
    expect(cleared).toBeLessThan(20);
    expect(cleared).toBeGreaterThanOrEqual(10);
    // The party should arrive at the boss somewhere around level 5–7.
    const avgLevel = results.reduce((sum, r) => sum + r.levels[0], 0) / results.length;
    expect(avgLevel).toBeGreaterThan(4.5);
    expect(avgLevel).toBeLessThan(7.5);
  });
});

describe('prowler balance', () => {
  for (const id of ['grimtusk', 'fenwraith', 'rootDraugr']) {
    it(`${id}: hopeless before level 10, risky at 10, beatable when well trained`, () => {
      expect(prowlerWinRate(id, 8)).toBeLessThanOrEqual(0.1);
      const at10 = prowlerWinRate(id, 10);
      expect(at10).toBeGreaterThanOrEqual(0.08);
      expect(at10).toBeLessThanOrEqual(0.45);
      expect(prowlerWinRate(id, 14)).toBeGreaterThanOrEqual(0.7);
    });
  }
});
