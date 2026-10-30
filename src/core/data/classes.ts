import type { ClassId, Row, SkillId, Stats } from '../types';

export interface TreeEntry {
  skill: SkillId;
  level: number;
  requires?: [SkillId, number];
}

/** Gathering skills every class can learn. */
const GATHERING: TreeEntry[] = [
  { skill: 'forage', level: 1 },
  { skill: 'mine', level: 1 },
  { skill: 'fell', level: 1 },
  { skill: 'fish', level: 1 },
];

export interface ClassDef {
  id: ClassId;
  name: string;
  row: Row;
  /** Ranged attackers deal full damage from the back row. */
  ranged: boolean;
  base: Stats;
  growth: Stats;
  /**
   * The class's skill tree. Each skill can be raised to rank 10 with skill points, once the
   * adventurer has reached `level` and has `requires` (another skill at some rank).
   */
  skills: TreeEntry[];
  color: string;
  description: string;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  bastion: {
    id: 'bastion',
    name: 'Bastion',
    row: 'front',
    ranged: false,
    base: { hp: 82, sp: 24, atk: 13, def: 13, mag: 5, res: 9, spd: 7 },
    growth: { hp: 11, sp: 2, atk: 1.6, def: 1.9, mag: 0.4, res: 1.2, spd: 0.8 },
    skills: [
      { skill: 'challenge', level: 1 },
      { skill: 'bulwarkBash', level: 1 },
      { skill: 'stoutHeart', level: 1 },
      { skill: 'ironFormation', level: 3, requires: ['challenge', 2] },
      { skill: 'ironSkin', level: 5, requires: ['stoutHeart', 2] },
      { skill: 'rampartCrash', level: 16, requires: ['bulwarkBash', 5] },
      ...GATHERING,
    ],
    color: '#d9a441',
    description: 'Shield-bearer of the front line. Draws enemy attacks and shields the party.',
  },
  strider: {
    id: 'strider',
    name: 'Strider',
    row: 'front',
    ranged: true,
    base: { hp: 62, sp: 30, atk: 15, def: 8, mag: 6, res: 7, spd: 15 },
    growth: { hp: 8, sp: 2.5, atk: 1.9, def: 1.1, mag: 0.5, res: 0.9, spd: 1.6 },
    skills: [
      { skill: 'twinFang', level: 1 },
      { skill: 'keenEye', level: 1 },
      { skill: 'venomArrow', level: 2, requires: ['twinFang', 1] },
      { skill: 'scatterVolley', level: 3, requires: ['twinFang', 2] },
      { skill: 'fleetFoot', level: 5, requires: ['keenEye', 2] },
      { skill: 'galePiercer', level: 18, requires: ['scatterVolley', 5] },
      ...GATHERING,
    ],
    color: '#6fbf73',
    description: 'Swift archer. Fights well from either row and strikes several foes at once.',
  },
  mender: {
    id: 'mender',
    name: 'Mender',
    row: 'back',
    ranged: false,
    base: { hp: 52, sp: 46, atk: 8, def: 7, mag: 14, res: 13, spd: 10 },
    growth: { hp: 6.5, sp: 4, atk: 0.8, def: 0.9, mag: 1.7, res: 1.6, spd: 1.0 },
    skills: [
      { skill: 'mend', level: 1 },
      { skill: 'gentleHands', level: 1 },
      { skill: 'cleanse', level: 2, requires: ['mend', 1] },
      { skill: 'verdantChorus', level: 3, requires: ['mend', 2] },
      { skill: 'deepWell', level: 4 },
      { skill: 'rekindle', level: 6, requires: ['cleanse', 2] },
      { skill: 'wellspring', level: 18, requires: ['verdantChorus', 5] },
      ...GATHERING,
    ],
    color: '#8fd3e8',
    description: 'Healer of the back row. Keeps the party standing with mending songs.',
  },
  runecaller: {
    id: 'runecaller',
    name: 'Runecaller',
    row: 'back',
    ranged: false,
    base: { hp: 46, sp: 52, atk: 6, def: 6, mag: 17, res: 11, spd: 11 },
    growth: { hp: 5.5, sp: 4.5, atk: 0.6, def: 0.8, mag: 2.1, res: 1.3, spd: 1.1 },
    skills: [
      { skill: 'emberRune', level: 1 },
      { skill: 'frostRune', level: 1 },
      { skill: 'stormRune', level: 1 },
      { skill: 'runeLore', level: 1 },
      { skill: 'deepWell', level: 4 },
      { skill: 'wildfire', level: 4, requires: ['emberRune', 3] },
      { skill: 'slumberRune', level: 5, requires: ['frostRune', 2] },
      { skill: 'thunderhead', level: 20, requires: ['stormRune', 5] },
      ...GATHERING,
    ],
    color: '#c58af0',
    description: 'Carver of elemental runes. Fragile, but hits enemy weaknesses hard.',
  },
};
