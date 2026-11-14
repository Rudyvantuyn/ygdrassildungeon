/**
 * Raven Runs: adventurers from the reserve go scouting on a floor the party has reached, for a few real hours.
 * Huginn and Muninn bring word back. The fights are played out with the game's own rules and the computer player
 * the moment the run sets out (from a seed, so reloading changes nothing): a strong team on an easy floor comes back
 * whole, a weak one sent too deep is routed. Runs bring materials and the odd item, never experience, gold or Oath
 * Tokens: scouts are not trainees, so nobody comes back overlevelled.
 */
import { Combat } from './combat';
import { FLOORS } from './data/floors';
import { makeInventory } from './data/items';
import { GATHER_KINDS, type GatherKind } from './data/gathering';
import { isGatherTile, parseFloor } from './dungeon';
import { gatherFinds, type Game } from './game';
import { fullRestore, healAmount, healMember, isAlive, memberStats, revive } from './party';
import { Rng } from './rng';
import { fullScaleRank, rankOf, skillFor } from './skilltree';
import { innCost } from './town';
import { count } from './deeds';
import { chooseCommands } from './tactics';
import type { ItemId, Member } from './types';

export type RunLength = 'short' | 'long' | 'overnight';

export const RUN_LENGTHS: Record<RunLength, { name: string; hours: number; fights: number }> = {
  short: { name: 'Short', hours: 3, fights: 3 },
  long: { name: 'Long', hours: 8, fights: 6 },
  overnight: { name: 'Overnight', hours: 14, fights: 10 },
};

export const MAX_RUNS = 2;
export const MAX_RUNNERS = 3;
/** Hours a wounded scout rests before they can go out again. */
export const WOUND_HOURS = 12;
/** From floor 5 on, the chance a run crosses a prowler's path. */
export const PROWLER_CHANCE = 0.15;
/** Fleeing a prowler is always this chance, as in the dungeon. */
export const PROWLER_FLEE = 0.3;
/** Share of monster parts the scouts manage to carry home. */
export const PARTS_KEPT = 0.5;
/** The Inn's healer costs this many nights at the Inn, per wounded adventurer. */
export const HEALER_NIGHTS = 3;

const HOUR = 3600_000;

export type RunOutcome = 'good' | 'close' | 'routed';

export interface RunReport {
  outcome: RunOutcome;
  /** Fights fought and won. */
  fought: number;
  won: number;
  /** A prowler crossed their path: slipped away, beaten, or the end of the run. */
  prowler: 'none' | 'escaped' | 'beaten' | 'lost';
  /** Material id → pieces brought home. */
  materials: Record<string, number>;
  items: Partial<Record<ItemId, number>>;
  /** Oath numbers of the scouts who come back wounded. */
  wounded: number[];
}

