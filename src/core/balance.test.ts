import { describe, expect, it } from 'vitest';
import { autoplay, chooseCommands, type AutoplayResult } from './autoplay';
import { Combat } from './combat';
import { EQUIPMENT_LIST } from './data/equipment';
import { createStartingParty, fullRestore, xpForLevel } from './party';
import { Rng } from './rng';
import { makeInventory } from './data/items';

/** A party at `level` wearing the best gear the shop sells by floor index `tier`. */
function trainedParty(level: number, tier: number) {
  const party = createStartingParty();
  for (const m of party) {
    m.level = level;
    m.xp = xpForLevel(level);
    for (const slot of ['weapon', 'armor'] as const) {
      m[slot] = EQUIPMENT_LIST.filter((e) => e.slot === slot && e.tier <= tier && e.classes.includes(m.classId)).sort((a, b) => b.price - a.price)[0]?.id;
    }
  }
  fullRestore(party);
  return party;
}

function prowlerWinRate(id: string, level: number, tier: number, fights = 100): number {
  let wins = 0;
  for (let seed = 1; seed <= fights; seed++) {
    const combat = new Combat(trainedParty(level, tier), [id], makeInventory({ sapTonic: 3, spiritDew: 1, kindlingMoss: 0, homingFeather: 0 }), new Rng(seed), { prowler: true });
    for (let r = 0; r < 100 && !combat.outcome; r++) combat.resolveRound(chooseCommands(combat));
    if (combat.outcome === 'victory') wins++;
  }
  return wins / fights;
}

// Deterministic seeds, so these are stable. If a balance change breaks them,
// re-check the numbers on purpose rather than loosening the bounds blindly.
describe('balance (computer player)', () => {
  const seeds = Array.from({ length: 20 }, (_, i) => 1000 + i);
  const count = (results: AutoplayResult[], ok: (r: AutoplayResult) => boolean) => results.filter(ok).length;

  it('the Blighted Elder (third floor) is a real threat without grinding', () => {
    const results = seeds.map((s) => autoplay(s, { floors: 3 }));
    const won = count(results, (r) => r.bossesDefeated >= 1);
    expect(won).toBeGreaterThanOrEqual(8);
    expect(won).toBeLessThan(20);
    const avgLevel = results.reduce((sum, r) => sum + r.levels[0], 0) / results.length;
    expect(avgLevel).toBeGreaterThan(4.5);
    expect(avgLevel).toBeLessThan(8);
  });

  it('a careful party that grinds a little and shops in town beats the Elder', () => {
    const plain = count(seeds.map((s) => autoplay(s, { floors: 3, grindBattles: 5 })), (r) => r.bossesDefeated >= 1);
    const town = count(seeds.map((s) => autoplay(s, { floors: 3, grindBattles: 5, town: true })), (r) => r.bossesDefeated >= 1);
    expect(town).toBeGreaterThanOrEqual(plain);
    expect(town).toBeGreaterThanOrEqual(18);
  });

  it('the Rootgnawer (end of chapter I) needs training', () => {
    const beaten = (r: AutoplayResult) => r.bossesDefeated >= 2;
    const untrained = count(seeds.map((s) => autoplay(s, { floors: 5, town: true })), beaten);
    expect(untrained).toBeGreaterThanOrEqual(1);
    expect(untrained).toBeLessThanOrEqual(12);
    const trained = count(seeds.map((s) => autoplay(s, { floors: 5, town: true, grindBattles: 20 })), beaten);
    expect(trained).toBeGreaterThanOrEqual(17);
  });

  it('the Hafgufa (end of chapter II) needs training too', () => {
    const some = seeds.slice(0, 12).map((s) => autoplay(s, { town: true, grindBattles: 10 }));
    const cleared = count(some, (r) => r.cleared);
    expect(cleared).toBeGreaterThanOrEqual(1);
    expect(cleared).toBeLessThanOrEqual(9);
    const trained = seeds.slice(0, 12).map((s) => autoplay(s, { town: true, grindBattles: 20 }));
    expect(count(trained, (r) => r.cleared)).toBeGreaterThanOrEqual(9);
    // Chapter II is paced for a party in its twenties; level 40 stays out of reach for now.
    const avgLevel = trained.reduce((sum, r) => sum + r.levels[0], 0) / trained.length;
    expect(avgLevel).toBeGreaterThan(24);
    expect(avgLevel).toBeLessThan(35);
  });
});

describe('prowler balance', () => {
  for (const id of ['grimtusk', 'fenwraith', 'rootDraugr']) {
    it(`${id}: hopeless before level 10, risky at 10, beatable when well trained`, () => {
      expect(prowlerWinRate(id, 8, 4)).toBeLessThanOrEqual(0.1);
      const at10 = prowlerWinRate(id, 10, 4);
      expect(at10).toBeGreaterThanOrEqual(0.08);
      expect(at10).toBeLessThanOrEqual(0.45);
      expect(prowlerWinRate(id, 14, 4)).toBeGreaterThanOrEqual(0.7);
    });
  }
  // Chapter II prowlers: hopeless on arrival, risky at 24, beatable when well trained.
  for (const id of ['skerryjaw', 'brineDraugr', 'tidecoil']) {
    it(`${id}: hopeless at level 20, risky at 24, beatable at 28`, () => {
      expect(prowlerWinRate(id, 20, 5)).toBeLessThanOrEqual(0.1);
      const at24 = prowlerWinRate(id, 24, 7);
      expect(at24).toBeGreaterThanOrEqual(0.08);
      expect(at24).toBeLessThanOrEqual(0.5);
      expect(prowlerWinRate(id, 28, 9)).toBeGreaterThanOrEqual(0.7);
    });
  }
});
