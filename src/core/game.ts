import { emptyChart, setMark, setTerrain, type Chart, type ChartMode, type MarkId } from './chart';
import { Combat, type CombatSnapshot } from './combat';
import { FLOORS, type FloorDef } from './data/floors';
import { ITEMS, makeInventory } from './data/items';
import type { QuestState } from './quests';
import { DX, DY, isGatherTile, isPassable, parseFloor, relCell, tileAt, turnDir, type FloorMap, type Tile } from './dungeon';
import { createStartingParty, fitRows, fullRestore, isAlive, memberStats, xpForLevel } from './party';
import { EQUIPMENT_LIST } from './data/equipment';
import type { Bestiary } from './bestiary';
import { autoSpend, clampRanks, fullScaleRank, rankOf } from './skilltree';
import { GATHER_AMBUSH, GATHER_KINDS, GATHER_TABLES, GATHER_USES, type GatherKind } from './data/gathering';
import { FLOORS_PER_CHAPTER, startFloors } from './data/chapters';
import { validOath } from './oaths';
import { STORY } from './data/story';
import { initProwlers, moveProwlers, type ProwlerState } from './prowlers';
import { Rng } from './rng';
import type { RavenRun } from './ravens';
import { WYRD_REWARD_SCALE, wyrdChapter, wyrdFloorCode, wyrdFloors } from './wyrd';
import { count, setCount, type DeedCounter, type EarnedDeed } from './deeds';
import { addToSaga, type Byname } from './sagas';
import { fragmentAt, type FragmentDef } from './data/fragments';
import { ECHO_COST, ECHO_HALL_FLOOR, EMBER_CHANCE, EMBER_FLOOR, GUARDIAN_LEVEL, SHARD_FLOOR, rollShard, shardChance } from './echoes';
import type { Dir, ItemId, Loot, Member } from './types';

/** Bump when the save format changes incompatibly; older saves are then discarded. */
export const SAVE_VERSION = 3;

/** What a fallen party left behind in the Rootdeep (see Game.carriedHome). */
export interface CarriedHomeLoss {
  gold: number;
  items: Partial<Record<ItemId, number>>;
  materials: Record<string, number>;
}

export interface FloorProgress {
  /** One character per cell: '1' = mapped. */
  explored: string;
  openedChests: number[];
  springUsed: boolean;
  bossDefeated: boolean;
  prowlers: ProwlerState[];
  /** The map the player draws. */
  chart: Chart;
  /** Gathering spots used this visit: cell index → times. */
  gathered?: Record<number, number>;
  /** Root gates opened (cell indices). They stay open for good: the shortcuts a party has earned. */
  gatesOpen?: number[];
  /** Cells the assisted map has already marked by itself, so a mark the player erases is not put back. */
  autoMarked?: number[];
  /** Prowlers (by index) that already gave their Oath Token: they come back, the token does not. */
  prowlerTokens?: number[];
}

export type Location = 'town' | 'dungeon';

export interface GameState {
  version: number;
  rng: number;
  location: Location;
  /** Deepest floor index the party has reached (unlocks shop stock and floor entry). */
  deepest: number;
  chartMode: ChartMode;
  floor: number;
  x: number;
  y: number;
  dir: Dir;
  party: Member[];
  /** Registered adventurers who are not in the party. */
  reserve: Member[];
  gold: number;
  inventory: Record<ItemId, number>;
  /** Materials carried, by material id. */
  materials: Record<string, number>;
  /** Materials sold to the shop over the whole game (unlocks special gear). */
  sold: Record<string, number>;
  /** Enemies defeated, by enemy id (for quests). */
  kills: Record<string, number>;
  /** What the party has learnt about each monster. */
  bestiary?: Bestiary;
  quests: Record<string, QuestState>;
  /** Story scenes already shown. */
  story: string[];
  /** An expedition's shared game: no Oath Tokens are won here (every expedition starts afresh, so they could be farmed). */
  expedition?: boolean;
  /** Choices made at the end of story scenes: scene id → option id. */
  choices?: Record<string, string>;
  /** Adventurers ever sworn in at the Oath Hall (the first few are free). */
  oaths?: number;
  /** Tutorial tips already shown. */
  tips?: string[];
  /** Tutorial tips switched off. */
  tipsOff?: boolean;
  /** Steps taken since the last encounter, compared against `encounterAt`. */
  danger: number;
  encounterAt: number;
  progress: FloorProgress[];
  steps: number;
  battles: number;
  /** Seconds played with the game in view (shown to the makers with feedback). */
  playSeconds?: number;
  cleared: boolean;
  /** Prowler the current fight is against, if any. */
  fighting?: number | null;
  /** Expeditions whose share has already been brought home. */
  claimed?: string[];
  /** Raven Runs out (or back and not yet collected). */
  ravenRuns?: RavenRun[];
  nextRunId?: number;
  /** The latest real time (ms) the game has seen, for Raven Runs and wounds. */
  clock?: number;
  /** This descent (from leaving town until coming back): one runestone may be carved per descent. */
  descent?: string;
  /** The descent a runestone was last carved on. */
  carvedOn?: string;
  /** What the party set out with on this descent (gold, items, materials): a fall only costs half of what was found since. */
  setOut?: { gold: number; inventory: Partial<Record<ItemId, number>>; materials: Record<string, number> };
  /** Runestones already read (ids, newest last): they show on the map. */
  runesRead?: number[];
  /** Fragments of the Rootdeep's past found (ids, src/core/data/fragments.ts). */
  fragments?: string[];
  /** Memory shards found: shard indexes per memory id (src/core/data/memories.ts). */
  memories?: Record<string, number[]>;
  /** Guardians beaten before sagas were kept: they count for Guardians' Bane, since nobody can strike them again. */
  guardiansBefore?: string[];
  /** Deeds earned (Book of Deeds), by id. */
  deeds?: Record<string, EarnedDeed>;
  /** Counters for deeds. */
  counters?: Partial<Record<DeedCounter, number>>;
  /** The roots just carried the party home: the next night at the inn is free (see `innCost`). */
  freeNight?: boolean;
  /** Brynja's advice line in town switched off (src/core/advice.ts). */
  adviceOff?: boolean;
  /** Floors whose map Sigrid has bought (src/core/charting.ts): each pays once. */
  mapsSold?: number[];
  /** The party came onto this floor from above (not back up its stairs), so its stairs down can count for the Pacifist's Walk. */
  fromAbove?: boolean;
  /** Where the party last walked into a wall (for a deed). */
  lastBump?: string;
  /** The Wyrdweave: the day of the last try, threads held, pieces of Wyrd gear woven, most floors cleared in a day. */
  wyrd?: { lastDay: number; threads?: number; woven?: string[]; best?: number; streak?: number };
}

