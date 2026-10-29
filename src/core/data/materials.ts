/** Monster parts the party carries home and sells in Lindholm. Selling some unlocks special equipment. */
export interface MaterialDef {
  id: string;
  name: string;
  price: number;
  description: string;
}

const list: MaterialDef[] = [
  { id: 'bogJelly', name: 'Bog Jelly', price: 6, description: 'Wobbly and green. Herbalists use it as a binder.' },
  { id: 'duskMembrane', name: 'Dusk Membrane', price: 8, description: 'A thin wing membrane that drinks in the light.' },
  { id: 'briarQuill', name: 'Briar Quill', price: 10, description: 'A hard, thorned quill. Smiths like it for spear tips.' },
  { id: 'hollowFang', name: 'Hollow Fang', price: 16, description: 'A fang with a hollow core, light and strong.' },
  { id: 'puffcapSpores', name: 'Puffcap Spores', price: 14, description: 'A pouch of sleepy spores. Do not sniff.' },
  { id: 'barkShell', name: 'Bark Shell', price: 20, description: 'A shell grown from living bark. Turns blades.' },
  { id: 'gloamScale', name: 'Gloam Scale', price: 26, description: 'A wing scale that shimmers with dusk colours.' },
  { id: 'heartwoodKnot', name: 'Heartwood Knot', price: 32, description: 'Dense wood from deep in the roots. Hums with sap.' },
  { id: 'rimePelt', name: 'Rime Pelt', price: 42, description: 'Fur that stays frozen even by the fire.' },
  { id: 'frostGill', name: 'Frost Gill', price: 38, description: 'The cold gills of a frostcap. Keeps food fresh for weeks.' },
  { id: 'iceCarapace', name: 'Ice Carapace', price: 48, description: 'A plate of shell and ice that never melts.' },
  { id: 'snowveilWing', name: 'Snowveil Wing', price: 46, description: 'Feather-light and pale as snowfall.' },
  { id: 'cinderFeather', name: 'Cinder Feather', price: 62, description: 'Still warm to the touch, and always will be.' },
  { id: 'emberCore', name: 'Ember Core', price: 70, description: 'A glowing heart of living flame.' },
  { id: 'fiendRoot', name: 'Fiend Root', price: 66, description: 'A twisted root that writhes when no one is looking.' },
  { id: 'ashSlab', name: 'Ash Slab', price: 80, description: 'Compressed ash, hard as iron.' },
  { id: 'grimTusk', name: 'Grim Tusk', price: 320, description: 'The tusk of a Grimtusk. Few explorers ever bring one home.' },
  { id: 'wraithSilk', name: 'Wraith Silk', price: 340, description: 'Silk spun from a Fenwraith’s shroud.' },
  { id: 'draugrBone', name: 'Draugr Bone', price: 360, description: 'Bone of the restless dead, wrapped in roots.' },
  { id: 'blightedHeartwood', name: 'Blighted Heartwood', price: 500, description: 'The rotted heart of the Blighted Elder.' },
  { id: 'gnawerFang', name: 'Gnawer Fang', price: 1000, description: 'A fang of the Rootgnawer, longer than a sword.' },
];

export const MATERIALS: Record<string, MaterialDef> = Object.fromEntries(list.map((m) => [m.id, m]));
