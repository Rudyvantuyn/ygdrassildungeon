/**
 * The Wyrdweave: each night the Norns weave three floors at the Well of Urd. The layout is the same for every
 * Wayfinder that day (it comes from the date alone); the monsters and colours follow the chapter the player has
 * reached. Every floor has one rule that changes how it plays, milder on the first floor, harsh on the third.
 *
 * One try a day, with the player's own party in a temporary game (like an expedition). After each floor: take the
 * threads home, or go deeper; a party that falls loses half. Wyrd Threads are scarce on purpose (at most four a day)
 * and only Hilde can weave them, into Wyrd gear that changes how a fight goes rather than simply adding stats.
 */
import { FLOORS, type FloorDef, type ProwlerDef } from './data/floors';
import { FLOORS_PER_CHAPTER } from './data/chapters';
import { EQUIPMENT } from './data/equipment';
import type { Game } from './game';
import { Rng } from './rng';
import { count } from './deeds';
import type { Dir, Member } from './types';

export const DAY_MS = 86_400_000;
/** Threads for clearing floor I, II and III. */
export const WYRD_REWARDS = [1, 1, 2];
/** Threads for the first, second and third piece of Wyrd gear. */
export const WYRD_COSTS = [30, 50, 80];
export const WYRD_GEAR = ['nornMantle', 'urdWeave', 'skuldShroud'];
/** The Well of Urd opens once this floor's guardian has fallen (the Blighted Elder). */
export const WYRD_OPENS_AFTER = 2;
/** Share of the usual XP and gold in the Wyrdweave. */
export const WYRD_REWARD_SCALE = 0.5;
/** Runestones and shades of the Wyrdweave are kept under these floor numbers: one set of three per day, for 30 days. */
export const WYRD_FLOOR_BASE = 100;
const WYRD_SLOTS = 30;

export type WyrdRuleId =
  | 'namelessDark'
  | 'restless'
  | 'longWay'
  | 'emptyHands'
  | 'bloodless'
  | 'echoes'
  | 'dim'
  | 'thinAir'
  | 'deepHunger'
  | 'theHunt'
  | 'fadingLight';

export interface WyrdRule {
  id: WyrdRuleId;
  name: string;
  text: string;
  /** 1 mild (floor I), 2 (floor II), 3 harsh (floor III). */
  tier: 1 | 2 | 3;
}

export const WYRD_RULES: WyrdRule[] = [
  { id: 'namelessDark', name: 'Nameless Dark', text: 'Your map draws nothing by itself. Ink only.', tier: 1 },
  { id: 'restless', name: 'Restless', text: 'Monsters come twice as often.', tier: 1 },
  { id: 'longWay', name: 'The Long Way', text: 'A wider, winding floor.', tier: 1 },
  { id: 'emptyHands', name: 'Empty Hands', text: 'No chest waits on this floor.', tier: 1 },
  { id: 'bloodless', name: 'Bloodless', text: 'No healing outside of fights: no tonics, no mending songs.', tier: 2 },
  { id: 'echoes', name: 'Echoes', text: 'Every pack of monsters comes twice as large.', tier: 2 },
  { id: 'dim', name: 'Dim Roots', text: 'The light reaches only four squares ahead.', tier: 2 },
  { id: 'thinAir', name: 'Thin Air', text: 'Monsters come more often, and the floor is wide.', tier: 2 },
  { id: 'deepHunger', name: 'Deep Hunger', text: 'Monsters from the next chapter roam here.', tier: 3 },
  { id: 'theHunt', name: 'The Hunt', text: 'A prowler stalks this floor, and it never stops hunting.', tier: 3 },
  { id: 'fadingLight', name: 'Fading Light', text: 'You see only two squares ahead.', tier: 3 },
];
export const WYRD_RULE_BY_ID = Object.fromEntries(WYRD_RULES.map((r) => [r.id, r])) as Record<WyrdRuleId, WyrdRule>;

const THREADS = ['Frost', 'Ember', 'Tide', 'Bone', 'Root', 'Storm', 'Ash', 'Moss', 'Salt', 'Iron', 'Rune', 'Raven', 'Amber', 'Ember-Root', 'Wolf'];
const NUMERALS = ['I', 'II', 'III'];