export type StepEvent =
  | { type: 'bump' }
  /** Walked into a chest: it has to be opened with the action button. */
  | { type: 'chestAhead'; opened: boolean }
  /** The action button was used with nothing to act on. */
  | { type: 'nothing' }
  | { type: 'moved' }
  | { type: 'chest'; loot: Loot; fragment?: FragmentDef }
  | { type: 'emptyChest' }
  | { type: 'stairs' }
  | { type: 'upstairs' }
  /** Standing on linked stairs, leading up or down to another floor of the chapter. */
  | { type: 'link'; down: boolean; floor: number }
  /** A root gate opened from its own side (it stays open), or one that only opens from the other side. */
  | { type: 'gateOpened' }
  | { type: 'gateSealed' }
  | { type: 'spring'; used: boolean }
  /** Standing on a gathering spot. `rank` is the party's best rank in its skill (0 = nobody can). */
  | { type: 'gatherSpot'; kind: GatherKind; left: number; rank: number }
  | { type: 'boss' }
  | { type: 'encounter'; enemies: string[] }
  /** A prowler and the party ran into each other. */
  | { type: 'prowler'; index: number }
  /** A hunting prowler has noticed the party. */
  | { type: 'prowlerAlert'; index: number };

export interface GatherResult {
  kind: GatherKind;
  /** Material ids found (already added to the party's materials). */
  finds: string[];
  /** Monsters drawn by the noise, or null. */
  ambush: string[] | null;
}

/**
 * What one gathering at a spot finds: better ranks (`power`, 1–10) find more, and rarer things; deeper floors
 * in a chapter hold rarer things too. Used in the dungeon and by Raven Runs.
 */
export function gatherFinds(depth: number, kind: GatherKind, power: number, rng: Rng): string[] {
  const table = GATHER_TABLES[Math.min(GATHER_TABLES.length - 1, Math.floor(depth / FLOORS_PER_CHAPTER))][kind];
  const inChapter = depth % FLOORS_PER_CHAPTER;
  const count = 1 + (power >= 4 ? 1 : 0) + (power >= 8 ? 1 : 0);
  const finds: string[] = [];
  for (let i = 0; i < count; i++) {
    const roll = rng.next();
    const rare = 0.03 + 0.015 * power + 0.015 * inChapter;
    const uncommon = rare + 0.22 + 0.02 * power + 0.03 * inChapter;
    finds.push(roll < rare ? table[2] : roll < uncommon ? table[1] : table[0]);
  }
  return finds;
}

export class SaveVersionError extends Error {
  constructor(readonly found: number) {
    super(`Save version ${found} is not supported (expected ${SAVE_VERSION})`);
  }
}

export class Game {
  map: FloorMap;
  rng: Rng;

  private constructor(
    public state: GameState,
    /** The floors of this run: the Rootdeep, or a single floor from the drafting table. */
    readonly floors: readonly FloorDef[] = FLOORS,
  ) {
    this.rng = new Rng(state.rng);
    this.map = this.loadMap();
    // Fill in fields that saves from earlier builds don't have yet.
    state.chartMode ??= 'assisted';
    state.reserve ??= [];
    state.inventory = makeInventory(state.inventory);
    state.materials ??= {};
    state.sold ??= {};
    state.kills ??= {};
    state.bestiary ??= {};
    state.quests ??= {};
    state.story ??= [];
    state.choices ??= {};
    if (!Number.isFinite(state.gold)) state.gold = 0;
    if (!Number.isInteger(state.deepest) || state.deepest < 0) state.deepest = 0;
    // Sigrid only began buying maps in November 2026: saves from before count the earlier chapters' maps as sold, so a
    // deep party is not paid for thirty floors at once; the chapter it is in still pays.
    if (!Array.isArray(state.mapsSold)) {
      const start = state.deepest - (state.deepest % FLOORS_PER_CHAPTER);
      state.mapsSold = Array.from({ length: start }, (_, f) => f);
    } else state.mapsSold = state.mapsSold.filter((f) => Number.isInteger(f) && f >= 0);
    // Number the oaths of adventurers from before oaths were numbered.
    [...state.party, ...state.reserve].forEach((m, i) => (m.oath ??= i + 1));
    [...state.party, ...state.reserve].forEach(clampRanks);
    // An oath beyond the adventurer's level cannot be honest (src/core/oaths.ts).
    for (const m of [...state.party, ...state.reserve]) if (!validOath(m.oathRank, m.level)) delete m.oathRank;
    // At most three in a row (parties from before the rule may have four in front).
    fitRows(state.party);
    // Difficulty settings existed briefly; everyone plays by the same rules (fair for expeditions).
    delete (state as { difficulty?: unknown }).difficulty;
    state.oaths ??= state.party.length + state.reserve.length;
    state.tips ??= [];
    // Saves from before skill points: give everyone the recommended build for their level.
    for (const m of [...state.party, ...state.reserve]) if (!m.skills) autoSpend(m);
    state.progress.forEach((p, i) => {
      p.prowlers ??= initProwlers(this.floors[i]);
      p.chart ??= emptyChart(p.explored.length);
    });
    // New chapters add floors; saves from before them get fresh progress for those.
    for (let i = state.progress.length; i < this.floors.length; i++) state.progress.push(newProgress(this.floors[i]));
    if (this.floors === FLOORS) this.catchUpOldSave();
    // "Cleared" means the last floor's boss has fallen (it meant floor 5 before chapter II).
    state.cleared = state.progress[this.floors.length - 1].bossDefeated;
  }

