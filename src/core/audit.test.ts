/** Fixes from the full check of November 2026: each test guards one bug that was found. */
import { describe, expect, it } from 'vitest';
import { Combat } from './combat';
import { makeInventory } from './data/items';
import { FLOORS } from './data/floors';
import { FRAGMENTS } from './data/fragments';
import { wentTogether, validMember, WYRD_GEAR_MIN_LEVEL, type ExpeditionState } from './expedition';
import { Game } from './game';
import { createMember, xpForLevel } from './party';
import { Rng } from './rng';
import { wyrdFloors } from './wyrd';
import { ENEMIES } from './data/enemies';

describe('fights rebuilt from a snapshot (expeditions)', () => {
  it('remember who the Norn-Spun Mantle already saved', () => {
    const m = createMember('Bram', 'bastion');
    m.armor = 'nornMantle';
    let snap = new Combat([m], ['hrungnir'], makeInventory({}), new Rng(3), { boss: true }).snapshot();
    for (let round = 0; round < 30; round++) {
      const combat = Combat.restore(snap, [m], makeInventory({}), new Rng(100 + round));
      combat.resolveRound([{ kind: 'defend' }]);
      snap = combat.snapshot();
      if (combat.outcome) break;
    }
    expect(snap.stoodLast?.length ?? 0).toBeLessThanOrEqual(1);
    expect(snap.outcome).toBe('defeat');
  });

  it('keep each member\'s deeds for their saga', () => {
    const party = [createMember('Bram', 'bastion')];
    const a = new Combat(party, ['bogling'], makeInventory({}), new Rng(1));
    a.deeds[0].kills = 3;
    const b = Combat.restore(a.snapshot(), party, makeInventory({}), new Rng(2));
    expect(b.deeds[0].kills).toBe(3);
  });
});

describe('self-only skills', () => {
  it('Lick Wounds heals the Fylgja whatever target the client sends', () => {
    const f = createMember('Ulf', 'fylgja');
    f.skills = { ...f.skills, lickWounds: 1 };
    f.hp = 10;
    f.sp = 30;
    const combat = new Combat([f], ['bogling'], makeInventory({}), new Rng(4));
    combat.enemies[0].hp = combat.enemies[0].maxHp = 9999;
    combat.resolveRound([{ kind: 'skill', skill: 'lickWounds', target: -1 }]);
    expect(f.sp).toBeLessThan(30);
    expect(f.hp).toBeGreaterThan(10);
  });
});

describe('expeditions', () => {
  it('turn away a beginner in Wyrd gear', () => {
    const at = (level: number) => {
      const m = createMember('Bram', 'bastion');
      m.level = level;
      m.xp = xpForLevel(level);
      m.armor = 'nornMantle';
      m.skills = {};
      return validMember(m);
    };
    expect(at(1)).toBeNull();
    expect(at(WYRD_GEAR_MIN_LEVEL)).not.toBeNull();
  });

  it('only count as "together" when set out with another player', () => {
    const base = { seats: [{ user: 'a' }, { user: 'b' }], result: { reason: 'returned', shares: [{ user: 'a' }] } } as unknown as ExpeditionState;
    expect(wentTogether(base, 'a')).toBe(true);
    expect(wentTogether({ ...base, result: { ...base.result!, reason: 'disbanded' } }, 'a')).toBe(false);
    expect(wentTogether({ ...base, seats: [base.seats[0], base.seats[0]] }, 'a')).toBe(false);
  });

  it('chests hold no Oath Tokens', () => {
    const floor = FLOORS.findIndex((f) => f.chests.some((c) => 'item' in c && c.item === 'oathToken'));
    expect(floor).toBeGreaterThanOrEqual(0);
    const g = Game.newGame(1);
    g.state.expedition = true;
    g.enterFloor(floor, true);
    const index = FLOORS[floor].chests.findIndex((c) => 'item' in c && c.item === 'oathToken');
    const chest = g.map.chests[index];
    const before = g.state.inventory.oathToken ?? 0;
    (g as unknown as { openChest(x: number, y: number): unknown }).openChest(chest.x, chest.y);
    expect(g.state.inventory.oathToken ?? 0).toBe(before);
  });
});

describe('saves from before the bestiary, fragments and sagas', () => {
  it('count the guardians already beaten', () => {
    const g = Game.newGame(7);
    const state = JSON.parse(JSON.stringify(g.state));
    state.progress[2].bossDefeated = true;
    state.progress[0].openedChests = [0];
    state.bestiary = {};
    delete state.fragments;
    delete state.guardiansBefore;
    const old = Game.fromState(state);
    expect(old.state.bestiary!.blightedElder.defeated).toBe(1);
    const expected = FRAGMENTS.filter((f) => ('guardian' in f.where ? f.where.guardian === 2 : f.where.chest === 0)).map((f) => f.id);
    expect(old.state.fragments).toEqual(expect.arrayContaining(expected));
    expect(old.state.guardiansBefore).toEqual(['blightedElder']);
  });
});

describe('the Wyrdweave', () => {
  it('sends no real prowler after a party that has not reached floor 5', () => {
    const prowlerIds = new Set(FLOORS.flatMap((f) => f.prowlers.flatMap((p) => p.enemies)));
    for (let d = 0; d < 60; d++) {
      for (const floor of wyrdFloors(20000 + d, 0, false)) for (const p of floor.prowlers) for (const id of p.enemies) expect(prowlerIds.has(id) && ENEMIES[id] ? id : 'ok').toBe('ok');
    }
  });
});

describe('a fallen party', () => {
  it('is carried home, losing half its gold, items and materials but keeping Oath Tokens', () => {
    const g = Game.newGame(5);
    g.enterFloor(0);
    g.state.gold = 101;
    g.state.inventory.sapTonic = 5;
    g.state.inventory.oathToken = 2;
    g.state.materials = { bogJelly: 4 };
    for (const m of g.state.party) m.hp = 0;
    const loss = g.carriedHome();
    expect(g.state.location).toBe('town');
    expect(g.state.gold).toBe(50);
    expect(loss.gold).toBe(51);
    expect(g.state.inventory.sapTonic).toBe(2);
    expect(g.state.inventory.oathToken).toBe(2);
    expect(g.state.materials.bogJelly).toBe(2);
    expect(g.state.party.every((m) => m.hp === 1)).toBe(true);
    expect(g.state.counters?.carriedHome).toBe(1);
  });
});
