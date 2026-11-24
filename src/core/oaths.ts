/**
 * Deeper oaths and new oaths: what Oath Tokens buy once the hall is full.
 *
 * - An adventurer can swear a deeper oath (First Oath → Fifth Oath). Each oath makes every level they have, and will
 *   have, count for a little more: +3% to their own stats per oath (gear is not touched). The next oath opens once
 *   the chapter before it is beaten and the adventurer has the level for it, and costs as many tokens as its number.
 * - An adventurer can swear a new oath as another class: they keep their level, oath, name, look and saga, and get
 *   every skill point back to spend in the new tree. Gear the new class cannot wear is sold back to Hilde.
 */
import { CLASSES } from './data/classes';
import { EQUIPMENT } from './data/equipment';
import { FLOORS_PER_CHAPTER } from './data/chapters';
import { classUnlocked } from './deeds';
import type { Game } from './game';
import { memberStats } from './party';
export { OATH_BONUS } from './party';
import type { ClassId, Member } from './types';

export const OATH_NAMES = ['First Oath', 'Second Oath', 'Third Oath', 'Fourth Oath', 'Fifth Oath'] as const;
export const MAX_OATH = OATH_NAMES.length - 1;

/**
 * The level an adventurer needs for each oath. The server checks it too (an expedition will not take a Fifth Oath at
 * level 3), so it stays below what any party that beat the chapter before has.
 */
export const OATH_LEVEL = [1, 10, 25, 40, 50] as const;

export function oathOf(m: Member): number {
  const o = m.oathRank ?? 0;
  return Number.isInteger(o) && o >= 0 && o <= MAX_OATH ? o : 0;
}

export function oathName(m: Member): string {
  return OATH_NAMES[oathOf(m)];
}

/** Whether `rank` is an oath an adventurer of `level` could honestly hold (used for saves and on the server). */
export function validOath(rank: unknown, level: number): boolean {
  return rank === undefined || (Number.isInteger(rank) && (rank as number) >= 0 && (rank as number) <= MAX_OATH && level >= OATH_LEVEL[rank as number]);
}

/** Tokens the next oath costs. */
export function deeperOathCost(m: Member): number {
  return oathOf(m) + 1;
}

/** Why `m` cannot swear the next oath now, or null when they can. */
export function deeperOathProblem(game: Game, m: Member): string | null {
  const next = oathOf(m) + 1;
  if (next > MAX_OATH) return `${m.name} has sworn the ${OATH_NAMES[MAX_OATH]}, the deepest there is.`;
  // The Second Oath opens with chapter I's last guardian, the Third with chapter II's, and so on.
  const guardianFloor = next * FLOORS_PER_CHAPTER - 1;
  if (!game.state.progress[guardianFloor]?.bossDefeated) return `The ${OATH_NAMES[next]} opens once the guardian at the end of chapter ${roman(next)} has fallen.`;
  if (m.level < OATH_LEVEL[next]) return `${m.name} needs level ${OATH_LEVEL[next]} for the ${OATH_NAMES[next]}.`;
  const cost = deeperOathCost(m);
  if ((game.state.inventory.oathToken ?? 0) < cost) return `The ${OATH_NAMES[next]} takes ${cost} Oath Token${cost === 1 ? '' : 's'}.`;
  return null;
}

/** Swears the next oath: returns an error message, or null when done. */
export function swearDeeperOath(game: Game, m: Member): string | null {
  const problem = deeperOathProblem(game, m);
  if (problem) return problem;
  const before = memberStats(m);
  game.state.inventory.oathToken = (game.state.inventory.oathToken ?? 0) - deeperOathCost(m);
  m.oathRank = oathOf(m) + 1;
  // The new strength is there at once, on top of what they have left.
  const after = memberStats(m);
  m.hp = Math.min(after.hp, m.hp + (after.hp - before.hp));
  m.sp = Math.min(after.sp, m.sp + (after.sp - before.sp));
  return null;
}

/** Tokens and gold a change of class costs. */
export function classChangeCost(m: Member): { tokens: number; gold: number } {
  return { tokens: 1, gold: 50 + m.level * 40 };
}

/** Why `m` cannot become `classId` now, or null when they can. */
export function classChangeProblem(game: Game, m: Member, classId: ClassId): string | null {
  if (!CLASSES[classId] || !classUnlocked(game, classId)) return 'Unknown class.';
  if (m.classId === classId) return `${m.name} is a ${CLASSES[classId].name} already.`;
  if (m.ravenRun !== undefined) return `${m.name} is out on a Raven Run.`;
  const cost = classChangeCost(m);
  if ((game.state.inventory.oathToken ?? 0) < cost.tokens) return 'A new oath takes an Oath Token.';
  if (game.state.gold < cost.gold) return `A new oath costs ${cost.gold} G.`;
  return null;
}

/** Makes `m` a `classId`: returns an error message, or null when done. */
export function changeClass(game: Game, m: Member, classId: ClassId): string | null {
  const problem = classChangeProblem(game, m, classId);
  if (problem) return problem;
  const cost = classChangeCost(m);
  game.state.inventory.oathToken = (game.state.inventory.oathToken ?? 0) - cost.tokens;
  game.state.gold -= cost.gold;
  m.classId = classId;
  m.skills = {};
  // Gear the new class cannot wear goes back to Hilde for half its price.
  for (const slot of ['weapon', 'armor'] as const) {
    const id = m[slot];
    if (id && !EQUIPMENT[id]?.classes.includes(classId)) {
      game.state.gold += Math.floor((EQUIPMENT[id]?.price ?? 0) / 2);
      delete m[slot];
    }
  }
  const max = memberStats(m);
  m.hp = Math.min(m.hp, max.hp);
  m.sp = Math.min(m.sp, max.sp);
  return null;
}

function roman(n: number): string {
  return ['', 'I', 'II', 'III', 'IV', 'V'][n] ?? String(n);
}
