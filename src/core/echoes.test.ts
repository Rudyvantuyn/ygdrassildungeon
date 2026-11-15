import { describe, expect, it } from 'vitest';
import { chooseCommands } from './autoplay';
import { Combat } from './combat';
import { EQUIPMENT_LIST } from './data/equipment';
import { FLOORS } from './data/floors';
import { makeInventory } from './data/items';
import { MEMORIES } from './data/memories';
import { ECHO_COST, echoBlocker, echoDef, echoGuardians, echoLevels, gearTierFor, GUARDIAN_LEVEL, hallOfEchoesOpen, rollShard, shardChance, startEchoFight } from './echoes';
import { Game } from './game';
import { createStartingParty, fullRestore, MAX_LEVEL, xpForLevel } from './party';
import { Rng } from './rng';
import { autoSpend, maxRankOf, unspentPoints } from './skilltree';
import { CLASSES } from './data/classes';

function trained(level: number) {
  const tier = gearTierFor(level);
  const party = createStartingParty();
  for (const m of party) {
    m.level = level;
    m.xp = xpForLevel(level);
    m.skills = {};
    autoSpend(m);
    for (const slot of ['weapon', 'armor'] as const) m[slot] = EQUIPMENT_LIST.filter((e) => e.slot === slot && !e.requires && !e.wyrd && e.tier <= tier && e.classes.includes(m.classId)).sort((a, b) => b.price - a.price)[0]?.id;
  }
  fullRestore(party);
  return party;
}

function echoWinRate(id: string, level: number, fights = 30): number {
  let wins = 0;
  for (let seed = 1; seed <= fights; seed++) {
    const c = new Combat(trained(level), [id], makeInventory({ sapTonic: 3, spiritDew: 1 }), new Rng(seed), { boss: true, echo: true, enemyDefs: { [id]: echoDef(id, level) } });
    for (let r = 0; r < 150 && !c.outcome; r++) c.resolveRound(chooseCommands(c));
    if (c.outcome === 'victory') wins++;
  }
  return wins / fights;
}

describe('the Hall of Echoes', () => {
  it('knows every guardian of the Rootdeep', () => {
    for (const f of FLOORS) for (const id of f.boss ?? []) expect(GUARDIAN_LEVEL[id], id).toBeDefined();
  });

  it('opens after chapter V, takes Dream Embers, and offers only guardians beaten and levels reached', () => {
    const g = Game.newGame(3);
    expect(hallOfEchoesOpen(g)).toBe(false);
    g.state.progress[2].bossDefeated = true;
    g.state.party.forEach((m) => (m.level = 34));
    expect(echoGuardians(g)).toEqual(['blightedElder']);
    expect(echoLevels(g)).toEqual([10, 20, 30]);
    expect(echoBlocker(g, 'blightedElder', 30)).toMatch(/Dream Embers/);
    expect(echoBlocker(g, 'hafgufa', 30)).toMatch(/beaten/);
    g.state.inventory.dreamEmber = ECHO_COST + 3;
    expect(echoBlocker(g, 'blightedElder', 40)).toMatch(/strong/);
    const c = startEchoFight(g, 'blightedElder', 30);
    expect(c).toBeInstanceOf(Combat);
    expect(g.state.inventory.dreamEmber).toBe(3);
    expect((c as Combat).enemies[0].name).toBe('Echo of the Blighted Elder');
  });

  it('gives a better shard chance at higher levels, and never the same shard twice', () => {
    expect(shardChance(150)).toBeGreaterThan(shardChance(10));
    expect(shardChance(10, 2)).toBeGreaterThan(shardChance(10));
    const g = Game.newGame(4);
    // No memories written yet: nothing can drop.
    expect(rollShard(g, 1, new Rng(1))).toBeNull();
  });

  it('keeps a memory\'s last shard for last', () => {
    const g = Game.newGame(5);
    MEMORIES.push({ id: 'zzTest', title: 'Test', shards: Array.from({ length: 15 }, (_, i) => ({ text: `shard ${i}` })) });
    try {
      const rng = new Rng(9);
      const order: number[] = [];
      for (let i = 0; i < 15; i++) order.push(rollShard(g, 1, rng)!.shard);
      expect(order.slice(0, 14)).not.toContain(14);
      expect(order[14]).toBe(14);
      expect(rollShard(g, 1, rng)).toBeNull();
    } finally {
      MEMORIES.pop();
    }
  });

  it('lets adventurers grow to level 150 without a full tree nagging them', () => {
    expect(MAX_LEVEL).toBe(150);
    const m = trained(150)[0];
    // Every rank of every skill taken: the points left over have nowhere to go, so none are shown as waiting.
    m.skills = Object.fromEntries(CLASSES[m.classId].skills.map((e) => [e.skill, maxRankOf(e.skill)]));
    expect(unspentPoints(m)).toBe(0);
  });
});

// Measured on purpose (November 2026): about two wins in three for a party of the echo's level, at every level.
describe('echo balance', { timeout: 300_000 }, () => {
  for (const id of Object.keys(GUARDIAN_LEVEL)) {
    it(`${id}: a fair fight at level 30, 60 and 120`, () => {
      for (const level of [30, 60, 120]) {
        const rate = echoWinRate(id, level);
        expect(rate, `${id} at ${level}`).toBeGreaterThanOrEqual(0.4);
        expect(rate, `${id} at ${level}`).toBeLessThanOrEqual(0.97);
      }
    });
  }
});
