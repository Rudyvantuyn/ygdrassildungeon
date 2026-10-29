import { emptyChart, setTerrain, type Chart, type ChartMode } from './chart';
import { Combat, type CombatSnapshot } from './combat';
import { FLOORS, type FloorDef } from './data/floors';
import { makeInventory } from './data/items';
import type { QuestState } from './quests';
import { DX, DY, isPassable, parseFloor, relCell, tileAt, turnDir, type FloorMap, type Tile } from './dungeon';
import { createStartingParty, fullRestore, isAlive } from './party';
import { initProwlers, moveProwlers, type ProwlerState } from './prowlers';
import { Rng } from './rng';
import type { Dir, ItemId, Loot, Member } from './types';

/** Bump when the save format changes incompatibly; older saves are then discarded. */
export const SAVE_VERSION = 3;

export interface FloorProgress {
  /** One character per cell: '1' = mapped. */
  explored: string;
  openedChests: number[];
  springUsed: boolean;
  bossDefeated: boolean;
  prowlers: ProwlerState[];
  /** The map the player draws. */
  chart: Chart;
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
  quests: Record<string, QuestState>;
  /** Story scenes already shown. */
  story: string[];
  /** Steps taken since the last encounter, compared against `encounterAt`. */
  danger: number;
  encounterAt: number;
  progress: FloorProgress[];
  steps: number;
  battles: number;
  cleared: boolean;
  /** Prowler the current fight is against, if any. */
  fighting?: number | null;
  /** Expeditions whose share has already been brought home. */
  claimed?: string[];
}

export type StepEvent =
  | { type: 'bump' }
  /** Walked into a chest: it has to be opened with the action button. */
  | { type: 'chestAhead'; opened: boolean }
  /** The action button was used with nothing to act on. */
  | { type: 'nothing' }
  | { type: 'moved' }
  | { type: 'chest'; loot: Loot }
  | { type: 'emptyChest' }
  | { type: 'stairs' }
  | { type: 'upstairs' }
  | { type: 'spring'; used: boolean }
  | { type: 'boss' }
  | { type: 'encounter'; enemies: string[] }
  /** A prowler and the party ran into each other. */
  | { type: 'prowler'; index: number }
  /** A hunting prowler has noticed the party. */
  | { type: 'prowlerAlert'; index: number };

export class SaveVersionError extends Error {
  constructor(readonly found: number) {
    super(`Save version ${found} is not supported (expected ${SAVE_VERSION})`);
  }
}

export class Game {
  map: FloorMap;
  private rng: Rng;

  private constructor(public state: GameState) {
    this.rng = new Rng(state.rng);
    this.map = parseFloor(this.floorDef);
    // Fill in fields that saves from earlier builds don't have yet.
    state.chartMode ??= 'assisted';
    state.reserve ??= [];
    state.inventory = makeInventory(state.inventory);
    state.materials ??= {};
    state.sold ??= {};
    state.kills ??= {};
    state.quests ??= {};
    state.story ??= [];
    state.progress.forEach((p, i) => {
      p.prowlers ??= initProwlers(FLOORS[i]);
      p.chart ??= emptyChart(p.explored.length);
    });
  }

