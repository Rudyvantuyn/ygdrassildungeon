/**
 * A simple computer player, used by tests to check that the game can be
 * finished and that the difficulty stays in a sensible range.
 */
import type { Combat, Command } from './combat';
import { SKILLS } from './data/skills';
import { DX, DY, isPassable, type FloorMap } from './dungeon';
import { Game } from './game';
import { buyEquipment, buyItem, canEquip, equipmentForSale, innCost, netPrice, restAtInn } from './town';
import { healAmount, healMember, isAlive, knownSkills, memberStats } from './party';
import type { Dir, SkillId } from './types';

export interface AutoplayResult {
  cleared: boolean;
  diedOnFloor: number | null;
  battles: number;
  levels: number[];
  bossRounds: number;
}

export function chooseCommands(combat: Combat): (Command | null)[] {
  const party = combat.party;
  const living = combat.livingEnemies();
  const weakest = living.reduce((a, b) => (combat.enemies[a].hp <= combat.enemies[b].hp ? a : b));
  const knows = (i: number, id: SkillId) => knownSkills(party[i]).some((s) => s.id === id);
  const canUse = (i: number, id: SkillId) => knows(i, id) && party[i].sp >= SKILLS[id].sp;
  const hurt = party.flatMap((m, i) => (isAlive(m) && m.hp < memberStats(m).hp * 0.45 ? [i] : []));

  return party.map((m, i): Command | null => {
    if (!isAlive(m)) return null;
    switch (m.classId) {
      case 'mender':
        if (hurt.length >= 2 && canUse(i, 'verdantChorus')) return { kind: 'skill', skill: 'verdantChorus', target: -1 };
        if (hurt.length >= 1 && canUse(i, 'mend')) return { kind: 'skill', skill: 'mend', target: hurt[0] };
        if (hurt.length >= 1 && combat.inventory.sapTonic > 0) return { kind: 'item', item: 'sapTonic', target: hurt[0] };
        break;
      case 'runecaller': {
        if (living.length >= 2 && canUse(i, 'wildfire')) return { kind: 'skill', skill: 'wildfire', target: -1 };
        const weak = combat.enemies[weakest].def.weak;
        const runes = { fire: 'emberRune', frost: 'frostRune', storm: 'stormRune' } as const;
        const element = (['fire', 'frost', 'storm'] as const).find((e) => weak.includes(e)) ?? 'fire';
        const spell = runes[element];
        if (canUse(i, spell)) return { kind: 'skill', skill: spell, target: weakest };
        break;
      }
      case 'strider':
        if (living.length >= 3 && canUse(i, 'scatterVolley')) return { kind: 'skill', skill: 'scatterVolley', target: -1 };
        if (combat.boss && canUse(i, 'twinFang')) return { kind: 'skill', skill: 'twinFang', target: weakest };
        break;
      case 'bastion':
        if (combat.boss && canUse(i, 'ironFormation') && combat.status[i].guard === 0) return { kind: 'skill', skill: 'ironFormation', target: -1 };
        break;
    }
    return { kind: 'attack', target: weakest };
  });
}

function fight(game: Game, combat: Combat): number {
  let rounds = 0;
  while (!combat.outcome && rounds < 200) {
    combat.resolveRound(chooseCommands(combat));
    rounds++;
  }
  game.finishCombat(combat);
  return rounds;
}

/** Heal up between fights the way a careful player would. */
function healBetweenFights(game: Game): void {
  const party = game.state.party;
  const wren = party.find((m) => m.classId === 'mender');
  for (const m of party) {
    if (!isAlive(m)) continue;
    while (m.hp < memberStats(m).hp * 0.7) {
      if (wren && isAlive(wren) && wren.sp >= SKILLS.mend.sp) {
        wren.sp -= SKILLS.mend.sp;
        healMember(m, healAmount(wren, 100));
      } else if (game.state.inventory.sapTonic > 0) {
        game.state.inventory.sapTonic -= 1;
        healMember(m, 60);
      } else break;
    }
  }
}

