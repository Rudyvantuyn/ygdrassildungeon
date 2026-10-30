import { describe, expect, it } from 'vitest';
import { Combat, type Command } from './combat';
import { ENEMIES } from './data/enemies';
import { EQUIPMENT_LIST } from './data/equipment';
import { makeInventory } from './data/items';
import { MATERIALS } from './data/materials';
import { QUESTS } from './data/quests';
import { STORY, markSeen, pendingScene } from './data/story';
import { Game } from './game';
import { createStartingParty, memberStats } from './party';
import { acceptQuest, boardQuests, questProgress, questStage, turnInQuest } from './quests';
import { Rng } from './rng';
import { equipmentForSale, sellMaterial, unlocksFrom } from './town';

const nothing = (): (Command | null)[] => [null, null, null, null];

describe('ailments', () => {
  it('poison hurts at the end of every round, then wears off', () => {
    const combat = new Combat(createStartingParty(), ['bogling'], makeInventory(), new Rng(1));
    combat.enemies[0].hp = combat.enemies[0].maxHp = 9999;
    combat.enemies[0].def = { ...combat.enemies[0].def, atk: 0, skills: [] };
    const bram = combat.party[0];
    combat.status[0].ailment = 'poison';
    combat.status[0].ailmentTurns = 2;
    const hp = bram.hp;
    const events = combat.resolveRound(nothing());
    expect(events.some((e) => e.type === 'damage' && e.side === 'party' && e.target === 0)).toBe(true);
    expect(bram.hp).toBeLessThan(hp);
    combat.resolveRound(nothing());
    expect(combat.status[0].ailment).toBeNull();
  });

  it('sleepers skip their turn and wake up when hit', () => {
    const combat = new Combat(createStartingParty(), ['bogling'], makeInventory(), new Rng(4));
    combat.enemies[0].hp = combat.enemies[0].maxHp = 9999;
    combat.enemies[0].ailment = 'sleep';
    combat.enemies[0].ailmentTurns = 3;
    const events = combat.resolveRound([{ kind: 'attack', target: 0 }, null, null, null]);
    expect(events.some((e) => e.type === 'info' && e.text.includes('asleep'))).toBe(false);
    expect(combat.enemies[0].ailment).toBeNull();
    expect(events.some((e) => e.type === 'ailment' && e.ailment === null)).toBe(true);
  });

  it('a sleeping party member does nothing that round', () => {
    const combat = new Combat(createStartingParty(), ['bogling'], makeInventory(), new Rng(2));
    combat.enemies[0].def = { ...combat.enemies[0].def, atk: 0, skills: [] };
    combat.enemies[0].hp = combat.enemies[0].maxHp = 9999;
    combat.status[3].ailment = 'sleep';
    combat.status[3].ailmentTurns = 3;
    const sp = combat.party[3].sp;
    const events = combat.resolveRound([null, null, null, { kind: 'skill', skill: 'emberRune', target: 0 }]);
    expect(combat.party[3].sp).toBe(sp);
    expect(events.some((e) => e.type === 'info' && e.text.includes('asleep'))).toBe(true);
  });

  it('Slumber Rune can put foes to sleep, but never a boss', () => {
    let slept = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const party = createStartingParty();
      party[3].level = 5;
      party[3].skills = { ...party[3].skills, frostRune: 2, slumberRune: 1 };
      const c = new Combat(party, ['bogling', 'bogling'], makeInventory(), new Rng(seed));
      c.resolveRound([null, null, null, { kind: 'skill', skill: 'slumberRune', target: -1 }]);
      slept += c.enemies.filter((e) => e.ailment === 'sleep').length;
      const boss = new Combat(party, ['blightedElder'], makeInventory(), new Rng(seed), { boss: true });
      boss.resolveRound([null, null, null, { kind: 'skill', skill: 'slumberRune', target: -1 }]);
      expect(boss.enemies[0].ailment).not.toBe('sleep');
    }
    expect(slept).toBeGreaterThan(10);
  });

  it('Cleanse and Clearwater cure ailments', () => {
    const combat = new Combat(createStartingParty(), ['bogling'], makeInventory({ clearwater: 1 }), new Rng(3));
    combat.enemies[0].def = { ...combat.enemies[0].def, atk: 0, skills: [] };
    combat.enemies[0].hp = combat.enemies[0].maxHp = 9999;
    combat.party[2].level = 2;
    combat.party[2].skills = { ...combat.party[2].skills, mend: 1, cleanse: 1 };
    combat.status[0].ailment = 'paralysis';
    combat.status[0].ailmentTurns = 3;
    combat.status[1].ailment = 'poison';
    combat.status[1].ailmentTurns = 3;
    combat.resolveRound([null, null, { kind: 'skill', skill: 'cleanse', target: 0 }, { kind: 'item', item: 'clearwater', target: 1 }]);
    expect(combat.status[0].ailment).toBeNull();
    expect(combat.status[1].ailment).toBeNull();
    expect(combat.inventory.clearwater).toBe(0);
  });
});

