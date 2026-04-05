import type { CharacterClass, CombatAction, CombatState, RoomPlayer, RoomState } from "@ygd/shared";
import { buildPartyEntities, createCombatState, resolvePlayerAction, runEnemyTurn, type RunState } from "../game/combatEngine.js";
import { generateDungeonEncounters } from "../game/dungeonGenerator.js";
import { applyRewards } from "../game/progression.js";
import { recordEnemyDefeated, recordFloorBossDefeated, recordRunCompleted } from "../game/missions.js";
import { grantSeasonXp, submitLeaderboardScore } from "../game/liveops.js";
import { incrementMetric } from "../game/telemetry.js";

interface Session {
  playerId: string;
  displayName: string;
  activeRoomId?: string;
}

export class RoomManager {
  private readonly rooms = new Map<string, RoomState>();
  private readonly runs = new Map<string, RunState>();
  private readonly sessions = new Map<string, Session>();
  private readonly roomDifficulty = new Map<string, "normal" | "veteran" | "mythic" | "abyss">();

  assignSession(playerId: string, displayName = "Explorer"): Session {
    const current = this.sessions.get(playerId);
    if (current) {
      return current;
    }
    const created: Session = { playerId, displayName };
    this.sessions.set(playerId, created);
    return created;
  }

  createRoom(playerId: string, displayName: string, selectedClass: CharacterClass): RoomState {
    const roomId = randomId("room");
    const player: RoomPlayer = { playerId, displayName, selectedClass, isReady: false, connected: true };
    const room: RoomState = { roomId, hostPlayerId: playerId, players: [player], status: "lobby" };
    this.rooms.set(roomId, room);
    this.roomDifficulty.set(roomId, "normal");
    this.sessions.set(playerId, { playerId, displayName, activeRoomId: roomId });
    return room;
  }

  joinRoom(playerId: string, roomId: string, displayName: string, selectedClass: CharacterClass): RoomState {
    const room = this.requireRoom(roomId);
    const existing = room.players.find((p) => p.playerId === playerId);
    if (existing) {
      existing.connected = true;
      existing.displayName = displayName;
      existing.selectedClass = selectedClass;
      this.rooms.set(roomId, room);
      return room;
    }
    room.players.push({ playerId, displayName, selectedClass, isReady: false, connected: true });
    this.sessions.set(playerId, { playerId, displayName, activeRoomId: roomId });
    this.rooms.set(roomId, room);
    return room;
  }

  markDisconnected(playerId: string): void {
    const session = this.sessions.get(playerId);
    if (!session?.activeRoomId) {
      return;
    }
    const room = this.rooms.get(session.activeRoomId);
    const player = room?.players.find((candidate) => candidate.playerId === playerId);
    if (player) {
      player.connected = false;
    }
  }

  setReady(playerId: string, roomId: string, isReady: boolean): RoomState {
    const room = this.requireRoom(roomId);
    const player = room.players.find((candidate) => candidate.playerId === playerId);
    if (!player) {
      throw new Error("Player is not in this room.");
    }
    player.isReady = isReady;
    return room;
  }

  startRun(playerId: string, roomId: string): RunState {
    const room = this.requireRoom(roomId);
    if (room.hostPlayerId !== playerId) {
      throw new Error("Only host can start a run.");
    }
    if (!room.players.every((entry) => entry.isReady)) {
      throw new Error("All players must be ready.");
    }
    room.status = "inRun";
    const difficulty = this.roomDifficulty.get(roomId) ?? "normal";
    const encounters = generateDungeonEncounters(Date.now(), difficulty);
    const runId = randomId("run");
    const allies = buildPartyEntities(room.players);
    const firstEncounter = encounters[0];
    if (!firstEncounter) {
      throw new Error("No encounters generated.");
    }
    const combat = createCombatState(runId, allies, firstEncounter.enemies);
    const run: RunState = {
      runId,
      roomId,
      floorIndex: 0,
      encounters,
      players: room.players,
      combat
    };
    this.runs.set(roomId, run);
    incrementMetric("runs_started_total");
    return run;
  }

