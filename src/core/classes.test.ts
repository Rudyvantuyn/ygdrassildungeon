import { describe, expect, it } from 'vitest';
import { Combat } from './combat';
import { makeInventory } from './data/items';
import { createMember, memberStats } from './party';
import { Rng } from './rng';
import type { ClassId } from './types';

function fight(classes: ClassId[], enemies: string[], seed = 1) {
  const party = classes.map((c, i) => {
    const m = createMember(`M${i}`, c);
    m.level = 10;
    return m;
  });
  return new Combat(party, enemies, makeInventory(), new Rng(seed));
}

describe('new classes', () => {
  it('War Song raises the party\'s damage for a few turns', () => {
    const c = fight(['skald', 'berserker'], ['shellbark']);
    c.party[0].skills = { warSong: 1 };
    c.enemies[0].hp = c.enemies[0].maxHp = 99999;
    c.resolveRound([{ kind: 'skill', skill: 'warSong', target: -1 }, null]);
    expect(c.status[1].mods?.atk?.amount).toBeGreaterThan(0);
    // Turns tick down at the end of each round and the buff runs out.
    for (let r = 0; r < 4; r++) c.resolveRound([null, null]);
    expect(c.status[1].mods?.atk).toBeUndefined();
  });

  it('a lowered defence makes the enemy take more damage', () => {
    let plain = 0;
    let cursed = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const a = fight(['berserker', 'seeress'], ['shellbark'], seed);
      a.enemies[0].hp = a.enemies[0].maxHp = 99999;
      a.resolveRound([{ kind: 'attack', target: 0 }, null]);
      plain += 99999 - a.enemies[0].hp;
      const b = fight(['berserker', 'seeress'], ['shellbark'], seed);
      b.enemies[0].hp = b.enemies[0].maxHp = 99999;
      b.enemies[0].mods = { def: { amount: -30, turns: 3 } };
      b.resolveRound([{ kind: 'attack', target: 0 }, null]);
      cursed += 99999 - b.enemies[0].hp;
    }
    expect(cursed).toBeGreaterThan(plain * 1.2);
  });

  it('Blood Price costs HP but never kills', () => {
    const c = fight(['berserker'], ['bogling']);
    const m = c.party[0];
    m.skills = { bloodPrice: 1 };
    m.hp = 5;
    c.enemies[0].hp = c.enemies[0].maxHp = 99999;
    c.enemies[0].def = { ...c.enemies[0].def, atk: 0, skills: [] };
    const events = c.resolveRound([{ kind: 'skill', skill: 'bloodPrice', target: 0 }]);
    const cost = events.find((e) => e.type === 'damage' && e.side === 'party');
    expect(cost && cost.type === 'damage' && cost.hp).toBe(1);
    expect(c.enemies[0].hp).toBeLessThan(99999);
    expect(memberStats(m).hp).toBeGreaterThan(5);
  });

  it('buffs and debuffs survive a snapshot (expeditions)', () => {
    const c = fight(['seeress', 'wolfkin'], ['bogling', 'bogling']);
    c.party[1].skills = { wolfGuard: 2 };
    c.party[0].skills = { curseOfFrailty: 1 };
    c.resolveRound([{ kind: 'skill', skill: 'curseOfFrailty', target: 0 }, { kind: 'skill', skill: 'wolfGuard', target: 0 }]);
    const back = Combat.restore(JSON.parse(JSON.stringify(c.snapshot())), c.party, c.inventory, new Rng(1));
    expect(back.status[0].mods?.def?.amount).toBeGreaterThan(0);
    expect(back.enemies[0].mods?.def?.amount).toBeLessThan(0);
  });
});
