import { EQUIPMENT, EQUIPMENT_LIST, type EquipDef } from './data/equipment';
import { ITEMS } from './data/items';
import type { Game } from './game';
import { fullRestore, memberStats } from './party';
import type { ItemId, Member, Stats } from './types';

/** Price of a night at the inn: scales with the party's levels. */
export function innCost(game: Game): number {
  return 10 + game.state.party.reduce((sum, m) => sum + m.level * 3, 0);
}

/** Rest at the inn: full HP/TP for everyone, fallen members included. */
export function restAtInn(game: Game): boolean {
  const cost = innCost(game);
  if (game.state.gold < cost) return false;
  game.state.gold -= cost;
  fullRestore(game.state.party);
  return true;
}

export function buyItem(game: Game, id: ItemId): boolean {
  const price = ITEMS[id].price;
  if (game.state.gold < price) return false;
  game.state.gold -= price;
  game.state.inventory[id] = (game.state.inventory[id] ?? 0) + 1;
  return true;
}

export function equipmentForSale(game: Game): EquipDef[] {
  return EQUIPMENT_LIST.filter((e) => e.tier <= game.state.deepest);
}

export function canEquip(m: Member, e: EquipDef): boolean {
  return e.classes.includes(m.classId);
}

/** What the old piece in that slot sells back for (half its price). */
export function tradeInValue(m: Member, slot: EquipDef['slot']): number {
  const current = m[slot];
  return current ? Math.floor(EQUIPMENT[current].price / 2) : 0;
}

/** Cost after trading in what the member wears in that slot now. */
export function netPrice(m: Member, e: EquipDef): number {
  return e.price - tradeInValue(m, e.slot);
}

export function buyEquipment(game: Game, equipId: string, memberIndex: number): boolean {
  const e = EQUIPMENT[equipId];
  const m = game.state.party[memberIndex];
  if (!e || !m || !canEquip(m, e) || m[e.slot] === e.id) return false;
  const cost = netPrice(m, e);
  if (game.state.gold < cost) return false;
  game.state.gold -= cost;
  m[e.slot] = e.id;
  // Keep HP/TP within the (possibly changed) maximum.
  const after = memberStats(m);
  m.hp = Math.min(m.hp, after.hp);
  m.tp = Math.min(m.tp, after.tp);
  return true;
}

/** Stat changes if `m` swapped to `e`, e.g. { atk: +5, def: 0 }. Only non-zero entries. */
export function statDelta(m: Member, e: EquipDef): Partial<Stats> {
  const before = memberStats(m);
  const after = memberStats({ ...m, [e.slot]: e.id });
  const delta: Partial<Stats> = {};
  for (const key of Object.keys(before) as (keyof Stats)[]) {
    if (after[key] !== before[key]) delta[key] = after[key] - before[key];
  }
  return delta;
}
