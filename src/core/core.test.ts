import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NOTE_MAX_LENGTH, emptyChart, eraseCell, setMark, setNote, setTerrain, terrainAt } from './chart';
import { Combat, PROWLER_FLEE_CHANCE, type Command } from './combat';
import { ENEMIES } from './data/enemies';
import { FIRST_PROWLER_FLOOR, FLOORS } from './data/floors';
import { SKILLS } from './data/skills';
import { CLASSES } from './data/classes';
import { DX, DY, isPassable, parseFloor, relCell, tileAt, turnDir } from './dungeon';
import { Game, SaveVersionError, type GameState } from './game';
import { buyEquipment, buyItem, equipmentForSale, innCost, netPrice, restAtInn } from './town';
import { moveProwlers, nextStep, prowlerCanEnter } from './prowlers';
import { createStartingParty, grantXp, memberStats, xpForLevel } from './party';
import { Rng } from './rng';
import type { ItemId } from './types';

function reachable(map: ReturnType<typeof parseFloor>): Set<string> {
  const seen = new Set<string>([`${map.start.x},${map.start.y}`]);
  const queue = [map.start];
  while (queue.length) {
    const { x, y } = queue.shift()!;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      const key = `${nx},${ny}`;
      if (!seen.has(key) && isPassable(map, nx, ny)) {
        seen.add(key);
        queue.push({ x: nx, y: ny, dir: 0 });
      }
    }
  }
  return seen;
}

describe('floor data', () => {
  FLOORS.forEach((def, index) => {
    it(`${def.name} is valid and fully reachable`, () => {
      const map = parseFloor(def);
      const reach = reachable(map);
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const tile = tileAt(map, x, y);
          const edge = x === 0 || y === 0 || x === map.width - 1 || y === map.height - 1;
          if (edge) expect(tile, `border at ${x},${y}`).toBe('wall');
          if (tile !== 'wall') expect(reach.has(`${x},${y}`), `${tile} at ${x},${y} reachable`).toBe(true);
        }
      }
      const isLast = index === FLOORS.length - 1;
      expect(map.tiles.includes('stairs')).toBe(!isLast);
      expect(map.tiles.includes('boss')).toBe(!!def.boss);
      expect(map.chests.length).toBe(def.chests.length);
      for (const group of def.encounters) for (const id of group.enemies) expect(ENEMIES[id], id).toBeDefined();
      for (const id of def.boss ?? []) expect(ENEMIES[id], id).toBeDefined();
    });
  });

  it('every class skill exists', () => {
    for (const c of Object.values(CLASSES)) for (const s of c.skills) expect(SKILLS[s.skill]).toBeDefined();
  });
});

describe('dungeon movement', () => {
  it('turns wrap around', () => {
    expect(turnDir(0, -1)).toBe(3);
    expect(turnDir(3, 1)).toBe(0);
  });

  it('relCell respects facing', () => {
    expect(relCell(5, 5, 1, 1, 0)).toEqual({ x: 6, y: 5 }); // east, forward
    expect(relCell(5, 5, 1, 0, 1)).toEqual({ x: 5, y: 6 }); // east, right = south
    expect(relCell(5, 5, 0, 2, -1)).toEqual({ x: 4, y: 3 }); // north
  });

  it('walks, bumps into walls and maps the floor', () => {
    const game = Game.newGame(1);
    game.state.encounterAt = 999;
    const { x, y } = game.state;
    expect(game.state.dir).toBe(1);
    expect(game.step(1, 0).map((e) => e.type)).toEqual(['moved']);
    expect(game.state.x).toBe(x + 1);
    game.turn(-1); // face north: wall
    expect(game.step(1, 0)).toEqual([{ type: 'bump' }]);
    expect(game.isExplored(x + 1, y)).toBe(true);
    expect(game.isExplored(x + 1, y - 1)).toBe(true);
    expect(game.isExplored(10, 10)).toBe(false);
  });

  it('triggers a random encounter when the danger counter fills up', () => {
    const game = Game.newGame(7);
    game.state.encounterAt = 1;
    const events = game.step(1, 0);
    const encounter = events.find((e) => e.type === 'encounter');
    expect(encounter).toBeDefined();
  });

  it('opens a chest only once', () => {
    const game = Game.newGame(3);
    const chest = game.map.chests[0];
    game.state.x = chest.x - 1;
    game.state.y = chest.y;
    game.state.dir = 1;
    const before = game.state.inventory.sapTonic;
    expect(game.step(1, 0).some((e) => e.type === 'chest')).toBe(true);
    expect(game.state.inventory.sapTonic).toBe(before + 2);
    game.step(-1, 0);
    expect(game.step(1, 0).some((e) => e.type === 'emptyChest')).toBe(true);
  });

  it('descends the stairs to the next floor', () => {
    const game = Game.newGame(3);
    const i = game.map.tiles.indexOf('stairs');
    game.state.x = i % game.map.width;
    game.state.y = Math.floor(i / game.map.width);
    game.descend();
    expect(game.state.floor).toBe(1);
    expect(game.state.x).toBe(game.map.start.x);
  });

  it('survives a save/load round trip', () => {
    const game = Game.newGame(42);
    game.state.encounterAt = 999;
    game.step(1, 0);
    const copy = Game.load(game.serialize());
    expect(copy.state).toEqual(game.state);
  });
});

