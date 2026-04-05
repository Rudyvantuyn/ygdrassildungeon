import type { GuildState, SeasonProgress } from "@ygd/shared";

const currentSeason: SeasonProgress = {
  seasonId: "s1",
  seasonName: "Season of the Abyss Gate",
  xp: 0,
  level: 1
};

const playerSeason = new Map<string, SeasonProgress>();
const guilds = new Map<string, GuildState>();
const leaderboard = new Map<string, number>();

export function getSeason(playerId: string): SeasonProgress {
  const existing = playerSeason.get(playerId);
  if (existing) {
    return existing;
  }
  const created: SeasonProgress = { ...currentSeason };
  playerSeason.set(playerId, created);
  return created;
}

export function grantSeasonXp(playerId: string, amount: number): SeasonProgress {
  const state = getSeason(playerId);
  state.xp += amount;
  state.level = 1 + Math.floor(state.xp / 250);
  return state;
}

export function createGuild(playerId: string, guildName: string): GuildState {
  const guild: GuildState = {
    guildId: randomId("guild"),
    guildName,
    memberIds: [playerId],
    missionProgress: 0
  };
  guilds.set(guild.guildId, guild);
  return guild;
}

export function joinGuild(playerId: string, guildId: string): GuildState {
  const guild = guilds.get(guildId);
  if (!guild) {
    throw new Error("Guild not found.");
  }
  if (!guild.memberIds.includes(playerId)) {
    guild.memberIds.push(playerId);
  }
  return guild;
}

export function listGuilds(): GuildState[] {
  return [...guilds.values()];
}

export function submitLeaderboardScore(playerId: string, score: number): void {
  const current = leaderboard.get(playerId) ?? 0;
  if (score > current) {
    leaderboard.set(playerId, score);
  }
}

export function getLeaderboard(): Array<{ playerId: string; score: number }> {
  return [...leaderboard.entries()]
    .map(([playerId, score]) => ({ playerId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
