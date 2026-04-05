export const CHARACTER_CLASSES = ["Guardian", "Ranger", "Mystic", "Rogue"] as const;
export type CharacterClass = (typeof CHARACTER_CLASSES)[number];

export type EntityId = string;
export type RoomId = string;
export type PlayerId = string;
export type RunId = string;

export interface Stats {
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  critChance: number;
  accuracy: number;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  power: number;
  cooldownTurns: number;
  target: "singleEnemy" | "allEnemies" | "singleAlly" | "self";
  manaCost: number;
  applyStatus?: "bleed" | "guarded" | "focus";
}

export interface CharacterDefinition {
  className: CharacterClass;
  baseStats: Stats;
  skillIds: string[];
  growthPerLevel: Omit<Stats, "maxHp"> & { maxHp: number };
}

export interface CombatEntity {
  entityId: EntityId;
  name: string;
  isPlayer: boolean;
  className?: CharacterClass;
  level: number;
  stats: Stats;
  currentHp: number;
  cooldowns: Record<string, number>;
  statuses: Partial<Record<"bleed" | "guarded" | "focus", number>>;
}

export interface Profile {
  playerId: PlayerId;
  name: string;
  unlockedClasses: CharacterClass[];
  accountLevel: number;
  currency: number;
  inventory: string[];
  premiumCurrency?: number;
  stamina?: number;
  masteryXp?: number;
  lastDailyResetAt?: string;
  skillPoints?: number;
}

export interface RoomPlayer {
  playerId: PlayerId;
  displayName: string;
  selectedClass: CharacterClass;
  isReady: boolean;
  connected: boolean;
}

export interface RoomState {
  roomId: RoomId;
  hostPlayerId: PlayerId;
  players: RoomPlayer[];
  status: "lobby" | "inRun" | "closed";
}

export interface RewardSummary {
  currency: number;
  itemDrops: string[];
  xp: number;
}

export interface WalletLedgerEntry {
  id: string;
  playerId: PlayerId;
  amount: number;
  kind: "runReward" | "missionReward" | "purchase" | "upgrade" | "salvage" | "admin";
  reason: string;
  createdAt: string;
}

export interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  track: "main" | "side";
  cadence: "main" | "daily" | "weekly";
  seasonId: string;
  objective: {
    kind: "clearRuns" | "clearFloors" | "killEnemies" | "playClass" | "defeatFloorBoss" | "collectItems";
    target: number;
    className?: CharacterClass;
    floor?: number;
    itemId?: string;
  };
  progressionGate?: {
    kind: "unlockFloor";
    unlocksFloor: number;
  };
  rewards: RewardSummary;
}

export interface MissionProgress {
  missionId: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
}

export interface SkillNode {
  id: string;
  className: CharacterClass;
  name: string;
  description: string;
  cost: number;
  requires: string[];
}

export interface PlayerSkillTreeState {
  unlockedNodeIds: string[];
  equippedSkillIds: string[];
}

export interface ItemDefinition {
  id: string;
  name: string;
  slot: "weapon" | "armor" | "trinket" | "relic";
  rarity: "common" | "rare" | "epic" | "legendary";
  basePower: number;
}

export interface PlayerItem {
  instanceId: string;
  definitionId: string;
  level: number;
  affixes: string[];
}

export interface ShopEntry {
  id: string;
  itemId: string;
  price: number;
  stock: number;
}

export interface SeasonProgress {
  seasonId: string;
  seasonName: string;
  xp: number;
  level: number;
}

export interface GuildState {
  guildId: string;
  guildName: string;
  memberIds: PlayerId[];
  missionProgress: number;
}

export type ForestHeading = 0 | 1 | 2 | 3;

export type ForestPoiKind = "start" | "stairs_down" | "stairs_up" | "mining" | "treasure" | "event" | "encounter" | "npc";

export interface ForestPoi {
  id: string;
  kind: ForestPoiKind;
  x: number;
  y: number;
  once?: boolean;
  lootTable?: string;
  eventId?: string;
  encounterPool?: string;
}

export interface ForestFloorMap {
  seasonId: string;
  floorId: string;
  floorNumber: number;
  width: number;
  height: number;
  start: {
    x: number;
    y: number;
    heading: ForestHeading;
  };
  stairsDown: { x: number; y: number } | null;
  stairsUp: { x: number; y: number } | null;
  passableCells: Array<{ x: number; y: number }>;
  pois: ForestPoi[];
}

export interface ForestStoryProgress {
  unlockedFloor: number;
  highestDefeatedBossFloor: number;
  currentFloor: number;
  maxAuthoredFloor: number;
}