describe('party', () => {
  it('levels up and gains stats', () => {
    const [bram] = createStartingParty();
    const before = memberStats(bram);
    expect(grantXp(bram, xpForLevel(3))).toBe(2);
    expect(bram.level).toBe(3);
    expect(memberStats(bram).hp).toBeGreaterThan(before.hp);
    expect(bram.hp).toBe(memberStats(bram).hp);
  });
});

describe('combat', () => {
  const inventory = (): Record<ItemId, number> => ({ sapTonic: 2, spiritDew: 0, homingFeather: 0 });
  const attackAll = (combat: Combat): Command[] => combat.party.map(() => ({ kind: 'attack', target: 0 }));

  it('a fresh party beats two slimes', () => {
    const party = createStartingParty();
    const combat = new Combat(party, ['bogling', 'bogling'], inventory(), new Rng(5));
    expect(combat.enemies.map((e) => e.name)).toEqual(['Bogling A', 'Bogling B']);
    for (let round = 0; round < 20 && !combat.outcome; round++) combat.resolveRound(attackAll(combat));
    expect(combat.outcome).toBe('victory');
    expect(combat.rewards!.xp).toBe(ENEMIES.bogling.xp * 2);
    expect(party.every((m) => m.xp === ENEMIES.bogling.xp * 2)).toBe(true);
  });

  it('weakness boosts elemental damage', () => {
    const run = (skill: 'emberRune' | 'frostRune') => {
      const party = createStartingParty();
      const combat = new Combat(party, ['bogling'], inventory(), new Rng(11));
      combat.enemies[0].hp = combat.enemies[0].maxHp = 9999;
      const commands: (Command | null)[] = [null, null, null, { kind: 'skill', skill, target: 0 }];
      const events = combat.resolveRound(commands);
      const hit = events.find((e) => e.type === 'damage' && e.side === 'enemy');
      return hit && hit.type === 'damage' ? hit : null;
    };
    const fire = run('emberRune')!;
    const ice = run('frostRune')!;
    expect(fire.weak).toBe(true);
    expect(ice.weak).toBe(false);
    expect(fire.amount).toBeGreaterThan(ice.amount);
  });

  it('spends SP and heals with skills and items', () => {
    const party = createStartingParty();
    const inv = inventory();
    const combat = new Combat(party, ['bogling'], inv, new Rng(2));
    combat.enemies[0].hp = combat.enemies[0].maxHp = 9999;
    party[0].hp = 10;
    party[1].hp = 10;
    const wren = party[2];
    const spBefore = wren.sp;
    combat.resolveRound([null, { kind: 'item', item: 'sapTonic', target: 1 }, { kind: 'skill', skill: 'mend', target: 0 }, null]);
    expect(wren.sp).toBe(spBefore - SKILLS.mend.sp);
    expect(inv.sapTonic).toBe(1);
    expect(party[0].hp).toBeGreaterThan(10);
  });

  it('defending halves damage taken', () => {
    const avgDamage = (defend: boolean) => {
      let total = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const party = createStartingParty();
        const combat = new Combat(party, ['briarGnawer'], inventory(), new Rng(seed));
        combat.enemies[0].def = { ...combat.enemies[0].def, skills: [] };
        for (const m of party.slice(1)) m.hp = 0; // only Bram can be hit
        const events = combat.resolveRound([defend ? { kind: 'defend' } : null, null, null, null]);
        for (const e of events) if (e.type === 'damage' && e.side === 'party') total += e.amount;
      }
      return total;
    };
    expect(avgDamage(true)).toBeLessThan(avgDamage(false) * 0.65);
  });

  it('cannot flee from a boss', () => {
    const party = createStartingParty();
    const combat = new Combat(party, ['blightedElder'], inventory(), new Rng(1), { boss: true });
    combat.resolveRound(party.map(() => ({ kind: 'flee' })));
    expect(combat.outcome).not.toBe('fled');
  });

  it('a party that does nothing is eventually defeated', () => {
    const party = createStartingParty();
    const combat = new Combat(party, ['blightedElder'], inventory(), new Rng(9), { boss: true });
    for (let round = 0; round < 100 && !combat.outcome; round++) combat.resolveRound(party.map(() => ({ kind: 'defend' })));
    expect(combat.outcome).toBe('defeat');
  });

  it('game applies gold after victory and marks the boss defeated', () => {
    const game = Game.newGame(1);
    game.state.floor = 2;
    const goldBefore = game.state.gold;
    const combat = game.startBossCombat();
    combat.enemies[0].hp = 1;
    for (let r = 0; r < 5 && !combat.outcome; r++) combat.resolveRound(attackAll(combat));
    expect(combat.outcome).toBe('victory');
    game.finishCombat(combat);
    expect(game.state.gold).toBe(goldBefore + ENEMIES.blightedElder.gold);
    expect(game.state.cleared).toBe(true);
  });
});

