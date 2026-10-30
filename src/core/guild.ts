import { CLASSES } from './data/classes';
import type { Game } from './game';
import { createMember } from './party';
import type { ClassId } from './types';

/** The Oath Hall: register adventurers and choose who goes into the Rootdeep. */
export const MAX_PARTY = 4;
export const MAX_ROSTER = 12;
export const NAME_MAX_LENGTH = 12;

/** A name as typed, cleaned up: invisible and control characters removed, spaces collapsed. */
export function cleanName(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/g, '').trim().replace(/\s+/g, ' ');
}

/** Length in characters as a player sees them (an emoji counts once). */
export function nameLength(name: string): number {
  return [...name].length;
}
/** The first adventurers swear the oath for free; after that each oath costs gold and an Oath Token. */
export const FOUNDING_OATHS = 4;

/** What swearing in the next adventurer costs. */
export function oathCost(game: Game): { gold: number; tokens: number } {
  const n = game.state.oaths ?? rosterSize(game);
  if (n < FOUNDING_OATHS) return { gold: 0, tokens: 0 };
  return { gold: Math.min(20000, 300 * 2 ** (n - FOUNDING_OATHS)), tokens: 1 };
}

export function rosterSize(game: Game): number {
  return game.state.party.length + game.state.reserve.length;
}

/** Returns an error message, or null when the new member was added (to the party if there is room, else the reserve). */
export function registerMember(game: Game, rawName: string, classId: ClassId): string | null {
  const name = cleanName(rawName);
  if (!name) return 'Give your adventurer a name.';
  if (nameLength(name) > NAME_MAX_LENGTH) return `Names can be at most ${NAME_MAX_LENGTH} letters.`;
  if (!CLASSES[classId]) return 'Unknown class.';
  const all = [...game.state.party, ...game.state.reserve];
  if (all.some((m) => m.name.toLowerCase() === name.toLowerCase())) return `There is already someone called ${name}.`;
  if (all.length >= MAX_ROSTER) return `The Oath Hall can hold at most ${MAX_ROSTER} adventurers.`;
  const cost = oathCost(game);
  if (game.state.gold < cost.gold) return `The oath costs ${cost.gold} G.`;
  if ((game.state.inventory.oathToken ?? 0) < cost.tokens) return 'You need an Oath Token. Bosses and prowlers leave them, and some chests hold one.';
  game.state.gold -= cost.gold;
  game.state.inventory.oathToken = (game.state.inventory.oathToken ?? 0) - cost.tokens;
  game.state.oaths = (game.state.oaths ?? rosterSize(game)) + 1;
  const member = createMember(name, classId);
  member.oath = game.state.oaths;
  if (game.state.party.length < MAX_PARTY) game.state.party.push(member);
  else game.state.reserve.push(member);
  return null;
}

export function moveToReserve(game: Game, partyIndex: number): boolean {
  if (game.state.party.length <= 1 || !game.state.party[partyIndex]) return false;
  game.state.reserve.push(...game.state.party.splice(partyIndex, 1));
  return true;
}

export function moveToParty(game: Game, reserveIndex: number): boolean {
  if (game.state.party.length >= MAX_PARTY || !game.state.reserve[reserveIndex]) return false;
  game.state.party.push(...game.state.reserve.splice(reserveIndex, 1));
  return true;
}

/** Move a party member one place left (-1) or right (+1) in the marching order. */
export function shiftMember(game: Game, partyIndex: number, delta: -1 | 1): boolean {
  const party = game.state.party;
  const to = partyIndex + delta;
  if (!party[partyIndex] || to < 0 || to >= party.length) return false;
  [party[partyIndex], party[to]] = [party[to], party[partyIndex]];
  return true;
}

export function toggleRow(game: Game, partyIndex: number): boolean {
  const m = game.state.party[partyIndex];
  if (!m) return false;
  m.row = m.row === 'front' ? 'back' : 'front';
  return true;
}

/** Dismiss a reserve member for good (their equipment goes with them). */
export function dismissMember(game: Game, reserveIndex: number): boolean {
  if (!game.state.reserve[reserveIndex]) return false;
  game.state.reserve.splice(reserveIndex, 1);
  return true;
}
