import type { ClientState } from "./gameStore.js";
import type { CombatEntity, RoomPlayer } from "@ygd/shared";

export interface PartyMemberVm {
  name: string;
  className: string;
  ready: boolean;
  connected: boolean;
}

export interface LobbyVm {
  roomId: string;
  roomStatus: string;
  members: PartyMemberVm[];
}

export function mapLobbyVm(state: ClientState): LobbyVm | null {
  if (!state.room) {
    return null;
  }
  return {
    roomId: state.room.roomId,
    roomStatus: state.room.status,
    members: state.room.players.map((player: RoomPlayer) => ({
      name: player.displayName,
      className: player.selectedClass,
      ready: player.isReady,
      connected: player.connected
    }))
  };
}

export interface CombatVm {
  activeEntityId: string;
  turn: number;
  allies: string[];
  enemies: string[];
  lastLog: string;
}

export function mapCombatVm(state: ClientState): CombatVm | null {
  if (!state.combat) {
    return null;
  }
  return {
    activeEntityId: state.combat.activeEntityId,
    turn: state.combat.turn,
    allies: state.combat.allies.map((ally: CombatEntity) => `${ally.name} ${ally.currentHp}/${ally.stats.maxHp}`),
    enemies: state.combat.enemies.map((enemy: CombatEntity) => `${enemy.name} ${enemy.currentHp}/${enemy.stats.maxHp}`),
    lastLog: state.combat.logs[state.combat.logs.length - 1]?.message ?? "-"
  };
}
