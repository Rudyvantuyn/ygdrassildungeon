import type { ItemId } from '../types';

export type QuestKind = 'hunt' | 'gather' | 'reach' | 'boss';

export interface QuestDef {
  id: string;
  title: string;
  giver: string;
  /** What the giver asks, shown on the notice board. */
  text: string;
  kind: QuestKind;
  /** hunt/boss: enemy id; gather: material id; reach: floor index. */
  target: string | number;
  qty: number;
  reward: { gold: number; items?: Partial<Record<ItemId, number>> };
  /** Shown on the board once the party has reached this floor index. */
  minFloor: number;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'bogTrouble',
    title: 'Bog Trouble',
    giver: 'Hjalmar the miller',
    text: 'Boglings got into my grain store through the old root tunnel. Squash five of them for me, would you?',
    kind: 'hunt', target: 'bogling', qty: 5,
    reward: { gold: 120, items: { sapTonic: 2 } },
    minFloor: 0,
  },
  {
    id: 'quillsForSpears',
    title: 'Quills for Spears',
    giver: 'Hilde of the shop',
    text: 'Briar Quills make the finest spear tips. Bring me three and I will pay above market.',
    kind: 'gather', target: 'briarQuill', qty: 3,
    reward: { gold: 150 },
    minFloor: 0,
  },
  {
    id: 'firstSteps',
    title: 'Deeper Roots',
    giver: 'Sigrid, Warden of Lindholm',
    text: 'Find the way down to the second floor. I need to know how far the rot has spread.',
    kind: 'reach', target: 1, qty: 1,
    reward: { gold: 100, items: { homingFeather: 1 } },
    minFloor: 0,
  },
  {
    id: 'houndHunt',
    title: 'Howls at Night',
    giver: 'Ylva the shepherd',
    text: 'Hollow Hounds have started coming up the roots at night. Hunt four before they take my flock.',
    kind: 'hunt', target: 'hollowHound', qty: 4,
    reward: { gold: 260, items: { clearwater: 2 } },
    minFloor: 1,
  },
  {
    id: 'sporeSample',
    title: 'A Sleepy Remedy',
    giver: 'Brother Aske, healer',
    text: 'Puffcap spores, carefully dried, make a fine sleeping draught for the sick. Four pouches, please.',
    kind: 'gather', target: 'puffcapSpores', qty: 4,
    reward: { gold: 280, items: { spiritDew: 2 } },
    minFloor: 1,
  },
  {
    id: 'elderRot',
    title: 'The Rotting Heart',
    giver: 'Sigrid, Warden of Lindholm',
    text: 'The rot gathers around a great blighted tree spirit on the third floor. Fell it.',
    kind: 'boss', target: 'blightedElder', qty: 1,
    reward: { gold: 800, items: { kindlingMoss: 2 } },
    minFloor: 2,
  },
  {
    id: 'colossusHeart',
    title: 'Heart of the Colossus',
    giver: 'Torvald the carver',
    text: 'A Heartwood Knot carves like nothing else. Two of them, and I will carve your names into the hall door.',
    kind: 'gather', target: 'heartwoodKnot', qty: 2,
    reward: { gold: 500 },
    minFloor: 2,
  },
  {
    id: 'wolfPelts',
    title: 'Winter Coats',
    giver: 'Hjalmar the miller',
    text: 'My grandchildren need winter coats, and Rime Pelts never thaw. Four will do.',
    kind: 'gather', target: 'rimePelt', qty: 4,
    reward: { gold: 700 },
    minFloor: 3,
  },
  {
    id: 'mothSwarm',
    title: 'White Wings',
    giver: 'Ylva the shepherd',
    text: 'Snowveil Moths swarm up the shafts and freeze the wells. Drive off six of them.',
    kind: 'hunt', target: 'snowveil', qty: 6,
    reward: { gold: 800, items: { spiritDew: 2 } },
    minFloor: 3,
  },
  {
    id: 'emberTrouble',
    title: 'Embers in the Roots',
    giver: 'Brother Aske, healer',
    text: 'Emberlings are scorching the deep roots. Put out five of them before the fire spreads.',
    kind: 'hunt', target: 'emberling', qty: 5,
    reward: { gold: 1100, items: { clearwater: 3 } },
    minFloor: 4,
  },
  {
    id: 'grimTrophy',
    title: 'A Grim Trophy',
    giver: 'Torvald the carver',
    text: 'They say a Grimtusk roams the deepest tunnels. Bring one down and I will make you famous.',
    kind: 'hunt', target: 'grimtusk', qty: 1,
    reward: { gold: 2000, items: { kindlingMoss: 3 } },
    minFloor: 4,
  },
  {
    id: 'endTheGnawing',
    title: 'The Gnawing Below',
    giver: 'Sigrid, Warden of Lindholm',
    text: 'Whatever chews at the Great Tree lies at the very bottom of the Rootdeep. End it.',
    kind: 'boss', target: 'rootgnawer', qty: 1,
    reward: { gold: 3000 },
    minFloor: 4,
  },
  // ── Chapter II ──────────────────────────────────────────────────────────────
  {
    id: 'saltInTheWells',
    title: 'Salt in the Wells',
    giver: 'Hjalmar the miller',
    text: 'My millpond has gone salty and the fish are dying. Brinelings come up the roots with the water. Clear out eight of them.',
    kind: 'hunt', target: 'brineling', qty: 8,
    reward: { gold: 2200, items: { tideDraught: 3 } },
    minFloor: 5,
  },
  {
    id: 'nets',
    title: 'Nets That Hold',
    giver: 'Ylva the shepherd',
    text: 'Kelp Cord never rots. Bring me five strands and I can mend every fence and net in Lindholm.',
    kind: 'gather', target: 'kelpCord', qty: 5,
    reward: { gold: 2400 },
    minFloor: 6,
  },
  {
    id: 'coralVault',
    title: 'Under the Coral',
    giver: 'Sigrid, Warden of Lindholm',
    text: 'The sea folk’s old songs speak of a vault of red coral. Find it, and tell me what lies there.',
    kind: 'reach', target: 7, qty: 1,
    reward: { gold: 2000, items: { kindlingMoss: 2 } },
    minFloor: 6,
  },
  {
    id: 'pearlLight',
    title: 'Pearl Light',
    giver: 'Brother Aske, healer',
    text: 'Pearl Dust eases fevers like nothing else. Four pinches, please, for the children who drank from the salt wells.',
    kind: 'gather', target: 'pearlDust', qty: 4,
    reward: { gold: 2800, items: { spiritDew: 3 } },
    minFloor: 7,
  },
  {
    id: 'drownedJarl',
    title: 'The Drowned Crown',
    giver: 'Sigrid, Warden of Lindholm',
    text: 'A crowned warrior rules the coral vault, long dead and still fighting. Lay him to rest.',
    kind: 'boss', target: 'drownedJarl', qty: 1,
    reward: { gold: 6000, items: { tideDraught: 4 } },
    minFloor: 7,
  },
  {
    id: 'finTrophy',
    title: 'A Fin for the Hall',
    giver: 'Torvald the carver',
    text: 'A Skerryjaw fin over the hall door, now that would be something. Bring one down for me.',
    kind: 'hunt', target: 'skerryjaw', qty: 1,
    reward: { gold: 5000, items: { kindlingMoss: 3 } },
    minFloor: 6,
  },
  {
    id: 'eelLights',
    title: 'Lights in the Deep',
    giver: 'Torvald the carver',
    text: 'Eel Lanterns never go out. Three of them would light my workshop all winter.',
    kind: 'gather', target: 'eelLantern', qty: 3,
    reward: { gold: 3600 },
    minFloor: 8,
  },
  {
    id: 'sweetWater',
    title: 'Sweet Water',
    giver: 'Sigrid, Warden of Lindholm',
    text: 'Something enormous lies at the bottom of the drowned roots, and the sea turns sour around it. End it, and give the Great Tree its water back.',
    kind: 'boss', target: 'hafgufa', qty: 1,
    reward: { gold: 12000 },
    minFloor: 9,
  },
];
