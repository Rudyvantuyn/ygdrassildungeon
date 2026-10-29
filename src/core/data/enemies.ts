import type { Element, ItemId } from '../types';

export type MonsterShape = 'slime' | 'bat' | 'beast' | 'shroom' | 'beetle' | 'moth' | 'golem' | 'treant';

export interface EnemySkill {
  name: string;
  chance: number;
  kind: 'phys' | 'magic';
  element: Element;
  power: number;
  target: 'one' | 'all';
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  spd: number;
  xp: number;
  gold: number;
  weak: Element[];
  resist: Element[];
  /** Ranged enemies hit the back row at full strength. */
  ranged?: boolean;
  skills?: EnemySkill[];
  drop?: { item: ItemId; chance: number };
  art: { shape: MonsterShape; color: string; accent: string; size: number };
}

const list: EnemyDef[] = [
  // ── Depth 1: Mossy Hollow ────────────────────────────────────────────────
  {
    id: 'bogling',
    name: 'Bogling',
    hp: 30, atk: 10, def: 4, mag: 4, res: 3, spd: 5,
    xp: 7, gold: 4,
    weak: ['fire'], resist: [],
    drop: { item: 'sapTonic', chance: 0.12 },
    art: { shape: 'slime', color: '#5e9e4a', accent: '#c7f08a', size: 0.8 },
  },
  {
    id: 'duskwing',
    name: 'Duskwing',
    hp: 24, atk: 11, def: 3, mag: 3, res: 4, spd: 14,
    xp: 8, gold: 5,
    weak: ['storm'], resist: [],
    ranged: true,
    art: { shape: 'bat', color: '#5b4a7a', accent: '#f2c14e', size: 0.8 },
  },
  {
    id: 'briarGnawer',
    name: 'Briar Gnawer',
    hp: 36, atk: 13, def: 5, mag: 2, res: 3, spd: 10,
    xp: 10, gold: 6,
    weak: ['frost'], resist: [],
    skills: [{ name: 'Gnash', chance: 0.25, kind: 'phys', element: 'phys', power: 150, target: 'one' }],
    art: { shape: 'beast', color: '#8a6a4a', accent: '#e05a4a', size: 0.85 },
  },
  // ── Depth 2: Rootway ─────────────────────────────────────────────────────
  {
    id: 'hollowHound',
    name: 'Hollow Hound',
    hp: 62, atk: 21, def: 8, mag: 4, res: 5, spd: 15,
    xp: 18, gold: 10,
    weak: ['fire'], resist: [],
    skills: [{ name: 'Rend', chance: 0.3, kind: 'phys', element: 'phys', power: 160, target: 'one' }],
    art: { shape: 'beast', color: '#4b5a6e', accent: '#f2e14e', size: 1.0 },
  },
  {
    id: 'puffcap',
    name: 'Puffcap',
    hp: 50, atk: 12, def: 7, mag: 15, res: 9, spd: 6,
    xp: 16, gold: 9,
    weak: ['fire'], resist: ['frost'],
    ranged: true,
    skills: [{ name: 'Spore Burst', chance: 0.4, kind: 'magic', element: 'phys', power: 70, target: 'all' }],
    drop: { item: 'spiritDew', chance: 0.12 },
    art: { shape: 'shroom', color: '#b8473f', accent: '#f6e7c8', size: 0.9 },
  },
  {
    id: 'shellbark',
    name: 'Shellbark',
    hp: 58, atk: 16, def: 18, mag: 3, res: 6, spd: 7,
    xp: 17, gold: 12,
    weak: ['fire', 'storm'], resist: ['phys'],
    art: { shape: 'beetle', color: '#3f5a3a', accent: '#a7d36b', size: 0.95 },
  },
  // ── Depth 3: Heartwood ───────────────────────────────────────────────────
  {
    id: 'gloamMoth',
    name: 'Gloam Moth',
    hp: 70, atk: 18, def: 9, mag: 25, res: 14, spd: 19,
    xp: 28, gold: 14,
    weak: ['frost'], resist: ['storm'],
    ranged: true,
    skills: [{ name: 'Gloam Dust', chance: 0.35, kind: 'magic', element: 'storm', power: 75, target: 'all' }],
    art: { shape: 'moth', color: '#6a4e8a', accent: '#f0d070', size: 1.0 },
  },
  {
    id: 'rootColossus',
    name: 'Root Colossus',
    hp: 120, atk: 28, def: 20, mag: 5, res: 8, spd: 5,
    xp: 34, gold: 20,
    weak: ['fire'], resist: ['phys'],
    skills: [{ name: 'Stonefist', chance: 0.3, kind: 'phys', element: 'phys', power: 170, target: 'one' }],
    drop: { item: 'sapTonic', chance: 0.25 },
    art: { shape: 'golem', color: '#6e5a44', accent: '#7fe0c0', size: 1.1 },
  },
  // ── Boss ───────────────────────────────────────────────────────────────────
  {
    id: 'blightedElder',
    name: 'The Blighted Elder',
    hp: 1050, atk: 38, def: 17, mag: 34, res: 15, spd: 12,
    xp: 300, gold: 250,
    weak: ['fire'], resist: ['frost'],
    skills: [
      { name: 'Root Lash', chance: 0.3, kind: 'phys', element: 'phys', power: 85, target: 'all' },
      { name: 'Rot Breath', chance: 0.2, kind: 'magic', element: 'frost', power: 90, target: 'all' },
      { name: 'Trunk Slam', chance: 0.2, kind: 'phys', element: 'phys', power: 190, target: 'one' },
    ],
    art: { shape: 'treant', color: '#5a4636', accent: '#c4ff6a', size: 1.6 },
  },
];

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(list.map((e) => [e.id, e]));