  /**
   * Guardians cannot be fought again and chests stay open, so what a save did before the bestiary, fragments and
   * sagas existed is filled in here: guardians beaten count as met and defeated, and their fragments (and those in
   * the first chests already opened) are found.
   */
  private catchUpOldSave(): void {
    const state = this.state;
    const fresh = !state.fragments;
    const beaten: string[] = [];
    state.progress.forEach((p, i) => {
      const boss = this.floors[i]?.boss;
      if (p.bossDefeated && boss?.length) {
        beaten.push(boss[0]);
        for (const id of boss) {
          const e = ((state.bestiary ??= {})[id] ??= { seen: 0, defeated: 0, tried: [] });
          e.seen = Math.max(e.seen, 1);
          e.defeated = Math.max(e.defeated, 1);
        }
      }
      if (fresh) {
        const found = (state.fragments ??= []);
        const add = (f: FragmentDef | undefined) => f && !found.includes(f.id) && found.push(f.id);
        if (p.bossDefeated) add(fragmentAt(i, 'guardian'));
        if (p.openedChests.includes(0)) add(fragmentAt(i, 'chest'));
      }
    });
    if (state.guardiansBefore === undefined) {
      const sagasKept = [...state.party, ...state.reserve].some((m) => m.saga);
      state.guardiansBefore = sagasKept ? [] : beaten;
    }
  }

  /** A new game; `party` is the group the player made (the default party is for tests and the computer player). */
  static newGame(seed: number, party?: Member[]): Game {
    const game = Game.fresh(seed, FLOORS);
    if (party) {
      game.state.party = party;
      game.state.oaths = party.length;
      party.forEach((m, i) => (m.oath = i + 1));
    }
    return game;
  }

  /**
   * A test run of one floor from the drafting table: a party at `level` wearing the best gear
   * the shop sells by floor `tier`, standing at the floor's start. Nothing of it is saved.
   */
  static trial(def: FloorDef | FloorDef[], level: number, tier: number, seed: number): Game {
    const game = Game.fresh(seed, Array.isArray(def) ? def : [def]);
    const s = game.state;
    for (const m of s.party) {
      m.level = level;
      m.xp = xpForLevel(level);
      m.skills = {};
      autoSpend(m);
      for (const slot of ['weapon', 'armor'] as const) {
        const best = EQUIPMENT_LIST.filter((e) => e.slot === slot && e.tier <= tier && !e.requires && e.classes.includes(m.classId)).sort((a, b) => b.price - a.price)[0];
        m[slot] = best?.id;
      }
    }
    fullRestore(s.party);
    s.inventory = makeInventory({ sapTonic: 6, tideDraught: tier >= 5 ? 4 : 0, spiritDew: 3, clearwater: 3, kindlingMoss: 2 });
    s.story = STORY.map((scene) => scene.id);
    s.gold = 0;
    game.enterFloor(0);
    return game;
  }

  /**
   * Today's Wyrdweave for `home`: its three floors, with the home party (a copy), its bag, its map settings and tips.
   * What happens here goes back home with bringWyrdHome (src/core/wyrd.ts).
   */
  static wyrdRun(home: Game, day: number, seed: number): Game {
    const game = Game.fresh(seed, wyrdFloors(day, wyrdChapter(home), home.state.deepest >= FLOORS_PER_CHAPTER - 1));
    const s = game.state;
    s.party = JSON.parse(JSON.stringify(home.state.party)) as Member[];
    s.inventory = { ...home.state.inventory };
    s.chartMode = home.state.chartMode;
    s.tips = [...(home.state.tips ?? [])];
    s.tipsOff = home.state.tipsOff;
    s.story = STORY.map((scene) => scene.id);
    s.gold = 0;
    // No Oath Tokens here: the Wyrdweave comes back every day.
    s.expedition = true;
    game.rewardScale = WYRD_REWARD_SCALE;
    game.runeFloors = [0, 1, 2].map((k) => wyrdFloorCode(day, k));
    game.enterFloor(0, true);
    return game;
  }

  private static fresh(seed: number, floors: readonly FloorDef[]): Game {
    const progress = floors.map(newProgress);
    const start = parseFloor(floors[0]).start;
    const game = new Game({
      version: SAVE_VERSION,
      rng: seed,
      location: 'town',
      deepest: 0,
      chartMode: 'assisted',
      floor: 0,
      x: start.x,
      y: start.y,
      dir: start.dir,
      party: createStartingParty(),
      reserve: [],
      gold: 150,
      inventory: makeInventory({ sapTonic: 3, spiritDew: 1, clearwater: 2, kindlingMoss: 1, homingFeather: 1 }),
      danger: 0,
      encounterAt: 0,
      progress,
      steps: 0,
      battles: 0,
      cleared: false,
      materials: {},
      sold: {},
      kills: {},
      quests: {},
      story: [],
      choices: {},
    }, floors);
    game.rollEncounterAt();
    return game;
  }

