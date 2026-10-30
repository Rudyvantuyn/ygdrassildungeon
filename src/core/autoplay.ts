/**
 * A simple computer player, used by tests to check that the game can be
 * finished and that the difficulty stays in a sensible range.
 */
import type { Combat } from './combat';
import { chooseCommands } from './tactics';

export { chooseCommands };
import { DX, DY, isPassable, type FloorMap } from './dungeon';
import { startFloorFor } from './data/chapters';
import { FLOORS } from './data/floors';
import { Game, type StepEvent } from './game';
import { buyEquipment, buyItem, canEquip, equipmentForSale, innCost, netPrice, restAtInn, sellMaterial } from './town';
import { healAmount, healMember, isAlive, memberStats, revive } from './party';
import { autoSpend, skillFor } from './skilltree';
import { ITEMS } from './data/items';
import type { Dir } from './types';

export interface AutoplayResult {
  /** Beat the final boss. */
  cleared: boolean;
  bossesDefeated: number;
  diedOnFloor: number | null;
  battles: number;
  levels: number[];
  bossRounds: number;
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
    if (isAlive(m)) continue;
    const rekindle = wren && skillFor(wren, 'rekindle');
    if (wren && rekindle && isAlive(wren) && wren.sp >= rekindle.sp) {
      wren.sp -= rekindle.sp;
      revive(m, rekindle.power);
    } else if ((game.state.inventory.kindlingMoss ?? 0) > 0) {
      game.state.inventory.kindlingMoss -= 1;
      revive(m, ITEMS.kindlingMoss.amount);
    }
  }
  for (const m of party) {
    if (!isAlive(m)) continue;
    while (m.hp < memberStats(m).hp * 0.7) {
      const mend = wren && skillFor(wren, 'mend');
      if (wren && mend && isAlive(wren) && wren.sp >= mend.sp) {
        wren.sp -= mend.sp;
        healMember(m, healAmount(wren, mend.power));
      } else if (game.state.inventory.sapTonic > 0) {
        game.state.inventory.sapTonic -= 1;
        healMember(m, 60);
      } else break;
    }
  }
}

/** The Mender can barely heal any more and the party is worn down. */
function outOfSteam(game: Game): boolean {
  const party = game.state.party;
  const wren = party.find((m) => m.classId === 'mender');
  const hp = party.reduce((sum, m) => sum + m.hp, 0) / party.reduce((sum, m) => sum + memberStats(m).hp, 0);
  return !!wren && wren.sp < (skillFor(wren, 'mend')?.sp ?? 3) * 3 && hp < 0.6;
}

/** Shortest walk from `from` to `to`; cells in `avoid` are only entered if they are the goal. */
function path(map: FloorMap, from: { x: number; y: number }, to: { x: number; y: number }, avoid?: Set<number>): Dir[] {
  const key = (x: number, y: number) => y * map.width + x;
  const goal = key(to.x, to.y);
  const prev = new Map<number, { from: number; dir: Dir }>();
  const queue = [from];
  const seen = new Set([key(from.x, from.y)]);
  while (queue.length) {
    const c = queue.shift()!;
    if (c.x === to.x && c.y === to.y) break;
    for (let d = 0; d < 4; d++) {
      const nx = c.x + DX[d];
      const ny = c.y + DY[d];
      const k = key(nx, ny);
      if (!isPassable(map, nx, ny) || seen.has(k) || (k !== goal && avoid?.has(k))) continue;
      seen.add(k);
      prev.set(k, { from: key(c.x, c.y), dir: d as Dir });
      queue.push({ x: nx, y: ny });
    }
  }
  const dirs: Dir[] = [];
  let k = goal;
  while (k !== key(from.x, from.y)) {
    const p = prev.get(k);
    if (!p) return [];
    dirs.unshift(p.dir);
    k = p.from;
  }
  return dirs;
}

/** Cells a careful player keeps away from: around every prowler, wider around hunters. */
function prowlerZone(game: Game): Set<number> {
  const zone = new Set<number>();
  const { map } = game;
  game.progress.prowlers.forEach((p, i) => {
    if (p.defeated) return;
    const r = 2 + game.floorDef.prowlers[i].hunt;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= r) zone.add((p.y + dy) * map.width + (p.x + dx));
      }
    }
  });
  return zone;
}

function find(map: FloorMap, tile: string): { x: number; y: number }[] {
  return map.tiles.flatMap((t, i) => (t === tile ? [{ x: i % map.width, y: Math.floor(i / map.width) }] : []));
}

/** A town visit: buy the best gear that fits the budget, top up Sap Tonic, sleep at the inn. */
function visitTown(game: Game): void {
  game.returnToTown();
  for (const id of Object.keys(game.state.materials)) sellMaterial(game, id, game.state.materials[id]);
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
  while ((game.state.inventory.kindlingMoss ?? 0) < 2 && buyItem(game, 'kindlingMoss'));
}

export interface AutoplayOptions {
  grindBattles?: number;
  town?: boolean;
  /** Stop after this many floors (default: all). */
  floors?: number;
}

