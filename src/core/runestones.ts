/**
 * Runestones: short messages players carve on a square of the Rootdeep for others to find, built only from fixed
 * words (no free text, so nothing needs moderating). Floors are the same for everyone, so a stone on Rootway II
 * square (4, 7) is found there by every player. Shades mark where a whole party fell.
 *
 * The rules here are shared by the client and the server (the expedition Edge Function checks every carving).
 */
import { FLOORS } from './data/floors';
import { isPassable, parseFloor, type FloorMap } from './dungeon';
import { wyrdLayoutForCode } from './wyrd';
import type { Dir } from './types';

export const RUNE_WHAT = {
  danger: 'Danger',
  prowler: 'Prowler',
  chest: 'Chest',
  spring: 'Spring',
  stairs: 'Stairs',
  shortcut: 'Shortcut',
  gate: 'Root gate',
  deadend: 'Dead end',
  gathering: 'Gathering',
  guardian: 'Guardian',
} as const;

/** Where, as the carver faced. Stored as a compass direction, read back from the reader's own facing. */
export const RUNE_WHERE = { ahead: 'ahead', behind: 'behind', left: 'to the left', right: 'to the right', here: 'here' } as const;

export const RUNE_ADVICE = {
  goback: 'Go back.',
  rest: 'Rest first.',
  worth: 'Worth it.',
  notworth: 'Not worth it.',
  fire: 'Bring fire.',
  frost: 'Bring ice.',
  storm: 'Bring thunder.',
  clearwater: 'Bring Clearwater.',
} as const;

export type RuneWhat = keyof typeof RUNE_WHAT;
export type RuneWhere = keyof typeof RUNE_WHERE;
export type RuneAdvice = keyof typeof RUNE_ADVICE;
/** n, e, s, w (from the carver's facing) or here. */
export type RuneDir = 'n' | 'e' | 's' | 'w' | 'here';

export const MAX_STONES = 20;
export const STONES_PER_FLOOR = 12;
export const SHADES_PER_FLOOR = 5;
export const HEED_GOLD = 25;
export const HEED_GOLD_PER_DAY = 100;

/** A stone as the server hands it out. */
export interface Runestone {
  id: number;
  author: string;
  x: number;
  y: number;
  what: RuneWhat;
  dir: RuneDir;
  advice: RuneAdvice | null;
  style: string;
  heeds: number;
  falses: number;
  mine: boolean;
  voted: 'heed' | 'false' | null;
}

export interface Shade {
  id: number;
  x: number;
  y: number;
  /** Enemy id of what felled the party. */
  enemy: string;
}

export interface FloorMarks {
  stones: Runestone[];
  shades: Shade[];
}

const COMPASS: RuneDir[] = ['n', 'e', 's', 'w'];
const OFFSETS: Record<Exclude<RuneWhere, 'here'>, number> = { ahead: 0, right: 1, behind: 2, left: 3 };

/** The compass direction meant by "ahead/left/…" for a carver facing `facing`. */
export function runeDir(where: RuneWhere, facing: Dir): RuneDir {
  return where === 'here' ? 'here' : COMPASS[(facing + OFFSETS[where]) % 4];
}

/** "ahead/left/…" as seen by a reader facing `facing`. */
export function runeWhere(dir: RuneDir, facing: Dir): RuneWhere {
  if (dir === 'here') return 'here';
  const turn = (COMPASS.indexOf(dir) - facing + 4) % 4;
  return (['ahead', 'right', 'behind', 'left'] as const)[turn];
}

/** "Prowler ahead. Go back." from the reader's point of view. */
export function runeText(stone: Pick<Runestone, 'what' | 'dir' | 'advice'>, facing: Dir): string {
  const where = runeWhere(stone.dir, facing);
  const first = `${RUNE_WHAT[stone.what]} ${RUNE_WHERE[where]}.`;
  return stone.advice ? `${first} ${RUNE_ADVICE[stone.advice]}` : first;
}

const maps = new Map<number, FloorMap>();
function mapOf(floor: number): FloorMap {
  let map = maps.get(floor);
  if (!map) maps.set(floor, (map = parseFloor(FLOORS[floor])));
  return map;
}

/** The map of a floor number: a floor of the Rootdeep, or one of the Wyrdweave's (as woven on the day it stands for). */
function mapFor(floor: number, now: number): FloorMap | null {
  if (!Number.isInteger(floor) || floor < 0) return null;
  if (floor < FLOORS.length) return mapOf(floor);
  const rows = wyrdLayoutForCode(floor, now);
  return rows ? parseFloor({ name: '', rows, startDir: 1, encounterSteps: 1, encounters: [], chests: [], prowlers: [], palette: FLOORS[0].palette }) : null;
}

/** Whether a stone can stand on this square: an existing floor, a square one can walk on. */
export function canHoldStone(floor: number, x: number, y: number, now = Date.now()): boolean {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  const map = mapFor(floor, now);
  if (!map) return false;
  return x >= 0 && y >= 0 && x < map.width && y < map.height && isPassable(map, x, y);
}

export interface CarveRequest {
  floor: number;
  x: number;
  y: number;
  what: string;
  dir: string;
  advice: string | null;
  descent: string;
}

/** Checks a carving as sent by a client; returns an error message or null. */
export function carveProblem(c: CarveRequest): string | null {
  if (!canHoldStone(c.floor, c.x, c.y)) return 'A stone cannot stand there.';
  if (!(c.what in RUNE_WHAT)) return 'Unknown rune.';
  if (!(['n', 'e', 's', 'w', 'here'] as string[]).includes(c.dir)) return 'Unknown direction.';
  if (c.advice !== null && !(c.advice in RUNE_ADVICE)) return 'Unknown advice.';
  if (typeof c.descent !== 'string' || !/^[A-Za-z0-9-]{8,40}$/.test(c.descent)) return 'Unknown descent.';
  return null;
}

/** Only stones and shades on squares that (still) exist and can be walked are shown. */
export function visibleMarks(floor: number, marks: FloorMarks): FloorMarks {
  return {
    stones: marks.stones.filter((s) => canHoldStone(floor, s.x, s.y) && s.what in RUNE_WHAT).slice(0, STONES_PER_FLOOR),
    shades: marks.shades.filter((s) => canHoldStone(floor, s.x, s.y)).slice(0, SHADES_PER_FLOOR),
  };
}
