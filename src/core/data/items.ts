import type { ItemId } from '../types';

export interface ItemDef {
  id: ItemId;
  name: string;
  /**
   * hp/sp restore an ally; cure removes ailments; revive (amount = % of max HP) wakes a fallen ally;
   * warp returns the party to town (outside combat only).
   */
  effect: 'hp' | 'sp' | 'cure' | 'revive' | 'warp';
  amount: number;
  price: number;
  description: string;
  /** Sold in the shop once the party has reached this floor index (default: from the start). */
  minFloor?: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  sapTonic: { id: 'sapTonic', name: 'Sap Tonic', effect: 'hp', amount: 60, price: 30, description: 'A bitter tonic brewed from tree sap. Restores 60 HP.' },
  tideDraught: { id: 'tideDraught', name: 'Tide Draught', effect: 'hp', amount: 200, price: 110, minFloor: 5, description: 'Kelp and salt boiled into a strong draught. Restores 200 HP.' },
  spiritDew: { id: 'spiritDew', name: 'Spirit Dew', effect: 'sp', amount: 25, price: 70, description: 'Morning dew gathered from the Great Tree. Restores 25 SP.' },
  clearwater: { id: 'clearwater', name: 'Clearwater', effect: 'cure', amount: 0, price: 40, description: 'Spring water blessed at the roots. Cures poison, sleep and paralysis.' },
  kindlingMoss: {
    id: 'kindlingMoss',
    name: 'Kindling Moss',
    effect: 'revive',
    amount: 25,
    price: 220,
    description: 'Glowing moss that rekindles the spark of a fallen ally (25% HP).',
  },
  homingFeather: {
    id: 'homingFeather',
    name: 'Homing Feather',
    effect: 'warp',
    amount: 0,
    price: 120,
    description: 'Toss it into the air and the wind carries you home to Lindholm. Use it from the pack menu.',
  },
};

/** A full inventory (every item present) from just the items you name. */
export function makeInventory(items: Partial<Record<ItemId, number>> = {}): Record<ItemId, number> {
  const inventory = {} as Record<ItemId, number>;
  for (const id of Object.keys(ITEMS) as ItemId[]) inventory[id] = items[id] ?? 0;
  return inventory;
}

export function usableInCombat(id: ItemId): boolean {
  return ITEMS[id].effect !== 'warp';
}