function path(map: FloorMap, from: { x: number; y: number }, to: { x: number; y: number }): Dir[] {
  const key = (x: number, y: number) => y * map.width + x;
  const prev = new Map<number, { from: number; dir: Dir }>();
  const queue = [from];
  const seen = new Set([key(from.x, from.y)]);
  while (queue.length) {
    const c = queue.shift()!;
    if (c.x === to.x && c.y === to.y) break;
    for (let d = 0; d < 4; d++) {
      const nx = c.x + DX[d];
      const ny = c.y + DY[d];
      if (!isPassable(map, nx, ny) || seen.has(key(nx, ny))) continue;
      seen.add(key(nx, ny));
      prev.set(key(nx, ny), { from: key(c.x, c.y), dir: d as Dir });
      queue.push({ x: nx, y: ny });
    }
  }
  const dirs: Dir[] = [];
  let k = key(to.x, to.y);
  while (k !== key(from.x, from.y)) {
    const p = prev.get(k);
    if (!p) return [];
    dirs.unshift(p.dir);
    k = p.from;
  }
  return dirs;
}

function find(map: FloorMap, tile: string): { x: number; y: number }[] {
  return map.tiles.flatMap((t, i) => (t === tile ? [{ x: i % map.width, y: Math.floor(i / map.width) }] : []));
}

/** A town visit: buy the best gear that fits the budget, top up Sap Tonic, sleep at the inn. */
function visitTown(game: Game): void {
  game.returnToTown();
  restAtInn(game);
  const forSale = equipmentForSale(game).sort((a, b) => b.price - a.price);
  for (const slot of ['weapon', 'armor'] as const) {
    game.state.party.forEach((m, i) => {
      const best = forSale.find((e) => e.slot === slot && canEquip(m, e) && m[slot] !== e.id && netPrice(m, e) > 0 && netPrice(m, e) <= game.state.gold - innCost(game));
      const current = m[slot] ? forSale.find((e) => e.id === m[slot]) : undefined;
      if (best && (!current || best.price > current.price)) buyEquipment(game, best.id, i);
    });
  }
  while ((game.state.inventory.sapTonic ?? 0) < 5 && buyItem(game, 'sapTonic'));
}

export function autoplay(seed: number, opts: { grindBattles?: number; town?: boolean } = {}): AutoplayResult {
  const game = Game.newGame(seed);
  game.enterFloor(0);
  let bossRounds = 0;

  const walkTo = (target: { x: number; y: number }): boolean => {
    for (const dir of path(game.map, game.state, target)) {
      game.state.dir = dir;
      for (const ev of game.step(1, 0)) {
        if (ev.type === 'encounter' || ev.type === 'prowler') {
          fight(game, ev.type === 'prowler' ? game.startProwlerCombat(ev.index) : game.startCombat(ev.enemies));
          if (!game.partyAlive) return false;
          healBetweenFights(game);
        }
      }
    }
    return true;
  };

  for (let floor = 0; floor < 3; floor++) {
    if (opts.town) {
      visitTown(game);
      game.enterFloor(floor);
    }
    // Optional grinding first: pace back and forth.
    for (let i = 0; i < (opts.grindBattles ?? 0); i++) {
      const before = game.state.battles;
      while (game.state.battles === before) {
        const here = { x: game.state.x, y: game.state.y };
        const next = [0, 1, 2, 3].map((d) => ({ x: here.x + DX[d], y: here.y + DY[d] })).find((c) => isPassable(game.map, c.x, c.y))!;
        if (!walkTo(next) || !walkTo(here)) return result(game, floor, bossRounds);
      }
    }
    const goals = [...game.map.chests, ...find(game.map, 'spring')];
    for (const goal of goals) {
      if (!walkTo(goal)) return result(game, floor, bossRounds);
      game.drinkSpring();
    }
    if (floor < 2) {
      if (!walkTo(find(game.map, 'stairs')[0])) return result(game, floor, bossRounds);
      game.descend();
    } else {
      const boss = find(game.map, 'boss')[0];
      const approach = path(game.map, game.state, boss);
      // Stop one step short to heal up, then enter the boss tile.
      const before = { x: boss.x - DX[approach[approach.length - 1]], y: boss.y - DY[approach[approach.length - 1]] };
      if (!walkTo(before)) return result(game, floor, bossRounds);
      healBetweenFights(game);
      game.state.dir = approach[approach.length - 1];
      game.step(1, 0);
      bossRounds = fight(game, game.startBossCombat());
      if (!game.partyAlive) return result(game, floor, bossRounds);
    }
  }
  return result(game, null, bossRounds);
}

function result(game: Game, diedOnFloor: number | null, bossRounds: number): AutoplayResult {
  return {
    cleared: game.state.cleared,
    diedOnFloor,
    battles: game.state.battles,
    levels: game.state.party.map((m) => m.level),
    bossRounds,
  };
}