  /** Wraps an existing state (shared, not copied). Used for expeditions, which keep their own state. */
  static fromState(state: GameState): Game {
    return new Game(state);
  }

  static load(json: string): Game {
    const state = JSON.parse(json) as GameState;
    if (!state || typeof state !== 'object' || state.version !== SAVE_VERSION) throw new SaveVersionError(state?.version);
    if (!Array.isArray(state.party) || !state.party.length || !Array.isArray(state.progress)) throw new SaveVersionError(state.version);
    return new Game(state);
  }

  serialize(): string {
    this.state.rng = this.rng.state;
    return JSON.stringify(this.state);
  }

  get floorDef(): FloorDef {
    return this.floors[this.state.floor];
  }

  get isLastFloor(): boolean {
    return this.state.floor === this.floors.length - 1;
  }

  get progress(): FloorProgress {
    return this.state.progress[this.state.floor];
  }

  /** 0..1 — how close the next random encounter is (for the danger gauge). */
  get dangerLevel(): number {
    return Math.min(1, this.state.danger / this.state.encounterAt);
  }

  tileHere(): Tile {
    return tileAt(this.map, this.state.x, this.state.y);
  }

  isExplored(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return false;
    return this.progress.explored[y * this.map.width + x] === '1';
  }

  /** Whether the party can walk onto a cell: an emptied chest can be stepped over. */
  canEnter(x: number, y: number): boolean {
    return isPassable(this.map, x, y) || (tileAt(this.map, x, y) === 'chest' && this.isChestOpened(x, y));
  }

  isChestOpened(x: number, y: number): boolean {
    const index = this.map.chests.findIndex((c) => c.x === x && c.y === y);
    return this.progress.openedChests.includes(index);
  }

  turn(delta: -1 | 1): void {
    this.state.dir = turnDir(this.state.dir, delta);
    this.markExplored();
  }

  /** forward: 1 = step ahead, -1 = step back. right: 1/-1 = strafe. */
  step(forward: number, right: number): StepEvent[] {
    const { x, y, dir } = this.state;
    const next = relCell(x, y, dir, forward, right);
    if (!this.canEnter(next.x, next.y)) {
      if (tileAt(this.map, next.x, next.y) === 'chest') return [{ type: 'chestAhead', opened: this.isChestOpened(next.x, next.y) }];
      const spot = `${this.state.floor}:${next.x}:${next.y}`;
      if (this.state.lastBump === spot) count(this, 'bumps');
      else setCount(this, 'bumps', 1);
      this.state.lastBump = spot;
      return [{ type: 'bump' }];
    }

    this.state.x = next.x;
    this.state.y = next.y;
    this.state.steps += 1;
    this.markExplored();

    const events: StepEvent[] = [{ type: 'moved' }];

    // Prowlers: walking into one, or one walking into the party, starts a fight.
    let hit = this.prowlerAt(this.state.x, this.state.y);
    if (hit < 0) {
      for (const index of moveProwlers(this.map, this.floorDef, this.progress.prowlers, this.state)) {
        events.push({ type: 'prowlerAlert', index });
      }
      hit = this.prowlerAt(this.state.x, this.state.y);
    }
    if (hit >= 0) {
      events.push({ type: 'prowler', index: hit });
      return events;
    }

    const tile = this.tileHere();
    if (tile === 'stairs') {
      events.push({ type: 'stairs' });
      return events;
    }
    if (tile === 'up') {
      events.push({ type: 'upstairs' });
      return events;
    }
    if (tile === 'link') {
      const to = this.linkTarget(this.state.x, this.state.y);
      if (to) events.push({ type: 'link', down: to.floor > this.state.floor, floor: to.floor });
      return events;
    }
    if (tile === 'spring') {
      events.push({ type: 'spring', used: this.progress.springUsed });
      return events;
    }
    if (isGatherTile(tile)) {
      const spot = this.gatherSpotHere()!;
      events.push({ type: 'gatherSpot', ...spot });
      return events;
    }
    if (tile === 'boss' && !this.progress.bossDefeated && this.floorDef.boss) {
      events.push({ type: 'boss' });
      return events;
    }

    this.state.danger += 1;
    if (this.state.danger >= this.state.encounterAt) {
      events.push({ type: 'encounter', enemies: this.rng.weighted(this.floorDef.encounters).enemies });
    }
    return events;
  }

  drinkSpring(): boolean {
    if (this.tileHere() !== 'spring' || this.progress.springUsed) return false;
    fullRestore(this.state.party);
    this.progress.springUsed = true;
    return true;
  }

  descend(): void {
    if (this.tileHere() !== 'stairs' || this.isLastFloor) return;
    // Deeds: down a floor without winning a single fight on it; how many stairs down on this descent.
    if (this.state.fromAbove && (this.state.counters?.winsFloor ?? 0) === 0) count(this, 'pacifist');
    count(this, 'downDescent');
    this.enterFloor(this.state.floor + 1, true);
  }

  /**
   * On the first floor of a chapter (6, 11, 16, …) the stairs up can also take the party straight home: the gods' wards
   * that let no one in halfway also know the way back out.
   */
  get canGoHomeHere(): boolean {
    return this.floors === FLOORS && this.state.floor > 0 && this.state.floor % FLOORS_PER_CHAPTER === 0 && this.tileHere() === 'up';
  }