describe('town', () => {
  it('a new game starts in town with a little money', () => {
    const game = Game.newGame(1);
    expect(game.state.location).toBe('town');
    expect(game.state.gold).toBeGreaterThan(0);
  });

  it('the inn restores everyone, including fallen members, for gold', () => {
    const game = Game.newGame(1);
    const [bram, sela] = game.state.party;
    bram.hp = 0;
    sela.sp = 0;
    const cost = innCost(game);
    const gold = game.state.gold;
    expect(restAtInn(game)).toBe(true);
    expect(game.state.gold).toBe(gold - cost);
    expect(bram.hp).toBe(memberStats(bram).hp);
    expect(sela.sp).toBe(memberStats(sela).sp);
    game.state.gold = 0;
    expect(restAtInn(game)).toBe(false);
  });

  it('buys items and equipment, trading in the old piece', () => {
    const game = Game.newGame(1);
    game.state.gold = 1000;
    expect(buyItem(game, 'sapTonic')).toBe(true);
    expect(game.state.inventory.sapTonic).toBe(4);

    const bram = game.state.party[0];
    const atk = memberStats(bram).atk;
    expect(buyEquipment(game, 'copperEdge', 0)).toBe(true);
    expect(memberStats(bram).atk).toBe(atk + 5);
    expect(buyEquipment(game, 'copperEdge', 1)).toBe(false); // a Strider can't use swords

    game.state.deepest = 1;
    const iron = equipmentForSale(game).find((e) => e.id === 'ironbarkBlade')!;
    expect(netPrice(bram, iron)).toBe(260 - 40);
    const before = game.state.gold;
    expect(buyEquipment(game, 'ironbarkBlade', 0)).toBe(true);
    expect(game.state.gold).toBe(before - 220);
    expect(memberStats(bram).atk).toBe(atk + 10);
  });

  it('only sells gear for floors the party has reached', () => {
    const game = Game.newGame(1);
    expect(equipmentForSale(game).every((e) => e.tier === 0)).toBe(true);
    game.state.deepest = 2;
    expect(equipmentForSale(game).some((e) => e.tier === 2)).toBe(true);
  });

  it('enters only floors already reached, and climbs back to town', () => {
    const game = Game.newGame(1);
    game.enterFloor(2);
    expect(game.state.location).toBe('town');
    game.enterFloor(0);
    expect(game.state.location).toBe('dungeon');
    expect(game.tileHere()).toBe('up');
    game.ascend();
    expect(game.state.location).toBe('town');
  });

  it('stairs up from the second floor lead to the stairs down on the first', () => {
    const game = Game.newGame(1);
    game.enterFloor(1, true);
    game.ascend();
    expect(game.state.floor).toBe(0);
    expect(game.tileHere()).toBe('stairs');
    expect(game.state.deepest).toBe(1);
  });

  it('an Homing Feather returns the party to town and refills springs', () => {
    const game = Game.newGame(1);
    game.enterFloor(0);
    game.state.progress[0].springUsed = true;
    expect(game.useFeather()).toBe(true);
    expect(game.state.location).toBe('town');
    expect(game.state.inventory.homingFeather).toBe(0);
    expect(game.state.progress[0].springUsed).toBe(false);
    expect(game.useFeather()).toBe(false);
  });

  it('rejects saves from an older version', () => {
    const state = JSON.parse(Game.newGame(1).serialize()) as GameState;
    state.version = 2;
    expect(() => Game.load(JSON.stringify(state))).toThrow(SaveVersionError);
  });
});

