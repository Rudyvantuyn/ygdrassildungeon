import { getOrCreateProfile, grantCurrency, spendCurrency } from "./progression.js";
import { getPlayerItems, rerollAffixes, salvagePlayerItem, upgradePlayerItem } from "./items.js";

export function getBlacksmithState(playerId: string): { items: ReturnType<typeof getPlayerItems> } {
  return { items: getPlayerItems(playerId) };
}

export function upgradeItem(playerId: string, fallbackName: string, itemInstanceId: string): void {
  getOrCreateProfile(playerId, fallbackName);
  const cost = 50;
  spendCurrency(playerId, fallbackName, cost, `Blacksmith upgrade ${itemInstanceId}`);
  upgradePlayerItem(playerId, itemInstanceId);
}

export function salvageItem(playerId: string, fallbackName: string, itemInstanceId: string): number {
  getOrCreateProfile(playerId, fallbackName);
  const recovered = salvagePlayerItem(playerId, itemInstanceId);
  grantCurrency(playerId, fallbackName, recovered, "salvage", `Salvaged ${itemInstanceId}`);
  return recovered;
}

export function rerollItemAffixes(playerId: string, fallbackName: string, itemInstanceId: string): void {
  getOrCreateProfile(playerId, fallbackName);
  const cost = 35;
  spendCurrency(playerId, fallbackName, cost, `Blacksmith reroll ${itemInstanceId}`);
  rerollAffixes(playerId, itemInstanceId);
}
