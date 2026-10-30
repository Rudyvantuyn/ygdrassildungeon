import type { ClassId, Stats } from '../types';

export interface EquipDef {
  id: string;
  name: string;
  slot: 'weapon' | 'armor';
  classes: ClassId[];
  /** Appears in the shop once the party has reached floor `tier` (0 = from the start). */
  tier: number;
  /** Special gear: only appears once this many of a material have been sold to the shop. */
  requires?: { material: string; qty: number };
  price: number;
  bonus: Partial<Stats>;
}

const ALL: ClassId[] = ['bastion', 'strider', 'mender', 'runecaller', 'skald', 'berserker', 'seeress', 'wolfkin'];
const CASTERS: ClassId[] = ['mender', 'runecaller', 'skald', 'seeress'];
/** Blades, axes and spears for the front-line fighters. */
const BLADES: ClassId[] = ['bastion', 'berserker', 'wolfkin'];
/** Mail and hide armour. */
const MAIL: ClassId[] = ['bastion', 'strider', 'berserker', 'wolfkin'];

const list: EquipDef[] = [
  // Tier 0 — available from the start
  { id: 'copperEdge', name: 'Copper Edge', slot: 'weapon', classes: BLADES, tier: 0, price: 80, bonus: { atk: 5 } },
  { id: 'ashwoodBow', name: 'Ashwood Bow', slot: 'weapon', classes: ['strider'], tier: 0, price: 80, bonus: { atk: 5 } },
  { id: 'oakenRod', name: 'Oaken Rod', slot: 'weapon', classes: CASTERS, tier: 0, price: 80, bonus: { mag: 4 } },
  { id: 'hideJerkin', name: 'Hide Jerkin', slot: 'armor', classes: ALL, tier: 0, price: 70, bonus: { def: 3 } },
  // Tier 1 — after reaching the second floor
  { id: 'ironbarkBlade', name: 'Ironbark Blade', slot: 'weapon', classes: BLADES, tier: 1, price: 260, bonus: { atk: 10 } },
  { id: 'yewLongbow', name: 'Yew Longbow', slot: 'weapon', classes: ['strider'], tier: 1, price: 260, bonus: { atk: 10, spd: 1 } },
  { id: 'cinderRod', name: 'Cinder Rod', slot: 'weapon', classes: CASTERS, tier: 1, price: 240, bonus: { mag: 8 } },
  { id: 'ringmail', name: 'Ringmail', slot: 'armor', classes: MAIL, tier: 1, price: 280, bonus: { def: 8 } },
  { id: 'mosswoveRobe', name: 'Mosswove Robe', slot: 'armor', classes: CASTERS, tier: 1, price: 240, bonus: { def: 4, res: 5 } },
  // Tier 2 — after reaching the third floor
  { id: 'oathEdge', name: 'Oath Edge', slot: 'weapon', classes: BLADES, tier: 2, price: 620, bonus: { atk: 16 } },
  { id: 'galestringBow', name: 'Galestring Bow', slot: 'weapon', classes: ['strider'], tier: 2, price: 600, bonus: { atk: 15, spd: 2 } },
  { id: 'starfallRod', name: 'Starfall Rod', slot: 'weapon', classes: CASTERS, tier: 2, price: 580, bonus: { mag: 14 } },
  { id: 'bulwarkPlate', name: 'Bulwark Plate', slot: 'armor', classes: ['bastion'], tier: 2, price: 650, bonus: { def: 14, spd: -1 } },
  { id: 'spiritweaveRobe', name: 'Spiritweave Robe', slot: 'armor', classes: CASTERS, tier: 2, price: 560, bonus: { def: 7, res: 10 } },
  // Tier 3 — after reaching the fourth floor
  { id: 'runehewnAxe', name: 'Runehewn Axe', slot: 'weapon', classes: BLADES, tier: 3, price: 1300, bonus: { atk: 22 } },
  { id: 'hrimstringBow', name: 'Hrimstring Bow', slot: 'weapon', classes: ['strider'], tier: 3, price: 1250, bonus: { atk: 21, spd: 2 } },
  { id: 'frostbirchRod', name: 'Frostbirch Rod', slot: 'weapon', classes: CASTERS, tier: 3, price: 1200, bonus: { mag: 19 } },
  { id: 'scalehideMail', name: 'Scalehide Mail', slot: 'armor', classes: MAIL, tier: 3, price: 1300, bonus: { def: 18 } },
  { id: 'rimeweaveRobe', name: 'Rimeweave Robe', slot: 'armor', classes: CASTERS, tier: 3, price: 1150, bonus: { def: 10, res: 14 } },
  // Tier 4 — after reaching the fifth floor
  { id: 'wyrmtoothBlade', name: 'Wyrmtooth Blade', slot: 'weapon', classes: BLADES, tier: 4, price: 2600, bonus: { atk: 30 } },
  { id: 'embersongBow', name: 'Embersong Bow', slot: 'weapon', classes: ['strider'], tier: 4, price: 2500, bonus: { atk: 28, spd: 3 } },
  { id: 'ashrootRod', name: 'Ashroot Rod', slot: 'weapon', classes: CASTERS, tier: 4, price: 2400, bonus: { mag: 25 } },
  { id: 'emberscalePlate', name: 'Emberscale Plate', slot: 'armor', classes: ['bastion'], tier: 4, price: 2700, bonus: { def: 24, spd: -1 } },
  { id: 'starveilRobe', name: 'Starveil Robe', slot: 'armor', classes: CASTERS, tier: 4, price: 2300, bonus: { def: 14, res: 19 } },
  // Tier 5 — after reaching the sixth floor (Chapter II)
  { id: 'saltsteelBlade', name: 'Saltsteel Blade', slot: 'weapon', classes: BLADES, tier: 5, price: 2600, bonus: { atk: 37 } },
  { id: 'gullwindBow', name: 'Gullwind Bow', slot: 'weapon', classes: ['strider'], tier: 5, price: 2500, bonus: { atk: 35, spd: 3 } },
  { id: 'driftwoodRod', name: 'Driftwood Rod', slot: 'weapon', classes: CASTERS, tier: 5, price: 2500, bonus: { mag: 31 } },
  { id: 'sharkhideMail', name: 'Sharkhide Mail', slot: 'armor', classes: MAIL, tier: 5, price: 2700, bonus: { def: 29 } },
  { id: 'kelpweaveRobe', name: 'Kelpweave Robe', slot: 'armor', classes: CASTERS, tier: 5, price: 2400, bonus: { def: 17, res: 24 } },
  // Tier 7 — after reaching the eighth floor
  { id: 'tidebreakerAxe', name: 'Tidebreaker Axe', slot: 'weapon', classes: BLADES, tier: 7, price: 4500, bonus: { atk: 45 } },
  { id: 'stormgullBow', name: 'Stormgull Bow', slot: 'weapon', classes: ['strider'], tier: 7, price: 4300, bonus: { atk: 42, spd: 4 } },
  { id: 'coralheartRod', name: 'Coralheart Rod', slot: 'weapon', classes: CASTERS, tier: 7, price: 4200, bonus: { mag: 38 } },
  { id: 'anchorPlate', name: 'Anchor Plate', slot: 'armor', classes: ['bastion'], tier: 7, price: 4600, bonus: { def: 36, spd: -1 } },
  { id: 'deepscaleMail', name: 'Deepscale Mail', slot: 'armor', classes: ['strider'], tier: 7, price: 4300, bonus: { def: 33, spd: 1 } },
  { id: 'seafoamRobe', name: 'Seafoam Robe', slot: 'armor', classes: CASTERS, tier: 7, price: 4100, bonus: { def: 21, res: 29 } },
  // Tier 9 — after reaching the tenth floor
  { id: 'fathomEdge', name: 'Fathom Edge', slot: 'weapon', classes: BLADES, tier: 9, price: 6800, bonus: { atk: 54 } },
  { id: 'wavecallerBow', name: 'Wavecaller Bow', slot: 'weapon', classes: ['strider'], tier: 9, price: 6700, bonus: { atk: 51, spd: 5 } },
  { id: 'abyssRod', name: 'Abyss Rod', slot: 'weapon', classes: CASTERS, tier: 9, price: 6500, bonus: { mag: 46 } },
  { id: 'leviathanMail', name: 'Leviathan Mail', slot: 'armor', classes: MAIL, tier: 9, price: 6900, bonus: { def: 43 } },
  { id: 'tidesongRobe', name: 'Tidesong Robe', slot: 'armor', classes: CASTERS, tier: 9, price: 6300, bonus: { def: 26, res: 35 } },
  // Special gear, unlocked by selling materials
  { id: 'briarthornSpear', name: 'Briarthorn Spear', slot: 'weapon', classes: BLADES, tier: 0, price: 220, bonus: { atk: 8 }, requires: { material: 'briarQuill', qty: 5 } },
  { id: 'duskweaveCloak', name: 'Duskweave Cloak', slot: 'armor', classes: ALL, tier: 0, price: 200, bonus: { def: 5, res: 4 }, requires: { material: 'duskMembrane', qty: 6 } },
  { id: 'barkshellMail', name: 'Barkshell Mail', slot: 'armor', classes: MAIL, tier: 1, price: 420, bonus: { def: 11 }, requires: { material: 'barkShell', qty: 5 } },
  { id: 'gloamscaleRobe', name: 'Gloamscale Robe', slot: 'armor', classes: CASTERS, tier: 2, price: 520, bonus: { def: 6, res: 9 }, requires: { material: 'gloamScale', qty: 5 } },
  { id: 'heartknotStaff', name: 'Heartknot Staff', slot: 'weapon', classes: CASTERS, tier: 2, price: 560, bonus: { mag: 12, spd: 1 }, requires: { material: 'heartwoodKnot', qty: 3 } },
  { id: 'elderheartMail', name: 'Elderheart Mail', slot: 'armor', classes: MAIL, tier: 2, price: 1800, bonus: { def: 20 }, requires: { material: 'blightedHeartwood', qty: 1 } },
  { id: 'rimefangBlade', name: 'Rimefang Blade', slot: 'weapon', classes: BLADES, tier: 3, price: 1100, bonus: { atk: 19 }, requires: { material: 'rimePelt', qty: 6 } },
  { id: 'snowveilBow', name: 'Snowveil Bow', slot: 'weapon', classes: ['strider'], tier: 3, price: 1100, bonus: { atk: 19, spd: 3 }, requires: { material: 'snowveilWing', qty: 5 } },
  { id: 'embercoreRod', name: 'Embercore Rod', slot: 'weapon', classes: CASTERS, tier: 4, price: 2100, bonus: { mag: 23 }, requires: { material: 'emberCore', qty: 5 } },
  { id: 'grimtuskCleaver', name: 'Grimtusk Cleaver', slot: 'weapon', classes: BLADES, tier: 4, price: 3200, bonus: { atk: 34 }, requires: { material: 'grimTusk', qty: 1 } },
  { id: 'draugrboneBow', name: 'Draugrbone Bow', slot: 'weapon', classes: ['strider'], tier: 4, price: 3200, bonus: { atk: 32, spd: 4 }, requires: { material: 'draugrBone', qty: 1 } },
  { id: 'wraithsilkRobe', name: 'Wraithsilk Robe', slot: 'armor', classes: CASTERS, tier: 4, price: 3000, bonus: { def: 15, res: 22 }, requires: { material: 'wraithSilk', qty: 1 } },
  { id: 'reefshellMail', name: 'Reefshell Mail', slot: 'armor', classes: MAIL, tier: 5, price: 2400, bonus: { def: 31 }, requires: { material: 'reefShell', qty: 6 } },
  { id: 'nacreRobe', name: 'Nacre Robe', slot: 'armor', classes: CASTERS, tier: 7, price: 3700, bonus: { def: 20, res: 30, spd: 1 }, requires: { material: 'pearlDust', qty: 6 } },
  { id: 'eelLanternRod', name: 'Eel Lantern Rod', slot: 'weapon', classes: CASTERS, tier: 8, price: 4800, bonus: { mag: 41 }, requires: { material: 'eelLantern', qty: 5 } },
  { id: 'skerryjawSaber', name: 'Skerryjaw Saber', slot: 'weapon', classes: BLADES, tier: 6, price: 5500, bonus: { atk: 50 }, requires: { material: 'skerryjawFin', qty: 1 } },
  { id: 'brinecrownBow', name: 'Brinecrown Bow', slot: 'weapon', classes: ['strider'], tier: 8, price: 6100, bonus: { atk: 50, spd: 6 }, requires: { material: 'brineCrown', qty: 1 } },
  { id: 'coilscaleRobe', name: 'Coilscale Robe', slot: 'armor', classes: CASTERS, tier: 8, price: 5800, bonus: { def: 25, res: 36 }, requires: { material: 'coilScale', qty: 1 } },
  { id: 'jarlguardPlate', name: 'Jarlguard Plate', slot: 'armor', classes: ['bastion'], tier: 7, price: 5600, bonus: { def: 42 }, requires: { material: 'jarlsCrown', qty: 1 } },
];

export const EQUIPMENT: Record<string, EquipDef> = Object.fromEntries(list.map((e) => [e.id, e]));
export const EQUIPMENT_LIST: readonly EquipDef[] = list;
