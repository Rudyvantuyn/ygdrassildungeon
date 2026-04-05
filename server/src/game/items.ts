import type { ItemDefinition, PlayerItem } from "@ygd/shared";

const definitions: ItemDefinition[] = [
  { id: "blade_iron", name: "Iron Blade", slot: "weapon", rarity: "common", basePower: 8 },
  { id: "mail_guard", name: "Guard Mail", slot: "armor", rarity: "common", basePower: 6 },
  { id: "ring_focus", name: "Focus Ring", slot: "trinket", rarity: "rare", basePower: 5 },
  { id: "relic_abyss", name: "Abyss Relic", slot: "relic", rarity: "epic", basePower: 12 }
];

const playerItems = new Map<string, PlayerItem[]>();

export function getItemDefinitions(): ItemDefinition[] {
  return definitions;
}

export function getPlayerItems(playerId: string): PlayerItem[] {
  return playerItems.get(playerId) ?? [];
}

export function addItemToPlayer(playerId: string, definitionId: string): PlayerItem {
  const def = definitions.find((item) => item.id === definitionId);
  if (!def) {
    throw new Error("Item definition not found.");
  }
  const list = playerItems.get(playerId) ?? [];
  const created: PlayerItem = {
    instanceId: randomId("itm"),
    definitionId: def.id,
    level: 1,
    affixes: defaultAffixes(def.rarity)
  };
  list.push(created);
  playerItems.set(playerId, list);
  return created;
}

export function upgradePlayerItem(playerId: string, itemInstanceId: string): PlayerItem {
  const item = requirePlayerItem(playerId, itemInstanceId);
  item.level += 1;
  return item;
}

export function salvagePlayerItem(playerId: string, itemInstanceId: string): number {
  const list = playerItems.get(playerId) ?? [];
  const index = list.findIndex((item) => item.instanceId === itemInstanceId);
  if (index < 0) {
    throw new Error("Item not found.");
  }
  const item = list[index];
  if (!item) {
    throw new Error("Item not found.");
  }
  list.splice(index, 1);
  playerItems.set(playerId, list);
  return Math.max(10, item.level * 12);
}

export function rerollAffixes(playerId: string, itemInstanceId: string): PlayerItem {
  const item = requirePlayerItem(playerId, itemInstanceId);
  const def = definitions.find((entry) => entry.id === item.definitionId);
  if (!def) {
    throw new Error("Item definition missing.");
  }
  item.affixes = defaultAffixes(def.rarity).map((affix) => `${affix}-${Math.floor(Math.random() * 10) + 1}`);
  return item;
}

function requirePlayerItem(playerId: string, itemInstanceId: string): PlayerItem {
  const list = playerItems.get(playerId) ?? [];
  const item = list.find((entry) => entry.instanceId === itemInstanceId);
  if (!item) {
    throw new Error("Item not found.");
  }
  return item;
}

function defaultAffixes(rarity: ItemDefinition["rarity"]): string[] {
  if (rarity === "legendary") {
    return ["atk", "crit", "lifesteal"];
  }
  if (rarity === "epic") {
    return ["atk", "crit"];
  }
  if (rarity === "rare") {
    return ["atk", "speed"];
  }
  return ["atk"];
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
