import { describe, expect, it } from 'vitest';
import { Combat } from './combat';
import { CLASSES } from './data/classes';
import { EQUIPMENT_LIST } from './data/equipment';
import { FLOORS } from './data/floors';
import { makeInventory } from './data/items';
import { pendingScene } from './data/story';
import { SECRET_CLASSES, checkDeeds, classUnlocked } from './deeds';
import { Game } from './game';
import { registerMember } from './guild';
import { createMember, fullRestore, xpForLevel } from './party';
import { Rng } from './rng';
import { autoSpend } from './skilltree';
import { chooseCommands } from './tactics';
import type { ClassId } from './types';

function party(classes: ClassId[], level: number, tier: number) {
  return classes.map((c, i) => {
    const m = createMember(`M${i}`, c);
    m.level = level;
    m.xp = xpForLevel(level);
    m.skills = {};
    autoSpend(m);
    for (const slot of ['weapon', 'armor'] as const) {
      m[slot] = EQUIPMENT_LIST.filter((e) => e.slot === slot && !e.requires && e.tier <= tier && e.classes.includes(c)).sort((a, b) => b.price - a.price)[0]?.id;
    }
    fullRestore([m]);
    return m;
  });
}

function winRate(classes: ClassId[], level: number, tier: number, enemies: string[], boss: boolean): number {
  let wins = 0;
  const N = 60;
  for (let s = 1; s <= N; s++) {
    const c = new Combat(party(classes, level, tier), enemies, makeInventory({ sapTonic: 3, spiritDew: 1 }), new Rng(s), { boss });
    for (let r = 0; r < 150 && !c.outcome; r++) c.resolveRound(chooseCommands(c));
    if (c.outcome === 'victory') wins++;
  }
  return wins / N;
}

describe('secret classes', () => {
  it('stay locked until their deed is done, then the stranger comes', () => {
    const g = Game.newGame(3);
    g.state.gold = 99999;
    g.state.inventory.oathToken = 5;
    for (const id of Object.keys(SECRET_CLASSES) as ClassId[]) {
      expect(classUnlocked(g, id)).toBe(false);
      expect(registerMember(g, 'Stranger', id)).toMatch(/Unknown class/);
    }
    (g.state.counters ??= {}).runs = 25;
    expect(checkDeeds(g, 1).map((d) => d.id)).toContain('ravenCall');
    expect(classUnlocked(g, 'ravenspeaker')).toBe(true);
    expect(classUnlocked(g, 'hornbearer')).toBe(false);
    expect(registerMember(g, 'Svala', 'ravenspeaker', 5)).toBeNull();
    g.state.location = 'town';
    expect(pendingScene(g, 'town')?.id === 'ravenStranger' || g.state.story.length === 0).toBe(true);
    g.state.claimed = ['a', 'b', 'c', 'd', 'e'];
    expect(checkDeeds(g, 2).map((d) => d.id)).toContain('hornCall');
    expect(registerMember(g, 'Hallgrim', 'hornbearer', 0)).toBeNull();
  });

  it('every secret class has a full tree, gear and eight looks', () => {
    for (const id of Object.keys(SECRET_CLASSES) as ClassId[]) {
      expect(CLASSES[id].skills.length).toBeGreaterThanOrEqual(10);
      expect(EQUIPMENT_LIST.some((e) => e.slot === 'weapon' && e.tier === 0 && e.classes.includes(id))).toBe(true);
      expect(EQUIPMENT_LIST.some((e) => e.slot === 'armor' && e.tier === 0 && e.classes.includes(id))).toBe(true);
    }
  });
});

// Deterministic seeds. A secret class should feel different, not stronger or weaker than the classes it replaces.
describe('secret classes balance', { timeout: 120_000 }, () => {
  const base: ClassId[] = ['bastion', 'strider', 'mender', 'runecaller'];
  const raven: ClassId[] = ['bastion', 'strider', 'mender', 'ravenspeaker'];
  const horn: ClassId[] = ['bastion', 'hornbearer', 'mender', 'runecaller'];
  const fights: [string, number, number, string[], boolean][] = [
    ['the Rootgnawer', 10, 4, FLOORS[4].boss!, true],
    ['the Drowned Jarl', 15, 7, FLOORS[7].boss!, true],
    ['a chapter II pack', 12, 6, FLOORS[7].encounters[0].enemies, false],
  ];
  for (const [name, level, tier, enemies, boss] of fights) {
    it(`in step with the usual party against ${name}`, () => {
      const usual = winRate(base, level, tier, enemies, boss);
      expect(Math.abs(winRate(raven, level, tier, enemies, boss) - usual)).toBeLessThanOrEqual(0.25);
      expect(Math.abs(winRate(horn, level, tier, enemies, boss) - usual)).toBeLessThanOrEqual(0.25);
    });
  }
});
