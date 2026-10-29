import type { ItemId } from '../types';

export interface ItemDef {
  id: ItemId;
  name: string;
  /** hp/sp restore an ally; revive (amount = % of max HP) wakes a fallen ally; warp returns the party to town (outside combat only). */
  effect: 'hp' | 'sp' | 'revive' | 'warp';
  amount: number;
  price: number;
  description: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  sapTonic: { id: 'sapTonic', name: 'Sap Tonic', effect: 'hp', amount: 60, price: 30, description: 'A bitter tonic brewed from tree sap. Restores 60 HP.' },
  spiritDew: { id: 'spiritDew', name: 'Spirit Dew', effect: 'sp', amount: 25, price: 70, description: 'Morning dew gathered from the Great Tree. Restores 25 SP.' },
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

export function usableInCombat(id: ItemId): boolean {
  return ITEMS[id].effect !== 'warp';
}