describe('prowlers', () => {
  // The current floors are too shallow for prowlers, so most tests below place some on purpose.
  const saved = FLOORS.map((f) => f.prowlers);
  beforeEach(() => {
    FLOORS[0].prowlers = [{ enemies: ['grimtusk'], route: [[3, 11], [11, 11]], hunt: 0 }];
    FLOORS[2].prowlers = [{ enemies: ['rootDraugr'], route: [[10, 15], [14, 15]], hunt: 5 }];
  });
  afterEach(() => FLOORS.forEach((f, i) => (f.prowlers = saved[i])));

  it(`no prowlers before floor ${FIRST_PROWLER_FLOOR + 1}`, () => {
    saved.slice(0, FIRST_PROWLER_FLOOR).forEach((prowlers) => expect(prowlers).toEqual([]));
  });

  it('fleeing from a prowler is a flat 30%', () => {
    const game = Game.newGame(1);
    game.state.party.forEach((m) => (m.level = 20));
    const combat = game.startProwlerCombat(0);
    expect(combat.fleeChance()).toBe(PROWLER_FLEE_CHANCE);
    expect(PROWLER_FLEE_CHANCE).toBe(0.3);
  });

  FLOORS.forEach((def, f) => {
    it(`${def.name}: prowler routes are valid`, () => {
      const map = parseFloor(def);
      for (const p of def.prowlers) {
        for (const id of p.enemies) expect(ENEMIES[id], id).toBeDefined();
        for (const [x, y] of p.route) expect(prowlerCanEnter(map, x, y), `${x},${y} is plain floor`).toBe(true);
        p.route.forEach(([x, y], i) => {
          const [nx, ny] = p.route[(i + 1) % p.route.length];
          expect(nextStep(map, { x, y }, { x: nx, y: ny }, new Set()), `route leg ${i} on floor ${f}`).not.toBeNull();
        });
        // Never right next to the entrance: the party always gets a moment to look around.
        const [sx, sy] = p.route[0];
        expect(Math.abs(sx - map.start.x) + Math.abs(sy - map.start.y)).toBeGreaterThan(3);
      }
    });
  });

  it('patrols back and forth along the route, only on plain floor', () => {
    const game = Game.newGame(1);
    game.enterFloor(0);
    const p = game.progress.prowlers[0];
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      moveProwlers(game.map, game.floorDef, game.progress.prowlers, { x: 1, y: 1 });
      expect(prowlerCanEnter(game.map, p.x, p.y)).toBe(true);
      seen.add(`${p.x},${p.y}`);
    }
    for (const [x, y] of game.floorDef.prowlers[0].route) expect(seen.has(`${x},${y}`)).toBe(true);
  });

  it('a hunter chases the party once it is in range', () => {
    const game = Game.newGame(1);
    game.enterFloor(2, true);
    const hunter = game.progress.prowlers[0];
    const party = { x: hunter.x + 3, y: hunter.y }; // same corridor, towards the boss
    const before = nextStep(game.map, hunter, party, new Set())!.distance;
    const alerts = moveProwlers(game.map, game.floorDef, game.progress.prowlers, party);
    expect(alerts).toContain(0);
    expect(nextStep(game.map, hunter, party, new Set())!.distance).toBe(before - 1);
  });

  it('walking into a prowler starts a fight; winning removes it until the party returns to town', () => {
    const game = Game.newGame(1);
    game.enterFloor(0);
    game.state.encounterAt = 999;
    const p = game.progress.prowlers[0];
    game.state.x = p.x - 1;
    game.state.y = p.y;
    game.state.dir = 1;
    p.stun = 1; // keep it in place for this step
    const events = game.step(1, 0);
    const ev = events.find((e) => e.type === 'prowler');
    expect(ev).toEqual({ type: 'prowler', index: 0 });

    const combat = game.startProwlerCombat(0);
    expect(combat.canFlee).toBe(true);
    combat.enemies.forEach((e) => (e.hp = 1));
    for (let r = 0; r < 5 && !combat.outcome; r++) combat.resolveRound(game.state.party.map(() => ({ kind: 'attack', target: 0 })));
    game.finishCombat(combat);
    expect(p.defeated).toBe(true);
    expect(game.prowlerAt(p.x, p.y)).toBe(-1);

    game.returnToTown();
    expect(game.progress.prowlers[0].defeated).toBe(false);
  });

  it('after fleeing, the prowler is dazed for 3 steps', () => {
    const game = Game.newGame(1);
    game.enterFloor(0);
    const combat = game.startProwlerCombat(0);
    combat.outcome = 'fled';
    game.finishCombat(combat);
    const p = game.progress.prowlers[0];
    const at = { x: p.x, y: p.y };
    for (let i = 0; i < 3; i++) moveProwlers(game.map, game.floorDef, game.progress.prowlers, { x: 1, y: 1 });
    expect({ x: p.x, y: p.y }).toEqual(at);
    moveProwlers(game.map, game.floorDef, game.progress.prowlers, { x: 1, y: 1 });
    expect({ x: p.x, y: p.y }).not.toEqual(at);
  });
});