export interface RavenRun {
  id: number;
  floor: number;
  length: RunLength;
  /** Oath numbers of the scouts. */
  members: number[];
  sentAt: number;
  returnAt: number;
  /** Settled when the run sets out; shown when it is collected. */
  report: RunReport;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** The latest time the game has seen: a clock turned back does not make a run shorter or longer. */
export function gameNow(game: Game, now: number): number {
  game.state.clock = Math.max(game.state.clock ?? 0, now);
  return game.state.clock;
}

export function runs(game: Game): RavenRun[] {
  return (game.state.ravenRuns ??= []);
}

function everyone(game: Game): Member[] {
  return [...game.state.party, ...game.state.reserve];
}

export function memberByOath(game: Game, oath: number): Member | undefined {
  return everyone(game).find((m) => m.oath === oath);
}

export function isWounded(m: Member, now: number): boolean {
  return (m.woundedUntil ?? 0) > now;
}

/** Why this adventurer cannot join the party or go anywhere right now, or null. */
export function unavailable(m: Member, now: number): string | null {
  if (m.ravenRun !== undefined) return 'Out on a Raven Run.';
  if (isWounded(m, now)) return `Wounded: resting for ${timeLeft(m.woundedUntil! - now)} more (or see the healer at the Inn).`;
  return null;
}

/** "5h 12m", "12m", "less than a minute". */
export function timeLeft(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  if (minutes <= 0) return 'less than a minute';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** Reserve members who could be sent out now. */
export function scoutsFree(game: Game, now: number): Member[] {
  return game.state.reserve.filter((m) => !unavailable(m, now));
}

/** Floors a run may go to: every floor the party has reached, never deeper. */
export function runFloors(game: Game): number[] {
  return FLOORS.slice(0, game.state.deepest + 1).map((_, i) => i);
}

/** An error message, or null when the run can set out. */
export function canSend(game: Game, oaths: number[], floor: number, now: number): string | null {
  if (runs(game).length >= MAX_RUNS) return `At most ${MAX_RUNS} runs can be out at once.`;
  if (oaths.length < 1 || oaths.length > MAX_RUNNERS) return `Send 1 to ${MAX_RUNNERS} adventurers.`;
  if (new Set(oaths).size !== oaths.length) return 'Everyone can only go once.';
  if (!runFloors(game).includes(floor)) return 'The ravens only know the floors your party has reached.';
  for (const oath of oaths) {
    const m = game.state.reserve.find((r) => r.oath === oath);
    if (!m) return 'Only adventurers in the reserve can be sent out.';
    const why = unavailable(m, now);
    if (why) return `${m.name}: ${why}`;
  }
  return null;
}

/** Send scouts out. Returns the run, or an error message. */
export function sendRun(game: Game, oaths: number[], floor: number, length: RunLength, now: number, seed: number): RavenRun | string {
  now = gameNow(game, now);
  const problem = canSend(game, oaths, floor, now);
  if (problem) return problem;
  const team = oaths.map((o) => game.state.reserve.find((r) => r.oath === o)!);
  const id = (game.state.nextRunId ?? 1);
  game.state.nextRunId = id + 1;
  const run: RavenRun = {
    id,
    floor,
    length,
    members: oaths,
    sentAt: now,
    returnAt: now + RUN_LENGTHS[length].hours * HOUR,
    report: simulateRun(team, floor, length, seed),
  };
  for (const m of team) m.ravenRun = id;
  runs(game).push(run);
  return run;
}

/** Runs that are back and can be collected. */
export function runsBack(game: Game, now: number): RavenRun[] {
  const t = gameNow(game, now);
  return runs(game).filter((r) => r.returnAt <= t);
}

/** Bring a returned run home: its finds go into the bag, the wounded start resting. */
export function collectRun(game: Game, id: number, now: number): RunReport | null {
  const t = gameNow(game, now);
  const list = runs(game);
  const i = list.findIndex((r) => r.id === id && r.returnAt <= t);
  if (i < 0) return null;
  const [run] = list.splice(i, 1);
  const { materials, items, wounded } = run.report;
  count(game, 'runs');
  if (!wounded.length) count(game, 'safeRuns');
  for (const [mid, n] of Object.entries(materials)) game.state.materials[mid] = (game.state.materials[mid] ?? 0) + n;
  for (const [item, n] of Object.entries(items) as [ItemId, number][]) game.state.inventory[item] = (game.state.inventory[item] ?? 0) + n;
  for (const oath of run.members) {
    const m = memberByOath(game, oath);
    if (!m) continue;
    delete m.ravenRun;
    if (wounded.includes(oath)) m.woundedUntil = run.returnAt + WOUND_HOURS * HOUR;
  }
  return run.report;
}

export function healerCost(game: Game): number {
  return innCost(game) * HEALER_NIGHTS;
}

/** The Inn's healer sees to a wounded adventurer at once. */
export function healWound(game: Game, oath: number, now: number): boolean {
  const m = memberByOath(game, oath);
  const cost = healerCost(game);
  if (!m || !isWounded(m, gameNow(game, now)) || game.state.gold < cost) return false;
  game.state.gold -= cost;
  delete m.woundedUntil;
  return true;
}

/** Gathering kinds that have a spot on this floor. */
function gatherKindsOn(floor: number): GatherKind[] {
  const kinds = new Set<GatherKind>();
  for (const tile of parseFloor(FLOORS[floor]).tiles) if (isGatherTile(tile)) kinds.add(tile);
  return [...kinds];
}

/** Between fights the scouts patch each other up with their own skills; they carry no supplies. */
function patchUp(team: Member[]): void {
  for (const healer of team) {
    if (!isAlive(healer)) continue;
    const rekindle = skillFor(healer, 'rekindle');
    for (const m of team) {
      if (isAlive(m) || !rekindle || healer.sp < rekindle.sp) continue;
      healer.sp -= rekindle.sp;
      revive(m, rekindle.power);
    }
    const mend = skillFor(healer, 'mend');
    for (const m of team) {
      while (mend && isAlive(m) && healer.sp >= mend.sp && m.hp < memberStats(m).hp * 0.7) {
        healer.sp -= mend.sp;
        healMember(m, healAmount(healer, mend.power));
      }
    }
  }
}

/**
 * Play the run out: `fights` ordinary fights on the floor (from floor 5 on, maybe a prowler), HP carried from one
 * to the next. Works on copies: the real adventurers gain nothing but what the report says.
 */
export function simulateRun(members: Member[], floor: number, length: RunLength, seed: number): RunReport {
  const rng = new Rng(seed);
  const def = FLOORS[floor];
  const depth = def.depth ?? floor;
  const team = members.map((m) => clone(m));
  fullRestore(team);
  const bag = makeInventory();
  const fights = RUN_LENGTHS[length].fights;
  const fell = new Set<number>();
  const parts: string[] = [];
  let won = 0;
  let fought = 0;
  let prowler: RunReport['prowler'] = 'none';
  let routed = false;
  const prowlerAt = depth >= 4 && def.prowlers.length && rng.chance(PROWLER_CHANCE) ? rng.int(0, fights - 1) : -1;

  for (let i = 0; i < fights && !routed; i++) {
    let combat: Combat;
    if (i === prowlerAt) {
      if (rng.chance(PROWLER_FLEE)) {
        prowler = 'escaped';
        continue;
      }
      combat = new Combat(team, rng.pick(def.prowlers).enemies, bag, rng, { prowler: true, oathToken: false });
    } else {
      // Scouts pick their fights: they slip past the bigger part of a pack and take on as many as they are.
      combat = new Combat(team, rng.weighted(def.encounters).enemies.slice(0, team.length), bag, rng);
    }
    fought++;
    for (let round = 0; !combat.outcome && round < 200; round++) {
      combat.resolveRound(chooseCommands(combat));
      team.forEach((m, k) => !isAlive(m) && fell.add(k));
    }
    if (combat.outcome === 'victory') {
      won++;
      if (i === prowlerAt) prowler = 'beaten';
      for (const id of combat.rewards?.materials ?? []) if (rng.chance(PARTS_KEPT)) parts.push(id);
    } else if (combat.outcome !== 'fled') {
      routed = true;
      if (i === prowlerAt) prowler = 'lost';
    }
    patchUp(team);
  }

  // Scouts who know a gathering skill stop to gather about once every three fights, at a spot they know how to use.
  const finds: string[] = [];
  const known = gatherKindsOn(floor)
    .map((kind) => ({ kind, skill: GATHER_KINDS[kind].skill }))
    .map((k) => ({ ...k, rank: Math.max(0, ...members.map((m) => rankOf(m, k.skill))) }))
    .filter((k) => k.rank > 0);
  if (known.length) {
    for (let s = 0; s < Math.ceil(fought / 3); s++) {
      const spot = rng.pick(known);
      // In a hurry: one find per stop (a better rank still finds rarer things).
      finds.push(gatherFinds(depth, spot.kind, fullScaleRank(spot.skill, spot.rank), rng)[0]);
    }
  }

  // Routed: they drop half of what they carried on the way out.
  const keep = () => !routed || rng.chance(0.5);
  const materials: Record<string, number> = {};
  for (const id of [...parts, ...finds]) if (keep()) materials[id] = (materials[id] ?? 0) + 1;
  const items: Partial<Record<ItemId, number>> = {};
  for (const [item, n] of Object.entries(bag) as [ItemId, number][]) {
    let kept = 0;
    for (let k = 0; k < n; k++) if (keep()) kept++;
    if (kept && item !== 'oathToken') items[item] = kept;
  }

  const wounded = routed ? members.map((m) => m.oath!) : [...fell].map((k) => members[k].oath!);
  return { outcome: routed ? 'routed' : fell.size ? 'close' : 'good', fought, won, prowler, materials, items, wounded };
}