export function autoplay(seed: number, opts: AutoplayOptions = {}): AutoplayResult {
  const game = Game.newGame(seed);
  game.enterFloor(0);
  let bossRounds = 0;
  const lastFloor = Math.min(FLOORS.length, opts.floors ?? FLOORS.length) - 1;

  /**
   * Back to town, then down again to `floor`: a descent starts at the chapter's first floor, so the party
   * walks (and fights) its way back down floor by floor.
   */
  let returning = 0;
  const backTo = (floor: number): boolean => {
    visitTown(game);
    game.enterFloor(startFloorFor(floor, game.state.deepest));
    returning += 1;
    try {
      while (game.state.floor < floor) {
        // Too many trips in a row without getting anywhere: carry on from here instead.
        if (returning > 3) return true;
        if (!walkTo(find(game.map, 'stairs')[0])) return false;
        game.descend();
      }
      return true;
    } finally {
      returning -= 1;
    }
  };

  const handle = (events: StepEvent[]): boolean => {
    for (const ev of events) {
      if (ev.type === 'encounter' || ev.type === 'prowler') {
        fight(game, ev.type === 'prowler' ? game.startProwlerCombat(ev.index) : game.startCombat(ev.enemies));
        if (!game.partyAlive) return false;
        // A player spends new skill points; the computer follows the recommended build.
        for (const m of game.state.party) autoSpend(m);
        healBetweenFights(game);
        // Someone is still down and can't be woken here, or the healer has run dry:
        // go back to the inn, then return to this floor.
        if (opts.town && returning === 0 && (!game.state.party.every(isAlive) || outOfSteam(game))) {
          if (!backTo(game.state.floor)) return false;
        }
      }
    }
    return true;
  };

  /** Walks one step at a time, steering clear of prowlers (waiting it out if it must). */
  const walkTo = (target: { x: number; y: number }): boolean => {
    for (let steps = 0; steps < 600; steps++) {
      if (game.state.x === target.x && game.state.y === target.y) return true;
      const zone = prowlerZone(game);
      let route = path(game.map, game.state, target, zone);
      if (route.length === 0) {
        // No safe way right now: step to the free neighbour farthest from the prowlers, or go anyway after a while.
        const free = [0, 1, 2, 3].filter((d) => {
          const k = (game.state.y + DY[d]) * game.map.width + game.state.x + DX[d];
          return isPassable(game.map, game.state.x + DX[d], game.state.y + DY[d]) && !zone.has(k);
        });
        route = steps < 300 && free.length ? [free[steps % free.length] as Dir] : path(game.map, game.state, target);
      }
      if (route.length === 0) return true;
      game.state.dir = route[0];
      if (!handle(game.step(1, 0))) return false;
    }
    return true;
  };

  for (let floor = 0; floor <= lastFloor; floor++) {
    // A new chapter starts with a trip to town; within a chapter the party only goes back when it must.
    if (opts.town && startFloorFor(floor, game.state.deepest) === floor && !backTo(floor)) return result(game, floor, bossRounds);
    // Optional grinding first: pace back and forth.
    for (let i = 0; i < (opts.grindBattles ?? 0); i++) {
      const before = game.state.battles;
      while (game.state.battles === before) {
        const here = { x: game.state.x, y: game.state.y };
        const next = [0, 1, 2, 3].map((d) => ({ x: here.x + DX[d], y: here.y + DY[d] })).find((c) => isPassable(game.map, c.x, c.y))!;
        if (!walkTo(next) || !walkTo(here)) return result(game, floor, bossRounds);
      }
    }
    for (const chest of game.map.chests) {
      // Stand next to the chest, face it and open it.
      const spot = [0, 1, 2, 3]
        .map((d) => ({ x: chest.x - DX[d], y: chest.y - DY[d], dir: d as Dir }))
        .find((c) => isPassable(game.map, c.x, c.y));
      if (!spot) continue;
      if (!walkTo(spot)) return result(game, floor, bossRounds);
      game.state.dir = spot.dir;
      game.interact();
    }
    for (const spring of find(game.map, 'spring')) {
      if (!walkTo(spring)) return result(game, floor, bossRounds);
      game.drinkSpring();
    }
    const boss = find(game.map, 'boss')[0];
    if (boss && !game.progress.bossDefeated) {
      // Rest at the inn first, like a sensible player would before a boss.
      if (opts.town && !backTo(floor)) return result(game, floor, bossRounds);
      // Top up at the spring on the way (it refills after a town visit).
      for (const spring of find(game.map, 'spring')) {
        if (!walkTo(spring)) return result(game, floor, bossRounds);
        game.drinkSpring();
      }
      const approach = path(game.map, game.state, boss);
      // Stop one step short to heal up, then enter the boss tile.
      const last = approach[approach.length - 1];
      if (!walkTo({ x: boss.x - DX[last], y: boss.y - DY[last] })) return result(game, floor, bossRounds);
      healBetweenFights(game);
      game.state.dir = last;
      game.step(1, 0);
      bossRounds = fight(game, game.startBossCombat());
      if (!game.partyAlive) return result(game, floor, bossRounds);
    }
    if (floor < lastFloor) {
      if (!walkTo(find(game.map, 'stairs')[0])) return result(game, floor, bossRounds);
      game.descend();
    }
  }
  return result(game, null, bossRounds);
}

function result(game: Game, diedOnFloor: number | null, bossRounds: number): AutoplayResult {
  return {
    cleared: game.state.cleared,
    bossesDefeated: game.state.progress.filter((p) => p.bossDefeated).length,
    diedOnFloor,
    battles: game.state.battles,
    levels: game.state.party.map((m) => m.level),
    bossRounds,
  };
}