describe('materials and the shop', () => {
  it('every enemy material, gear requirement and quest target exists', () => {
    for (const e of Object.values(ENEMIES)) if (e.material) expect(MATERIALS[e.material.id], e.id).toBeDefined();
    for (const g of EQUIPMENT_LIST) if (g.requires) expect(MATERIALS[g.requires.material], g.id).toBeDefined();
    for (const q of QUESTS) {
      if (q.kind === 'hunt' || q.kind === 'boss') expect(ENEMIES[q.target as string], q.id).toBeDefined();
      if (q.kind === 'gather') expect(MATERIALS[q.target as string], q.id).toBeDefined();
    }
    expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length);
  });

  it('victories bring home materials and count kills', () => {
    const game = Game.newGame(1);
    game.enterFloor(0);
    let got = 0;
    for (let i = 0; i < 20; i++) {
      const c = game.startCombat(['bogling']);
      c.enemies[0].hp = 1;
      for (let r = 0; r < 5 && !c.outcome; r++) c.resolveRound(game.state.party.map(() => ({ kind: 'attack', target: 0 }) as Command));
      game.finishCombat(c);
      got += c.rewards!.materials.length;
    }
    expect(game.state.kills.bogling).toBe(20);
    expect(game.state.materials.bogJelly ?? 0).toBe(got);
    expect(got).toBeGreaterThan(3);
  });

  it('selling materials pays out and unlocks special gear', () => {
    const game = Game.newGame(1);
    game.state.materials.briarQuill = 6;
    expect(equipmentForSale(game).some((e) => e.id === 'briarthornSpear')).toBe(false);
    expect(unlocksFrom(game, 'briarQuill')[0].remaining).toBe(5);
    const gold = game.state.gold;
    expect(sellMaterial(game, 'briarQuill', 5)).toBe(5 * MATERIALS.briarQuill.price);
    expect(game.state.gold).toBe(gold + 5 * MATERIALS.briarQuill.price);
    expect(game.state.materials.briarQuill).toBe(1);
    expect(equipmentForSale(game).some((e) => e.id === 'briarthornSpear')).toBe(true);
    expect(sellMaterial(game, 'bogJelly', 1)).toBe(0);
  });
});

describe('quests', () => {
  it('hunt quests count kills from the moment they are accepted', () => {
    const game = Game.newGame(1);
    game.state.kills.bogling = 10;
    const q = QUESTS.find((x) => x.id === 'bogTrouble')!;
    expect(questStage(game, q)).toBe('new');
    acceptQuest(game, q.id);
    expect(questProgress(game, q).current).toBe(0);
    game.state.kills.bogling = 14;
    expect(questStage(game, q)).toBe('active');
    game.state.kills.bogling = 15;
    expect(questStage(game, q)).toBe('ready');
    const gold = game.state.gold;
    expect(turnInQuest(game, q.id)).toBe(true);
    expect(game.state.gold).toBe(gold + q.reward.gold);
    expect(boardQuests(game).some((x) => x.id === q.id)).toBe(false);
    expect(turnInQuest(game, q.id)).toBe(false);
  });

  it('gather quests take the materials when handed in', () => {
    const game = Game.newGame(1);
    acceptQuest(game, 'quillsForSpears');
    game.state.materials.briarQuill = 4;
    expect(turnInQuest(game, 'quillsForSpears')).toBe(true);
    expect(game.state.materials.briarQuill).toBe(1);
  });

  it('reach and boss quests follow progress, and deeper quests appear later', () => {
    const game = Game.newGame(1);
    expect(boardQuests(game).every((q) => q.minFloor === 0)).toBe(true);
    acceptQuest(game, 'firstSteps');
    expect(questStage(game, QUESTS.find((q) => q.id === 'firstSteps')!)).toBe('active');
    game.state.deepest = 2;
    expect(questStage(game, QUESTS.find((q) => q.id === 'firstSteps')!)).toBe('ready');
    expect(boardQuests(game).some((q) => q.id === 'elderRot')).toBe(true);
    acceptQuest(game, 'elderRot');
    game.state.progress[2].bossDefeated = true;
    expect(questStage(game, QUESTS.find((q) => q.id === 'elderRot')!)).toBe('ready');
  });
});

describe('story', () => {
  it('plays each scene once, at the right moment', () => {
    const game = Game.newGame(1);
    expect(pendingScene(game, 'town')?.id).toBe('intro');
    markSeen(game, 'intro');
    expect(pendingScene(game, 'town')).toBeNull();
    game.enterFloor(0);
    expect(pendingScene(game, 'floor')?.id).toBe('firstDescent');
    markSeen(game, 'firstDescent');
    game.state.progress[2].bossDefeated = true;
    expect(pendingScene(game, 'town')?.id).toBe('elderFallen');
    const copy = Game.load(game.serialize());
    expect(copy.state.story).toEqual(['intro', 'firstDescent']);
    for (const s of STORY) expect(s.lines.length).toBeGreaterThan(0);
  });
});

describe('sanity', () => {
  it('memberStats still works with all new gear', () => {
    const party = createStartingParty();
    party[0].weapon = 'grimtuskCleaver';
    expect(memberStats(party[0]).atk).toBeGreaterThan(40);
  });
});
