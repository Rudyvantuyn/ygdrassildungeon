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
  /**
   * Wyrd gear, woven by Hilde from Wyrd Threads (never sold for gold): its gift in a fight. lastStand: once per fight
   * a killing blow leaves 1 HP. mending: heals a little at the end of every round. steadfast: poison, sleep and
   * paralysis do not take.
   */
  wyrd?: 'lastStand' | 'mending' | 'steadfast';
}

const ALL: ClassId[] = ['bastion', 'strider', 'mender', 'runecaller', 'skald', 'berserker', 'seeress', 'wolfkin', 'ravenspeaker', 'hornbearer', 'fylgja'];
const CASTERS: ClassId[] = ['mender', 'runecaller', 'skald', 'seeress', 'ravenspeaker'];
/** Blades, axes and spears for the front-line fighters. */
const BLADES: ClassId[] = ['bastion', 'berserker', 'wolfkin', 'hornbearer', 'fylgja'];
/** Mail and hide armour. */
const MAIL: ClassId[] = ['bastion', 'strider', 'berserker', 'wolfkin', 'hornbearer', 'fylgja'];

const list: EquipDef[] = [
  // Wyrd gear: woven from Wyrd Threads at Hilde's (see WYRD_COSTS in src/core/wyrd.ts), for every class.
  { id: 'nornMantle', name: 'Norn-Spun Mantle', slot: 'armor', classes: ALL, tier: 99, price: 0, bonus: { def: 9, res: 9 }, wyrd: 'lastStand' },
  { id: 'urdWeave', name: "Urd's Weave", slot: 'armor', classes: ALL, tier: 99, price: 0, bonus: { def: 8, res: 12 }, wyrd: 'mending' },
  { id: 'skuldShroud', name: "Skuld's Shroud", slot: 'armor', classes: ALL, tier: 99, price: 0, bonus: { def: 11, res: 11, spd: 2 }, wyrd: 'steadfast' },
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
  // Tier 10 — after reaching the eleventh floor (Chapter III)
  { id: 'bonebreakerAxe', name: 'Bonebreaker Axe', slot: 'weapon', classes: BLADES, tier: 10, price: 9500, bonus: { atk: 62 } },
  { id: 'marrowBow', name: 'Marrow Bow', slot: 'weapon', classes: ['strider'], tier: 10, price: 9300, bonus: { atk: 59, spd: 5 } },
  { id: 'runeboneRod', name: 'Runebone Rod', slot: 'weapon', classes: CASTERS, tier: 10, price: 9100, bonus: { mag: 53 } },
  { id: 'cairnplateMail', name: 'Cairnplate Mail', slot: 'armor', classes: MAIL, tier: 10, price: 9600, bonus: { def: 50 } },
  { id: 'chalkweaveRobe', name: 'Chalkweave Robe', slot: 'armor', classes: CASTERS, tier: 10, price: 8900, bonus: { def: 30, res: 40 } },
  // Tier 12 — after reaching the thirteenth floor
  { id: 'giantsteelBlade', name: 'Giantsteel Blade', slot: 'weapon', classes: BLADES, tier: 12, price: 13000, bonus: { atk: 70 } },
  { id: 'stormhornBow', name: 'Stormhorn Bow', slot: 'weapon', classes: ['strider'], tier: 12, price: 12800, bonus: { atk: 66, spd: 6 } },
  { id: 'quartzheartRod', name: 'Quartzheart Rod', slot: 'weapon', classes: CASTERS, tier: 12, price: 12500, bonus: { mag: 60 } },
  { id: 'cragPlate', name: 'Crag Plate', slot: 'armor', classes: ['bastion'], tier: 12, price: 13200, bonus: { def: 56, spd: -1 } },
  { id: 'cragleatherCoat', name: 'Cragleather Coat', slot: 'armor', classes: ['strider'], tier: 12, price: 12600, bonus: { def: 50, spd: 2 } },
  { id: 'echoweaveRobe', name: 'Echoweave Robe', slot: 'armor', classes: CASTERS, tier: 12, price: 12300, bonus: { def: 34, res: 46 } },
  // Tier 14 — after reaching the fifteenth floor
  { id: 'jotunCleaver', name: 'Jotun Cleaver', slot: 'weapon', classes: BLADES, tier: 14, price: 17000, bonus: { atk: 80 } },
  { id: 'skyrenderBow', name: 'Skyrender Bow', slot: 'weapon', classes: ['strider'], tier: 14, price: 16800, bonus: { atk: 76, spd: 6 } },
  { id: 'starmarrowRod', name: 'Starmarrow Rod', slot: 'weapon', classes: CASTERS, tier: 14, price: 16500, bonus: { mag: 69 } },
  { id: 'mountainheartMail', name: 'Mountainheart Mail', slot: 'armor', classes: MAIL, tier: 14, price: 17200, bonus: { def: 62 } },
  { id: 'runeveilRobe', name: 'Runeveil Robe', slot: 'armor', classes: CASTERS, tier: 14, price: 16200, bonus: { def: 39, res: 53 } },
  // Chapter IV: the Dreaming Skull
  { id: 'skysteelBlade', name: 'Skysteel Blade', slot: 'weapon', classes: BLADES, tier: 16, price: 22000, bonus: { atk: 90 } },
  { id: 'galebornBow', name: 'Galeborn Bow', slot: 'weapon', classes: ['strider'], tier: 16, price: 21800, bonus: { atk: 86, spd: 7 } },
  { id: 'cloudglassRod', name: 'Cloudglass Rod', slot: 'weapon', classes: CASTERS, tier: 16, price: 21500, bonus: { mag: 78 } },
  { id: 'stormplateMail', name: 'Stormplate Mail', slot: 'armor', classes: MAIL, tier: 16, price: 22500, bonus: { def: 70 } },
  { id: 'mistweaveRobe', name: 'Mistweave Robe', slot: 'armor', classes: CASTERS, tier: 16, price: 21000, bonus: { def: 44, res: 59 } },
  { id: 'thundersteelAxe', name: 'Thundersteel Axe', slot: 'weapon', classes: BLADES, tier: 18, price: 28000, bonus: { atk: 100 } },
  { id: 'starwindBow', name: 'Starwind Bow', slot: 'weapon', classes: ['strider'], tier: 18, price: 27800, bonus: { atk: 95, spd: 7 } },
  { id: 'dreamglassRod', name: 'Dreamglass Rod', slot: 'weapon', classes: CASTERS, tier: 18, price: 27500, bonus: { mag: 87 } },
  { id: 'skyvaultMail', name: 'Skyvault Mail', slot: 'armor', classes: MAIL, tier: 18, price: 28500, bonus: { def: 78 } },
  { id: 'dreamveilRobe', name: 'Dreamveil Robe', slot: 'armor', classes: CASTERS, tier: 18, price: 27000, bonus: { def: 49, res: 66 } },
  // Chapter V: Ginnungagap
  { id: 'rimesteelBlade', name: 'Rimesteel Blade', slot: 'weapon', classes: BLADES, tier: 20, price: 34000, bonus: { atk: 110 } },
  { id: 'sparkstringBow', name: 'Sparkstring Bow', slot: 'weapon', classes: ['strider'], tier: 20, price: 33800, bonus: { atk: 104, spd: 8 } },
  { id: 'frostfireRod', name: 'Frostfire Rod', slot: 'weapon', classes: CASTERS, tier: 20, price: 33500, bonus: { mag: 96 } },
  { id: 'hoarplateMail', name: 'Hoarplate Mail', slot: 'armor', classes: MAIL, tier: 20, price: 34500, bonus: { def: 86 } },
  { id: 'rimeweftRobe', name: 'Rimeweft Robe', slot: 'armor', classes: CASTERS, tier: 20, price: 33000, bonus: { def: 54, res: 73 } },
  { id: 'gapforgedAxe', name: 'Gapforged Axe', slot: 'weapon', classes: BLADES, tier: 22, price: 41000, bonus: { atk: 120 } },
  { id: 'emberwindBow', name: 'Emberwind Bow', slot: 'weapon', classes: ['strider'], tier: 22, price: 40800, bonus: { atk: 113, spd: 8 } },
  { id: 'firstfrostRod', name: 'Firstfrost Rod', slot: 'weapon', classes: CASTERS, tier: 22, price: 40500, bonus: { mag: 105 } },
  { id: 'rimeheartMail', name: 'Rimeheart Mail', slot: 'armor', classes: MAIL, tier: 22, price: 41500, bonus: { def: 94 } },
  { id: 'steamsilkRobe', name: 'Steamsilk Robe', slot: 'armor', classes: CASTERS, tier: 22, price: 40000, bonus: { def: 59, res: 80 } },
  // Chapter VI: Hvergelmir
  { id: 'mistforgedBlade', name: 'Mistforged Blade', slot: 'weapon', classes: BLADES, tier: 25, price: 48000, bonus: { atk: 130 } },
  { id: 'greyyewBow', name: 'Greyyew Bow', slot: 'weapon', classes: ['strider'], tier: 25, price: 47800, bonus: { atk: 122, spd: 9 } },
  { id: 'wellwaterRod', name: 'Wellwater Rod', slot: 'weapon', classes: CASTERS, tier: 25, price: 47500, bonus: { mag: 114 } },
  { id: 'blackslateMail', name: 'Blackslate Mail', slot: 'armor', classes: MAIL, tier: 25, price: 48500, bonus: { def: 102 } },
  { id: 'mistweftRobe', name: 'Mistweft Robe', slot: 'armor', classes: CASTERS, tier: 25, price: 47000, bonus: { def: 64, res: 87 } },
  { id: 'rootcleaverAxe', name: 'Rootcleaver Axe', slot: 'weapon', classes: BLADES, tier: 27, price: 56000, bonus: { atk: 140 } },
  { id: 'serpentstringBow', name: 'Serpentstring Bow', slot: 'weapon', classes: ['strider'], tier: 27, price: 55800, bonus: { atk: 131, spd: 9 } },
  { id: 'kettlefireRod', name: 'Kettlefire Rod', slot: 'weapon', classes: CASTERS, tier: 27, price: 55500, bonus: { mag: 123 } },
  { id: 'rootplateMail', name: 'Rootplate Mail', slot: 'armor', classes: MAIL, tier: 27, price: 56500, bonus: { def: 110 } },
  { id: 'shroudweaveRobe', name: 'Shroudweave Robe', slot: 'armor', classes: CASTERS, tier: 27, price: 55000, bonus: { def: 69, res: 94 } },
  // Special gear, unlocked by selling materials. It should always beat the shop gear of the next floor down:
  // that is the reward for hunting a kind of monster on purpose.
  { id: 'briarthornSpear', name: 'Briarthorn Spear', slot: 'weapon', classes: BLADES, tier: 0, price: 220, bonus: { atk: 11 }, requires: { material: 'briarQuill', qty: 5 } },
  { id: 'duskweaveCloak', name: 'Duskweave Cloak', slot: 'armor', classes: ALL, tier: 0, price: 200, bonus: { def: 7, res: 6 }, requires: { material: 'duskMembrane', qty: 6 } },
  { id: 'barkshellMail', name: 'Barkshell Mail', slot: 'armor', classes: MAIL, tier: 1, price: 420, bonus: { def: 13, res: 3 }, requires: { material: 'barkShell', qty: 5 } },
  { id: 'gloamscaleRobe', name: 'Gloamscale Robe', slot: 'armor', classes: CASTERS, tier: 2, price: 520, bonus: { def: 10, res: 15 }, requires: { material: 'gloamScale', qty: 5 } },
  { id: 'heartknotStaff', name: 'Heartknot Staff', slot: 'weapon', classes: CASTERS, tier: 2, price: 560, bonus: { mag: 18, spd: 1 }, requires: { material: 'heartwoodKnot', qty: 3 } },
  { id: 'elderheartMail', name: 'Elderheart Mail', slot: 'armor', classes: MAIL, tier: 2, price: 1800, bonus: { def: 24, res: 4 }, requires: { material: 'blightedHeartwood', qty: 1 } },
  { id: 'rimefangBlade', name: 'Rimefang Blade', slot: 'weapon', classes: BLADES, tier: 3, price: 1100, bonus: { atk: 27 }, requires: { material: 'rimePelt', qty: 6 } },
  { id: 'snowveilBow', name: 'Snowveil Bow', slot: 'weapon', classes: ['strider'], tier: 3, price: 1100, bonus: { atk: 26, spd: 4 }, requires: { material: 'snowveilWing', qty: 5 } },
  { id: 'embercoreRod', name: 'Embercore Rod', slot: 'weapon', classes: CASTERS, tier: 4, price: 2100, bonus: { mag: 30 }, requires: { material: 'emberCore', qty: 5 } },
  { id: 'grimtuskCleaver', name: 'Grimtusk Cleaver', slot: 'weapon', classes: BLADES, tier: 4, price: 3200, bonus: { atk: 41 }, requires: { material: 'grimTusk', qty: 1 } },
  { id: 'draugrboneBow', name: 'Draugrbone Bow', slot: 'weapon', classes: ['strider'], tier: 4, price: 3200, bonus: { atk: 39, spd: 5 }, requires: { material: 'draugrBone', qty: 1 } },
  { id: 'wraithsilkRobe', name: 'Wraithsilk Robe', slot: 'armor', classes: CASTERS, tier: 4, price: 3000, bonus: { def: 20, res: 28 }, requires: { material: 'wraithSilk', qty: 1 } },
  { id: 'reefshellMail', name: 'Reefshell Mail', slot: 'armor', classes: MAIL, tier: 5, price: 2400, bonus: { def: 36 }, requires: { material: 'reefShell', qty: 6 } },
  { id: 'nacreRobe', name: 'Nacre Robe', slot: 'armor', classes: CASTERS, tier: 7, price: 3700, bonus: { def: 25, res: 36, spd: 1 }, requires: { material: 'pearlDust', qty: 6 } },
  { id: 'eelLanternRod', name: 'Eel Lantern Rod', slot: 'weapon', classes: CASTERS, tier: 8, price: 4800, bonus: { mag: 49 }, requires: { material: 'eelLantern', qty: 5 } },
  { id: 'skerryjawSaber', name: 'Skerryjaw Saber', slot: 'weapon', classes: BLADES, tier: 6, price: 5500, bonus: { atk: 52 }, requires: { material: 'skerryjawFin', qty: 1 } },
  { id: 'brinecrownBow', name: 'Brinecrown Bow', slot: 'weapon', classes: ['strider'], tier: 8, price: 6100, bonus: { atk: 56, spd: 6 }, requires: { material: 'brineCrown', qty: 1 } },
  { id: 'coilscaleRobe', name: 'Coilscale Robe', slot: 'armor', classes: CASTERS, tier: 8, price: 5800, bonus: { def: 30, res: 42 }, requires: { material: 'coilScale', qty: 1 } },
  { id: 'jarlguardPlate', name: 'Jarlguard Plate', slot: 'armor', classes: ['bastion'], tier: 7, price: 5600, bonus: { def: 48 }, requires: { material: 'jarlsCrown', qty: 1 } },
  // Special gear from rare gathering finds: a reason to train foraging, mining, felling and fishing.
  { id: 'moonpetalRobe', name: 'Moonpetal Robe', slot: 'armor', classes: CASTERS, tier: 2, price: 1500, bonus: { def: 12, res: 18 }, requires: { material: 'moonpetal', qty: 3 } },
  { id: 'starsilverBlade', name: 'Starsilver Blade', slot: 'weapon', classes: BLADES, tier: 2, price: 1600, bonus: { atk: 26 }, requires: { material: 'starsilver', qty: 3 } },
  { id: 'heartoakBow', name: 'Heartoak Bow', slot: 'weapon', classes: ['strider'], tier: 2, price: 1600, bonus: { atk: 25, spd: 3 }, requires: { material: 'heartoakBurl', qty: 3 } },
  { id: 'glimmerscaleMail', name: 'Glimmerscale Mail', slot: 'armor', classes: MAIL, tier: 2, price: 1600, bonus: { def: 21, spd: 1 }, requires: { material: 'glimmerTrout', qty: 3 } },
  { id: 'pearlkelpRobe', name: 'Pearlkelp Robe', slot: 'armor', classes: CASTERS, tier: 6, price: 5200, bonus: { def: 25, res: 36 }, requires: { material: 'pearlKelp', qty: 3 } },
  { id: 'deepironMail', name: 'Deepiron Mail', slot: 'armor', classes: MAIL, tier: 6, price: 5600, bonus: { def: 41 }, requires: { material: 'deepiron', qty: 3 } },
  { id: 'ghostwoodRod', name: 'Ghostwood Rod', slot: 'weapon', classes: CASTERS, tier: 6, price: 5400, bonus: { mag: 44, spd: 2 }, requires: { material: 'ghostwood', qty: 3 } },
  { id: 'moonscaleBow', name: 'Moonscale Bow', slot: 'weapon', classes: ['strider'], tier: 6, price: 5600, bonus: { atk: 48, spd: 5 }, requires: { material: 'moonscaleEel', qty: 3 } },
  // Chapter III special gear (monster parts, then rare finds).
  { id: 'knucklebonesAxe', name: 'Knucklebone Axe', slot: 'weapon', classes: BLADES, tier: 10, price: 9000, bonus: { atk: 72 }, requires: { material: 'gnawedKnuckle', qty: 6 } },
  { id: 'chalksilkRobe', name: 'Chalksilk Robe', slot: 'armor', classes: CASTERS, tier: 10, price: 8800, bonus: { def: 36, res: 48 }, requires: { material: 'chalkSilk', qty: 6 } },
  { id: 'wingboneBow', name: 'Wingbone Bow', slot: 'weapon', classes: ['strider'], tier: 10, price: 9000, bonus: { atk: 68, spd: 7 }, requires: { material: 'hollowWingbone', qty: 5 } },
  { id: 'ramhornMail', name: 'Ramhorn Mail', slot: 'armor', classes: MAIL, tier: 11, price: 10500, bonus: { def: 58 }, requires: { material: 'curledHorn', qty: 5 } },
  { id: 'cairnwardCloak', name: 'Cairnward Cloak', slot: 'armor', classes: ALL, tier: 11, price: 10000, bonus: { def: 40, res: 40 }, requires: { material: 'cairnDust', qty: 5 } },
  { id: 'crystalmarrowRod', name: 'Crystalmarrow Rod', slot: 'weapon', classes: CASTERS, tier: 12, price: 12000, bonus: { mag: 71 }, requires: { material: 'marrowCrystal', qty: 5 } },
  { id: 'trollhideMail', name: 'Trollhide Mail', slot: 'armor', classes: MAIL, tier: 13, price: 15000, bonus: { def: 64 }, requires: { material: 'rimeHide', qty: 6 } },
  { id: 'ribwardenPlate', name: 'Ribwarden Plate', slot: 'armor', classes: ['bastion'], tier: 12, price: 16000, bonus: { def: 68, res: 10 }, requires: { material: 'wardenRib', qty: 1 } },
  { id: 'giantstoothCleaver', name: "Giant's-Tooth Cleaver", slot: 'weapon', classes: BLADES, tier: 13, price: 18000, bonus: { atk: 86 }, requires: { material: 'giantsTooth', qty: 1 } },
  { id: 'ossuaryBow', name: 'Ossuary Bow', slot: 'weapon', classes: ['strider'], tier: 14, price: 18000, bonus: { atk: 84, spd: 7 }, requires: { material: 'ossuaryFang', qty: 1 } },
  { id: 'heartstoneRod', name: 'Heartstone Rod', slot: 'weapon', classes: CASTERS, tier: 14, price: 19000, bonus: { mag: 78, spd: 2 }, requires: { material: 'heartstoneShard', qty: 1 } },
  { id: 'glimmercapRobe', name: 'Glimmercap Robe', slot: 'armor', classes: CASTERS, tier: 11, price: 11000, bonus: { def: 37, res: 50 }, requires: { material: 'glimmercap', qty: 3 } },
  { id: 'runequartzBlade', name: 'Runequartz Blade', slot: 'weapon', classes: BLADES, tier: 11, price: 11500, bonus: { atk: 74 }, requires: { material: 'runeQuartz', qty: 3 } },
  { id: 'ironrootBow', name: 'Ironroot Bow', slot: 'weapon', classes: ['strider'], tier: 11, price: 11500, bonus: { atk: 71, spd: 7 }, requires: { material: 'ironroot', qty: 3 } },
  { id: 'paleeelMail', name: 'Pale-Eel Mail', slot: 'armor', classes: MAIL, tier: 11, price: 11500, bonus: { def: 59, spd: 1 }, requires: { material: 'paleEel', qty: 3 } },
  // Chapter IV: from the Dreaming Skull's creatures, prowlers, guardians and gathering spots
  { id: 'mistgelRobe', name: 'Mistgel Robe', slot: 'armor', classes: CASTERS, tier: 15, price: 20000, bonus: { def: 47, res: 62 }, requires: { material: 'mistGel', qty: 6 } },
  { id: 'cronefeatherBow', name: 'Cronefeather Bow', slot: 'weapon', classes: ['strider'], tier: 15, price: 20500, bonus: { atk: 92, spd: 8 }, requires: { material: 'croneFeather', qty: 5 } },
  { id: 'thoughtcoilBlade', name: 'Thought-Coil Blade', slot: 'weapon', classes: BLADES, tier: 16, price: 23000, bonus: { atk: 96 }, requires: { material: 'thoughtCoil', qty: 6 } },
  { id: 'hailheartMail', name: 'Hailheart Mail', slot: 'armor', classes: MAIL, tier: 16, price: 23500, bonus: { def: 74 }, requires: { material: 'hailHeart', qty: 5 } },
  { id: 'skylensRod', name: 'Sky-Lens Rod', slot: 'weapon', classes: CASTERS, tier: 17, price: 25000, bonus: { mag: 86 }, requires: { material: 'skyLens', qty: 5 } },
  { id: 'thurseyeCloak', name: 'Thurs-Eye Cloak', slot: 'armor', classes: ALL, tier: 17, price: 24000, bonus: { def: 52, res: 52 }, requires: { material: 'thursEye', qty: 5 } },
  { id: 'griffonBow', name: 'Griffon Bow', slot: 'weapon', classes: ['strider'], tier: 18, price: 30000, bonus: { atk: 104, spd: 9 }, requires: { material: 'griffonPlume', qty: 1 } },
  { id: 'wyrmcrestRod', name: 'Wyrmcrest Rod', slot: 'weapon', classes: CASTERS, tier: 18, price: 30000, bonus: { mag: 95, spd: 2 }, requires: { material: 'wyrmCrest', qty: 1 } },
  { id: 'watcherPlate', name: "Watcher's Plate", slot: 'armor', classes: ['bastion'], tier: 17, price: 29000, bonus: { def: 84, res: 14 }, requires: { material: 'watcherEye', qty: 1 } },
  { id: 'dreamshardBlade', name: 'Dreamshard Blade', slot: 'weapon', classes: BLADES, tier: 19, price: 36000, bonus: { atk: 112 }, requires: { material: 'dreamShard', qty: 1 } },
  { id: 'dreampoppyRobe', name: 'Dreampoppy Robe', slot: 'armor', classes: CASTERS, tier: 16, price: 24000, bonus: { def: 50, res: 66 }, requires: { material: 'dreamPoppy', qty: 3 } },
  { id: 'skyironBlade', name: 'Sky-Iron Blade', slot: 'weapon', classes: BLADES, tier: 16, price: 24500, bonus: { atk: 98 }, requires: { material: 'skyIron', qty: 3 } },
  { id: 'dreamwoodBow', name: 'Dreamwood Bow', slot: 'weapon', classes: ['strider'], tier: 16, price: 24500, bonus: { atk: 94, spd: 8 }, requires: { material: 'dreamwood', qty: 3 } },
  { id: 'stareelMail', name: 'Star-Eel Mail', slot: 'armor', classes: MAIL, tier: 16, price: 24500, bonus: { def: 75, spd: 1 }, requires: { material: 'starEel', qty: 3 } },
  // Chapter V: from Ginnungagap's creatures, prowlers, guardians and gathering spots
  { id: 'rimejellyRobe', name: 'Rime-Jelly Robe', slot: 'armor', classes: CASTERS, tier: 20, price: 34000, bonus: { def: 56, res: 76 }, requires: { material: 'rimeJelly', qty: 6 } },
  { id: 'adderscaleBow', name: 'Adderscale Bow', slot: 'weapon', classes: ['strider'], tier: 20, price: 34500, bonus: { atk: 110, spd: 9 }, requires: { material: 'adderScale', qty: 5 } },
  { id: 'embersegmentBlade', name: 'Ember-Ring Blade', slot: 'weapon', classes: BLADES, tier: 21, price: 37000, bonus: { atk: 116 }, requires: { material: 'emberSegment', qty: 6 } },
  { id: 'rimeclawMail', name: 'Rimeclaw Mail', slot: 'armor', classes: MAIL, tier: 21, price: 37500, bonus: { def: 90 }, requires: { material: 'rimeclawTalon', qty: 5 } },
  { id: 'eitrRod', name: 'Eitr Rod', slot: 'weapon', classes: CASTERS, tier: 21, price: 38000, bonus: { mag: 103 }, requires: { material: 'eitrBead', qty: 6 } },
  { id: 'aurochsCloak', name: 'Aurochs Cloak', slot: 'armor', classes: ALL, tier: 22, price: 38000, bonus: { def: 62, res: 62 }, requires: { material: 'aurochsHorn', qty: 5 } },
  { id: 'drakerimeBow', name: 'Drakerime Bow', slot: 'weapon', classes: ['strider'], tier: 23, price: 46000, bonus: { atk: 122, spd: 10 }, requires: { material: 'drakeRime', qty: 1 } },
  { id: 'jotunemberRod', name: 'Jotun-Ember Rod', slot: 'weapon', classes: CASTERS, tier: 23, price: 46000, bonus: { mag: 113, spd: 2 }, requires: { material: 'jotunEmber', qty: 1 } },
  { id: 'wellheartPlate', name: 'Wellheart Plate', slot: 'armor', classes: ['bastion'], tier: 22, price: 44000, bonus: { def: 101, res: 18 }, requires: { material: 'wellHeart', qty: 1 } },
  { id: 'gapsealBlade', name: 'Gapseal Blade', slot: 'weapon', classes: BLADES, tier: 24, price: 54000, bonus: { atk: 132 }, requires: { material: 'gapSeal', qty: 1 } },
  { id: 'emberthornRobe', name: 'Emberthorn Robe', slot: 'armor', classes: CASTERS, tier: 21, price: 38000, bonus: { def: 58, res: 79 }, requires: { material: 'emberThorn', qty: 3 } },
  { id: 'muspelironBlade', name: 'Muspel-Iron Blade', slot: 'weapon', classes: BLADES, tier: 21, price: 38500, bonus: { atk: 118 }, requires: { material: 'muspelIron', qty: 3 } },
  { id: 'firstwoodBow', name: 'Firstwood Bow', slot: 'weapon', classes: ['strider'], tier: 21, price: 38500, bonus: { atk: 112, spd: 9 }, requires: { material: 'firstwood', qty: 3 } },
  { id: 'sparkfinMail', name: 'Sparkfin Mail', slot: 'armor', classes: MAIL, tier: 21, price: 38500, bonus: { def: 91, spd: 1 }, requires: { material: 'sparkfin', qty: 3 } },
  // Chapter VI: from Hvergelmir's creatures, prowlers, guardians and gathering spots
  { id: 'niflmistRobe', name: 'Niflmist Robe', slot: 'armor', classes: CASTERS, tier: 25, price: 49000, bonus: { def: 66, res: 90 }, requires: { material: 'niflMist', qty: 6 } },
  { id: 'carrionBow', name: 'Carrion Bow', slot: 'weapon', classes: ['strider'], tier: 25, price: 49500, bonus: { atk: 128, spd: 10 }, requires: { material: 'carrionQuill', qty: 5 } },
  { id: 'barkbiterBlade', name: 'Barkbiter Blade', slot: 'weapon', classes: BLADES, tier: 26, price: 52000, bonus: { atk: 136 }, requires: { material: 'barkbiterFang', qty: 6 } },
  { id: 'houndpeltMail', name: 'Houndpelt Mail', slot: 'armor', classes: MAIL, tier: 26, price: 52500, bonus: { def: 106 }, requires: { material: 'houndPelt', qty: 5 } },
  { id: 'mirevenomRod', name: 'Mirevenom Rod', slot: 'weapon', classes: CASTERS, tier: 26, price: 53000, bonus: { mag: 120 }, requires: { material: 'mireVenom', qty: 6 } },
  { id: 'wightringCloak', name: 'Wightring Cloak', slot: 'armor', classes: ALL, tier: 27, price: 53000, bonus: { def: 72, res: 72 }, requires: { material: 'wightRing', qty: 5 } },
  { id: 'greybackBow', name: 'Greyback Bow', slot: 'weapon', classes: ['strider'], tier: 28, price: 62000, bonus: { atk: 140, spd: 11 }, requires: { material: 'greybackScale', qty: 1 } },
  { id: 'ofnirRod', name: 'Ófnir Rod', slot: 'weapon', classes: CASTERS, tier: 28, price: 62000, bonus: { mag: 131, spd: 2 }, requires: { material: 'ofnirCoil', qty: 1 } },
  { id: 'sleepbringerPlate', name: 'Sleep-Bringer Plate', slot: 'armor', classes: ['bastion'], tier: 27, price: 60000, bonus: { def: 118, res: 21 }, requires: { material: 'svafnirEye', qty: 1 } },
  { id: 'malicefangBlade', name: 'Malicefang Blade', slot: 'weapon', classes: BLADES, tier: 29, price: 72000, bonus: { atk: 152 }, requires: { material: 'nidhoggFang', qty: 1 } },
  { id: 'palebellRobe', name: 'Palebell Robe', slot: 'armor', classes: CASTERS, tier: 26, price: 53000, bonus: { def: 68, res: 92 }, requires: { material: 'paleBell', qty: 3 } },
  { id: 'wellstoneBlade', name: 'Wellstone Blade', slot: 'weapon', classes: BLADES, tier: 26, price: 53500, bonus: { atk: 138 }, requires: { material: 'wellstone', qty: 3 } },
  { id: 'rootsplinterBow', name: 'Rootsplinter Bow', slot: 'weapon', classes: ['strider'], tier: 26, price: 53500, bonus: { atk: 130, spd: 10 }, requires: { material: 'rootSplinter', qty: 3 } },
  { id: 'kettletroutMail', name: 'Kettle-Trout Mail', slot: 'armor', classes: MAIL, tier: 26, price: 53500, bonus: { def: 107, spd: 1 }, requires: { material: 'kettleTrout', qty: 3 } },
];

export const EQUIPMENT: Record<string, EquipDef> = Object.fromEntries(list.map((e) => [e.id, e]));
export const EQUIPMENT_LIST: readonly EquipDef[] = list;
