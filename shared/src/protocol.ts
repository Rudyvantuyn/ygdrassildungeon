import type { CharacterClass, CombatState, RoomId, RoomState } from "./index.js";

export interface ClientToServerEvents {
  identify: (payload: { playerId: string }) => void;
  createRoom: (payload: { displayName: string; selectedClass: CharacterClass }) => void;
  joinRoom: (payload: {
    roomId: RoomId;
    displayName: string;
    selectedClass: CharacterClass;
  }) => void;
  setReady: (payload: { roomId: RoomId; isReady: boolean }) => void;
  setRunDifficulty: (payload: { roomId: RoomId; difficulty: "normal" | "veteran" | "mythic" | "abyss" }) => void;
  startSoloRun: (payload: {
    displayName: string;
    selectedClass: CharacterClass;
    difficulty?: "normal" | "veteran" | "mythic" | "abyss";
  }) => void;
  startRun: (payload: { roomId: RoomId }) => void;
  submitAction: (payload: {
    roomId: RoomId;
    action: {
      actorId: string;
      skillId: string;
      targetIds: string[];
    };
  }) => void;
  requestResync: (payload: { roomId: RoomId }) => void;
  getProfileMeta: (payload: { playerId: string }) => void;
  getMissions: (payload: { playerId: string }) => void;
  claimMissionReward: (payload: { playerId: string; missionId: string }) => void;
  getShop: (payload: { playerId: string }) => void;
  buyShopItem: (payload: { playerId: string; entryId: string }) => void;
  getSkillTree: (payload: { playerId: string; className: CharacterClass }) => void;
  unlockSkillNode: (payload: { playerId: string; className: CharacterClass; nodeId: string }) => void;
  setSkillLoadout: (payload: { playerId: string; className: CharacterClass; skillIds: string[] }) => void;
  blacksmithUpgrade: (payload: { playerId: string; itemInstanceId: string }) => void;
  blacksmithSalvage: (payload: { playerId: string; itemInstanceId: string }) => void;
  blacksmithReroll: (payload: { playerId: string; itemInstanceId: string }) => void;
  getSeason: (payload: { playerId: string }) => void;
  createGuild: (payload: { playerId: string; guildName: string }) => void;
  joinGuild: (payload: { playerId: string; guildId: string }) => void;
}

export interface ServerToClientEvents {
  sessionAssigned: (payload: { playerId: string }) => void;
  roomUpdated: (room: RoomState) => void;
  runStarted: (payload: { roomId: RoomId; combat: CombatState }) => void;
  combatUpdated: (payload: { roomId: RoomId; combat: CombatState }) => void;
  rewardGranted: (payload: { roomId: RoomId; reward: CombatState["rewards"] }) => void;
  serverError: (payload: { message: string }) => void;
  profileMetaUpdated: (payload: Record<string, unknown>) => void;
  missionsUpdated: (payload: Record<string, unknown>) => void;
  shopUpdated: (payload: Record<string, unknown>) => void;
  skillTreeUpdated: (payload: Record<string, unknown>) => void;
  blacksmithUpdated: (payload: Record<string, unknown>) => void;
  seasonUpdated: (payload: Record<string, unknown>) => void;
  guildUpdated: (payload: Record<string, unknown>) => void;
  leaderboardUpdated: (payload: Record<string, unknown>) => void;
}
