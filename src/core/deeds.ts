/**
 * The Book of Deeds: things a player can do, none of them announced. A deed shows only once it is earned, with a
 * medal (its ribbon tells the kind, its metal how hard it was) and what the player did. Nothing in the game says
 * what the others are: that is the point (players try odd things to find them).
 *
 * Deeds are checked against the save's own state and a few counters kept here. When the player is signed in they
 * are also kept with the account (src/net/online.ts), so they follow the player to other devices.
 */
import { CLASSES } from './data/classes';
import { EQUIPMENT } from './data/equipment';
import { FLOORS } from './data/floors';
import { FLOORS_PER_CHAPTER } from './data/chapters';
import { isPassable, parseFloor, type FloorMap } from './dungeon';
import type { Game } from './game';
import { bestiaryOrder } from './bestiary';
import type { ClassId } from './types';

export type DeedKind = 'explore' | 'battle' | 'craft' | 'hall' | 'ravens' | 'together' | 'story' | 'odd' | 'secret';
export type DeedTier = 'bronze' | 'silver' | 'gold' | 'rune';

export interface DeedDef {
  id: string;
  name: string;
  /** What the player did, shown once earned. */
  text: string;
  kind: DeedKind;
  tier: DeedTier;
  /** game-icons.net icon (art/medals/icons.json). */
  icon: string;
  earned: (g: Game) => boolean;
}

export interface EarnedDeed {
  /** When (ms). */
  at: number;
  /** The adventurer who led the party then. */
  by?: string;
}

/** Counters some deeds need; everything else is read from the save. */
export type DeedCounter =
  | 'flees'
  | 'bumps'
  | 'gathers'
  | 'runs'
  | 'safeRuns'
  | 'heedsGiven'
  | 'stonesCarved'
  | 'resisted'
  | 'itemsDescent'
  | 'fallenDescent'
  | 'byAHair'
  | 'guardianNoItems'
  | 'guardianNoFall'
  | 'heedsReceived'
  | 'threadsEarned'
  | 'winsFloor'
  | 'downDescent'
  | 'pacifist'
  | 'longWayHome'
  | 'nightOwl'
  | 'bareHands';

export function count(g: Game, key: DeedCounter, by = 1): void {
  const c = (g.state.counters ??= {});
  c[key] = (c[key] ?? 0) + by;
}

export function setCount(g: Game, key: DeedCounter, value: number): void {
  (g.state.counters ??= {})[key] = value;
}

const n = (g: Game, key: DeedCounter) => g.state.counters?.[key] ?? 0;
const roster = (g: Game) => [...g.state.party, ...g.state.reserve];
const chapterFloors = (ch: number) => FLOORS.slice(ch * FLOORS_PER_CHAPTER, (ch + 1) * FLOORS_PER_CHAPTER).map((_, i) => ch * FLOORS_PER_CHAPTER + i);
const bossBeaten = (g: Game, floor: number) => !!g.state.progress[floor]?.bossDefeated;

const maps = new Map<number, FloorMap>();
function mapOf(floor: number): FloorMap {
  let m = maps.get(floor);
  if (!m) maps.set(floor, (m = parseFloor(FLOORS[floor])));
  return m;
}

/** Share of a floor's walkable squares the player drew as floor on their own map. */
function charted(g: Game, floor: number): number {
  const chart = g.state.progress[floor]?.chart;
  if (!chart) return 0;
  const m = mapOf(floor);
  let open = 0;
  let drawn = 0;
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      if (!isPassable(m, x, y)) continue;
      open++;
      if (chart.terrain[y * m.width + x] === '1') drawn++;
    }
  }
  return open ? drawn / open : 0;
}

/** Share of all squares of a floor the player drew as wall. */
function walled(g: Game, floor: number): number {
  const t = g.state.progress[floor]?.chart?.terrain ?? '';
  return t ? [...t].filter((c) => c === '2').length / t.length : 0;
}

function chestsOpened(g: Game, floors: number[]): boolean {
  return floors.every((f) => (g.state.progress[f]?.openedChests.length ?? 0) >= FLOORS[f].chests.length);
}

function gatesOpened(g: Game, floors: number[]): boolean {
  return floors.every((f) => {
    const gates = mapOf(f).tiles.filter((t) => t === 'gate' || t === 'gateOpen').length;
    return (g.state.progress[f]?.gatesOpen?.length ?? 0) >= gates;
  });
}

