import type { Element, SkillId } from '../types';

export type SkillTarget = 'enemy' | 'allEnemies' | 'ally' | 'allAllies' | 'self';

export interface SkillDef {
  id: SkillId;
  name: string;
  sp: number;
  target: SkillTarget;
  kind: 'phys' | 'magic' | 'heal' | 'challenge' | 'guard';
  element: Element;
  /** Percent of a normal attack (damage) or of the heal formula. */
  power: number;
  hits: number;
  /** Usable outside combat from the pack menu. */
  field: boolean;
  description: string;
}

function skill(def: Omit<SkillDef, 'element' | 'hits' | 'field'> & Partial<SkillDef>): SkillDef {
  return { element: 'phys', hits: 1, field: false, ...def };
}

export const SKILLS: Record<SkillId, SkillDef> = {
  challenge: skill({
    id: 'challenge',
    name: 'Challenge',
    sp: 3,
    target: 'self',
    kind: 'challenge',
    power: 0,
    description: 'Bang your shield and dare the enemy to strike you for 2 turns.',
  }),
  bulwarkBash: skill({
    id: 'bulwarkBash',
    name: 'Bulwark Bash',
    sp: 4,
    target: 'enemy',
    kind: 'phys',
    power: 160,
    description: 'Drive the full weight of your shield into one enemy.',
  }),
  ironFormation: skill({
    id: 'ironFormation',
    name: 'Iron Formation',
    sp: 6,
    target: 'allAllies',
    kind: 'guard',
    power: 0,
    description: 'Rally the party into a tight formation: 30% less damage for 3 turns.',
  }),
  twinFang: skill({
    id: 'twinFang',
    name: 'Twin Fang',
    sp: 4,
    target: 'enemy',
    kind: 'phys',
    power: 85,
    hits: 2,
    description: 'Loose two arrows at once at a single enemy.',
  }),
  scatterVolley: skill({
    id: 'scatterVolley',
    name: 'Scatter Volley',
    sp: 8,
    target: 'allEnemies',
    kind: 'phys',
    power: 80,
    description: 'A wide spray of arrows that strikes every enemy.',
  }),
  mend: skill({
    id: 'mend',
    name: 'Mend',
    sp: 3,
    target: 'ally',
    kind: 'heal',
    power: 100,
    field: true,
    description: 'Knit the wounds of one ally.',
  }),
  verdantChorus: skill({
    id: 'verdantChorus',
    name: 'Verdant Chorus',
    sp: 9,
    target: 'allAllies',
    kind: 'heal',
    power: 70,
    field: true,
    description: 'A soothing hymn that restores HP to the whole party.',
  }),
  emberRune: skill({
    id: 'emberRune',
    name: 'Ember Rune',
    sp: 4,
    target: 'enemy',
    kind: 'magic',
    element: 'fire',
    power: 150,
    description: 'Fire damage to one enemy.',
  }),
  frostRune: skill({
    id: 'frostRune',
    name: 'Frost Rune',
    sp: 4,
    target: 'enemy',
    kind: 'magic',
    element: 'frost',
    power: 150,
    description: 'Frost damage to one enemy.',
  }),
  stormRune: skill({
    id: 'stormRune',
    name: 'Storm Rune',
    sp: 4,
    target: 'enemy',
    kind: 'magic',
    element: 'storm',
    power: 150,
    description: 'Storm damage to one enemy.',
  }),
  wildfire: skill({
    id: 'wildfire',
    name: 'Wildfire',
    sp: 10,
    target: 'allEnemies',
    kind: 'magic',
    element: 'fire',
    power: 110,
    description: 'Fire damage to every enemy.',
  }),
};
