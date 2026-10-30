/**
 * How hard the Rootdeep hits. Chosen per save; expeditions always use the standard rules.
 * The standard ('normal') is the grindy game the balance tests are tuned for.
 */
export type Difficulty = 'gentle' | 'normal' | 'harsh';

export interface DifficultyDef {
  name: string;
  description: string;
  /** Multipliers for enemy HP, damage taken by the party, and XP/gold won. */
  enemyHp: number;
  enemyDamage: number;
  rewards: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  gentle: {
    name: 'Gentle',
    description: 'Weaker foes and a quarter more XP and gold. For those who come for the story.',
    enemyHp: 0.8,
    enemyDamage: 0.75,
    rewards: 1.25,
  },
  normal: {
    name: 'Standard',
    description: 'The Rootdeep as it is meant to be: slow, hard, and fair.',
    enemyHp: 1,
    enemyDamage: 1,
    rewards: 1,
  },
  harsh: {
    name: 'Harsh',
    description: 'Tougher foes that hit a fifth harder. A little more XP and gold, but no mercy.',
    enemyHp: 1.2,
    enemyDamage: 1.2,
    rewards: 1.1,
  },
};

export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[];