  static newGame(seed: number): Game {
    const progress = FLOORS.map((def) => {
      const map = parseFloor(def);
      return {
        explored: '0'.repeat(map.width * map.height),
        openedChests: [],
        springUsed: false,
        bossDefeated: false,
        prowlers: initProwlers(def),
        chart: emptyChart(map.width * map.height),
      };
    });
    const start = parseFloor(FLOORS[0]).start;
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
    });
    game.rollEncounterAt();
    return game;
  }

  /** Wraps an existing state (shared, not copied). Used for expeditions, which keep their own state. */
  static fromState(state: GameState): Game {
    return new Game(state);
  }

  static load(json: string): Game {
    const state = JSON.parse(json) as GameState;
    if (state.version !== SAVE_VERSION) throw new SaveVersionError(state.version);
    return new Game(state);
  }

  serialize(): string {
    this.state.rng = this.rng.state;
    return JSON.stringify(this.state);
  }

  get floorDef(): FloorDef {
    return FLOORS[this.state.floor];
  }

  get isLastFloor(): boolean {
    return this.state.floor === FLOORS.length - 1;
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
    if (!isPassable(this.map, next.x, next.y)) {
      if (tileAt(this.map, next.x, next.y) === 'chest') return [{ type: 'chestAhead', opened: this.isChestOpened(next.x, next.y) }];
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
    if (tile === 'spring') {
      events.push({ type: 'spring', used: this.progress.springUsed });
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
    this.enterFloor(this.state.floor + 1, true);
  }

  /** Climb the stairs up: to the previous floor's stairs down, or out to town from the first floor. */
  ascend(): void {
    if (this.tileHere() !== 'up') return;
    if (this.state.floor === 0) {
      this.returnToTown();
      return;
    }
    this.state.floor -= 1;
    this.map = parseFloor(this.floorDef);
    const i = this.map.tiles.indexOf('stairs');
    this.state.x = i % this.map.width;
    this.state.y = Math.floor(i / this.map.width);
    this.markExplored();
  }

  /** Enter the Rootdeep at the start of a floor the party has already reached. */
  enterFloor(floor: number, unlock = false): void {
    if (floor < 0 || floor >= FLOORS.length) return;
    if (!unlock && floor > this.state.deepest) return;
    this.state.location = 'dungeon';
    this.state.floor = floor;
    this.state.deepest = Math.max(this.state.deepest, floor);
    this.map = parseFloor(this.floorDef);
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
    this.state.progress.forEach((p, i) => {
      p.springUsed = false;
      p.prowlers = initProwlers(FLOORS[i]);
    });
  }

  useFeather(): boolean {
    if (this.state.location !== 'dungeon' || (this.state.inventory.homingFeather ?? 0) <= 0) return false;
    this.state.inventory.homingFeather -= 1;
    this.returnToTown();
    return true;
  }

  startCombat(enemies: string[]): Combat {
    return new Combat(this.state.party, enemies, this.state.inventory, this.rng);
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
    return new Combat(this.state.party, this.floorDef.prowlers[index].enemies, this.state.inventory, this.rng, { prowler: true });
  }

  startBossCombat(): Combat {
    return new Combat(this.state.party, this.floorDef.boss ?? [], this.state.inventory, this.rng, { boss: true });
  }

  /** Call after a combat is over, with the finished combat. */
  finishCombat(combat: Combat): void {
    this.state.battles += 1;
    this.state.danger = 0;
    this.rollEncounterAt();
    const fighting = this.state.fighting ?? null;
    if (fighting !== null) {
      const prowler = this.progress.prowlers[fighting];
      if (combat.outcome === 'victory') prowler.defeated = true;
      // After a successful escape the prowler is dazed for a few steps.
      if (combat.outcome === 'fled') prowler.stun = 3;
      this.state.fighting = null;
    }
    if (combat.outcome === 'victory' && combat.rewards) {
      this.state.gold += combat.rewards.gold;
      for (const id of combat.rewards.materials) this.state.materials[id] = (this.state.materials[id] ?? 0) + 1;
      for (const e of combat.enemies) this.state.kills[e.def.id] = (this.state.kills[e.def.id] ?? 0) + 1;
      if (combat.boss) {
        this.progress.bossDefeated = true;
        if (this.isLastFloor) this.state.cleared = true;
      }
    }
  }

  get partyAlive(): boolean {
    return this.state.party.some(isAlive);
  }

  /** The action button: interact with whatever is right in front of the party. */
  interact(): StepEvent {
    const ahead = relCell(this.state.x, this.state.y, this.state.dir, 1, 0);
    if (tileAt(this.map, ahead.x, ahead.y) === 'chest') return this.openChest(ahead.x, ahead.y);
    return { type: 'nothing' };
  }

  private openChest(x: number, y: number): StepEvent {
    const index = this.map.chests.findIndex((c) => c.x === x && c.y === y);
    if (index < 0 || this.progress.openedChests.includes(index)) return { type: 'emptyChest' };
    this.progress.openedChests.push(index);
    const loot = this.floorDef.chests[index] ?? { gold: 10 };
    if ('gold' in loot) this.state.gold += loot.gold;
    else this.state.inventory[loot.item] = (this.state.inventory[loot.item] ?? 0) + loot.qty;
    return { type: 'chest', loot };
  }

  private rollEncounterAt(): void {
    const avg = this.floorDef.encounterSteps;
    this.state.encounterAt = this.rng.int(Math.round(avg * 0.6), Math.round(avg * 1.4));
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
    if (this.state.chartMode === 'assisted') setTerrain(this.chart, this.state.y * this.map.width + this.state.x, 'floor');
    const cells = this.progress.explored.split('');
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = this.state.x + dx;
        const y = this.state.y + dy;
        if (x >= 0 && y >= 0 && x < this.map.width && y < this.map.height) cells[y * this.map.width + x] = '1';
      }
    }
    // Also map the corridor straight ahead while it stays open (what you can see).
    let { x, y } = this.state;
    for (let d = 1; d <= 3; d++) {
      x += DX[this.state.dir];
      y += DY[this.state.dir];
      if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) break;
      cells[y * this.map.width + x] = '1';
      if (!isPassable(this.map, x, y)) break;
    }
    this.progress.explored = cells.join('');
  }
}
