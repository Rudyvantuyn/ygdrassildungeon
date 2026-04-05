import "dotenv/config";
import cors from "cors";
import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { canReachDatabase } from "./db/db.js";
import { getAllProfiles, getOrCreateProfile, getWalletLedger } from "./game/progression.js";
import { canAccessFloor, claimMissionReward, getMissionContentPlan, getMissionProgress, getMissionTemplates, getStoryProgress } from "./game/missions.js";
import { getShopCatalog, buyShopEntry } from "./game/shop.js";
import { getSkillNodes, getPlayerSkillTree, unlockNode, setLoadout } from "./game/skills.js";
import { getBlacksmithState, rerollItemAffixes, salvageItem, upgradeItem } from "./game/blacksmith.js";
import { createGuild, getLeaderboard, getSeason, joinGuild, listGuilds } from "./game/liveops.js";
import { getEconomyAuditTail, getMetrics } from "./game/telemetry.js";
import { getItemDefinitions } from "./game/items.js";
import { getForestFloorMap, getForestMaxAuthoredFloor } from "./game/forestMaps.js";
import { RoomManager } from "./net/roomManager.js";
import { registerSocketGateway } from "./net/socketGateway.js";
import type { ClientToServerEvents, ServerToClientEvents } from "@ygd/shared";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  res.json({
    ok: true,
    dbConnected: await canReachDatabase()
  });
});

app.get("/profiles", (_req, res) => {
  res.json({ profiles: getAllProfiles() });
});

app.get("/meta/profile/:playerId", (req, res) => {
  const playerId = req.params.playerId;
  const profile = getOrCreateProfile(playerId, "Explorer");
  res.json({ profile, walletLedger: getWalletLedger(playerId) });
});

app.get("/meta/missions/:playerId", (req, res) => {
  const playerId = req.params.playerId;
  res.json({
    templates: getMissionTemplates(),
    progress: getMissionProgress(playerId),
    storyProgress: getStoryProgress(playerId),
    contentPlan: getMissionContentPlan()
  });
});