  setRunDifficulty(playerId: string, roomId: string, difficulty: "normal" | "veteran" | "mythic" | "abyss"): RoomState {
    const room = this.requireRoom(roomId);
    if (room.hostPlayerId !== playerId) {
      throw new Error("Only host can change difficulty.");
    }
    this.roomDifficulty.set(roomId, difficulty);
    return room;
  }

  getRunDifficulty(roomId: string): "normal" | "veteran" | "mythic" | "abyss" {
    return this.roomDifficulty.get(roomId) ?? "normal";
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  getRun(roomId: string): RunState | undefined {
    return this.runs.get(roomId);
  }

  submitAction(playerId: string, roomId: string, action: CombatAction): CombatState {
    const run = this.runs.get(roomId);
    if (!run) {
      throw new Error("Run not found.");
    }
    const active = run.combat.activeEntityId;
    const current = [...run.combat.allies, ...run.combat.enemies].find((entity) => entity.entityId === active);
    if (!current) {
      throw new Error("Active actor not found.");
    }
    if (current.isPlayer && current.entityId !== `player-${playerId}`) {
      throw new Error("It is not your turn.");
    }
    const beforeAliveEnemies = run.combat.enemies.filter((enemy) => enemy.currentHp > 0).length;
    run.combat = resolvePlayerAction(run.combat, action);
    run.combat = this.resolveAutomatedTurns(run.combat);
    const afterAliveEnemies = run.combat.enemies.filter((enemy) => enemy.currentHp > 0).length;
    if (afterAliveEnemies < beforeAliveEnemies) {
      const defeated = beforeAliveEnemies - afterAliveEnemies;
      for (const player of run.players) {
        recordEnemyDefeated(player.playerId, defeated);
      }
      incrementMetric("enemies_defeated_total", defeated);
    }
    if (run.combat.encounterComplete) {
      const result = this.advanceEncounterOrFinish(run);
      run.combat = result.combat;
      if (result.finished) {
        return run.combat;
      }
    }
    this.runs.set(roomId, run);
    return run.combat;
  }

  private resolveAutomatedTurns(combat: CombatState): CombatState {
    let next = combat;
    while (!next.encounterComplete) {
      const active = [...next.allies, ...next.enemies].find((entity) => entity.entityId === next.activeEntityId);
      if (!active || active.isPlayer) {
        break;
      }
      next = runEnemyTurn(next);
    }
    return next;
  }

  private advanceEncounterOrFinish(run: RunState): { combat: CombatState; finished: boolean } {
    if (!run.combat.rewards) {
      return { combat: run.combat, finished: false };
    }
    const currentEncounter = run.encounters[run.floorIndex];
    if (currentEncounter?.isBoss) {
      for (const player of run.players) {
        recordFloorBossDefeated(player.playerId, currentEncounter.floor);
      }
    }
    for (const player of run.players) {
      applyRewards(player.playerId, player.displayName, run.combat.rewards);
    }
    run.floorIndex += 1;
    if (run.floorIndex >= run.encounters.length) {
      const room = this.rooms.get(run.roomId);
      if (room) {
        room.status = "lobby";
        for (const player of room.players) {
          player.isReady = false;
          recordRunCompleted(player.playerId, run.encounters.length, player.selectedClass);
          grantSeasonXp(player.playerId, 80);
          submitLeaderboardScore(player.playerId, run.encounters.length * 100 + run.combat.turn);
        }
      }
      this.runs.delete(run.roomId);
      incrementMetric("runs_completed_total");
      return { combat: run.combat, finished: true };
    }
    const nextEncounter = run.encounters[run.floorIndex];
    if (!nextEncounter) {
      return { combat: run.combat, finished: false };
    }
    const resetAllies = run.combat.allies.map((ally) => ({
      ...ally,
      currentHp: Math.min(ally.stats.maxHp, ally.currentHp + Math.floor(ally.stats.maxHp * 0.3)),
      cooldowns: {},
      statuses: {}
    }));
    return { combat: createCombatState(run.runId, resetAllies, nextEncounter.enemies), finished: false };
  }

  private requireRoom(roomId: string): RoomState {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found.");
    }
    return room;
  }
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
