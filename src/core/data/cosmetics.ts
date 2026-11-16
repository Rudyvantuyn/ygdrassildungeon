/**
 * Cosmetics: things to look at, never anything that changes the rules (see CLAUDE.md, "Earning money"). Bought with
 * real money through Stripe (server/shop.ts) and kept with the player's account (the `entitlements` table), or free.
 *
 * - Frames go around the adventurers' portraits in the party bar.
 * - Themes recolour the game's windows.
 * - The Supporter badge shows that someone supported the game.
 */
export type CosmeticKind = 'frame' | 'theme' | 'badge';

export interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  name: string;
  description: string;
}

export interface PackDef {
  id: string;
  name: string;
  /** Price in euro cents. */
  price: number;
  items: string[];
  description: string;
}

export const COSMETICS: CosmeticDef[] = [
  { id: 'runeGold', kind: 'frame', name: 'Golden Runes', description: 'A frame of warded gold that glows softly, like the runes of the wards.' },
  { id: 'rootwork', kind: 'frame', name: 'Rootwork', description: 'Roots of the Great Tree, woven around the portrait.' },
  { id: 'rimeFrame', kind: 'frame', name: 'Rime', description: 'A frame of frost from the gap where the world began.' },
  { id: 'emberFrame', kind: 'frame', name: 'Embers', description: 'A frame that glows like a forge at night.' },
  { id: 'birchbark', kind: 'theme', name: 'Birchbark', description: 'Warm birch and parchment instead of the deep night.' },
  { id: 'emberhall', kind: 'theme', name: 'Emberhall', description: 'The red and gold of a jarl\'s hall by firelight.' },
  { id: 'fjordnight', kind: 'theme', name: 'Fjord Night', description: 'Deep green water and silver, like a fjord under the stars.' },
  { id: 'supporter', kind: 'badge', name: 'Supporter', description: 'A small gold mark beside your name: you helped the game grow.' },
];

export const COSMETIC_BY_ID: Record<string, CosmeticDef> = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

export const PACKS: PackDef[] = [
  {
    id: 'supporterPack',
    name: 'Supporter Pack',
    price: 500,
    items: ['runeGold', 'rootwork', 'birchbark', 'supporter'],
    description: 'Two portrait frames, the Birchbark theme and the Supporter badge. Thank you for keeping the lanterns lit.',
  },
  { id: 'framesOfTheDeep', name: 'Frames of the Deep', price: 200, items: ['rimeFrame', 'emberFrame'], description: 'Two more portrait frames: Rime and Embers.' },
  { id: 'hallThemes', name: 'Hall Themes', price: 300, items: ['emberhall', 'fjordnight'], description: 'Two more looks for the game\'s windows: Emberhall and Fjord Night.' },
];

export const PACK_BY_ID: Record<string, PackDef> = Object.fromEntries(PACKS.map((p) => [p.id, p]));

/** Donations, in euro cents: one-off support, with the Supporter badge for a signed-in player. */
export const DONATIONS = [300, 500, 1000, 2000];

/** The items a donation or a pack gives. */
export function itemsFor(kind: 'pack' | 'donation', id: string): string[] {
  if (kind === 'donation') return ['supporter'];
  return PACK_BY_ID[id]?.items ?? [];
}

/** A price as players read it: "€5", "€2.50". */
export function euros(cents: number): string {
  return `€${cents % 100 ? (cents / 100).toFixed(2) : cents / 100}`;
}
