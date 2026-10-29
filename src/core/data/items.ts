import type { ItemId } from '../types';

export interface ItemDef {
  id: ItemId;
  name: string;
  restores: 'hp' | 'tp';
  amount: number;
  description: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  medica: { id: 'medica', name: 'Medica', restores: 'hp', amount: 60, description: 'Restores 60 HP.' },
  amrita: { id: 'amrita', name: 'Amrita', restores: 'tp', amount: 25, description: 'Restores 25 TP.' },
};
