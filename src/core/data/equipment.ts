import type { ClassId, Stats } from '../types';

export interface EquipDef {
  id: string;
  name: string;
  slot: 'weapon' | 'armor';
  classes: ClassId[];
  /** Appears in the shop once the party has reached floor `tier` (0 = from the start). */
  tier: number;
  price: number;
  bonus: Partial<Stats>;
}

const ALL: ClassId[] = ['guardian', 'ranger', 'mystic', 'arcanist'];
const CASTERS: ClassId[] = ['mystic', 'arcanist'];

const list: EquipDef[] = [
  // Tier 0 — available from the start
  { id: 'bronzeSword', name: 'Bronze Sword', slot: 'weapon', classes: ['guardian'], tier: 0, price: 80, bonus: { atk: 5 } },
  { id: 'shortBow', name: 'Short Bow', slot: 'weapon', classes: ['ranger'], tier: 0, price: 80, bonus: { atk: 5 } },
  { id: 'oakStaff', name: 'Oak Staff', slot: 'weapon', classes: CASTERS, tier: 0, price: 80, bonus: { mag: 4 } },
  { id: 'leatherVest', name: 'Leather Vest', slot: 'armor', classes: ALL, tier: 0, price: 70, bonus: { def: 3 } },
  // Tier 1 — after reaching B2F
  { id: 'ironSword', name: 'Iron Sword', slot: 'weapon', classes: ['guardian'], tier: 1, price: 260, bonus: { atk: 10 } },
  { id: 'longBow', name: 'Long Bow', slot: 'weapon', classes: ['ranger'], tier: 1, price: 260, bonus: { atk: 10, spd: 1 } },
  { id: 'ashStaff', name: 'Ash Staff', slot: 'weapon', classes: CASTERS, tier: 1, price: 240, bonus: { mag: 8 } },
  { id: 'chainMail', name: 'Chain Mail', slot: 'armor', classes: ['guardian', 'ranger'], tier: 1, price: 280, bonus: { def: 8 } },
  { id: 'silkRobe', name: 'Silk Robe', slot: 'armor', classes: CASTERS, tier: 1, price: 240, bonus: { def: 4, res: 5 } },
  // Tier 2 — after reaching B3F
  { id: 'knightBlade', name: 'Knight Blade', slot: 'weapon', classes: ['guardian'], tier: 2, price: 620, bonus: { atk: 16 } },
  { id: 'elmGreatbow', name: 'Elm Greatbow', slot: 'weapon', classes: ['ranger'], tier: 2, price: 600, bonus: { atk: 15, spd: 2 } },
  { id: 'runeStaff', name: 'Rune Staff', slot: 'weapon', classes: CASTERS, tier: 2, price: 580, bonus: { mag: 14 } },
  { id: 'plateArmor', name: 'Plate Armor', slot: 'armor', classes: ['guardian'], tier: 2, price: 650, bonus: { def: 14, spd: -1 } },
  { id: 'spiritRobe', name: 'Spirit Robe', slot: 'armor', classes: CASTERS, tier: 2, price: 560, bonus: { def: 7, res: 10 } },
];

export const EQUIPMENT: Record<string, EquipDef> = Object.fromEntries(list.map((e) => [e.id, e]));
export const EQUIPMENT_LIST: readonly EquipDef[] = list;
