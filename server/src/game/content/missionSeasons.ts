import type { MissionTemplate } from "@ygd/shared";

export interface MissionSeasonPack {
  seasonId: string;
  seasonName: string;
  releaseMode: "fullDrop";
  releaseState: "released" | "planned";
  missions: MissionTemplate[];
}

const missionSeasonPacks: MissionSeasonPack[] = [
  {
    seasonId: "s1",
    seasonName: "Season of the Abyss Gate",
    releaseMode: "fullDrop",
    releaseState: "released",
    missions: [
      {
        id: "s1_main_floor3_boss",
        title: "Main Quest: Seal of Floor 3",
        description: "Defeat the Floor 3 boss to unlock the path deeper into the labyrinth.",
        track: "main",
        cadence: "main",
        seasonId: "s1",
        objective: { kind: "defeatFloorBoss", floor: 3, target: 1 },
        progressionGate: { kind: "unlockFloor", unlocksFloor: 4 },
        rewards: { currency: 120, xp: 140, itemDrops: ["story-seal-fragment"] }
      },
      {
        id: "s1_main_floor5_boss",
        title: "Main Quest: Crown of the Deep",
        description: "Defeat the Floor 5 boss to complete the Season 1 main arc.",
        track: "main",
        cadence: "main",
        seasonId: "s1",
        objective: { kind: "defeatFloorBoss", floor: 5, target: 1 },
        progressionGate: { kind: "unlockFloor", unlocksFloor: 6 },
        rewards: { currency: 180, xp: 220, itemDrops: ["abyss-core"] }
      },
      {
        id: "s1_side_ore_delivery",
        title: "Supply Request: Ore Shipment",
        description: "Deliver 20 ore fragments for the guild forges.",
        track: "side",
        cadence: "weekly",
        seasonId: "s1",
        objective: { kind: "collectItems", itemId: "ore-fragment", target: 20 },
        rewards: { currency: 90, xp: 85, itemDrops: ["smith-voucher"] }
      },
      {
        id: "s1_side_clear_3",
        title: "Guild Contract: Veteran Route",
        description: "Complete 3 dungeon runs for side contract rewards.",
        track: "side",
        cadence: "daily",
        seasonId: "s1",
        objective: { kind: "clearRuns", target: 3 },
        rewards: { currency: 75, xp: 70, itemDrops: ["mission-token"] }
      }
    ]
  },
  {
    seasonId: "s2",
    seasonName: "Season of Verdant Eclipse",
    releaseMode: "fullDrop",
    releaseState: "planned",
    missions: [
      {
        id: "s2_main_floor8_boss",
        title: "Main Quest: Echoes of Floor 8",
        description: "Defeat the Floor 8 boss to continue Season 2 story progression.",
        track: "main",
        cadence: "main",
        seasonId: "s2",
        objective: { kind: "defeatFloorBoss", floor: 8, target: 1 },
        progressionGate: { kind: "unlockFloor", unlocksFloor: 9 },
        rewards: { currency: 260, xp: 300, itemDrops: ["eclipse-emblem"] }
      },
      {
        id: "s2_side_relic_delivery",
        title: "Guild Contract: Relic Recovery",
        description: "Deliver 15 relic shards from deeper ruins.",
        track: "side",
        cadence: "weekly",
        seasonId: "s2",
        objective: { kind: "collectItems", itemId: "relic-shard", target: 15 },
        rewards: { currency: 140, xp: 150, itemDrops: ["guild-badge-s2"] }
      }
    ]
  }
];

export function getMissionSeasonPacks(): MissionSeasonPack[] {
  return missionSeasonPacks;
}

export function getReleasedMissionTemplates(): MissionTemplate[] {
  return missionSeasonPacks
    .filter((pack) => pack.releaseState === "released")
    .flatMap((pack) => pack.missions);
}

export function getMissionContentPlan(): Array<{
  seasonId: string;
  seasonName: string;
  releaseMode: "fullDrop";
  releaseState: "released" | "planned";
  missionCount: number;
}> {
  return missionSeasonPacks.map((pack) => ({
    seasonId: pack.seasonId,
    seasonName: pack.seasonName,
    releaseMode: pack.releaseMode,
    releaseState: pack.releaseState,
    missionCount: pack.missions.length
  }));
}
