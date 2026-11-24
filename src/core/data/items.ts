import type { Element, ItemId } from '../types';

export interface ItemDef {
  id: ItemId;
  name: string;
  /**
   * hp/sp restore an ally; cure removes ailments; revive (amount = % of max HP) wakes a fallen ally;
   * home returns the party to town (outside combat only); token is a keepsake with a use in town;
   * throw is hurled at one enemy (amount = power), hitting like a rune of `element` cast at the thrower's level.
   */
  effect: 'hp' | 'sp' | 'cure' | 'revive' | 'home' | 'token' | 'throw';
  /** What a thrown item hits with. */
  element?: Element;
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
  clearwater: { id: 'clearwater', name: 'Clearwater', effect: 'cure', amount: 0, price: 40, description: 'Spring water blessed at the roots. Cures poison, sleep and paralysis. Only in a fight.' },
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
    effect: 'home',
    amount: 0,
    price: 120,
    description: 'Toss it into the air and the wind carries you home to Lindholm. Use it from the menu (Bag).',
  },
  // Flasks: a party without a caster can still strike a guardian's weakness, for a price (measured in the balance tests).
  emberFlask: { id: 'emberFlask', name: 'Ember Flask', effect: 'throw', element: 'fire', amount: 200, price: 300, minFloor: 10, description: 'A clay flask of smouldering resin. Thrown at one enemy, it bursts into fire, as hot as a rune carved at the thrower\'s level.' },
  rimeFlask: { id: 'rimeFlask', name: 'Rime Flask', effect: 'throw', element: 'frost', amount: 200, price: 300, minFloor: 10, description: 'A flask of meltwater from the deep that freezes the moment it breaks. Thrown at one enemy: frost, as cold as a rune carved at the thrower\'s level.' },
  stormFlask: { id: 'stormFlask', name: 'Storm Flask', effect: 'throw', element: 'storm', amount: 200, price: 300, minFloor: 10, description: 'A sealed flask that crackles in the hand. Thrown at one enemy it lets loose a bolt, as strong as a rune carved at the thrower\'s level.' },
  oathToken: {
    id: 'oathToken',
    name: 'Oath Token',
    effect: 'token',
    amount: 0,
    price: 0,
    description: 'A shard of Ymir\'s bone. The Oath Hall needs one to swear in each new adventurer. Guardians, prowlers (the first time they fall) and a few chests hold them.',
  },
  dreamEmber: {
    id: 'dreamEmber',
    name: 'Dream Ember',
    effect: 'token',
    amount: 0,
    price: 0,
    description: 'A warm spark from the giant\'s dream. Ten of them wake an echo in the Hall of Echoes. Found deep in the Rootdeep.',
  },
};

/** A full inventory (every item present) from just the items you name. */
export function makeInventory(items: Partial<Record<ItemId, number>> = {}): Record<ItemId, number> {
  const inventory = {} as Record<ItemId, number>;
  for (const id of Object.keys(ITEMS) as ItemId[]) inventory[id] = items[id] ?? 0;
  return inventory;
}

export function usableInCombat(id: ItemId): boolean {
  return ITEMS[id].effect !== 'home' && ITEMS[id].effect !== 'token';
}
