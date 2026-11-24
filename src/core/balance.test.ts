import { describe, expect, it } from 'vitest';
import { autoplay, chooseCommands, type AutoplayResult } from './autoplay';
import { Combat } from './combat';
import { EQUIPMENT_LIST } from './data/equipment';
import { createStartingParty, fullRestore, xpForLevel } from './party';
import { Rng } from './rng';
import { autoSpend } from './skilltree';
import { makeInventory } from './data/items';

/** A party at `level` wearing the best regular gear the shop sells by floor index `tier` (no special gear: that takes extra hunting). */
function trainedParty(level: number, tier: number, oath = 0) {
  const party = createStartingParty();
  for (const m of party) {
    m.level = level;
    if (oath) m.oathRank = oath;
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

  // Made sterner in November 2026 (a player found the Elder easy at level 9): a little training is no longer enough,
  // a party around level 8 that has trained a while and shopped in town wins.
  it('a party that trains a while and shops in town beats the Elder; a little training is not enough', () => {
    const little = count(seeds.map((s) => autoplay(s, { floors: 3, grindBattles: 5, town: true })), (r) => r.bossesDefeated >= 1);
    expect(little).toBeLessThanOrEqual(8);
    const plain = count(seeds.map((s) => autoplay(s, { floors: 3, grindBattles: 15 })), (r) => r.bossesDefeated >= 1);
    const town = count(seeds.map((s) => autoplay(s, { floors: 3, grindBattles: 15, town: true })), (r) => r.bossesDefeated >= 1);
    expect(town).toBeGreaterThanOrEqual(plain);
    expect(town).toBeGreaterThanOrEqual(15);
  });

  it('the Rootgnawer (end of chapter I) needs real training', () => {
    const beaten = (r: AutoplayResult) => r.bossesDefeated >= 2;
    const untrained = count(seeds.map((s) => autoplay(s, { floors: 5, town: true })), beaten);
    expect(untrained).toBeLessThanOrEqual(6);
    const some = count(seeds.map((s) => autoplay(s, { floors: 5, town: true, grindBattles: 10 })), beaten);
    expect(some).toBeLessThanOrEqual(16);
    const trained = count(seeds.map((s) => autoplay(s, { floors: 5, town: true, grindBattles: 45 })), beaten);
    expect(trained).toBeGreaterThanOrEqual(17);
  });

  it('the Hafgufa (end of chapter II) needs even more', () => {
    const some = seeds.slice(0, 12).map((s) => autoplay(s, { floors: 10, town: true, grindBattles: 20 }));
    expect(count(some, (r) => r.bossesDefeated >= 4)).toBeLessThanOrEqual(8);
    const trained = seeds.slice(0, 12).map((s) => autoplay(s, { floors: 10, town: true, grindBattles: 40 }));
    // 9 of 12 since the guardians were made sterner on purpose (November 2026); the misses are unlucky runs on the way.
    expect(count(trained, (r) => r.bossesDefeated >= 4)).toBeGreaterThanOrEqual(9);
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
function fightWinRate(ids: string[], level: number, tier: number, opts: { boss?: boolean; prowler?: boolean; oath?: number }, fights = 80): number {
  let wins = 0;
  for (let seed = 1; seed <= fights; seed++) {
    const combat = new Combat(trainedParty(level, tier, opts.oath), ids, makeInventory({ sapTonic: 3, spiritDew: 1, kindlingMoss: 0, homingFeather: 0 }), new Rng(seed), opts);
    for (let r = 0; r < 100 && !combat.outcome; r++) combat.resolveRound(chooseCommands(combat));
    if (combat.outcome === 'victory') wins++;
  }
  return wins / fights;
}

// Chapter III (the Marrowdeep) is prepared before its floors are drawn, so it is checked fight by fight.
// A party reaches it around level 37 with tier 9-10 gear. Measured on purpose (November 2026):
// Ribwarden 41% at 38, 72% at 40; Hrungnir 7% at 38, 71% at 44; Bergrisi 16/44/63% and Ossuary Hound 5/31/74% at 38/44/48.
// Since November 2026 parties are five strong: the monsters were scaled up (src/core/data/enemies.ts) until every
// bound here held again with the same numbers, rather than the bounds being moved.
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

// Chapter IV (the Dreaming Skull), tuned for a party of five (November 2026). A party arrives after Hrungnir around
// level 46 with tier 15 gear. Measured on purpose: Fog-Watcher 23/60/77% at 46/48/50; Dreamwarden 18/45/68% at
// 48/52/54; the prowlers 10–18% at 48, about a third to a half at 53.
describe('chapter IV balance', { timeout: 120_000 }, () => {
  it('its packs are a step up from chapter III, but a party fresh from Hrungnir wins them', () => {
    expect(fightWinRate(['mistling', 'mistling', 'mistling'], 46, 15, {})).toBeGreaterThanOrEqual(0.85);
    expect(fightWinRate(['thunderwisp', 'thunderwisp', 'rimewraith', 'thunderwisp'], 46, 15, {})).toBeGreaterThanOrEqual(0.7);
    expect(fightWinRate(['stormcrone', 'stormcrone', 'thunderwisp'], 40, 14, {})).toBeLessThan(0.85);
  });

  it('the Fog-Watcher (middle of the chapter) is a fair fight around level 48', () => {
    const early = fightWinRate(['fogWatcher'], 48, 16, { boss: true });
    expect(early).toBeGreaterThanOrEqual(0.25);
    expect(early).toBeLessThanOrEqual(0.68);
    expect(fightWinRate(['fogWatcher'], 50, 17, { boss: true })).toBeGreaterThanOrEqual(0.65);
  });

  it('the Dreamwarden (end of the chapter) needs real training: hopeless on arrival, won around level 54', () => {
    expect(fightWinRate(['dreamwarden'], 48, 16, { boss: true })).toBeLessThanOrEqual(0.2);
    expect(fightWinRate(['dreamwarden'], 54, 19, { boss: true })).toBeGreaterThanOrEqual(0.6);
  });

  for (const id of ['gloomgriffon', 'thunderwyrm']) {
    it(`${id}: hopeless on arrival, risky at 53, beatable near the top`, () => {
      expect(fightWinRate([id], 48, 16, { prowler: true })).toBeLessThanOrEqual(0.22);
      const at53 = fightWinRate([id], 53, 18, { prowler: true });
      expect(at53).toBeGreaterThanOrEqual(0.08);
      expect(at53).toBeLessThanOrEqual(0.6);
      expect(fightWinRate([id], 58, 19, { prowler: true })).toBeGreaterThanOrEqual(0.55);
    });
  }
});

// Chapter V (Ginnungagap), tuned for a party of five (November 2026). A party arrives after the Dreamwarden around
// level 55 with tier 20 gear. Measured on purpose: Rimewell 35/67/73% at 58/60/62; Gapwarden 17/40/67% at 58/62/66;
// the prowlers about a fifth at 58, a third to a half at 63, two in three at 68.
describe('chapter V balance', { timeout: 180_000 }, () => {
  it('its packs are a step up from chapter IV, but a party fresh from the Dreamwarden wins them', () => {
    expect(fightWinRate(['rimeling', 'rimeling', 'rimeling'], 55, 20, {})).toBeGreaterThanOrEqual(0.85);
    expect(fightWinRate(['muspelSpark', 'muspelSpark', 'steamwraith', 'muspelSpark'], 55, 20, {})).toBeGreaterThanOrEqual(0.7);
    expect(fightWinRate(['cinderwhirl', 'sparkadder', 'rimeling'], 48, 18, {})).toBeLessThan(0.85);
  });

  it('the Rimewell (middle of the chapter) is a fair fight around level 59', () => {
    const early = fightWinRate(['rimewell'], 58, 20, { boss: true });
    expect(early).toBeGreaterThanOrEqual(0.25);
    expect(early).toBeLessThanOrEqual(0.68);
    expect(fightWinRate(['rimewell'], 62, 22, { boss: true })).toBeGreaterThanOrEqual(0.65);
  });

  it('the Gapwarden (end of the chapter) needs real training: hopeless on arrival, won around level 66', () => {
    expect(fightWinRate(['gapwarden'], 58, 20, { boss: true })).toBeLessThanOrEqual(0.22);
    expect(fightWinRate(['gapwarden'], 66, 22, { boss: true })).toBeGreaterThanOrEqual(0.6);
  });

  for (const id of ['rimedrake', 'emberjotun']) {
    it(`${id}: hopeless on arrival, risky at 63, beatable near the top`, () => {
      expect(fightWinRate([id], 58, 20, { prowler: true })).toBeLessThanOrEqual(0.25);
      const at63 = fightWinRate([id], 63, 22, { prowler: true });
      expect(at63).toBeGreaterThanOrEqual(0.08);
      expect(at63).toBeLessThanOrEqual(0.6);
      expect(fightWinRate([id], 68, 22, { prowler: true })).toBeGreaterThanOrEqual(0.55);
    });
  }
});

// Chapter VI (Hvergelmir), the first on 35×25, tuned for a party of five (November 2026). A party arrives after the
// Gapwarden around level 66 with tier 25 gear. Measured on purpose: Sváfnir 33/55/70% at 70/72/74; Níðhöggr 22/60% at
// 68/74 (the computer player does worse above 75 as its runecaller spends points differently, so it is measured below);
// the prowlers about a quarter at 70, a third to two fifths at 75, three in five at 80.
describe('chapter VI balance', { timeout: 240_000 }, () => {
  it('its packs are a step up from chapter V, but a party fresh from the Gapwarden wins them', () => {
    expect(fightWinRate(['nifling', 'nifling', 'nifling'], 66, 25, {})).toBeGreaterThanOrEqual(0.85);
    expect(fightWinRate(['carrionRaven', 'carrionRaven', 'mistPilgrim', 'carrionRaven'], 66, 25, {})).toBeGreaterThanOrEqual(0.7);
    expect(fightWinRate(['nifling', 'nifling', 'nifling'], 58, 22, {})).toBeLessThan(0.85);
  });

  it('Sváfnir (middle of the chapter) is a fair fight around level 71', () => {
    const early = fightWinRate(['svafnir'], 70, 25, { boss: true });
    expect(early).toBeGreaterThanOrEqual(0.25);
    expect(early).toBeLessThanOrEqual(0.68);
    expect(fightWinRate(['svafnir'], 74, 27, { boss: true })).toBeGreaterThanOrEqual(0.65);
  });

  it('Níðhöggr (end of the chapter) needs training: hopeless on arrival, won in good gear', () => {
    expect(fightWinRate(['nidhogg'], 68, 25, { boss: true })).toBeLessThanOrEqual(0.28);
    expect(fightWinRate(['nidhogg'], 74, 27, { boss: true })).toBeGreaterThanOrEqual(0.55);
  });

  for (const id of ['grabakr', 'ofnir']) {
    it(`${id}: hopeless on arrival, risky at 75, beatable at 80`, () => {
      expect(fightWinRate([id], 70, 25, { prowler: true })).toBeLessThanOrEqual(0.3);
      const at75 = fightWinRate([id], 75, 27, { prowler: true });
      expect(at75).toBeGreaterThanOrEqual(0.08);
      expect(at75).toBeLessThanOrEqual(0.6);
      expect(fightWinRate([id], 80, 27, { prowler: true })).toBeGreaterThanOrEqual(0.5);
    });
  }
});

// Deeper oaths (src/core/oaths.ts) add 3% per oath to an adventurer's own stats. Measured on purpose (November 2026)
// at the deepest oath a party can hold when it meets each guardian, oath 0 → deepest: Hafgufa 38→51% at 28,
// Hrungnir 33→49% at 40, Dreamwarden 20→63% at 50, Gapwarden 16→21% at 58 and 39→53% at 62, Níðhöggr 28→41% at 68.
// Worth two to four levels of training: they help, but a party fresh on arrival still has to train.
describe('deeper oaths do not skip the training', { timeout: 240_000 }, () => {
  it('a party at its deepest oath is still not ready on arrival', () => {
    expect(fightWinRate(['hafgufa'], 28, 9, { boss: true, oath: 1 })).toBeLessThanOrEqual(0.65);
    expect(fightWinRate(['dreamwarden'], 50, 17, { boss: true, oath: 3 })).toBeLessThanOrEqual(0.75);
    expect(fightWinRate(['gapwarden'], 58, 20, { boss: true, oath: 4 })).toBeLessThanOrEqual(0.35);
    expect(fightWinRate(['nidhogg'], 68, 25, { boss: true, oath: 4 })).toBeLessThanOrEqual(0.55);
  });

  it('but an oath does help', () => {
    expect(fightWinRate(['gapwarden'], 62, 21, { boss: true, oath: 4 })).toBeGreaterThan(fightWinRate(['gapwarden'], 62, 21, { boss: true }));
  });
});
