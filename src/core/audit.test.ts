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
import { BEAST_LORE } from './data/beastLore';
import { bestiaryOrder } from './bestiary';

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
  it('is carried home, losing half of what it found on this descent but nothing it set out with', () => {
    const g = Game.newGame(5);
    g.state.gold = 100;
    g.state.inventory.sapTonic = 4;
    g.state.inventory.oathToken = 1;
    g.state.materials = { bogJelly: 2 };
    g.enterFloor(0);
    // Found down there: 51 gold, 3 tonics, an Oath Token and 5 jelly.
    g.state.gold = 151;
    g.state.inventory.sapTonic = 7;
    g.state.inventory.oathToken = 2;
    g.state.materials = { bogJelly: 7, mossThread: 1 };
    for (const m of g.state.party) m.hp = 0;
    const loss = g.carriedHome();
    expect(g.state.location).toBe('town');
    expect(loss.gold).toBe(26);
    expect(g.state.gold).toBe(125);
    expect(g.state.inventory.sapTonic).toBe(5);
    expect(g.state.inventory.oathToken).toBe(2);
    expect(g.state.materials.bogJelly).toBe(4);
    expect(g.state.materials.mossThread).toBe(0);
    expect(g.state.party.every((m) => m.hp === 1)).toBe(true);
    expect(g.state.counters?.carriedHome).toBe(1);
    expect(g.state.setOut).toBeUndefined();
  });

  it('loses nothing it had in town, even when it used up its supplies down there', () => {
    const g = Game.newGame(5);
    g.state.gold = 300;
    g.state.inventory.sapTonic = 6;
    g.enterFloor(0);
    g.state.gold = 280;
    g.state.inventory.sapTonic = 1;
    for (const m of g.state.party) m.hp = 0;
    const loss = g.carriedHome();
    expect(loss.gold).toBe(0);
    expect(loss.items).toEqual({});
    expect(g.state.gold).toBe(280);
    expect(g.state.inventory.sapTonic).toBe(1);
  });

  it('starts counting again on every descent, not on every floor', () => {
    const g = Game.newGame(5);
    g.state.gold = 100;
    g.enterFloor(0);
    g.state.gold = 200;
    g.enterFloor(1, true);
    g.state.gold = 300;
    for (const m of g.state.party) m.hp = 0;
    expect(g.carriedHome().gold).toBe(100);
    g.state.gold = 300;
    g.enterFloor(0);
    g.state.gold = 310;
    for (const m of g.state.party) m.hp = 0;
    expect(g.carriedHome().gold).toBe(5);
  });
});

describe('the bestiary', () => {
  it('has a few lines about every creature of the Rootdeep, and none for creatures that do not exist', () => {
    const ids = bestiaryOrder().map((b) => b.def.id);
    expect(ids.filter((id) => !BEAST_LORE[id])).toEqual([]);
    expect(Object.keys(BEAST_LORE).filter((id) => !ids.includes(id))).toEqual([]);
  });
});

describe('bestiary deeds', () => {
  it('Every Soft Spot needs every element tried on every creature of the Greenwood Roots', async () => {
    const { checkDeeds } = await import('./deeds');
    const g = Game.newGame(9);
    const chapterOne = bestiaryOrder().filter((b) => Math.min(...b.floors) <= 5);
    for (const b of chapterOne) (g.state.bestiary ??= {})[b.def.id] = { seen: 1, defeated: 1, tried: ['phys', 'fire', 'frost'] };
    expect(checkDeeds(g, 1).map((d) => d.id)).not.toContain('greenwoodWeak');
    for (const b of chapterOne) g.state.bestiary![b.def.id].tried.push('storm');
    expect(checkDeeds(g, 2).map((d) => d.id)).toContain('greenwoodWeak');
  });
});