/** Days since 1 January 1970 (UTC): the Norns weave at midnight UTC. */
export function wyrdDayNumber(now: number): number {
  return Math.floor(now / DAY_MS);
}

function hash(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export interface WyrdDay {
  day: number;
  name: string;
  /** The rule of floor I, II and III. */
  rules: [WyrdRule, WyrdRule, WyrdRule];
}

export function wyrdDay(day: number): WyrdDay {
  const rng = new Rng(hash(day));
  const pick = (tier: 1 | 2 | 3) => rng.pick(WYRD_RULES.filter((r) => r.tier === tier));
  return { day, name: `The ${rng.pick(THREADS)} Thread`, rules: [pick(1), pick(2), pick(3)] };
}

/** Floor numbers for runestones and shades on floor `k` of `day`. */
export function wyrdFloorCode(day: number, k: number): number {
  return WYRD_FLOOR_BASE + (day % WYRD_SLOTS) * 3 + k;
}

/**
 * The maze of floor `k` of `day`: a winding maze with a few loops, the way in at the top left and the way down at the
 * far end. Same for everyone on that day.
 */
export function wyrdLayout(day: number, k: number): string[] {
  const rule = wyrdDay(day).rules[k];
  const size = rule.id === 'longWay' || rule.id === 'thinAir' ? 21 : 17;
  const rng = new Rng(hash(day * 7 + k + 1));
  const g: string[][] = Array.from({ length: size }, () => Array(size).fill('#'));
  const stack: [number, number][] = [[1, 1]];
  g[1][1] = '.';
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const dirs = ([[0, -2], [2, 0], [0, 2], [-2, 0]] as const).filter(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && g[ny][nx] === '#';
    });
    if (!dirs.length) {
      stack.pop();
      continue;
    }
    const [dx, dy] = rng.pick(dirs);
    g[y + dy / 2][x + dx / 2] = '.';
    g[y + dy][x + dx] = '.';
    stack.push([x + dx, y + dy]);
  }
  // A few loops, so there is more than one way.
  for (let i = 0; i < size; i++) {
    const x = rng.int(1, size - 2), y = rng.int(1, size - 2);
    if (g[y][x] !== '#') continue;
    if ((g[y][x - 1] === '.' && g[y][x + 1] === '.') || (g[y - 1][x] === '.' && g[y + 1][x] === '.')) g[y][x] = '.';
  }
  // The way down: the open square farthest from the way in.
  const dist = new Map<string, number>([['1,1', 0]]);
  const queue: [number, number][] = [[1, 1]];
  let far: [number, number] = [1, 1];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    const d = dist.get(`${x},${y}`)!;
    if (d > dist.get(`${far[0]},${far[1]}`)!) far = [x, y];
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx, ny = y + dy;
      if (g[ny][nx] === '.' && !dist.has(`${nx},${ny}`)) {
        dist.set(`${nx},${ny}`, d + 1);
        queue.push([nx, ny]);
      }
    }
  }
  g[1][1] = 'S';
  g[far[1]][far[0]] = '>';
  // A chest in a dead end, unless the rule says no.
  if (rule.id !== 'emptyHands') {
    const ends: [number, number][] = [];
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (g[y][x] !== '.') continue;
        const open = [g[y - 1][x], g[y + 1][x], g[y][x - 1], g[y][x + 1]].filter((c) => c !== '#').length;
        if (open === 1 && (dist.get(`${x},${y}`) ?? 0) > 6) ends.push([x, y]);
      }
    }
    if (ends.length) {
      const [x, y] = rng.pick(ends);
      g[y][x] = 'T';
    }
  }
  return g.map((row) => row.join(''));
}

/** The layout behind a runestone or shade floor number (for checking stones), or null if it is not a Wyrdweave floor. */
export function wyrdLayoutForCode(code: number, now: number): string[] | null {
  if (!Number.isInteger(code) || code < WYRD_FLOOR_BASE || code >= WYRD_FLOOR_BASE + WYRD_SLOTS * 3) return null;
  const slot = Math.floor((code - WYRD_FLOOR_BASE) / 3);
  const k = (code - WYRD_FLOOR_BASE) % 3;
  const today = wyrdDayNumber(now);
  // The latest day (today or before) whose stones are kept under this number.
  const day = today - ((today - slot + WYRD_SLOTS * 1000) % WYRD_SLOTS);
  return wyrdLayout(day, k);
}

