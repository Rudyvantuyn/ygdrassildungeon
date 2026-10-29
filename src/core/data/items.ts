import type { ItemId } from '../types';

export interface ItemDef {
  id: ItemId;
  name: string;
  /** hp/tp restore an ally; warp returns the party to town (outside combat only). */
  effect: 'hp' | 'tp' | 'warp';
  amount: number;
  price: number;
  description: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  medica: { id: 'medica', name: 'Medica', effect: 'hp', amount: 60, price: 30, description: 'Restores 60 HP.' },
  amrita: { id: 'amrita', name: 'Amrita', effect: 'tp', amount: 25, price: 70, description: 'Restores 25 TP.' },
  thread: {
    id: 'thread',
    name: 'Ariadne Thread',
    effect: 'warp',
    amount: 0,
    price: 120,
    description: 'Follow the thread back to town. Use it from the camp menu.',
  },
};

export function usableInCombat(id: ItemId): boolean {
  return ITEMS[id].effect !== 'warp';
}