  /** From the stairs up at the start of a chapter, straight back to Lindholm. */
  goHome(): void {
    if (this.canGoHomeHere) this.returnToTown();
  }

  /** Climb the stairs up: to the previous floor's stairs down, or out to town from the first floor. */
  ascend(): void {
    if (this.tileHere() !== 'up') return;
    if (this.state.floor === 0) {
      if ((this.state.counters?.downDescent ?? 0) >= 3) count(this, 'longWayHome');
      this.returnToTown();
      return;
    }
    setCount(this, 'winsFloor', 0);
    this.state.fromAbove = false;
    this.state.floor -= 1;
    this.map = this.loadMap();
    const i = this.map.tiles.indexOf('stairs');
    this.state.x = i % this.map.width;
    this.state.y = Math.floor(i / this.map.width);
    this.markExplored();
  }

  /**
   * Enter the Rootdeep at the start of a floor. From town (`unlock` false) only the first floor of a chapter the
   * party has reached is allowed; the stairs (`unlock` true) lead anywhere.
   */
  enterFloor(floor: number, unlock = false): void {
    if (floor < 0 || floor >= this.floors.length) return;
    if (!unlock && this.floors === FLOORS && !startFloors(this.state.deepest).includes(floor)) return;
    if (!unlock && floor > this.state.deepest) return;
    if (this.state.location === 'town' || !this.state.descent) {
      setCount(this, 'itemsDescent', 0);
      setCount(this, 'fallenDescent', 0);
      setCount(this, 'downDescent', 0);
      // A name for this descent; random, but without touching the game's own dice.
      this.state.descent = `d${this.state.steps.toString(36)}-${Math.floor(Math.random() * 0x7fffffff).toString(36)}`.padEnd(10, '0');
      this.state.setOut = { gold: this.state.gold, inventory: { ...this.state.inventory }, materials: { ...this.state.materials } };
    }
    this.state.location = 'dungeon';
    setCount(this, 'winsFloor', 0);
    this.state.fromAbove = true;
    this.state.floor = floor;
    this.state.deepest = Math.max(this.state.deepest, floor);
    this.map = this.loadMap();
    this.state.x = this.map.start.x;
    this.state.y = this.map.start.y;
    this.state.dir = this.map.start.dir;
    this.state.danger = 0;
    this.rollEncounterAt();
    this.markExplored();
  }

  /** Back to town. Springs refill and prowlers return while the party is away. */
  returnToTown(): void {
    this.state.location = 'town';
    delete this.state.descent;
    delete this.state.setOut;
    this.state.progress.forEach((p, i) => {
      p.springUsed = false;
      p.gathered = {};
      p.prowlers = initProwlers(this.floors[i]);
    });
  }

  /**
   * The whole party has fallen. It is not the end: the roots carry them home to Lindholm, but the deep keeps its toll:
   * half of what was found on this descent (gold, items and materials beyond what the party set out with) stays
   * behind. What they already had in town is safe, and so are Oath Tokens and worn gear. The fallen come round with
   * 1 HP; the inn does the rest. Returns what was lost.
   */
  carriedHome(): CarriedHomeLoss {
    const s = this.state;
    const start = s.setOut ?? { gold: s.gold, inventory: { ...s.inventory }, materials: { ...s.materials } };
    const toll = (now: number, before: number) => Math.ceil(Math.max(0, now - before) / 2);
    const loss: CarriedHomeLoss = { gold: toll(s.gold, start.gold), items: {}, materials: {} };
    s.gold -= loss.gold;
    for (const id of Object.keys(s.inventory) as ItemId[]) {
      const n = s.inventory[id] ?? 0;
      const lost = id === 'oathToken' ? 0 : toll(n, start.inventory[id] ?? 0);
      if (lost <= 0) continue;
      s.inventory[id] = n - lost;
      loss.items[id] = lost;
    }
    for (const [id, n] of Object.entries(s.materials)) {
      const lost = toll(n, start.materials[id] ?? 0);
      if (lost <= 0) continue;
      s.materials[id] = n - lost;
      loss.materials[id] = lost;
    }
    for (const m of s.party) if (m.hp <= 0) m.hp = 1;
    s.freeNight = true;
    delete s.fighting;
    count(this, 'carriedHome');
    this.returnToTown();
    return loss;
  }

  useFeather(): boolean {
    if (this.state.location !== 'dungeon' || (this.state.inventory.homingFeather ?? 0) <= 0) return false;
    this.state.inventory.homingFeather -= 1;
    this.returnToTown();
    return true;
  }

  /** A memory shard found with the guardian just beaten (for the UI to show); not saved. */
  foundShard: { memory: string; shard: number } | null = null;

  /** A fragment found with the guardian just beaten (for the UI to show); not saved. */
  foundFragment: FragmentDef | null = null;
  /** Share of the usual XP and gold (lower in the Wyrdweave). Not saved: a run is never saved. */
  rewardScale = 1;
  /** For a Wyrdweave run: the floor numbers its runestones and shades are kept under. */
  runeFloors: number[] | null = null;

  /** The floor number runestones and shades of this floor are kept under. */
  get runeFloor(): number {
    return this.runeFloors?.[this.state.floor] ?? this.state.floor;
  }

  startCombat(enemies: string[]): Combat {
    // From chapter VI on, monsters may leave a Dream Ember (for the Hall of Echoes).
    const emberChance = this.floors === FLOORS && this.depth >= EMBER_FLOOR ? EMBER_CHANCE : 0;
    return new Combat(this.state.party, enemies, this.state.inventory, this.rng, { rewardScale: this.rewardScale, emberChance });
  }