function weaknessesFound(g: Game): number {
  let found = 0;
  for (const b of bestiaryOrder()) {
    const e = g.state.bestiary?.[b.def.id];
    if (e) found += b.def.weak.filter((el) => e.tried.includes(el)).length;
  }
  return found;
}

/** Every root gate of a chapter opened (false for a chapter without gates). */
function allGatesOf(g: Game, ch: number): boolean {
  const floors = chapterFloors(ch).filter((f) => f < FLOORS.length);
  const any = floors.some((f) => mapOf(f).tiles.some((t) => t === 'gate' || t === 'gateOpen'));
  return any && gatesOpened(g, floors);
}

/** Guardians felled by the party's own blows (sagas), over everyone in the hall. */
function guardiansFelled(g: Game): number {
  return new Set(roster(g).flatMap((m) => m.saga?.guardians ?? [])).size;
}

function seenAllOfChapter(g: Game, ch: number): boolean {
  const first = ch * FLOORS_PER_CHAPTER + 1;
  const last = first + FLOORS_PER_CHAPTER - 1;
  return bestiaryOrder()
    .filter((b) => Math.min(...b.floors) >= first && Math.min(...b.floors) <= last)
    .every((b) => (g.state.bestiary?.[b.def.id]?.seen ?? 0) > 0);
}

/** Every creature of a chapter (its monsters, prowlers and guardian) defeated at least once. */
function beatenAllOfChapter(g: Game, ch: number): boolean {
  const first = ch * FLOORS_PER_CHAPTER + 1;
  const last = first + FLOORS_PER_CHAPTER - 1;
  return bestiaryOrder()
    .filter((b) => Math.min(...b.floors) >= first && Math.min(...b.floors) <= last)
    .every((b) => (g.state.bestiary?.[b.def.id]?.defeated ?? 0) > 0);
}

