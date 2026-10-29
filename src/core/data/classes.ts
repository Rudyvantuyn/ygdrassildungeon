import type { ClassId, Row, SkillId, Stats } from '../types';

export interface ClassDef {
  id: ClassId;
  name: string;
  row: Row;
  /** Ranged attackers deal full damage from the back row. */
  ranged: boolean;
  base: Stats;
  growth: Stats;
  skills: { skill: SkillId; level: number }[];
  color: string;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  guardian: {
    id: 'guardian',
    name: 'Guardian',
    row: 'front',
    ranged: false,
    base: { hp: 82, tp: 24, atk: 13, def: 13, mag: 5, res: 9, spd: 7 },
    growth: { hp: 11, tp: 2, atk: 1.6, def: 1.9, mag: 0.4, res: 1.2, spd: 0.8 },
    skills: [
      { skill: 'provoke', level: 1 },
      { skill: 'shieldSmite', level: 1 },
      { skill: 'shieldWall', level: 3 },
    ],
    color: '#d9a441',
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    row: 'front',
    ranged: true,
    base: { hp: 62, tp: 30, atk: 15, def: 8, mag: 6, res: 7, spd: 15 },
    growth: { hp: 8, tp: 2.5, atk: 1.9, def: 1.1, mag: 0.5, res: 0.9, spd: 1.6 },
    skills: [
      { skill: 'doubleShot', level: 1 },
      { skill: 'arrowRain', level: 3 },
    ],
    color: '#6fbf73',
  },
  mystic: {
    id: 'mystic',
    name: 'Mystic',
    row: 'back',
    ranged: false,
    base: { hp: 52, tp: 46, atk: 8, def: 7, mag: 14, res: 13, spd: 10 },
    growth: { hp: 6.5, tp: 4, atk: 0.8, def: 0.9, mag: 1.7, res: 1.6, spd: 1.0 },
    skills: [
      { skill: 'heal', level: 1 },
      { skill: 'healCircle', level: 3 },
    ],
    color: '#8fd3e8',
  },
  arcanist: {
    id: 'arcanist',
    name: 'Arcanist',
    row: 'back',
    ranged: false,
    base: { hp: 46, tp: 52, atk: 6, def: 6, mag: 17, res: 11, spd: 11 },
    growth: { hp: 5.5, tp: 4.5, atk: 0.6, def: 0.8, mag: 2.1, res: 1.3, spd: 1.1 },
    skills: [
      { skill: 'fire', level: 1 },
      { skill: 'ice', level: 1 },
      { skill: 'volt', level: 1 },
      { skill: 'flameWave', level: 4 },
    ],
    color: '#c58af0',
  },
};
