import {
  calculateDamage,
  getTurnOrder,
  isTeamDefeated,
  type CombatAction,
  type CombatEntity,
  type CombatLogEntry,
  type CombatState,
  type RewardSummary,
  type SkillDefinition
} from "@ygd/shared";
import classesData from "./content/classes.json" with { type: "json" };
import skillsData from "./content/skills.json" with { type: "json" };
import type { CharacterDefinition, CharacterClass, RoomPlayer } from "@ygd/shared";
import type { DungeonEncounter } from "./dungeonGenerator.js";

const skills = Object.fromEntries((skillsData as SkillDefinition[]).map((skill) => [skill.id, skill]));
const classDefs = classesData as CharacterDefinition[];

export interface RunState {
  runId: string;
  roomId: string;
  floorIndex: number;
  encounters: DungeonEncounter[];
  players: RoomPlayer[];
  combat: CombatState;
}

export function buildPartyEntities(players: RoomPlayer[]): CombatEntity[] {
  return players.map((player) => {
    const classDef = classDefs.find((candidate) => candidate.className === player.selectedClass);
    if (!classDef) {
      throw new Error(`Unknown class: ${player.selectedClass}`);
    }
    return createPlayerEntity(player.playerId, player.displayName, player.selectedClass, classDef);
  });
}

function createPlayerEntity(
  playerId: string,
  displayName: string,
  className: CharacterClass,
  classDef: CharacterDefinition
): CombatEntity {
  return {
    entityId: `player-${playerId}`,
    name: displayName,
    isPlayer: true,
    className,
    level: 1,
    stats: classDef.baseStats,
    currentHp: classDef.baseStats.maxHp,
    cooldowns: {},
    statuses: {}
  };
}

export function createCombatState(runId: string, allies: CombatEntity[], enemies: CombatEntity[]): CombatState {
  const turnOrder = getTurnOrder([...allies, ...enemies].filter((entity) => entity.currentHp > 0));
  const first = turnOrder[0];
  if (!first) {
    throw new Error("Cannot create combat state without entities");
  }
  return {
    runId,
    turn: 1,
    activeEntityId: first.entityId,
    allies,
    enemies,
    logs: [{ kind: "system", message: "Encounter starts." }],
    encounterComplete: false
  };
}

export function resolvePlayerAction(combat: CombatState, action: CombatAction): CombatState {
  const actor = [...combat.allies, ...combat.enemies].find((entity) => entity.entityId === action.actorId);
  if (!actor || actor.currentHp <= 0) {
    return appendLog(combat, { kind: "system", message: "Action rejected: invalid actor." });
  }
  const skill = skills[action.skillId];
  if (!skill) {
    return appendLog(combat, { kind: "system", message: "Action rejected: unknown skill." });
  }
  if ((actor.cooldowns[skill.id] ?? 0) > 0) {
    return appendLog(combat, { kind: "system", message: `${actor.name} cannot use ${skill.name} yet.` });
  }
  return resolveAction(combat, actor.entityId, skill, action.targetIds);
}

export function runEnemyTurn(combat: CombatState): CombatState {
  const actor = combat.enemies.find((enemy) => enemy.entityId === combat.activeEntityId && enemy.currentHp > 0);
  if (!actor) {
    return combat;
  }
  const skill = skills.claw ?? Object.values(skills)[0];
  if (!skill) {
    return combat;
  }
  const target = combat.allies.find((ally) => ally.currentHp > 0);
  if (!target) {
    return combat;
  }
  return resolveAction(combat, actor.entityId, skill, [target.entityId]);
}

function resolveAction(combat: CombatState, actorId: string, skill: SkillDefinition, targetIds: string[]): CombatState {
  const emittedLogs: CombatLogEntry[] = [];
  const next: CombatState = {
    ...combat,
    allies: combat.allies.map(cloneEntity),
    enemies: combat.enemies.map(cloneEntity),
    logs: [...combat.logs]
  };
  const actor = findEntity(next, actorId);
  if (!actor) {
    return combat;
  }

  const targets = selectTargets(next, actor, skill, targetIds);
  for (const target of targets) {
    if (target.currentHp <= 0) {
      continue;
    }
    if (skill.power > 0) {
      const damage = calculateDamage({ power: skill.power, attacker: actor, defender: target, random: Math.random });
      target.currentHp = Math.max(0, target.currentHp - damage);
      emittedLogs.push({ kind: "damage", message: `${actor.name} hits ${target.name} for ${damage}.` });
      if (target.currentHp <= 0) {
        emittedLogs.push({ kind: "death", message: `${target.name} falls.` });
      }
    }
    if (skill.applyStatus) {
      target.statuses[skill.applyStatus] = 2;
      emittedLogs.push({ kind: "status", message: `${target.name} is affected by ${skill.applyStatus}.` });
    }
  }

  actor.cooldowns[skill.id] = skill.cooldownTurns;
  tickStatusAndCooldowns(next);
  next.logs.push(...emittedLogs);
  const finalized = finalizeCombatState(next);
  return rotateTurn(finalized);
}

