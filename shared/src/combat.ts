import type { CombatEntity, EntityId, RewardSummary, SkillDefinition } from "./types.js";

export interface CombatAction {
  actorId: EntityId;
  skillId: string;
  targetIds: EntityId[];
}

export interface CombatLogEntry {
  kind: "damage" | "heal" | "status" | "death" | "system";
  message: string;
}

export interface CombatState {
  runId: string;
  turn: number;
  activeEntityId: EntityId;
  allies: CombatEntity[];
  enemies: CombatEntity[];
  logs: CombatLogEntry[];
  encounterComplete: boolean;
  rewards?: RewardSummary;
}

export interface CombatResolution {
  nextState: CombatState;
  emittedLogs: CombatLogEntry[];
}

export interface CombatContext {
  skills: Record<string, SkillDefinition>;
  random: () => number;
}

export function getTurnOrder(entities: CombatEntity[]): CombatEntity[] {
  return [...entities].sort((a, b) => b.stats.speed - a.stats.speed);
}

export function calculateDamage({
  power,
  attacker,
  defender,
  random
}: {
  power: number;
  attacker: CombatEntity;
  defender: CombatEntity;
  random: () => number;
}): number {
  const base = power + attacker.stats.attack - defender.stats.defense;
  const crit = random() < attacker.stats.critChance ? 1.5 : 1;
  return Math.max(1, Math.floor(base * crit));
}

export function isTeamDefeated(team: CombatEntity[]): boolean {
  return team.every((entity) => entity.currentHp <= 0);
}
