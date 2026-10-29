import { describe, expect, it } from 'vitest';
import { Combat, type Command } from './combat';
import { ENEMIES } from './data/enemies';
import { FLOORS } from './data/floors';
import { SKILLS } from './data/skills';
import { CLASSES } from './data/classes';
import { DX, DY, isPassable, parseFloor, relCell, tileAt, turnDir } from './dungeon';
import { Game } from './game';
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
    const before = game.state.inventory.medica;
    expect(game.step(1, 0).some((e) => e.type === 'chest')).toBe(true);
    expect(game.state.inventory.medica).toBe(before + 2);
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
    const [lief] = createStartingParty();
    const before = memberStats(lief);
    expect(grantXp(lief, xpForLevel(3))).toBe(2);
    expect(lief.level).toBe(3);
    expect(memberStats(lief).hp).toBeGreaterThan(before.hp);
    expect(lief.hp).toBe(memberStats(lief).hp);
  });
});

describe('combat', () => {
  const inventory = (): Record<ItemId, number> => ({ medica: 2, amrita: 0 });
  const attackAll = (combat: Combat): Command[] => combat.party.map(() => ({ kind: 'attack', target: 0 }));

  it('a fresh party beats two slimes', () => {
    const party = createStartingParty();
    const combat = new Combat(party, ['mossSlime', 'mossSlime'], inventory(), new Rng(5));
    expect(combat.enemies.map((e) => e.name)).toEqual(['Moss Slime A', 'Moss Slime B']);
    for (let round = 0; round < 20 && !combat.outcome; round++) combat.resolveRound(attackAll(combat));
    expect(combat.outcome).toBe('victory');
    expect(combat.rewards!.xp).toBe(ENEMIES.mossSlime.xp * 2);
    expect(party.every((m) => m.xp === ENEMIES.mossSlime.xp * 2)).toBe(true);
  });

  it('weakness boosts elemental damage', () => {
    const run = (skill: 'fire' | 'ice') => {
      const party = createStartingParty();
      const combat = new Combat(party, ['mossSlime'], inventory(), new Rng(11));
      combat.enemies[0].hp = combat.enemies[0].maxHp = 9999;
      const commands: (Command | null)[] = [null, null, null, { kind: 'skill', skill, target: 0 }];
      const events = combat.resolveRound(commands);
      const hit = events.find((e) => e.type === 'damage' && e.side === 'enemy');
      return hit && hit.type === 'damage' ? hit : null;
    };
    const fire = run('fire')!;
    const ice = run('ice')!;
    expect(fire.weak).toBe(true);
    expect(ice.weak).toBe(false);
    expect(fire.amount).toBeGreaterThan(ice.amount);
  });

  it('spends TP and heals with skills and items', () => {
    const party = createStartingParty();
    const inv = inventory();
    const combat = new Combat(party, ['mossSlime'], inv, new Rng(2));
    combat.enemies[0].hp = combat.enemies[0].maxHp = 9999;
    party[0].hp = 10;
    party[1].hp = 10;
    const mira = party[2];
    const tpBefore = mira.tp;
    combat.resolveRound([null, { kind: 'item', item: 'medica', target: 1 }, { kind: 'skill', skill: 'heal', target: 0 }, null]);
    expect(mira.tp).toBe(tpBefore - SKILLS.heal.tp);
    expect(inv.medica).toBe(1);
    expect(party[0].hp).toBeGreaterThan(10);
  });

  it('defending halves damage taken', () => {
    const avgDamage = (defend: boolean) => {
      let total = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const party = createStartingParty();
        const combat = new Combat(party, ['thornRat'], inventory(), new Rng(seed));
        combat.enemies[0].def = { ...combat.enemies[0].def, skills: [] };
        for (const m of party.slice(1)) m.hp = 0; // only Lief can be hit
        const events = combat.resolveRound([defend ? { kind: 'defend' } : null, null, null, null]);
        for (const e of events) if (e.type === 'damage' && e.side === 'party') total += e.amount;
      }
      return total;
    };
    expect(avgDamage(true)).toBeLessThan(avgDamage(false) * 0.65);
  });

  it('cannot flee from a boss', () => {
    const party = createStartingParty();
    const combat = new Combat(party, ['witheredWarden'], inventory(), new Rng(1), { boss: true });
    combat.resolveRound(party.map(() => ({ kind: 'flee' })));
    expect(combat.outcome).not.toBe('fled');
  });

  it('a party that does nothing is eventually defeated', () => {
    const party = createStartingParty();
    const combat = new Combat(party, ['witheredWarden'], inventory(), new Rng(9), { boss: true });
    for (let round = 0; round < 100 && !combat.outcome; round++) combat.resolveRound(party.map(() => ({ kind: 'defend' })));
    expect(combat.outcome).toBe('defeat');
  });

  it('game applies gold after victory and marks the boss defeated', () => {
    const game = Game.newGame(1);
    game.state.floor = 2;
    const combat = game.startBossCombat();
    combat.enemies[0].hp = 1;
    for (let r = 0; r < 5 && !combat.outcome; r++) combat.resolveRound(attackAll(combat));
    expect(combat.outcome).toBe('victory');
    game.finishCombat(combat);
    expect(game.state.gold).toBe(ENEMIES.witheredWarden.gold);
    expect(game.state.cleared).toBe(true);
  });
});