  /** Index of the active prowler standing on (x, y), or -1. */
  prowlerAt(x: number, y: number): number {
    return this.progress.prowlers.findIndex((p) => !p.defeated && p.x === x && p.y === y);
  }

  /** Picks up a fight saved with `Combat.snapshot()`, using this game's party, pack and random source. */
  resumeCombat(snap: CombatSnapshot): Combat {
    return Combat.restore(snap, this.state.party, this.state.inventory, this.rng);
  }

  startProwlerCombat(index: number): Combat {
    this.state.fighting = index;
    const paid = this.progress.prowlerTokens?.includes(index) ?? false;
    return new Combat(this.state.party, this.floorDef.prowlers[index].enemies, this.state.inventory, this.rng, { prowler: true, oathToken: !paid && !this.state.expedition, rewardScale: this.rewardScale });
  }

  startBossCombat(): Combat {
    return new Combat(this.state.party, this.floorDef.boss ?? [], this.state.inventory, this.rng, { boss: true, oathToken: !this.state.expedition });
  }

  /** Call after a combat is over, with the finished combat. Returns the bynames earned in it (sagas). */
  finishCombat(combat: Combat): { member: Member; byname: Byname }[] {
    if (combat.echo) return this.finishEcho(combat);
    const earned = this.addFightToSagas(combat);
    this.state.battles += 1;
    this.state.danger = 0;
    this.rollEncounterAt();
    const fighting = this.state.fighting ?? null;
    if (fighting !== null) {
      const prowler = this.progress.prowlers[fighting];
      if (combat.outcome === 'victory') {
        prowler.defeated = true;
        const paid = (this.progress.prowlerTokens ??= []);
        if (!paid.includes(fighting)) paid.push(fighting);
      }
      // After a successful escape the prowler is dazed for a few steps.
      if (combat.outcome === 'fled') prowler.stun = 3;
      this.state.fighting = null;
    }
    // For deeds: items used and adventurers fallen on this descent, flights, narrow escapes.
    count(this, 'itemsDescent', combat.itemsUsed);
    if (combat.outcome === 'fled') count(this, 'flees');
    if (this.state.party.some((m) => m.hp <= 0) || combat.fellDuring) count(this, 'fallenDescent');
    if (combat.outcome === 'victory') {
      const standing = this.state.party.filter(isAlive);
      if (standing.length === 1 && this.state.party.length > 1 && standing[0].hp <= 0.1 * memberStats(standing[0]).hp) count(this, 'byAHair');
      count(this, 'winsFloor');
      // Odd ones: a win in the small hours (the player's own clock), and a big fight won with someone unarmed.
      if (new Date().getHours() === 3) count(this, 'nightOwl');
      if ((combat.boss || combat.prowler) && this.state.party.some((m) => !m.weapon)) count(this, 'bareHands');
      if (combat.boss && (this.state.counters?.itemsDescent ?? 0) === 0) count(this, 'guardianNoItems');
      if (combat.boss && (this.state.counters?.fallenDescent ?? 0) === 0) count(this, 'guardianNoFall');
    }
    if (combat.outcome === 'victory' && combat.rewards) {
      this.state.gold += combat.rewards.gold;
      for (const id of combat.rewards.materials) this.state.materials[id] = (this.state.materials[id] ?? 0) + 1;
      for (const e of combat.enemies) this.state.kills[e.def.id] = (this.state.kills[e.def.id] ?? 0) + 1;
      if (combat.boss) {
        // From chapter V on a guardian may leave a memory shard.
        if (this.floors === FLOORS && this.state.floor >= SHARD_FLOOR) this.foundShard = rollShard(this, shardChance(GUARDIAN_LEVEL[combat.enemies[0].def.id] ?? 50), this.rng);
        this.foundFragment = this.findFragment('guardian') ?? null;
        // The Gapwarden, the first time it falls, leaves enough Dream Embers to try the Hall of Echoes once.
        if (this.floors === FLOORS && this.state.floor === ECHO_HALL_FLOOR && !this.progress.bossDefeated) {
          this.state.inventory.dreamEmber = (this.state.inventory.dreamEmber ?? 0) + ECHO_COST;
          for (let i = 0; i < ECHO_COST; i++) combat.rewards.drops.push('dreamEmber');
        }
        this.progress.bossDefeated = true;
        if (this.isLastFloor) this.state.cleared = true;
      }
    }
    return earned;
  }

  /**
   * An echo fight in the Hall of Echoes, fought from Lindholm: nothing in the Rootdeep changes. A win may leave a
   * memory shard; a loss costs nothing more than the embers already spent (the fallen wake with 1 HP).
   */
  private finishEcho(combat: Combat): { member: Member; byname: Byname }[] {
    const earned = this.addFightToSagas(combat);
    this.state.battles += 1;
    this.foundShard = null;
    if (combat.outcome === 'victory' && combat.rewards) {
      this.state.gold += combat.rewards.gold;
      for (const e of combat.enemies) this.state.kills[e.def.id] = (this.state.kills[e.def.id] ?? 0) + 1;
      count(this, 'echoes');
      this.foundShard = rollShard(this, shardChance(combat.echoLevel), this.rng);
    } else {
      for (const m of this.state.party) if (m.hp <= 0) m.hp = 1;
    }
    return earned;
  }

