import type { CharacterClass, Profile, RewardSummary, WalletLedgerEntry } from "@ygd/shared";
import { CHARACTER_CLASSES } from "@ygd/shared";
import { profileRepository } from "../db/repositories/profileRepository.js";
import { addEconomyAudit, incrementMetric } from "./telemetry.js";

function createDefaultProfile(playerId: string, name: string): Profile {
  return {
    playerId,
    name,
    unlockedClasses: ["Guardian", "Ranger"] satisfies CharacterClass[],
    accountLevel: 1,
    currency: 0,
    inventory: [],
    premiumCurrency: 0,
    stamina: 120,
    masteryXp: 0,
    lastDailyResetAt: new Date().toISOString(),
    skillPoints: 0
  };
}

export function getOrCreateProfile(playerId: string, name: string): Profile {
  const existing = profileRepository.get(playerId);
  if (existing) {
    return existing;
  }
  const profile = createDefaultProfile(playerId, name);
  return profileRepository.save(profile);
}

export function applyRewards(playerId: string, fallbackName: string, rewards: RewardSummary): Profile {
  const profile = getOrCreateProfile(playerId, fallbackName);
  profile.currency += rewards.currency;
  profile.masteryXp = (profile.masteryXp ?? 0) + rewards.xp;
  const levelsGained = Math.floor(rewards.xp / 100);
  profile.accountLevel += levelsGained;
  profile.skillPoints = (profile.skillPoints ?? 0) + Math.max(1, levelsGained);
  profile.inventory.push(...rewards.itemDrops);
  if (profile.accountLevel >= 3) {
    unlockClass(profile, "Mystic");
  }
  if (profile.accountLevel >= 5) {
    unlockClass(profile, "Rogue");
  }
  addLedgerEntry(playerId, rewards.currency, "runReward", `Run rewards (+${rewards.xp} xp)`);
  addEconomyAudit("currency_source_run", rewards.currency);
  incrementMetric("reward_grants_total");
  return profileRepository.save(profile);
}

export function spendCurrency(playerId: string, fallbackName: string, amount: number, reason: string): Profile {
  const profile = getOrCreateProfile(playerId, fallbackName);
  if (amount <= 0) {
    return profile;
  }
  if (profile.currency < amount) {
    throw new Error("Not enough currency.");
  }
  profile.currency -= amount;
  addLedgerEntry(playerId, -amount, "purchase", reason);
  addEconomyAudit("currency_sink_spend", amount);
  incrementMetric("currency_spend_total", amount);
  return profileRepository.save(profile);
}

export function grantCurrency(
  playerId: string,
  fallbackName: string,
  amount: number,
  kind: WalletLedgerEntry["kind"],
  reason: string
): Profile {
  const profile = getOrCreateProfile(playerId, fallbackName);
  if (amount <= 0) {
    return profile;
  }
  profile.currency += amount;
  addLedgerEntry(playerId, amount, kind, reason);
  addEconomyAudit(`currency_source_${kind}`, amount);
  incrementMetric("currency_grant_total", amount);
  return profileRepository.save(profile);
}

function unlockClass(profile: Profile, className: CharacterClass): void {
  if (!CHARACTER_CLASSES.includes(className)) {
    return;
  }
  if (!profile.unlockedClasses.includes(className)) {
    profile.unlockedClasses.push(className);
  }
}

export function getAllProfiles(): Profile[] {
  return profileRepository.list();
}

export function getWalletLedger(playerId: string): WalletLedgerEntry[] {
  return profileRepository.getLedger(playerId);
}

function addLedgerEntry(
  playerId: string,
  amount: number,
  kind: WalletLedgerEntry["kind"],
  reason: string
): void {
  profileRepository.appendLedger({
    id: randomId("ledger"),
    playerId,
    amount,
    kind,
    reason,
    createdAt: new Date().toISOString()
  });
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