export const DEEDS: DeedDef[] = [
  // Exploring and mapping
  { id: 'firstSteps', name: 'First Steps', text: 'Went down the stairs for the first time.', kind: 'explore', tier: 'bronze', icon: 'stairs', earned: (g) => g.state.deepest >= 1 },
  { id: 'drowned', name: 'Below the Forest', text: 'Reached the Drowned Roots.', kind: 'explore', tier: 'silver', icon: 'wave-crest', earned: (g) => g.state.deepest >= 5 },
  { id: 'marrow', name: 'Into the Bone', text: 'Reached the Marrowdeep.', kind: 'explore', tier: 'gold', icon: 'ribcage', earned: (g) => g.state.deepest >= 10 },
  { id: 'cartographer', name: 'Cartographer', text: 'Drew nearly every square of a floor on your own map.', kind: 'explore', tier: 'silver', icon: 'treasure-map', earned: (g) => g.state.chartMode !== 'auto' && FLOORS.some((_, f) => charted(g, f) >= 0.95) },
  { id: 'everyCorner', name: 'Every Corner', text: 'Opened every chest of the Greenwood Roots.', kind: 'explore', tier: 'silver', icon: 'open-chest', earned: (g) => chestsOpened(g, chapterFloors(0)) },
  { id: 'rootWalker', name: 'Root Walker', text: 'Opened every root gate of the Marrowdeep.', kind: 'explore', tier: 'gold', icon: 'tree-roots', earned: (g) => chapterFloors(2).length > 0 && gatesOpened(g, chapterFloors(2)) },
  { id: 'wallToWall', name: 'Wall to Wall', text: 'Drew walls over nearly a whole floor. A bold way to make a map.', kind: 'odd', tier: 'bronze', icon: 'brick-wall', earned: (g) => FLOORS.some((_, f) => walled(g, f) >= 0.8) },

  // Fighting
  { id: 'firstBlood', name: 'First Blood', text: 'Won your first fight.', kind: 'battle', tier: 'bronze', icon: 'crossed-swords', earned: (g) => Object.values(g.state.kills).some((k) => k > 0) },
  { id: 'hundredFights', name: 'Seasoned', text: 'Fought a hundred battles.', kind: 'battle', tier: 'bronze', icon: 'sword-clash', earned: (g) => g.state.battles >= 100 },
  { id: 'thousandFights', name: 'Battle-Worn', text: 'Fought a thousand battles.', kind: 'battle', tier: 'gold', icon: 'sword-clash', earned: (g) => g.state.battles >= 1000 },
  { id: 'rotCleansed', name: 'Rot Cleansed', text: 'Brought down the Blighted Elder.', kind: 'battle', tier: 'bronze', icon: 'dead-wood', earned: (g) => bossBeaten(g, 2) },
  { id: 'greenwoodGuard', name: 'Warden of the Greenwood', text: 'Brought down the guardian of the Greenwood Roots.', kind: 'battle', tier: 'silver', icon: 'wolf-head', earned: (g) => bossBeaten(g, 4) },
  { id: 'drownedGuard', name: 'Warden of the Deep Water', text: 'Brought down the guardian of the Drowned Roots.', kind: 'battle', tier: 'gold', icon: 'kraken-tentacle', earned: (g) => bossBeaten(g, 9) },
  { id: 'prowlerSlain', name: 'Prowler Slayer', text: 'Brought down a prowler.', kind: 'battle', tier: 'silver', icon: 'fangs', earned: (g) => g.state.progress.some((p) => (p.prowlerTokens?.length ?? 0) > 0) },
  { id: 'byAHair', name: 'By a Hair', text: 'Won a fight with one adventurer left standing, barely.', kind: 'battle', tier: 'silver', icon: 'heart-beats', earned: (g) => n(g, 'byAHair') > 0 },
  { id: 'weaknessFound', name: 'Keen Eye', text: 'Found twenty-five weaknesses.', kind: 'battle', tier: 'silver', icon: 'magnifying-glass', earned: (g) => weaknessesFound(g) >= 25 },
  { id: 'boneWarden', name: 'Warden of the Bone', text: 'Brought down the guardian of the Marrowdeep.', kind: 'battle', tier: 'gold', icon: 'ribcage', earned: (g) => bossBeaten(g, 14) },
  { id: 'drownedBook', name: 'Drowned Lore', text: 'Met every creature of the Drowned Roots.', kind: 'battle', tier: 'silver', icon: 'book-cover', earned: (g) => seenAllOfChapter(g, 1) },
  { id: 'greenwoodBook', name: 'Greenwood Lore', text: 'Met every creature of the Greenwood Roots.', kind: 'battle', tier: 'silver', icon: 'book-cover', earned: (g) => seenAllOfChapter(g, 0) },
  { id: 'lightPack', name: 'Light Pack', text: 'Brought down a guardian without using a single item on that descent.', kind: 'battle', tier: 'gold', icon: 'knapsack', earned: (g) => n(g, 'guardianNoItems') > 0 },
  { id: 'deathless', name: 'Deathless', text: 'Brought down a guardian on a descent where nobody fell.', kind: 'battle', tier: 'gold', icon: 'laurels', earned: (g) => n(g, 'guardianNoFall') > 0 },
  { id: 'runAway', name: 'Discretion', text: 'Fled from twenty fights. Living to fight another day.', kind: 'odd', tier: 'bronze', icon: 'run', earned: (g) => n(g, 'flees') >= 20 },
  { id: 'wrongTool', name: 'Wrong Tool', text: 'Hit monsters with what they shrug off, ten times over.', kind: 'odd', tier: 'bronze', icon: 'broken-shield', earned: (g) => n(g, 'resisted') >= 10 },

  // Gathering and the shop
  { id: 'gatherer', name: 'Gatherer', text: 'Gathered fifty times in the Rootdeep.', kind: 'craft', tier: 'bronze', icon: 'sprout', earned: (g) => n(g, 'gathers') >= 50 },
  { id: 'masterCraft', name: 'Made to Order', text: 'Wore gear Hilde made from your own finds.', kind: 'craft', tier: 'silver', icon: 'anvil', earned: (g) => roster(g).some((m) => [m.weapon, m.armor].some((id) => id && EQUIPMENT[id]?.requires)) },
  { id: 'hildesFavourite', name: "Hilde's Favourite", text: 'Sold a thousand materials to Hilde.', kind: 'craft', tier: 'silver', icon: 'coins', earned: (g) => Object.values(g.state.sold).reduce((a, b) => a + b, 0) >= 1000 },

  // The Oath Hall
  { id: 'fullHall', name: 'Full Hall', text: 'Filled the Oath Hall with twelve adventurers.', kind: 'hall', tier: 'silver', icon: 'castle', earned: (g) => roster(g).length >= 12 },
  { id: 'everyBanner', name: 'Every Banner', text: 'Swore in one of every class.', kind: 'hall', tier: 'silver', icon: 'flying-flag', earned: (g) => (Object.keys(CLASSES) as ClassId[]).filter((c) => !SECRET_CLASSES[c]).every((c) => roster(g).some((m) => m.classId === c)) },
  { id: 'oldGuard', name: 'Old Guard', text: 'Brought an adventurer to level fifty.', kind: 'hall', tier: 'gold', icon: 'crown', earned: (g) => roster(g).some((m) => m.level >= 50) },

  // Raven Runs
  { id: 'firstRavens', name: 'Word from Below', text: 'Heard back from your first Raven Run.', kind: 'ravens', tier: 'bronze', icon: 'raven', earned: (g) => n(g, 'runs') >= 1 },
  { id: 'safeReturns', name: 'Safe Returns', text: 'Ten Raven Runs came home without a scratch.', kind: 'ravens', tier: 'silver', icon: 'feather', earned: (g) => n(g, 'safeRuns') >= 10 },

  // Together
  { id: 'answeredHorn', name: 'Answered the Horn', text: 'Came home from an expedition with other Wayfinders.', kind: 'together', tier: 'bronze', icon: 'hunting-horn', earned: (g) => (g.state.claimed?.length ?? 0) >= 1 },
  { id: 'carver', name: 'Stone Carver', text: 'Carved a runestone for others to find.', kind: 'together', tier: 'bronze', icon: 'rune-stone', earned: (g) => n(g, 'stonesCarved') >= 1 },
  { id: 'kindStranger', name: 'Kind Stranger', text: 'Heeded ten runestones of other Wayfinders.', kind: 'together', tier: 'silver', icon: 'shaking-hands', earned: (g) => n(g, 'heedsGiven') >= 10 },
  { id: 'heeded', name: 'Heeded', text: 'Your runestones were heeded ten times.', kind: 'together', tier: 'silver', icon: 'tied-scroll', earned: (g) => n(g, 'heedsReceived') >= 10 },

  // The Wyrdweave
  { id: 'threadBearer', name: 'Thread-Bearer', text: 'Brought a Wyrd Thread home from the Well of Urd.', kind: 'explore', tier: 'bronze', icon: 'feather', earned: (g) => n(g, 'threadsEarned') >= 1 },
  { id: 'allThree', name: 'All Three Floors', text: 'Went through all three floors of the Wyrdweave in one day.', kind: 'explore', tier: 'silver', icon: 'stairs', earned: (g) => (g.state.wyrd?.best ?? 0) >= 3 },
  { id: 'wovenFate', name: 'Woven Fate', text: 'Had Hilde weave a piece of Wyrd gear.', kind: 'craft', tier: 'silver', icon: 'anvil', earned: (g) => (g.state.wyrd?.woven?.length ?? 0) >= 1 },
  { id: 'sevenDays', name: 'Seven Days Spun', text: 'Walked the Wyrdweave seven days in a row.', kind: 'explore', tier: 'gold', icon: 'crown', earned: (g) => (g.state.wyrd?.streak ?? 0) >= 7 },

  // Sagas
  { id: 'sungOf', name: 'Sung Of', text: 'One of yours earned a byname. The skalds are singing.', kind: 'hall', tier: 'bronze', icon: 'tied-scroll', earned: (g) => roster(g).some((m) => (m.bynames?.length ?? 0) > 0) },
  { id: 'hallOfNames', name: 'A Hall of Names', text: 'Everyone in a full party bore a byname.', kind: 'hall', tier: 'silver', icon: 'laurels', earned: (g) => g.state.party.length >= 4 && g.state.party.every((m) => !!m.byname) },
  { id: 'guardiansBane', name: "Guardians' Bane", text: 'Struck the last blow on three different guardians.', kind: 'battle', tier: 'gold', icon: 'crossed-swords', earned: (g) => guardiansFelled(g) >= 3 },

  // The story
  { id: 'firstChoice', name: 'A Road Chosen', text: 'Made your first choice for Midgard.', kind: 'story', tier: 'bronze', icon: 'crossroad', earned: (g) => Object.keys(g.state.choices ?? {}).length >= 1 },

  // Secret: each brings a stranger to the Oath Hall, and a new class with them.
  { id: 'ravenCall', name: 'Voice of the Ravens', text: 'Sent out twenty-five Raven Runs. One of the ravens came back with someone: the Ravenspeakers now swear the oath.', kind: 'secret', tier: 'rune', icon: 'raven', earned: (g) => n(g, 'runs') >= 25 },
  { id: 'hornCall', name: 'Horn of Many Halls', text: 'Came home from five expeditions. Someone from another hall followed you back: the Hornbearers now swear the oath.', kind: 'secret', tier: 'rune', icon: 'hunting-horn', earned: (g) => (g.state.claimed?.length ?? 0) >= 5 },

  { id: 'wildCall', name: 'Kin of the Wild', text: 'Defeated every creature of the Greenwood Roots, prowlers and guardian too. Something wild followed you home: the Fylgjur now swear the oath.', kind: 'secret', tier: 'rune', icon: 'paw', earned: (g) => beatenAllOfChapter(g, 0) },

  // Odd ones
  { id: 'gateOpener', name: 'Gate-Opener', text: 'Opened every root gate of the Marrowdeep.', kind: 'explore', tier: 'silver', icon: 'tree-roots', earned: (g) => allGatesOf(g, 2) },
  { id: 'nightOwl', name: 'Night Owl', text: 'Won a fight between three and four in the morning. Go to bed.', kind: 'odd', tier: 'bronze', icon: 'raven', earned: (g) => n(g, 'nightOwl') >= 1 },
  { id: 'pacifist', name: "Pacifist's Walk", text: 'Reached the stairs down without winning a single fight on that floor.', kind: 'odd', tier: 'silver', icon: 'run', earned: (g) => n(g, 'pacifist') >= 1 },
  { id: 'bareHands', name: 'Bare Hands', text: 'Beat a guardian or a prowler with someone unarmed in the party.', kind: 'odd', tier: 'bronze', icon: 'broken-shield', earned: (g) => n(g, 'bareHands') >= 1 },
  { id: 'longWayHome', name: 'The Long Way Home', text: 'Walked all the way back up to Lindholm after going down three stairs.', kind: 'odd', tier: 'silver', icon: 'stairs', earned: (g) => n(g, 'longWayHome') >= 1 },
  { id: 'stubborn', name: 'Stubborn', text: 'Walked into the same wall twenty times in a row.', kind: 'odd', tier: 'bronze', icon: 'brick-wall', earned: (g) => n(g, 'bumps') >= 20 },
];