  /** Every party member's part in a fight that was won or fled goes into their saga. */
  private addFightToSagas(combat: Combat): { member: Member; byname: Byname }[] {
    if (combat.outcome !== 'victory' && combat.outcome !== 'fled') return [];
    const won = combat.outcome === 'victory';
    return combat.party.flatMap((m, i) => {
      const d = combat.deeds[i];
      const closeCall = won && isAlive(m) && m.hp <= 0.1 * memberStats(m).hp;
      const fresh = addToSaga(m, { ...d, battles: 1, falls: combat.fell.has(i) ? 1 : 0, closeCalls: closeCall ? 1 : 0 });
      return fresh.map((byname) => ({ member: m, byname }));
    });
  }

  get partyAlive(): boolean {
    return this.state.party.some(isAlive);
  }

  /** The action button: interact with whatever is right in front of the party. */
  /** The Rootdeep floor this floor counts as (drawn floors borrow one). */
  get depth(): number {
    return this.floorDef.depth ?? this.state.floor;
  }

  /** The party's best rank in a gathering skill; only those still standing can gather. */
  gatherRank(kind: GatherKind): number {
    return Math.max(0, ...this.state.party.filter(isAlive).map((m) => rankOf(m, GATHER_KINDS[kind].skill)));
  }

  /** The best gathering rank on the 1–10 scale the finds are worked out on. */
  private gatherPower(kind: GatherKind): number {
    return fullScaleRank(GATHER_KINDS[kind].skill, this.gatherRank(kind));
  }

  gatherSpotHere(): { kind: GatherKind; left: number; rank: number } | null {
    const tile = this.tileHere();
    if (!isGatherTile(tile)) return null;
    const used = this.progress.gathered?.[this.state.y * this.map.width + this.state.x] ?? 0;
    return { kind: tile, left: Math.max(0, GATHER_USES - used), rank: this.gatherRank(tile) };
  }

  /**
   * Gather at the spot the party stands on. Better ranks find more, and rarer things; deeper floors
   * in a chapter hold rarer things too. The noise may draw monsters (`ambush`: start that fight).
   */
  gather(): GatherResult | null {
    const spot = this.gatherSpotHere();
    if (!spot || spot.left <= 0 || spot.rank <= 0) return null;
    const index = this.state.y * this.map.width + this.state.x;
    this.progress.gathered = { ...this.progress.gathered, [index]: GATHER_USES - spot.left + 1 };
    count(this, 'gathers');
    const finds = gatherFinds(this.depth, spot.kind, this.gatherPower(spot.kind), this.rng);
    for (const id of finds) this.state.materials[id] = (this.state.materials[id] ?? 0) + 1;
    const ambush = this.rng.chance(GATHER_AMBUSH) ? this.rng.weighted(this.floorDef.encounters).enemies : null;
    return { kind: spot.kind, finds, ambush };
  }

  /**
   * What the action button would do here, without doing it: gather at a spot, open the chest or the root
   * gate straight ahead. Null when there is nothing to do (the UI then hides the button on PC).
   */
  actionHere(): { kind: 'gather'; gather: GatherKind; left: number } | { kind: 'chest' } | { kind: 'gate' } | null {
    const spot = this.gatherSpotHere();
    // Only when someone in the party has learned this gathering skill (rank 0 can't gather).
    if (spot && spot.left > 0 && spot.rank > 0) return { kind: 'gather', gather: spot.kind, left: spot.left };
    const ahead = relCell(this.state.x, this.state.y, this.state.dir, 1, 0);
    const tile = tileAt(this.map, ahead.x, ahead.y);
    if (tile === 'chest' && !this.isChestOpened(ahead.x, ahead.y)) return { kind: 'chest' };
    if (tile === 'gate') return { kind: 'gate' };
    return null;
  }

  interact(): StepEvent {
    const ahead = relCell(this.state.x, this.state.y, this.state.dir, 1, 0);
    // An unopened chest ahead comes before a gathering spot underfoot: some chests can only be reached from one.
    if (tileAt(this.map, ahead.x, ahead.y) === 'chest' && !this.isChestOpened(ahead.x, ahead.y)) return this.openChest(ahead.x, ahead.y);
    const spot = this.gatherSpotHere();
    if (spot) return { type: 'gatherSpot', ...spot };
    if (tileAt(this.map, ahead.x, ahead.y) === 'chest') return this.openChest(ahead.x, ahead.y);
    if (tileAt(this.map, ahead.x, ahead.y) === 'gate') return this.openGate(ahead.x, ahead.y);
    return { type: 'nothing' };
  }

  /** A root gate opens only for a party standing on its opening side; then it stays open for good. */
  private openGate(x: number, y: number): StepEvent {
    const index = y * this.map.width + x;
    const side = this.map.gates[index];
    if (this.state.x !== x + DX[side] || this.state.y !== y + DY[side]) return { type: 'gateSealed' };
    const open = (this.progress.gatesOpen ??= []);
    if (!open.includes(index)) open.push(index);
    this.map.tiles[index] = 'gateOpen';
    return { type: 'gateOpened' };
  }

  /**
   * The other end of the linked stairs at (x, y): the cell with the same number on another floor of
   * the same chapter (a run of five floors), or null.
   */
  linkTarget(x: number, y: number): { floor: number; x: number; y: number } | null {
    const id = this.map.links[y * this.map.width + x];
    if (!id) return null;
    const first = this.state.floor - (this.state.floor % FLOORS_PER_CHAPTER);
    for (let f = first; f < Math.min(this.floors.length, first + FLOORS_PER_CHAPTER); f++) {
      if (f === this.state.floor) continue;
      const i = this.floors[f].rows.findIndex((row) => row.includes(id));
      if (i >= 0) return { floor: f, x: this.floors[f].rows[i].indexOf(id), y: i };
    }
    return null;
  }

