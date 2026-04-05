import type { ShopEntry } from "@ygd/shared";
import { getOrCreateProfile, spendCurrency } from "./progression.js";
import { addItemToPlayer } from "./items.js";

const baseCatalog: ShopEntry[] = [
  { id: "shop_iron_blade", itemId: "blade_iron", price: 120, stock: 999 },
  { id: "shop_guard_mail", itemId: "mail_guard", price: 100, stock: 999 },
  { id: "shop_focus_ring", itemId: "ring_focus", price: 210, stock: 999 },
  { id: "shop_abyss_relic", itemId: "relic_abyss", price: 480, stock: 50 }
];

export function getShopCatalog(): ShopEntry[] {
  return baseCatalog;
}

export function buyShopEntry(playerId: string, fallbackName: string, entryId: string): { itemInstanceId: string } {
  const profile = getOrCreateProfile(playerId, fallbackName);
  const entry = baseCatalog.find((item) => item.id === entryId);
  if (!entry) {
    throw new Error("Shop entry not found.");
  }
  if (entry.stock <= 0) {
    throw new Error("Out of stock.");
  }
  spendCurrency(profile.playerId, fallbackName, entry.price, `Shop purchase ${entry.itemId}`);
  entry.stock -= 1;
  const created = addItemToPlayer(profile.playerId, entry.itemId);
  return { itemInstanceId: created.instanceId };
}
