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
  // Chapter II
  { id: 'brineGel', name: 'Brine Gel', price: 92, description: 'Salty, clear and cold. Fishers rub it on their nets.' },
  { id: 'skerryPlume', name: 'Skerry Plume', price: 96, description: 'A grey feather that sheds every drop of water.' },
  { id: 'reefShell', name: 'Reef Shell', price: 110, description: 'A claw plate crusted with tiny shells. Tougher than steel.' },
  { id: 'kelpCord', name: 'Kelp Cord', price: 118, description: 'A strand of kelp that never rots or snaps.' },
  { id: 'saltSpores', name: 'Salt Spores', price: 112, description: 'Crystals of salt that grow like a mushroom’s gills.' },
  { id: 'seahoundFang', name: 'Seahound Fang', price: 124, description: 'A curved fang, slick and sharp as a fish hook.' },
  { id: 'pearlDust', name: 'Pearl Dust', price: 134, description: 'Glittering dust from a Pearlmoth’s wings.' },
  { id: 'coralChunk', name: 'Coral Chunk', price: 150, description: 'Living red coral. It still grows a little each night.' },
  { id: 'tideglass', name: 'Tideglass', price: 140, description: 'Glass formed by the sea. You can hear waves inside it.' },
  { id: 'nykurMane', name: 'Nykur Mane', price: 160, description: 'Long hair like river weed, from the water horse.' },
  { id: 'saltBone', name: 'Salt Bone', price: 166, description: 'Bone turned half to salt crystal.' },
  { id: 'eelLantern', name: 'Eel Lantern', price: 170, description: 'The glowing lure of a Gloom Eel. It never goes dark.' },
  { id: 'deepmawTooth', name: 'Deepmaw Tooth', price: 196, description: 'A tooth as long as a hand, from the deepest water.' },
  { id: 'foamSilk', name: 'Foam Silk', price: 190, description: 'A veil of sea foam that does not melt away.' },
  { id: 'fathomCore', name: 'Fathom Core', price: 220, description: 'A heavy stone heart, cold as the sea floor.' },
  { id: 'skerryjawFin', name: 'Skerryjaw Fin', price: 1100, description: 'The fin of a Skerryjaw. Sailors would pay a fortune for it.' },
  { id: 'brineCrown', name: 'Brine Crown', price: 1200, description: 'A rusted crown of a drowned chieftain, grown over with salt.' },
  { id: 'coilScale', name: 'Coil Scale', price: 1300, description: 'A scale of the Tidecoil, shifting like deep water.' },
  { id: 'jarlsCrown', name: 'Jarl’s Crown', price: 2000, description: 'The crown of the Drowned Jarl, heavy with sea gold.' },
  { id: 'hafgufaPearl', name: 'Hafgufa Pearl', price: 4000, description: 'A pearl as big as a fist. The whole sea seems to move inside it.' },
];

export const MATERIALS: Record<string, MaterialDef> = Object.fromEntries(list.map((m) => [m.id, m]));