app.post("/meta/missions/:playerId/claim", (req, res) => {
  try {
    const playerId = req.params.playerId;
    const missionId = readString(req.body, "missionId", "");
    const reward = claimMissionReward(playerId, "Explorer", missionId);
    res.json({
      ok: true,
      reward,
      templates: getMissionTemplates(),
      progress: getMissionProgress(playerId),
      storyProgress: getStoryProgress(playerId),
      contentPlan: getMissionContentPlan()
    });
  } catch (error) {
    res.status(400).json({ ok: false, message: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/meta/forest/:playerId", (req, res) => {
  const playerId = req.params.playerId;
  const story = getStoryProgress(playerId);
  res.json({
    storyProgress: {
      ...story,
      currentFloor: 1,
      maxAuthoredFloor: getForestMaxAuthoredFloor("s1")
    }
  });
});

app.get("/meta/forest/:playerId/floor/:floorNumber", (req, res) => {
  const playerId = req.params.playerId;
  const floorNumber = Number(req.params.floorNumber);
  if (!Number.isFinite(floorNumber) || floorNumber < 1) {
    res.status(400).json({ ok: false, message: "Invalid floor number." });
    return;
  }
  if (!canAccessFloor(playerId, floorNumber)) {
    const story = getStoryProgress(playerId);
    res.status(403).json({
      ok: false,
      message: `Floor ${floorNumber} is locked by main mission progression.`,
      lockedByMainMission: true,
      storyProgress: {
        ...story,
        currentFloor: Math.min(story.unlockedFloor, floorNumber),
        maxAuthoredFloor: getForestMaxAuthoredFloor("s1")
      }
    });
    return;
  }
  const floor = getForestFloorMap(floorNumber, "s1");
  if (!floor) {
    res.status(404).json({ ok: false, message: `Floor ${floorNumber} is not authored yet.` });
    return;
  }
  const story = getStoryProgress(playerId);
  res.json({
    ok: true,
    floor,
    storyProgress: {
      ...story,
      currentFloor: floorNumber,
      maxAuthoredFloor: getForestMaxAuthoredFloor("s1")
    }
  });
});

app.get("/meta/shop/:playerId", (req, res) => {
  const playerId = req.params.playerId;
  res.json({
    profile: getOrCreateProfile(playerId, "Explorer"),
    catalog: getShopCatalog(),
    itemDefinitions: getItemDefinitions()
  });
});

app.post("/meta/shop/:playerId/buy", (req, res) => {
  try {
    const playerId = req.params.playerId;
    const entryId = readString(req.body, "entryId", "");
    const purchase = buyShopEntry(playerId, "Explorer", entryId);
    res.json({ ok: true, purchase, profile: getOrCreateProfile(playerId, "Explorer"), catalog: getShopCatalog() });
  } catch (error) {
    res.status(400).json({ ok: false, message: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/meta/training/:playerId", (req, res) => {
  const playerId = req.params.playerId;
  const className = normalizeClassName(readString(req.query, "className", "Guardian"));
  res.json({
    profile: getOrCreateProfile(playerId, "Explorer"),
    className,
    nodes: getSkillNodes(className),
    tree: getPlayerSkillTree(playerId, "Explorer", className)
  });
});

app.post("/meta/training/:playerId/unlock", (req, res) => {
  try {
    const playerId = req.params.playerId;
    const className = normalizeClassName(readString(req.body, "className", "Guardian"));
    const nodeId = readString(req.body, "nodeId", "");
    const tree = unlockNode(playerId, "Explorer", className, nodeId);
    res.json({ ok: true, className, nodes: getSkillNodes(className), tree, profile: getOrCreateProfile(playerId, "Explorer") });
  } catch (error) {
    res.status(400).json({ ok: false, message: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/meta/training/:playerId/loadout", (req, res) => {
  const playerId = req.params.playerId;
  const className = normalizeClassName(readString(req.body, "className", "Guardian"));
  const skillIds = readStringArray(req.body, "skillIds");
  const tree = setLoadout(playerId, className, skillIds);
  res.json({ ok: true, className, tree });
});

app.get("/meta/blacksmith/:playerId", (req, res) => {
  const playerId = req.params.playerId;
  res.json({
    profile: getOrCreateProfile(playerId, "Explorer"),
    ...getBlacksmithState(playerId)
  });
});

app.post("/meta/blacksmith/:playerId/upgrade", (req, res) => {
  try {
    const playerId = req.params.playerId;
    const itemInstanceId = readString(req.body, "itemInstanceId", "");
    upgradeItem(playerId, "Explorer", itemInstanceId);
    res.json({ ok: true, profile: getOrCreateProfile(playerId, "Explorer"), ...getBlacksmithState(playerId) });
  } catch (error) {
    res.status(400).json({ ok: false, message: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/meta/blacksmith/:playerId/salvage", (req, res) => {
  try {
    const playerId = req.params.playerId;
    const itemInstanceId = readString(req.body, "itemInstanceId", "");
    const recovered = salvageItem(playerId, "Explorer", itemInstanceId);
    res.json({ ok: true, recovered, profile: getOrCreateProfile(playerId, "Explorer"), ...getBlacksmithState(playerId) });
  } catch (error) {
    res.status(400).json({ ok: false, message: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/meta/blacksmith/:playerId/reroll", (req, res) => {
  try {
    const playerId = req.params.playerId;
    const itemInstanceId = readString(req.body, "itemInstanceId", "");
    rerollItemAffixes(playerId, "Explorer", itemInstanceId);
    res.json({ ok: true, profile: getOrCreateProfile(playerId, "Explorer"), ...getBlacksmithState(playerId) });
  } catch (error) {
    res.status(400).json({ ok: false, message: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/meta/liveops/:playerId", (req, res) => {
  const playerId = req.params.playerId;
  res.json({
    season: getSeason(playerId),
    guilds: listGuilds(),
    leaderboard: getLeaderboard()
  });
});

app.post("/meta/liveops/:playerId/guild/create", (req, res) => {
  try {
    const playerId = req.params.playerId;
    const guildName = readString(req.body, "guildName", "Abyss Raiders");
    const guild = createGuild(playerId, guildName);
    res.json({ ok: true, guild, guilds: listGuilds() });
  } catch (error) {
    res.status(400).json({ ok: false, message: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/meta/liveops/:playerId/guild/join", (req, res) => {
  try {
    const playerId = req.params.playerId;
    const guildId = readString(req.body, "guildId", "");
    const guild = joinGuild(playerId, guildId);
    res.json({ ok: true, guild, guilds: listGuilds() });
  } catch (error) {
    res.status(400).json({ ok: false, message: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/meta/telemetry", (_req, res) => {
  res.json({ metrics: getMetrics(), economyAudit: getEconomyAuditTail(200) });
});

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: process.env.CORS_ORIGIN ?? "*"
  }
});

registerSocketGateway(io, new RoomManager());

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

function readString(source: unknown, key: string, fallback: string): string {
  if (!source || typeof source !== "object") {
    return fallback;
  }
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value : fallback;
}

function readStringArray(source: unknown, key: string): string[] {
  if (!source || typeof source !== "object") {
    return [];
  }
  const value = (source as Record<string, unknown>)[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeClassName(className: string): "Guardian" | "Ranger" | "Mystic" | "Rogue" {
  if (className === "Guardian" || className === "Ranger" || className === "Mystic" || className === "Rogue") {
    return className;
  }
  return "Guardian";
}