function finalizeCombatState(combat: CombatState): CombatState {
  if (isTeamDefeated(combat.enemies)) {
    const rewards: RewardSummary = {
      currency: 25 + combat.turn * 3,
      itemDrops: combat.turn % 2 === 0 ? ["healing-herb"] : ["mana-spark"],
      xp: 120
    };
    return {
      ...combat,
      encounterComplete: true,
      rewards,
      logs: [...combat.logs, { kind: "system", message: "Encounter cleared." }]
    };
  }
  if (isTeamDefeated(combat.allies)) {
    return {
      ...combat,
      encounterComplete: true,
      rewards: { currency: 0, itemDrops: [], xp: 30 },
      logs: [...combat.logs, { kind: "system", message: "Party wiped out." }]
    };
  }
  return combat;
}

function rotateTurn(combat: CombatState): CombatState {
  if (combat.encounterComplete) {
    return combat;
  }
  const alive = [...combat.allies, ...combat.enemies].filter((entity) => entity.currentHp > 0);
  const order = getTurnOrder(alive);
  const currentIndex = order.findIndex((entity) => entity.entityId === combat.activeEntityId);
  const nextEntity = order[(currentIndex + 1) % order.length];
  if (!nextEntity) {
    return combat;
  }
  return {
    ...combat,
    turn: combat.turn + 1,
    activeEntityId: nextEntity.entityId
  };
}

function selectTargets(
  combat: CombatState,
  actor: CombatEntity,
  skill: SkillDefinition,
  targetIds: string[]
): CombatEntity[] {
  if (skill.target === "allEnemies") {
    return actor.isPlayer ? combat.enemies.filter(isAlive) : combat.allies.filter(isAlive);
  }
  if (skill.target === "singleAlly") {
    const party = actor.isPlayer ? combat.allies : combat.enemies;
    return [party.find((entity) => entity.entityId === targetIds[0]) ?? actor];
  }
  if (skill.target === "self") {
    return [actor];
  }
  const enemyTeam = actor.isPlayer ? combat.enemies : combat.allies;
  const selected = enemyTeam.find((entity) => entity.entityId === targetIds[0] && entity.currentHp > 0);
  return [selected ?? enemyTeam.find(isAlive) ?? enemyTeam[0]].filter((entity): entity is CombatEntity => Boolean(entity));
}

function tickStatusAndCooldowns(combat: CombatState): void {
  for (const entity of [...combat.allies, ...combat.enemies]) {
    for (const [skillId, turns] of Object.entries(entity.cooldowns)) {
      if (turns > 0) {
        entity.cooldowns[skillId] = turns - 1;
      }
    }
    for (const [status, turns] of Object.entries(entity.statuses)) {
      if (!turns) {
        continue;
      }
      if (status === "bleed") {
        entity.currentHp = Math.max(0, entity.currentHp - 2);
        combat.logs.push({ kind: "damage", message: `${entity.name} bleeds for 2.` });
      }
      entity.statuses[status as keyof CombatEntity["statuses"]] = turns - 1;
    }
  }
}

function cloneEntity(entity: CombatEntity): CombatEntity {
  return {
    ...entity,
    cooldowns: { ...entity.cooldowns },
    statuses: { ...entity.statuses }
  };
}

function appendLog(combat: CombatState, log: CombatLogEntry): CombatState {
  return { ...combat, logs: [...combat.logs, log] };
}

function findEntity(combat: CombatState, entityId: string): CombatEntity | undefined {
  return [...combat.allies, ...combat.enemies].find((entity) => entity.entityId === entityId);
}

function isAlive(entity: CombatEntity): boolean {
  return entity.currentHp > 0;
}
