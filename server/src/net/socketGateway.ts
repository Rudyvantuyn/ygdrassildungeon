import { Server, type Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@ygd/shared";
import { RoomManager } from "./roomManager.js";
import { getOrCreateProfile, getWalletLedger } from "../game/progression.js";
import { claimMissionReward, getMissionContentPlan, getMissionProgress, getMissionTemplates, getStoryProgress } from "../game/missions.js";
import { getShopCatalog, buyShopEntry } from "../game/shop.js";
import { getSkillNodes, getPlayerSkillTree, unlockNode, setLoadout } from "../game/skills.js";
import { getBlacksmithState, rerollItemAffixes, salvageItem, upgradeItem } from "../game/blacksmith.js";
import { createGuild, getLeaderboard, getSeason, joinGuild, listGuilds } from "../game/liveops.js";
import { getItemDefinitions } from "../game/items.js";

export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
export type GameIo = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketGateway(io: GameIo, roomManager: RoomManager): void {
  const socketToPlayer = new Map<string, string>();

  io.on("connection", (socket) => {
    socket.on("identify", ({ playerId }) => {
      roomManager.assignSession(playerId);
      socketToPlayer.set(socket.id, playerId);
      socket.emit("sessionAssigned", { playerId });
    });

    socket.on("createRoom", (payload) => {
      const playerId = getOrCreatePlayerId(socket, socketToPlayer, roomManager);
      const room = roomManager.createRoom(playerId, payload.displayName, payload.selectedClass);
      void socket.join(room.roomId);
      io.to(room.roomId).emit("roomUpdated", room);
      socket.emit("sessionAssigned", { playerId });
    });

    socket.on("joinRoom", (payload) => {
      const playerId = getOrCreatePlayerId(socket, socketToPlayer, roomManager);
      try {
        const room = roomManager.joinRoom(playerId, payload.roomId, payload.displayName, payload.selectedClass);
        void socket.join(room.roomId);
        io.to(room.roomId).emit("roomUpdated", room);
        socket.emit("sessionAssigned", { playerId });
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on("setReady", ({ roomId, isReady }) => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) {
        socket.emit("serverError", { message: "Identify first." });
        return;
      }
      try {
        const room = roomManager.setReady(playerId, roomId, isReady);
        io.to(roomId).emit("roomUpdated", room);
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on("startRun", ({ roomId }) => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) {
        socket.emit("serverError", { message: "Identify first." });
        return;
      }
      try {
        const run = roomManager.startRun(playerId, roomId);
        const room = roomManager.getRoom(roomId);
        if (room) {
          io.to(roomId).emit("roomUpdated", room);
        }
        io.to(roomId).emit("runStarted", { roomId, combat: run.combat });
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on("startSoloRun", ({ displayName, selectedClass, difficulty }) => {
      const playerId = getOrCreatePlayerId(socket, socketToPlayer, roomManager);
      try {
        const room = roomManager.createRoom(playerId, displayName, selectedClass);
        void socket.join(room.roomId);
        if (difficulty) {
          roomManager.setRunDifficulty(playerId, room.roomId, difficulty);
        }
        roomManager.setReady(playerId, room.roomId, true);
        const run = roomManager.startRun(playerId, room.roomId);
        const updatedRoom = roomManager.getRoom(room.roomId);
        if (updatedRoom) {
          io.to(room.roomId).emit("roomUpdated", updatedRoom);
        }
        io.to(room.roomId).emit("runStarted", { roomId: room.roomId, combat: run.combat });
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on("setRunDifficulty", ({ roomId, difficulty }) => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) {
        socket.emit("serverError", { message: "Identify first." });
        return;
      }
      try {
        const room = roomManager.setRunDifficulty(playerId, roomId, difficulty);
        io.to(roomId).emit("roomUpdated", room);
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on("submitAction", ({ roomId, action }) => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) {
        socket.emit("serverError", { message: "Identify first." });
        return;
      }
      try {
        const combat = roomManager.submitAction(playerId, roomId, action);
        const room = roomManager.getRoom(roomId);
        if (room) {
          io.to(roomId).emit("roomUpdated", room);
        }
        io.to(roomId).emit("combatUpdated", { roomId, combat });
        if (combat.encounterComplete) {
          io.to(roomId).emit("rewardGranted", { roomId, reward: combat.rewards });
        }
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on("requestResync", ({ roomId }) => {
      const room = roomManager.getRoom(roomId);
      const run = roomManager.getRun(roomId);
      if (room) {
        socket.emit("roomUpdated", room);
      }
      if (run) {
        socket.emit("combatUpdated", { roomId, combat: run.combat });
      }
    });

    socket.on("disconnect", () => {
      const playerId = socketToPlayer.get(socket.id);
      if (playerId) {
        roomManager.markDisconnected(playerId);
      }
      socketToPlayer.delete(socket.id);
    });

    socket.on("getProfileMeta", ({ playerId }) => {
      const profile = getOrCreateProfile(playerId, "Explorer");
      socket.emit("profileMetaUpdated", {
        profile,
        walletLedger: getWalletLedger(playerId),
        runDifficulty: roomManager.getRunDifficulty(profile.playerId)
      });
    });

    socket.on("getMissions", ({ playerId }) => {
      socket.emit("missionsUpdated", {
        templates: getMissionTemplates(),
        progress: getMissionProgress(playerId),
        storyProgress: getStoryProgress(playerId),
        contentPlan: getMissionContentPlan()
      });
    });

    socket.on("claimMissionReward", ({ playerId, missionId }) => {
      try {
        const reward = claimMissionReward(playerId, "Explorer", missionId);
        socket.emit("missionsUpdated", {
          templates: getMissionTemplates(),
          progress: getMissionProgress(playerId),
          storyProgress: getStoryProgress(playerId),
          contentPlan: getMissionContentPlan(),
          lastClaimed: { missionId, reward }
        });
        socket.emit("profileMetaUpdated", {
          profile: getOrCreateProfile(playerId, "Explorer"),
          walletLedger: getWalletLedger(playerId)
        });
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on("getShop", ({ playerId }) => {
      socket.emit("shopUpdated", {
        catalog: getShopCatalog(),
        itemDefinitions: getItemDefinitions(),
        profile: getOrCreateProfile(playerId, "Explorer")
      });
    });

    socket.on("buyShopItem", ({ playerId, entryId }) => {
      try {
        const result = buyShopEntry(playerId, "Explorer", entryId);
        socket.emit("shopUpdated", {
          catalog: getShopCatalog(),
          itemDefinitions: getItemDefinitions(),
          purchase: result,
          profile: getOrCreateProfile(playerId, "Explorer")
        });
        socket.emit("blacksmithUpdated", {
          ...getBlacksmithState(playerId),
          profile: getOrCreateProfile(playerId, "Explorer")
        });
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on("getSkillTree", ({ playerId, className }) => {
      socket.emit("skillTreeUpdated", {
        className,
        nodes: getSkillNodes(className),
        state: getPlayerSkillTree(playerId, "Explorer", className),
        profile: getOrCreateProfile(playerId, "Explorer")
      });
    });

    socket.on("unlockSkillNode", ({ playerId, className, nodeId }) => {
      try {
        const state = unlockNode(playerId, "Explorer", className, nodeId);
        socket.emit("skillTreeUpdated", {
          className,
          nodes: getSkillNodes(className),
          state,
          profile: getOrCreateProfile(playerId, "Explorer")
        });
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on("setSkillLoadout", ({ playerId, className, skillIds }) => {
      const state = setLoadout(playerId, className, skillIds);
      socket.emit("skillTreeUpdated", { className, nodes: getSkillNodes(className), state });
    });

    socket.on("blacksmithUpgrade", ({ playerId, itemInstanceId }) => {
      try {
        upgradeItem(playerId, "Explorer", itemInstanceId);
        socket.emit("blacksmithUpdated", { ...getBlacksmithState(playerId), profile: getOrCreateProfile(playerId, "Explorer") });
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on("blacksmithSalvage", ({ playerId, itemInstanceId }) => {
      try {
        const recovered = salvageItem(playerId, "Explorer", itemInstanceId);
        socket.emit("blacksmithUpdated", {
          ...getBlacksmithState(playerId),
          profile: getOrCreateProfile(playerId, "Explorer"),
          recovered
        });
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on("blacksmithReroll", ({ playerId, itemInstanceId }) => {
      try {
        rerollItemAffixes(playerId, "Explorer", itemInstanceId);
        socket.emit("blacksmithUpdated", { ...getBlacksmithState(playerId), profile: getOrCreateProfile(playerId, "Explorer") });
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on("getSeason", ({ playerId }) => {
      socket.emit("seasonUpdated", { season: getSeason(playerId), guilds: listGuilds(), leaderboard: getLeaderboard() });
    });

    socket.on("createGuild", ({ playerId, guildName }) => {
      try {
        const guild = createGuild(playerId, guildName);
        socket.emit("guildUpdated", { guild, guilds: listGuilds() });
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on("joinGuild", ({ playerId, guildId }) => {
      try {
        const guild = joinGuild(playerId, guildId);
        socket.emit("guildUpdated", { guild, guilds: listGuilds() });
      } catch (error) {
        emitError(socket, error);
      }
    });
  });
}

function getOrCreatePlayerId(
  socket: GameSocket,
  socketToPlayer: Map<string, string>,
  roomManager: RoomManager
): string {
  const existing = socketToPlayer.get(socket.id);
  if (existing) {
    return existing;
  }
  const playerId = `p_${Math.random().toString(36).slice(2, 10)}`;
  roomManager.assignSession(playerId);
  socketToPlayer.set(socket.id, playerId);
  return playerId;
}

function emitError(socket: GameSocket, error: unknown): void {
  socket.emit("serverError", {
    message: error instanceof Error ? error.message : "Unknown server error."
  });
}
