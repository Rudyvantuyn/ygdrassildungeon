import { Combat } from './combat';
import { FLOORS, type FloorDef } from './data/floors';
import { DX, DY, isPassable, parseFloor, relCell, tileAt, turnDir, type FloorMap, type Tile } from './dungeon';
import { createStartingParty, fullRestore, isAlive } from './party';
import { Rng } from './rng';
import type { Dir, ItemId, Loot, Member } from './types';

export const SAVE_VERSION = 1;

export interface FloorProgress {
  /** One character per cell: '1' = mapped. */
  explored: string;
  openedChests: number[];
  springUsed: boolean;
  bossDefeated: boolean;
}

export interface GameState {
  version: number;
  rng: number;
  floor: number;
  x: number;
  y: number;
  dir: Dir;
  party: Member[];
  gold: number;
  inventory: Record<ItemId, number>;
  /** Steps taken since the last encounter, compared against `encounterAt`. */
  danger: number;
  encounterAt: number;
  progress: FloorProgress[];
  steps: number;
  battles: number;
  cleared: boolean;
}

export type StepEvent =
  | { type: 'bump' }
  | { type: 'moved' }
  | { type: 'chest'; loot: Loot }
  | { type: 'emptyChest' }
  | { type: 'stairs' }
  | { type: 'spring'; used: boolean }
  | { type: 'boss' }
  | { type: 'encounter'; enemies: string[] };

export class Game {
  map: FloorMap;
  private rng: Rng;

  private constructor(public state: GameState) {
    this.rng = new Rng(state.rng);
    this.map = parseFloor(this.floorDef);
  }

  static newGame(seed: number): Game {
    const progress = FLOORS.map((def) => {
      const map = parseFloor(def);
      return { explored: '0'.repeat(map.width * map.height), openedChests: [], springUsed: false, bossDefeated: false };
    });
    const start = parseFloor(FLOORS[0]).start;
    const game = new Game({
      version: SAVE_VERSION,
      rng: seed,
      floor: 0,
      x: start.x,
      y: start.y,
      dir: start.dir,
      party: createStartingParty(),
      gold: 0,
      inventory: { medica: 3, amrita: 1 },
      danger: 0,
      encounterAt: 0,
      progress,
      steps: 0,
      battles: 0,
      cleared: false,
    });
    game.rollEncounterAt();
    game.markExplored();
    return game;
  }

  static load(json: string): Game {
    const state = JSON.parse(json) as GameState;
    if (state.version !== SAVE_VERSION) throw new Error(`Unsupported save version ${state.version}`);
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
    if (!isPassable(this.map, next.x, next.y)) return [{ type: 'bump' }];

    this.state.x = next.x;
    this.state.y = next.y;
    this.state.steps += 1;
    this.markExplored();

    const events: StepEvent[] = [{ type: 'moved' }];
    const tile = this.tileHere();
    if (tile === 'chest') {
      events.push(this.openChest());
      return events;
    }
    if (tile === 'stairs') {
      events.push({ type: 'stairs' });
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
    this.state.floor += 1;
    this.map = parseFloor(this.floorDef);
    this.state.x = this.map.start.x;
    this.state.y = this.map.start.y;
    this.state.dir = this.map.start.dir;
    this.state.danger = 0;
    this.rollEncounterAt();
    this.markExplored();
  }

  startCombat(enemies: string[]): Combat {
    return new Combat(this.state.party, enemies, this.state.inventory, this.rng);
  }

  startBossCombat(): Combat {
    return new Combat(this.state.party, this.floorDef.boss ?? [], this.state.inventory, this.rng, { boss: true });
  }

  /** Call after a combat is over, with the finished combat. */
  finishCombat(combat: Combat): void {
    this.state.battles += 1;
    this.state.danger = 0;
    this.rollEncounterAt();
    if (combat.outcome === 'victory' && combat.rewards) {
      this.state.gold += combat.rewards.gold;
      if (combat.boss) {
        this.progress.bossDefeated = true;
        if (this.isLastFloor) this.state.cleared = true;
      }
    }
  }

  get partyAlive(): boolean {
    return this.state.party.some(isAlive);
  }

  private openChest(): StepEvent {
    const index = this.map.chests.findIndex((c) => c.x === this.state.x && c.y === this.state.y);
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

  /** Auto-map: the current cell and its eight neighbours become known. */
  private markExplored(): void {
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
