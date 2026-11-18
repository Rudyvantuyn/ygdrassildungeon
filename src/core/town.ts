import { EQUIPMENT, EQUIPMENT_LIST, type EquipDef } from './data/equipment';
import { ITEMS } from './data/items';
import { MATERIALS } from './data/materials';
import type { Game } from './game';
import { fullRestore, memberStats } from './party';
import type { ItemId, Member, Stats } from './types';

/** Price of a night at the inn: scales with the party's levels. */
export function innCost(game: Game): number {
  // The first night after the roots carry a fallen party home is on the house: otherwise a party that lost half its
  // gold could be left unable to rest, sent down again with 1 HP, and fall again.
  if (game.state.freeNight) return 0;
  return 10 + game.state.party.reduce((sum, m) => sum + m.level * 3, 0);
}

/** Rest at the inn: full HP/SP for everyone, fallen members included. */
export function restAtInn(game: Game): boolean {
  const cost = innCost(game);
  if (game.state.gold < cost) return false;
  game.state.gold -= cost;
  delete game.state.freeNight;
  fullRestore(game.state.party);
  return true;
}

export function itemsForSale(game: Game): ItemId[] {
  return (Object.keys(ITEMS) as ItemId[]).filter((id) => ITEMS[id].effect !== 'token' && (ITEMS[id].minFloor ?? 0) <= game.state.deepest);
}

export function buyItem(game: Game, id: ItemId): boolean {
  const price = ITEMS[id].price;
  if (game.state.gold < price || !itemsForSale(game).includes(id)) return false;
  game.state.gold -= price;
  game.state.inventory[id] = (game.state.inventory[id] ?? 0) + 1;
  return true;
}

export function equipmentForSale(game: Game): EquipDef[] {
  return EQUIPMENT_LIST.filter((e) => e.tier <= game.state.deepest && (!e.requires || (game.state.sold[e.requires.material] ?? 0) >= e.requires.qty));
}

/** Special gear Hilde has started on: some of its material is sold, not yet enough. */
export function specialGearInProgress(game: Game): { gear: EquipDef; remaining: number }[] {
  return EQUIPMENT_LIST.filter((e) => e.requires && e.tier <= game.state.deepest)
    .map((gear) => ({ gear, sold: game.state.sold[gear.requires!.material] ?? 0 }))
    .filter(({ gear, sold }) => sold > 0 && sold < gear.requires!.qty)
    .map(({ gear, sold }) => ({ gear, remaining: gear.requires!.qty - sold }));
}

/** Sells `qty` of a carried material. Returns the gold earned (0 if there was nothing to sell). */
export function sellMaterial(game: Game, id: string, qty = 1): number {
  const have = game.state.materials[id] ?? 0;
  const def = MATERIALS[id];
  const n = Math.min(have, qty);
  if (!def || n <= 0) return 0;
  game.state.materials[id] = have - n;
  if (game.state.materials[id] === 0) delete game.state.materials[id];
  game.state.sold[id] = (game.state.sold[id] ?? 0) + n;
  game.state.gold += def.price * n;
  return def.price * n;
}

/** Special gear that selling `materialId` unlocks, and how many more must be sold for it. */
export function unlocksFrom(game: Game, materialId: string): { gear: EquipDef; remaining: number }[] {
  return EQUIPMENT_LIST.filter((e) => e.requires?.material === materialId).map((gear) => ({
    gear,
    remaining: Math.max(0, gear.requires!.qty - (game.state.sold[materialId] ?? 0)),
  }));
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
  if (!equipmentForSale(game).includes(e)) return false;
  const cost = netPrice(m, e);
  if (game.state.gold < cost) return false;
  game.state.gold -= cost;
  m[e.slot] = e.id;
  // Keep HP/SP within the (possibly changed) maximum.
  const after = memberStats(m);
  m.hp = Math.min(m.hp, after.hp);
  m.sp = Math.min(m.sp, after.sp);
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

/** One piece of gear in the shop, seen from one adventurer: what it changes and whether it beats what they wear. */
export interface GearOffer {
  gear: EquipDef;
  delta: Partial<Stats>;
  /** The sum of every stat it changes (a rough "how much better"). */
  gain: number;
  worn: boolean;
  upgrade: boolean;
}

/**
 * What the shop has for one adventurer: everything they can wear, best gains first (weapons, then armour). An upgrade
 * is a piece that adds more than it takes away compared to what they wear now.
 */
/**
 * The short list the shop shows first, per slot: what is worn now, the best upgrade, and the best upgrade the party can
 * pay for if that is another piece. Everything else is one click away.
 */
export function featuredGear(game: Game, m: Member): GearOffer[] {
  const offers = gearFor(game, m);
  const keep = new Set<GearOffer>();
  for (const slot of ['weapon', 'armor'] as const) {
    const mine = offers.filter((o) => o.gear.slot === slot);
    const worn = mine.find((o) => o.worn);
    const ups = mine.filter((o) => o.upgrade);
    const affordable = ups.find((o) => netPrice(m, o.gear) <= game.state.gold);
    for (const o of [worn, ups[0], affordable]) if (o) keep.add(o);
  }
  return offers.filter((o) => keep.has(o));
}

export function gearFor(game: Game, m: Member): GearOffer[] {
  return equipmentForSale(game)
    .filter((e) => canEquip(m, e))
    .map((gear) => {
      const delta = statDelta(m, gear);
      const gain = Object.values(delta).reduce((a, b) => a + (b ?? 0), 0);
      const worn = m[gear.slot] === gear.id;
      return { gear, delta, gain, worn, upgrade: !worn && gain > 0 };
    })
    .sort((a, b) => (a.gear.slot === b.gear.slot ? b.gain - a.gain || b.gear.price - a.gear.price : a.gear.slot === 'weapon' ? -1 : 1));
}
