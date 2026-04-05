import type { CharacterClass, MissionProgress, MissionTemplate, RewardSummary } from "@ygd/shared";
import { getMissionContentPlan, getReleasedMissionTemplates } from "./content/missionSeasons.js";
import { getOrCreateProfile, grantCurrency } from "./progression.js";

type Counters = {
  clearRuns: number;
  clearFloors: number;
  killEnemies: number;
  classesPlayed: Set<CharacterClass>;
  defeatedBossFloors: Set<number>;
};

interface PlayerMissionState {
  counters: Counters;
  progress: MissionProgress[];
}

const missionState = new Map<string, PlayerMissionState>();

function activeTemplates(): MissionTemplate[] {
  return getReleasedMissionTemplates();
}

export function getMissionTemplates(): MissionTemplate[] {
  return activeTemplates();
}

export { getMissionContentPlan };

export function getMissionProgress(playerId: string): MissionProgress[] {
  const state = ensurePlayerState(playerId);
  syncProgressRowsWithTemplates(state);
  recomputeProgress(playerId);
  return state.progress;
}

export function getStoryProgress(playerId: string): {
  unlockedFloor: number;
  highestDefeatedBossFloor: number;
} {
  const state = ensurePlayerState(playerId);
  syncProgressRowsWithTemplates(state);
  recomputeProgress(playerId);
  const mainTemplates = activeTemplates().filter((template) => template.track === "main");
  let unlockedFloor = 1;
  let highestDefeatedBossFloor = 0;
  for (const floor of state.counters.defeatedBossFloors) {
    highestDefeatedBossFloor = Math.max(highestDefeatedBossFloor, floor);
  }
  for (const template of mainTemplates) {
    const row = state.progress.find((progress) => progress.missionId === template.id);
    if (!row?.completed) {
      continue;
    }
    if (template.progressionGate?.kind === "unlockFloor") {
      unlockedFloor = Math.max(unlockedFloor, template.progressionGate.unlocksFloor);
    }
  }
  return { unlockedFloor, highestDefeatedBossFloor };
}

export function canAccessFloor(playerId: string, floor: number): boolean {
  return floor <= getStoryProgress(playerId).unlockedFloor;
}

export function recordRunCompleted(playerId: string, floors: number, className: CharacterClass): void {
  const state = ensurePlayerState(playerId);
  state.counters.clearRuns += 1;
  state.counters.clearFloors += floors;
  state.counters.classesPlayed.add(className);
  recomputeProgress(playerId);
}

export function recordEnemyDefeated(playerId: string, count = 1): void {
  const state = ensurePlayerState(playerId);
  state.counters.killEnemies += count;
  recomputeProgress(playerId);
}

export function recordFloorBossDefeated(playerId: string, floor: number): void {
  const state = ensurePlayerState(playerId);
  state.counters.defeatedBossFloors.add(Math.max(1, Math.floor(floor)));
  recomputeProgress(playerId);
}

export function claimMissionReward(
  playerId: string,
  fallbackName: string,
  missionId: string
): RewardSummary {
  const state = ensurePlayerState(playerId);
  syncProgressRowsWithTemplates(state);
  recomputeProgress(playerId);
  const progress = state.progress.find((item) => item.missionId === missionId);
  const template = activeTemplates().find((item) => item.id === missionId);
  if (!progress || !template) {
    throw new Error("Mission not found.");
  }
  if (!progress.completed) {
    throw new Error("Mission not complete.");
  }
  if (progress.claimed) {
    throw new Error("Mission reward already claimed.");
  }
  if (template.objective.kind === "collectItems") {
    const itemId = template.objective.itemId;
    if (!itemId) {
      throw new Error("Collect mission is missing itemId.");
    }
    const profile = getOrCreateProfile(playerId, fallbackName);
    const removed = removeInventoryItems(profile.inventory, itemId, template.objective.target);
    if (removed < template.objective.target) {
      throw new Error("Required mission items are no longer in inventory.");
    }
  }
  progress.claimed = true;
  grantCurrency(playerId, fallbackName, template.rewards.currency, "missionReward", `Mission ${template.id}`);
  return template.rewards;
}

function ensurePlayerState(playerId: string): PlayerMissionState {
  const existing = missionState.get(playerId);
  if (existing) {
    return existing;
  }
  const created: PlayerMissionState = {
    counters: {
      clearRuns: 0,
      clearFloors: 0,
      killEnemies: 0,
      classesPlayed: new Set<CharacterClass>(),
      defeatedBossFloors: new Set<number>()
    },
    progress: []
  };
  syncProgressRowsWithTemplates(created);
  missionState.set(playerId, created);
  return created;
}

function syncProgressRowsWithTemplates(state: PlayerMissionState): void {
  const templates = activeTemplates();
  for (const template of templates) {
    if (state.progress.some((row) => row.missionId === template.id)) {
      continue;
    }
    state.progress.push({
      missionId: template.id,
      progress: 0,
      target: template.objective.target,
      completed: false,
      claimed: false
    });
  }
  state.progress = state.progress.filter((row) => templates.some((template) => template.id === row.missionId));
}

function recomputeProgress(playerId: string): void {
  const state = ensurePlayerState(playerId);
  const templates = activeTemplates();
  syncProgressRowsWithTemplates(state);
  const profile = getOrCreateProfile(playerId, "Explorer");
  for (const row of state.progress) {
    const template = templates.find((item) => item.id === row.missionId);
    if (!template) {
      continue;
    }
    let value = 0;
    switch (template.objective.kind) {
      case "clearRuns":
        value = state.counters.clearRuns;
        break;
      case "clearFloors":
        value = state.counters.clearFloors;
        break;
      case "killEnemies":
        value = state.counters.killEnemies;
        break;
      case "playClass":
        value = state.counters.classesPlayed.has(template.objective.className ?? "Guardian") ? 1 : 0;
        break;
      case "defeatFloorBoss":
        value = state.counters.defeatedBossFloors.has(template.objective.floor ?? -1) ? 1 : 0;
        break;
      case "collectItems":
        value = countInventoryItems(profile.inventory, template.objective.itemId);
        break;
    }
    row.target = template.objective.target;
    row.progress = Math.min(value, row.target);
    row.completed = row.progress >= row.target;
  }
}

function countInventoryItems(inventory: string[], itemId: string | undefined): number {
  if (!itemId) {
    return 0;
  }
  return inventory.filter((id) => id === itemId).length;
}

function removeInventoryItems(inventory: string[], itemId: string, amount: number): number {
  let removed = 0;
  for (let index = inventory.length - 1; index >= 0 && removed < amount; index -= 1) {
    if (inventory[index] !== itemId) {
      continue;
    }
    inventory.splice(index, 1);
    removed += 1;
  }
  return removed;
}