/** The chapter (0, 1, 2…) whose monsters the Wyrdweave uses for this player: the deepest one reached. */
export function wyrdChapter(game: Game): number {
  return Math.min(Math.floor(game.state.deepest / FLOORS_PER_CHAPTER), Math.floor((FLOORS.length - 1) / FLOORS_PER_CHAPTER));
}

function prowlerFor(chapter: number): ProwlerDef['enemies'] {
  const first = chapter * FLOORS_PER_CHAPTER;
  for (let f = first; f < FLOORS.length; f++) if (FLOORS[f].prowlers.length) return FLOORS[f].prowlers[0].enemies;
  for (let f = first; f >= 0; f--) if (FLOORS[f].prowlers.length) return FLOORS[f].prowlers[0].enemies;
  return ['grimtusk'];
}

/** The three floors of `day` for a player in `chapter`. */
export function wyrdFloors(day: number, chapter: number): FloorDef[] {
  const w = wyrdDay(day);
  return w.rules.map((rule, k) => {
    const rows = wyrdLayout(day, k);
    const baseIndex = Math.min(FLOORS.length - 1, rule.id === 'deepHunger' ? (chapter + 1) * FLOORS_PER_CHAPTER + 1 : chapter * FLOORS_PER_CHAPTER + 1 + k);
    const base = FLOORS[baseIndex];
    const echoes = rule.id === 'echoes';
    const often = rule.id === 'restless' || rule.id === 'thinAir';
    const open: [number, number][] = [];
    rows.forEach((r, y) => [...r].forEach((c, x) => c === '.' && x + y > 10 && open.push([x, y])));
    const routeRng = new Rng(hash(day * 13 + k));
    const prowlers: ProwlerDef[] =
      rule.id === 'theHunt' && open.length > 4
        ? [{ enemies: prowlerFor(chapter), route: [routeRng.pick(open), routeRng.pick(open), routeRng.pick(open)], hunt: 6 }]
        : [];
    const startDir: Dir = rows[1][2] !== '#' ? 1 : 2;
    return {
      name: `${w.name} ${NUMERALS[k]}`,
      rows,
      startDir,
      encounterSteps: Math.max(6, Math.round(base.encounterSteps * (often ? 0.5 : 1))),
      encounters: base.encounters.map((e) => ({ ...e, enemies: echoes ? [...e.enemies, ...e.enemies].slice(0, 5) : e.enemies })),
      chests: rows.some((r) => r.includes('T')) ? [{ item: 'sapTonic', qty: 2 }] : [],
      prowlers,
      palette: { ...base.palette, grade: 'hue-rotate(215deg) saturate(65%) brightness(88%)' },
      depth: baseIndex,
    };
  });
}

/** How far ahead the party sees on floor `k` (fewer squares under some rules), or undefined for the usual. */
export function wyrdViewDepth(rule: WyrdRule): number | undefined {
  return rule.id === 'fadingLight' ? 2 : rule.id === 'dim' ? 4 : undefined;
}

// ── The home save ────────────────────────────────────────────────────────────

export function wyrdOpen(home: Game): boolean {
  return !!home.state.progress[WYRD_OPENS_AFTER]?.bossDefeated;
}

/** Today's try is used (whether it went well or not). */
export function wyrdDoneToday(home: Game, now: number): boolean {
  return home.state.wyrd?.lastDay === wyrdDayNumber(now);
}

export function markWyrdStarted(home: Game, now: number): void {
  const day = wyrdDayNumber(now);
  const w = home.state.wyrd;
  // Days in a row with a try (for a deed).
  const streak = w && w.lastDay === day - 1 ? (w.streak ?? 1) + 1 : w?.lastDay === day ? w.streak ?? 1 : 1;
  home.state.wyrd = { ...w, lastDay: day, streak };
}

export interface WyrdResult {
  /** Floors cleared (0–3). */
  cleared: number;
  fell: boolean;
  /** Threads brought home. */
  threads: number;
  gold: number;
}