describe('chart (player-drawn map)', () => {
  it('assisted mode fills in the cells the party walks on, and nothing else', () => {
    const game = Game.newGame(1);
    game.enterFloor(0);
    game.state.encounterAt = 999;
    const w = game.map.width;
    const start = game.state.y * w + game.state.x;
    expect(terrainAt(game.chart, start)).toBe('floor');
    game.step(1, 0);
    expect(terrainAt(game.chart, game.state.y * w + game.state.x)).toBe('floor');
    // A wall next to the party is seen, but not drawn for the player.
    expect(terrainAt(game.chart, (game.state.y - 1) * w + game.state.x)).toBe('none');
  });

  it('manual mode draws nothing by itself', () => {
    const game = Game.newGame(1);
    game.state.chartMode = 'manual';
    game.enterFloor(0);
    game.state.encounterAt = 999;
    game.step(1, 0);
    expect(game.chart.terrain).not.toContain('1');
  });

  it('draws terrain, marks and notes, and erases them', () => {
    const chart = emptyChart(10);
    setTerrain(chart, 3, 'wall');
    expect(terrainAt(chart, 3)).toBe('wall');
    setMark(chart, 4, 'chest');
    setNote(chart, 5, '  Locked door, need a key  ');
    expect(chart.notes[5]).toBe('Locked door, need a key');
    expect(chart.marks[5]).toBe('note');
    setNote(chart, 6, 'x'.repeat(200));
    expect(chart.notes[6].length).toBe(NOTE_MAX_LENGTH);
    setNote(chart, 5, '');
    expect(chart.marks[5]).toBeUndefined();
    eraseCell(chart, 3);
    eraseCell(chart, 4);
    expect(terrainAt(chart, 3)).toBe('none');
    expect(chart.marks[4]).toBeUndefined();
  });

  it('each floor keeps its own chart, and it survives a save', () => {
    const game = Game.newGame(1);
    game.enterFloor(0);
    setNote(game.chart, 20, 'Grimtusk lair');
    game.enterFloor(1, true);
    expect(game.chart.notes[20]).toBeUndefined();
    const copy = Game.load(game.serialize());
    expect(copy.state.progress[0].chart.notes[20]).toBe('Grimtusk lair');
  });

  it('older saves without a chart get an empty one', () => {
    const state = JSON.parse(Game.newGame(1).serialize()) as Omit<GameState, 'chartMode'> & { chartMode?: unknown };
    delete state.chartMode;
    for (const p of state.progress) delete (p as Partial<typeof p>).chart;
    const game = Game.load(JSON.stringify(state));
    expect(game.state.chartMode).toBe('assisted');
    expect(game.chart.terrain.length).toBe(game.map.width * game.map.height);
  });
});
