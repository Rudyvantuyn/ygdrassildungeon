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

const ALL: ClassId[] = ['bastion', 'strider', 'mender', 'runecaller'];
const CASTERS: ClassId[] = ['mender', 'runecaller'];

const list: EquipDef[] = [
  // Tier 0 — available from the start
  { id: 'copperEdge', name: 'Copper Edge', slot: 'weapon', classes: ['bastion'], tier: 0, price: 80, bonus: { atk: 5 } },
  { id: 'ashwoodBow', name: 'Ashwood Bow', slot: 'weapon', classes: ['strider'], tier: 0, price: 80, bonus: { atk: 5 } },
  { id: 'oakenRod', name: 'Oaken Rod', slot: 'weapon', classes: CASTERS, tier: 0, price: 80, bonus: { mag: 4 } },
  { id: 'hideJerkin', name: 'Hide Jerkin', slot: 'armor', classes: ALL, tier: 0, price: 70, bonus: { def: 3 } },
  // Tier 1 — after reaching the second floor
  { id: 'ironbarkBlade', name: 'Ironbark Blade', slot: 'weapon', classes: ['bastion'], tier: 1, price: 260, bonus: { atk: 10 } },
  { id: 'yewLongbow', name: 'Yew Longbow', slot: 'weapon', classes: ['strider'], tier: 1, price: 260, bonus: { atk: 10, spd: 1 } },
  { id: 'cinderRod', name: 'Cinder Rod', slot: 'weapon', classes: CASTERS, tier: 1, price: 240, bonus: { mag: 8 } },
  { id: 'ringmail', name: 'Ringmail', slot: 'armor', classes: ['bastion', 'strider'], tier: 1, price: 280, bonus: { def: 8 } },
  { id: 'mosswoveRobe', name: 'Mosswove Robe', slot: 'armor', classes: CASTERS, tier: 1, price: 240, bonus: { def: 4, res: 5 } },
  // Tier 2 — after reaching the third floor
  { id: 'oathEdge', name: 'Oath Edge', slot: 'weapon', classes: ['bastion'], tier: 2, price: 620, bonus: { atk: 16 } },
  { id: 'galestringBow', name: 'Galestring Bow', slot: 'weapon', classes: ['strider'], tier: 2, price: 600, bonus: { atk: 15, spd: 2 } },
  { id: 'starfallRod', name: 'Starfall Rod', slot: 'weapon', classes: CASTERS, tier: 2, price: 580, bonus: { mag: 14 } },
  { id: 'bulwarkPlate', name: 'Bulwark Plate', slot: 'armor', classes: ['bastion'], tier: 2, price: 650, bonus: { def: 14, spd: -1 } },
  { id: 'spiritweaveRobe', name: 'Spiritweave Robe', slot: 'armor', classes: CASTERS, tier: 2, price: 560, bonus: { def: 7, res: 10 } },
];

export const EQUIPMENT: Record<string, EquipDef> = Object.fromEntries(list.map((e) => [e.id, e]));
export const EQUIPMENT_LIST: readonly EquipDef[] = list;
