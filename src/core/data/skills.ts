import type { Element, SkillId } from '../types';

export type SkillTarget = 'enemy' | 'allEnemies' | 'ally' | 'allAllies' | 'self';

export interface SkillDef {
  id: SkillId;
  name: string;
  tp: number;
  target: SkillTarget;
  kind: 'phys' | 'magic' | 'heal' | 'provoke' | 'guard';
  element: Element;
  /** Percent of a normal attack (damage) or of the heal formula. */
  power: number;
  hits: number;
  /** Usable outside combat from the camp menu. */
  field: boolean;
  description: string;
}

function skill(def: Omit<SkillDef, 'element' | 'hits' | 'field'> & Partial<SkillDef>): SkillDef {
  return { element: 'phys', hits: 1, field: false, ...def };
}

export const SKILLS: Record<SkillId, SkillDef> = {
  provoke: skill({
    id: 'provoke',
    name: 'Provoke',
    tp: 3,
    target: 'self',
    kind: 'provoke',
    power: 0,
    description: 'Draws enemy attacks to yourself for 2 turns.',
  }),
  shieldSmite: skill({
    id: 'shieldSmite',
    name: 'Shield Smite',
    tp: 4,
    target: 'enemy',
    kind: 'phys',
    power: 160,
    description: 'A heavy blow with the shield.',
  }),
  shieldWall: skill({
    id: 'shieldWall',
    name: 'Shield Wall',
    tp: 6,
    target: 'allAllies',
    kind: 'guard',
    power: 0,
    description: 'The whole party takes 30% less damage for 3 turns.',
  }),
  doubleShot: skill({
    id: 'doubleShot',
    name: 'Double Shot',
    tp: 4,
    target: 'enemy',
    kind: 'phys',
    power: 85,
    hits: 2,
    description: 'Fires two arrows at one enemy.',
  }),
  arrowRain: skill({
    id: 'arrowRain',
    name: 'Arrow Rain',
    tp: 8,
    target: 'allEnemies',
    kind: 'phys',
    power: 80,
    description: 'Rains arrows on every enemy.',
  }),
  heal: skill({
    id: 'heal',
    name: 'Heal',
    tp: 3,
    target: 'ally',
    kind: 'heal',
    power: 100,
    field: true,
    description: 'Restores HP to one ally.',
  }),
  healCircle: skill({
    id: 'healCircle',
    name: 'Heal Circle',
    tp: 9,
    target: 'allAllies',
    kind: 'heal',
    power: 70,
    field: true,
    description: 'Restores HP to the whole party.',
  }),
  fire: skill({
    id: 'fire',
    name: 'Fire',
    tp: 4,
    target: 'enemy',
    kind: 'magic',
    element: 'fire',
    power: 150,
    description: 'Fire damage to one enemy.',
  }),
  ice: skill({
    id: 'ice',
    name: 'Ice',
    tp: 4,
    target: 'enemy',
    kind: 'magic',
    element: 'ice',
    power: 150,
    description: 'Ice damage to one enemy.',
  }),
  volt: skill({
    id: 'volt',
    name: 'Volt',
    tp: 4,
    target: 'enemy',
    kind: 'magic',
    element: 'volt',
    power: 150,
    description: 'Volt damage to one enemy.',
  }),
  flameWave: skill({
    id: 'flameWave',
    name: 'Flame Wave',
    tp: 10,
    target: 'allEnemies',
    kind: 'magic',
    element: 'fire',
    power: 110,
    description: 'Fire damage to every enemy.',
  }),
};