describe('the assisted map', () => {
  it('marks the special squares the party comes upon, once', async () => {
    const { Game } = await import('./game');
    const g = Game.newGame(5);
    g.enterFloor(0, true);
    g.state.chartMode = 'assisted';
    // Find a chest and stand in front of it.
    const m = g.map;
    let spot: { x: number; y: number; dir: number; chest: number } | null = null;
    for (let y = 0; y < m.height && !spot; y++)
      for (let x = 0; x < m.width && !spot; x++) {
        if (m.tiles[y * m.width + x] !== 'chest') continue;
        for (const [dir, dx, dy] of [[0, 0, 1], [1, -1, 0], [2, 0, -1], [3, 1, 0]] as const)
          if (m.tiles[(y + dy) * m.width + x + dx] === 'floor') { spot = { x: x + dx, y: y + dy, dir, chest: y * m.width + x }; break; }
      }
    expect(spot).not.toBeNull();
    const index = spot!.chest;
    Object.assign(g.state, { x: spot!.x, y: spot!.y, dir: spot!.dir });
    (g as unknown as { markExplored(): void }).markExplored();
    expect(g.chart.marks[index]).toBe('chest');
    // Erased by the player: not put back.
    delete g.chart.marks[index];
    (g as unknown as { markExplored(): void }).markExplored();
    expect(g.chart.marks[index]).toBeUndefined();
  });
});

describe("the Pacifist's Walk", () => {
  it('needs a floor walked from its way in, not just back up and down the stairs', async () => {
    const { Game } = await import('./game');
    const g = Game.newGame(9);
    g.enterFloor(1, true);
    const stand = (tile: string) => {
      const i = g.map.tiles.indexOf(tile as never);
      g.state.x = i % g.map.width;
      g.state.y = Math.floor(i / g.map.width);
    };
    g.state.counters = { ...g.state.counters, winsFloor: 1 };
    stand('up');
    g.ascend();
    stand('stairs');
    g.descend();
    expect(g.state.counters?.pacifist ?? 0).toBe(0);
    // A real walk down a floor without a win still counts.
    stand('stairs');
    g.descend();
    expect(g.state.counters?.pacifist).toBe(1);
  });
});

describe('the way home from a chapter', () => {
  it('the stairs up on the first floor of a chapter can lead straight home, nowhere else', async () => {
    const { Game } = await import('./game');
    const g = Game.newGame(4);
    const stand = (tile: string) => {
      const i = g.map.tiles.indexOf(tile as never);
      g.state.x = i % g.map.width;
      g.state.y = Math.floor(i / g.map.width);
    };
    g.enterFloor(6, true);
    stand('up');
    expect(g.canGoHomeHere).toBe(false);
    g.enterFloor(5, true);
    stand('up');
    expect(g.canGoHomeHere).toBe(true);
    g.goHome();
    expect(g.state.location).toBe('town');
  });
});

describe('chests beside a gathering spot', () => {
  it('a chest that can only be reached from a gathering spot still opens; then the spot works again', async () => {
    const { Game } = await import('./game');
    const g = Game.newGame(6);
    g.enterFloor(18, true); // Stormcrown XIX: a chest walled in on three sides, the fourth an ore vein
    const m = g.map;
    let found = false;
    for (let y = 0; y < m.height && !found; y++)
      for (let x = 0; x < m.width && !found; x++) {
        if (m.tiles[y * m.width + x] !== 'chest') continue;
        for (const [dir, dx, dy] of [[0, 0, 1], [1, -1, 0], [2, 0, -1], [3, 1, 0]] as const) {
          const t = m.tiles[(y + dy) * m.width + x + dx];
          if (t === 'mine' || t === 'forage' || t === 'fell' || t === 'fish') {
            Object.assign(g.state, { x: x + dx, y: y + dy, dir });
            expect(g.interact().type).toBe('chest');
            expect(g.interact().type).toBe('gatherSpot');
            found = true;
          }
        }
      }
    expect(found).toBe(true);
  });
});

describe('the night after a fall', () => {
  it('is free once, then the inn costs again', async () => {
    const { Game } = await import('./game');
    const { innCost, restAtInn } = await import('./town');
    const g = Game.newGame(2);
    const price = innCost(g);
    expect(price).toBeGreaterThan(0);
    g.enterFloor(0, true);
    g.state.party.forEach((m) => (m.hp = 0));
    g.carriedHome();
    g.state.gold = 0;
    expect(innCost(g)).toBe(0);
    expect(restAtInn(g)).toBe(true);
    expect(innCost(g)).toBe(price);
  });
});