/** Threads for clearing `cleared` floors; a party that fell keeps half (rounded down). */
export function threadsFor(cleared: number, fell: boolean): number {
  const all = WYRD_REWARDS.slice(0, cleared).reduce((a, b) => a + b, 0);
  return fell ? Math.floor(all / 2) : all;
}

/**
 * The run is over: the party comes home with what it learned and found. Adventurers keep their experience, skills,
 * wounds and the items used; gold, materials and what the bestiary learned come along, and the threads.
 */
export function bringWyrdHome(home: Game, run: Game, cleared: number, fell: boolean): WyrdResult {
  const byOath = new Map(run.state.party.map((m) => [m.oath, m]));
  home.state.party = home.state.party.map((m) => {
    const back = byOath.get(m.oath);
    if (!back) return m;
    const kept: Member = { ...m, level: back.level, xp: back.xp, skills: back.skills, hp: fell ? 0 : back.hp, sp: back.sp, saga: back.saga, bynames: back.bynames, byname: back.byname };
    return kept;
  });
  home.state.inventory = { ...run.state.inventory };
  home.state.gold += run.state.gold;
  for (const [id, n] of Object.entries(run.state.materials)) home.state.materials[id] = (home.state.materials[id] ?? 0) + n;
  for (const [id, n] of Object.entries(run.state.kills)) home.state.kills[id] = (home.state.kills[id] ?? 0) + n;
  const book = (home.state.bestiary ??= {});
  for (const [id, e] of Object.entries(run.state.bestiary ?? {})) {
    const mine = (book[id] ??= { seen: 0, defeated: 0, tried: [] });
    mine.seen += e.seen;
    mine.defeated += e.defeated;
    for (const el of e.tried) if (!mine.tried.includes(el)) mine.tried.push(el);
  }
  home.state.battles += run.state.battles;
  const threads = threadsFor(cleared, fell);
  count(home, 'threadsEarned', threads);
  home.state.wyrd = { ...home.state.wyrd, lastDay: home.state.wyrd?.lastDay ?? 0, threads: (home.state.wyrd?.threads ?? 0) + threads, best: Math.max(home.state.wyrd?.best ?? 0, cleared) };
  return { cleared, fell, threads, gold: run.state.gold };
}

// ── Wyrd gear ────────────────────────────────────────────────────────────────

/** What the next piece costs, or null when all three are woven. */
export function nextWeaveCost(home: Game): number | null {
  const n = home.state.wyrd?.woven?.length ?? 0;
  return n < WYRD_COSTS.length ? WYRD_COSTS[n] : null;
}

/** Hilde weaves a piece of Wyrd gear from threads. Returns an error message, or null. */
export function weave(home: Game, gearId: string): string | null {
  const w = (home.state.wyrd ??= { lastDay: 0 });
  if (!WYRD_GEAR.includes(gearId)) return 'Hilde cannot weave that.';
  if (w.woven?.includes(gearId)) return 'Already woven.';
  const cost = nextWeaveCost(home);
  if (cost === null) return 'Every piece is woven.';
  if ((w.threads ?? 0) < cost) return `That takes ${cost} Wyrd Threads.`;
  w.threads = (w.threads ?? 0) - cost;
  w.woven = [...(w.woven ?? []), gearId];
  return null;
}

/** Put a woven piece on an adventurer (or take it off, with null): free, as often as you like. */
export function wearWyrd(home: Game, gearId: string, memberIndex: number | null): boolean {
  if (!home.state.wyrd?.woven?.includes(gearId)) return false;
  for (const m of [...home.state.party, ...home.state.reserve]) if (m.armor === gearId) delete m.armor;
  if (memberIndex === null) return true;
  const m = home.state.party[memberIndex];
  if (!m || !EQUIPMENT[gearId].classes.includes(m.classId)) return false;
  // Shop armour that comes off is traded in for half its price, as at Hilde's counter.
  const old = m.armor ? EQUIPMENT[m.armor] : undefined;
  if (old && !old.wyrd) home.state.gold += Math.floor(old.price / 2);
  m.armor = gearId;
  return true;
}