/** Secret classes and the deed that brings each to the Oath Hall. */
export const SECRET_CLASSES: Partial<Record<ClassId, string>> = { ravenspeaker: 'ravenCall', hornbearer: 'hornCall', fylgja: 'wildCall' };

/** Whether this save may swear in adventurers of a class (secret ones only once their deed is done). */
export function classUnlocked(g: Pick<Game, 'state'> | null, classId: ClassId): boolean {
  const deed = SECRET_CLASSES[classId];
  return !deed || !!g?.state.deeds?.[deed];
}

export const DEED_BY_ID: Record<string, DeedDef> = Object.fromEntries(DEEDS.map((d) => [d.id, d]));

/** Checks every deed not yet earned; returns the ones earned just now. */
export function checkDeeds(g: Game, now: number): DeedDef[] {
  const book = (g.state.deeds ??= {});
  const fresh: DeedDef[] = [];
  for (const d of DEEDS) {
    if (book[d.id]) continue;
    let ok = false;
    try {
      ok = d.earned(g);
    } catch {
      ok = false;
    }
    if (!ok) continue;
    book[d.id] = { at: now, by: g.state.party[0]?.name };
    fresh.push(d);
  }
  return fresh;
}

/** Deeds earned, newest first. */
export function earnedDeeds(g: Game): { def: DeedDef; earned: EarnedDeed }[] {
  return Object.entries(g.state.deeds ?? {})
    .filter(([id]) => DEED_BY_ID[id])
    .map(([id, earned]) => ({ def: DEED_BY_ID[id], earned }))
    .sort((a, b) => b.earned.at - a.earned.at);
}

/** Deeds kept with the account (another device, a lost save) come back into this save. */
export function mergeDeeds(g: Game, fromAccount: Record<string, EarnedDeed>): void {
  const book = (g.state.deeds ??= {});
  for (const [id, e] of Object.entries(fromAccount)) if (DEED_BY_ID[id] && !book[id]) book[id] = e;
}
