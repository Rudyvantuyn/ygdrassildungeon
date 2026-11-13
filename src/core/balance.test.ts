import { describe, expect, it } from 'vitest';
import { autoplay, chooseCommands, type AutoplayResult } from './autoplay';
import { Combat } from './combat';
import { EQUIPMENT_LIST } from './data/equipment';
import { createStartingParty, fullRestore, xpForLevel } from './party';
import { Rng } from './rng';
import { autoSpend } from './skilltree';
import { makeInventory } from './data/items';

/** A party at `level` wearing the best regular gear the shop sells by floor index `tier` (no special gear: that takes extra hunting). */
function trainedParty(level: number, tier: number) {
  const party = createStartingParty();
  for (const m of party) {
    m.level = level;
    m.xp = xpForLevel(level);
    m.skills = {};
    autoSpend(m);
    for (const slot of ['weapon', 'armor'] as const) {
      m[slot] = EQUIPMENT_LIST.filter((e) => e.slot === slot && !e.requires && e.tier <= tier && e.classes.includes(m.classId)).sort((a, b) => b.price - a.price)[0]?.id;
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
describe('balance (computer player)', { timeout: 60_000 }, () => {
  const seeds = Array.from({ length: 20 }, (_, i) => 1000 + i);
  const count = (results: AutoplayResult[], ok: (r: AutoplayResult) => boolean) => results.filter(ok).length;

  // The game is meant to be grindy: rushing ahead fails, steady training wins.
  it('the Blighted Elder (third floor) cannot be rushed', () => {
    const results = seeds.map((s) => autoplay(s, { floors: 3 }));
    expect(count(results, (r) => r.bossesDefeated >= 1)).toBeLessThanOrEqual(3);
    const avgLevel = results.reduce((sum, r) => sum + r.levels[0], 0) / results.length;
    expect(avgLevel).toBeGreaterThan(4);
    expect(avgLevel).toBeLessThan(7);
  });

  it('a careful party that grinds a little and shops in town beats the Elder', () => {
    const plain = count(seeds.map((s) => autoplay(s, { floors: 3, grindBattles: 5 })), (r) => r.bossesDefeated >= 1);
    const town = count(seeds.map((s) => autoplay(s, { floors: 3, grindBattles: 5, town: true })), (r) => r.bossesDefeated >= 1);
    expect(town).toBeGreaterThanOrEqual(plain);
    expect(town).toBeGreaterThanOrEqual(17);
  });

  it('the Rootgnawer (end of chapter I) needs real training', () => {
    const beaten = (r: AutoplayResult) => r.bossesDefeated >= 2;
    const untrained = count(seeds.map((s) => autoplay(s, { floors: 5, town: true })), beaten);
    expect(untrained).toBeLessThanOrEqual(6);
    const some = count(seeds.map((s) => autoplay(s, { floors: 5, town: true, grindBattles: 10 })), beaten);
    expect(some).toBeLessThanOrEqual(16);
    const trained = count(seeds.map((s) => autoplay(s, { floors: 5, town: true, grindBattles: 30 })), beaten);
    expect(trained).toBeGreaterThanOrEqual(18);
  });

  it('the Hafgufa (end of chapter II) needs even more', () => {
    const some = seeds.slice(0, 12).map((s) => autoplay(s, { town: true, grindBattles: 20 }));
    expect(count(some, (r) => r.cleared)).toBeLessThanOrEqual(8);
    const trained = seeds.slice(0, 12).map((s) => autoplay(s, { town: true, grindBattles: 40 }));
    expect(count(trained, (r) => r.cleared)).toBeGreaterThanOrEqual(10);
    // Paced for a party around level 30; level 40 stays out of reach for now.
    const avgLevel = trained.reduce((sum, r) => sum + r.levels[0], 0) / trained.length;
    expect(avgLevel).toBeGreaterThan(26);
    expect(avgLevel).toBeLessThan(37);
    // Money still matters at the end of chapter II: what is left after buying gear is a few pieces' worth, not a fortune.
    const avgGold = trained.reduce((sum, r) => sum + r.gold, 0) / trained.length;
    expect(avgGold).toBeLessThan(20_000);
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

/** Win rate of a trained party in a single fight from full health. */
function fightWinRate(ids: string[], level: number, tier: number, opts: { boss?: boolean; prowler?: boolean }, fights = 80): number {
  let wins = 0;
  for (let seed = 1; seed <= fights; seed++) {
    const combat = new Combat(trainedParty(level, tier), ids, makeInventory({ sapTonic: 3, spiritDew: 1, kindlingMoss: 0, homingFeather: 0 }), new Rng(seed), opts);
    for (let r = 0; r < 100 && !combat.outcome; r++) combat.resolveRound(chooseCommands(combat));
    if (combat.outcome === 'victory') wins++;
  }
  return wins / fights;
}

// Chapter III (the Marrowdeep) is prepared before its floors are drawn, so it is checked fight by fight.
// A party reaches it around level 37 with tier 9-10 gear. Measured on purpose (November 2026):
// Ribwarden 41% at 38, 72% at 40; Hrungnir 7% at 38, 71% at 44; Bergrisi 16/44/63% and Ossuary Hound 5/31/74% at 38/44/48.
describe('chapter III balance', { timeout: 120_000 }, () => {
  it('its monsters are a step up from chapter II, but a fresh party on arrival still wins them', () => {
    expect(fightWinRate(['rimeTroll', 'shardling'], 37, 10, {})).toBeGreaterThanOrEqual(0.85);
    expect(fightWinRate(['stonehorn', 'stonehorn', 'marrowgnaw', 'marrowgnaw'], 37, 10, {})).toBeGreaterThanOrEqual(0.8);
    expect(fightWinRate(['rimeTroll', 'shardling'], 30, 9, {})).toBeLessThan(0.85);
  });

  it('the Ribwarden (middle of the chapter) is a fair fight around level 39', () => {
    const early = fightWinRate(['ribwarden'], 38, 10, { boss: true });
    expect(early).toBeGreaterThanOrEqual(0.25);
    expect(early).toBeLessThanOrEqual(0.6);
    expect(fightWinRate(['ribwarden'], 40, 12, { boss: true })).toBeGreaterThanOrEqual(0.6);
  });

  it('Hrungnir (end of the chapter) needs real training: hopeless on arrival, won around level 44', () => {
    expect(fightWinRate(['hrungnir'], 38, 10, { boss: true })).toBeLessThanOrEqual(0.15);
    expect(fightWinRate(['hrungnir'], 44, 12, { boss: true })).toBeGreaterThanOrEqual(0.6);
  });

  for (const id of ['bergrisi', 'ossuaryHound']) {
    it(`${id}: hopeless on arrival, risky at 44, beatable at 48`, () => {
      expect(fightWinRate([id], 38, 10, { prowler: true })).toBeLessThanOrEqual(0.2);
      const at44 = fightWinRate([id], 44, 12, { prowler: true });
      expect(at44).toBeGreaterThanOrEqual(0.08);
      expect(at44).toBeLessThanOrEqual(0.55);
      expect(fightWinRate([id], 48, 14, { prowler: true })).toBeGreaterThanOrEqual(0.6);
    });
  }
});