  /** Whether linked stairs at (x, y) on this floor lead down (true), up (false), or nowhere (null). */
  linkGoesDown(x: number, y: number): boolean | null {
    const to = this.linkTarget(x, y);
    return to ? to.floor > this.state.floor : null;
  }

  /** Take the linked stairs the party stands on: to the matching stairs on the other floor. */
  takeLink(): boolean {
    const to = this.linkTarget(this.state.x, this.state.y);
    if (!to) return false;
    // Numbered stairs count like the plain ones for the deeds: down without a win, and a fresh floor's tally.
    if (to.floor > this.state.floor) {
      if (this.state.fromAbove && (this.state.counters?.winsFloor ?? 0) === 0) count(this, 'pacifist');
      count(this, 'downDescent');
    }
    setCount(this, 'winsFloor', 0);
    this.state.fromAbove = to.floor > this.state.floor;
    this.state.floor = to.floor;
    this.state.deepest = Math.max(this.state.deepest, to.floor);
    this.map = this.loadMap();
    this.state.x = to.x;
    this.state.y = to.y;
    this.state.danger = 0;
    this.markExplored();
    return true;
  }

  /** The current floor's map, with the gates this party has opened standing open. */
  private loadMap(): FloorMap {
    const map = parseFloor(this.floorDef);
    for (const i of this.state.progress[this.state.floor]?.gatesOpen ?? []) if (map.tiles[i] === 'gate') map.tiles[i] = 'gateOpen';
    return map;
  }

  private openChest(x: number, y: number): StepEvent {
    const index = this.map.chests.findIndex((c) => c.x === x && c.y === y);
    if (index < 0 || this.progress.openedChests.includes(index)) return { type: 'emptyChest' };
    this.progress.openedChests.push(index);
    let loot = this.floorDef.chests[index] ?? { gold: 10 };
    // Oath Tokens are not won on expeditions (every expedition starts afresh, so they could be farmed).
    if (this.state.expedition && 'item' in loot && ITEMS[loot.item]?.effect === 'token') loot = { gold: 40 };
    if ('gold' in loot) this.state.gold += loot.gold;
    else this.state.inventory[loot.item] = (this.state.inventory[loot.item] ?? 0) + loot.qty;
    const fragment = index === 0 ? this.findFragment('chest') : undefined;
    return { type: 'chest', loot, fragment };
  }

  /** A fragment lying here (first chest, or the guardian), if this is the Rootdeep and it was not found before. */
  findFragment(kind: 'chest' | 'guardian'): FragmentDef | undefined {
    if (this.floors !== FLOORS) return undefined;
    const f = fragmentAt(this.state.floor, kind);
    const found = (this.state.fragments ??= []);
    if (!f || found.includes(f.id)) return undefined;
    found.push(f.id);
    return f;
  }

  private rollEncounterAt(): void {
    const avg = this.floorDef.encounterSteps;
    this.state.encounterAt = this.rng.int(Math.round(avg * 0.6), Math.round(avg * 1.4));
  }

  /** The mark the assisted map puts on a special square the party comes upon, if any. */
  markFor(x: number, y: number): MarkId | null {
    const tile = tileAt(this.map, x, y);
    if (tile === 'stairs') return 'down';
    if (tile === 'up') return 'up';
    if (tile === 'chest') return 'chest';
    if (tile === 'spring') return 'spring';
    if (tile === 'link') {
      const down = this.linkGoesDown(x, y);
      return down === null ? null : down ? 'down' : 'up';
    }
    return isGatherTile(tile) ? tile : null;
  }

  /** Assisted map: marks a special square once, never over a mark of the player's own. */
  private autoMark(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return;
    const mark = this.markFor(x, y);
    if (!mark) return;
    const index = y * this.map.width + x;
    const done = (this.progress.autoMarked ??= []);
    if (done.includes(index)) return;
    done.push(index);
    if (!this.chart.marks[index]) setMark(this.chart, index, mark);
  }

  /** The map the player has drawn of the current floor. */
  get chart(): Chart {
    return this.progress.chart;
  }

  /**
   * What the party has seen (always tracked; drawn on the map in auto mode),
   * plus, in assisted mode, the cell the party stands on is charted as floor.
   */
  private markExplored(): void {
    if (this.state.chartMode === 'assisted') {
      setTerrain(this.chart, this.state.y * this.map.width + this.state.x, 'floor');
      const ahead = relCell(this.state.x, this.state.y, this.state.dir, 1, 0);
      this.autoMark(this.state.x, this.state.y);
      this.autoMark(ahead.x, ahead.y);
    }
    const cells = this.progress.explored.split('');
    // The party's own square and the four beside it: what is visible without peeking round a corner.
    for (const [dx, dy] of [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const x = this.state.x + dx;
      const y = this.state.y + dy;
      if (x >= 0 && y >= 0 && x < this.map.width && y < this.map.height) cells[y * this.map.width + x] = '1';
    }
    // Also map the corridor straight ahead while it stays open (what you can see).
    let { x, y } = this.state;
    for (let d = 1; d <= 3; d++) {
      x += DX[this.state.dir];
      y += DY[this.state.dir];
      if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) break;
      cells[y * this.map.width + x] = '1';
      if (!this.canEnter(x, y)) break;
    }
    this.progress.explored = cells.join('');
  }
}

function newProgress(def: FloorDef): FloorProgress {
  const map = parseFloor(def);
  return {
    explored: '0'.repeat(map.width * map.height),
    openedChests: [],
    springUsed: false,
    bossDefeated: false,
    prowlers: initProwlers(def),
    chart: emptyChart(map.width * map.height),
  };
}
