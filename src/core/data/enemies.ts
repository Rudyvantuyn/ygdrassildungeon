import type { Element, ItemId } from '../types';

export type MonsterShape = 'slime' | 'bat' | 'beast' | 'shroom' | 'beetle' | 'moth' | 'golem' | 'treant' | 'wyrm';

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
  // ── Depth 4: Rimehollow ─────────────────────────────────────────────────
  {
    id: 'hrimwolf',
    name: 'Hrimwolf',
    hp: 110, atk: 32, def: 14, mag: 6, res: 10, spd: 20,
    xp: 45, gold: 22,
    weak: ['fire'], resist: ['frost'],
    skills: [{ name: 'Frostfang', chance: 0.3, kind: 'phys', element: 'frost', power: 150, target: 'one' }],
    art: { shape: 'beast', color: '#8aa0b8', accent: '#d8f4ff', size: 1.0 },
  },
  {
    id: 'frostcap',
    name: 'Frostcap',
    hp: 95, atk: 20, def: 14, mag: 34, res: 18, spd: 9,
    xp: 40, gold: 20,
    weak: ['fire'], resist: ['frost'],
    ranged: true,
    skills: [{ name: 'Rime Spores', chance: 0.4, kind: 'magic', element: 'frost', power: 75, target: 'all' }],
    drop: { item: 'spiritDew', chance: 0.15 },
    art: { shape: 'shroom', color: '#5a8ab8', accent: '#e8f8ff', size: 0.9 },
  },
  {
    id: 'rimeshell',
    name: 'Rimeshell',
    hp: 130, atk: 30, def: 32, mag: 5, res: 12, spd: 9,
    xp: 48, gold: 28,
    weak: ['fire', 'storm'], resist: ['phys', 'frost'],
    art: { shape: 'beetle', color: '#6a8aa0', accent: '#c8f0ff', size: 0.95 },
  },
  {
    id: 'snowveil',
    name: 'Snowveil Moth',
    hp: 105, atk: 24, def: 14, mag: 38, res: 22, spd: 24,
    xp: 50, gold: 26,
    weak: ['fire'], resist: ['frost'],
    ranged: true,
    skills: [{ name: 'Whiteout', chance: 0.35, kind: 'magic', element: 'frost', power: 80, target: 'all' }],
    art: { shape: 'moth', color: '#c8d8e8', accent: '#7ab8ff', size: 1.0 },
  },
  // ── Depth 5: Wyrmroot ───────────────────────────────────────────────────
  {
    id: 'cinderwing',
    name: 'Cinderwing',
    hp: 120, atk: 38, def: 16, mag: 10, res: 14, spd: 30,
    xp: 70, gold: 30,
    weak: ['frost'], resist: ['fire'],
    ranged: true,
    skills: [{ name: 'Ember Dive', chance: 0.3, kind: 'phys', element: 'fire', power: 160, target: 'one' }],
    art: { shape: 'bat', color: '#5a2a1a', accent: '#ffb04a', size: 0.85 },
  },
  {
    id: 'emberling',
    name: 'Emberling',
    hp: 160, atk: 34, def: 22, mag: 40, res: 20, spd: 12,
    xp: 75, gold: 34,
    weak: ['frost'], resist: ['fire'],
    skills: [{ name: 'Flare', chance: 0.35, kind: 'magic', element: 'fire', power: 85, target: 'all' }],
    drop: { item: 'sapTonic', chance: 0.2 },
    art: { shape: 'slime', color: '#c0502a', accent: '#ffd070', size: 0.9 },
  },
  {
    id: 'rootfiend',
    name: 'Rootfiend',
    hp: 190, atk: 46, def: 24, mag: 8, res: 14, spd: 22,
    xp: 85, gold: 40,
    weak: ['fire'], resist: [],
    skills: [{ name: 'Rending Roots', chance: 0.25, kind: 'phys', element: 'phys', power: 80, target: 'all' }],
    art: { shape: 'beast', color: '#4a3020', accent: '#ff7a3a', size: 1.05 },
  },
  {
    id: 'ashenColossus',
    name: 'Ashen Colossus',
    hp: 260, atk: 50, def: 36, mag: 10, res: 18, spd: 8,
    xp: 100, gold: 55,
    weak: ['frost'], resist: ['phys', 'fire'],
    skills: [{ name: 'Ashfall', chance: 0.25, kind: 'magic', element: 'fire', power: 90, target: 'all' }],
    drop: { item: 'spiritDew', chance: 0.2 },
    art: { shape: 'golem', color: '#5a4a44', accent: '#ff8a4a', size: 1.1 },
  },
  // ── Prowlers: strong monsters that roam the map (floor 5 and deeper) ───────
  // Tuned so a geared party needs about level 10 to win, and only sometimes.
  // The balance test checks this; keep it in sync when stats change.
  {
    id: 'grimtusk',
    name: 'Grimtusk',
    hp: 3900, atk: 88, def: 42, mag: 10, res: 28, spd: 22,
    xp: 520, gold: 300,
    weak: ['fire'], resist: [],
    skills: [{ name: 'Gore', chance: 0.35, kind: 'phys', element: 'phys', power: 175, target: 'one' }],
    drop: { item: 'sapTonic', chance: 0.6 },
    art: { shape: 'beast', color: '#6a3a2a', accent: '#ff6a3a', size: 1.2 },
  },
  {
    id: 'fenwraith',
    name: 'Fenwraith',
    hp: 2450, atk: 48, def: 30, mag: 59, res: 42, spd: 26,
    xp: 580, gold: 340,
    weak: ['frost'], resist: ['storm'],
    ranged: true,
    skills: [{ name: 'Wailing Gust', chance: 0.35, kind: 'magic', element: 'storm', power: 85, target: 'all' }],
    drop: { item: 'spiritDew', chance: 0.5 },
    art: { shape: 'moth', color: '#3a5a5a', accent: '#a0fff0', size: 1.15 },
  },
  {
    id: 'rootDraugr',
    name: 'Root Draugr',
    hp: 3900, atk: 90, def: 50, mag: 36, res: 30, spd: 16,
    xp: 650, gold: 380,
    weak: ['fire'], resist: ['frost'],
    skills: [
      { name: 'Grave Grip', chance: 0.3, kind: 'phys', element: 'phys', power: 185, target: 'one' },
      { name: 'Barrow Chill', chance: 0.2, kind: 'magic', element: 'frost', power: 80, target: 'all' },
    ],
    drop: { item: 'sapTonic', chance: 0.8 },
    art: { shape: 'golem', color: '#3e4a3a', accent: '#d0f0ff', size: 1.2 },
  },
  // ── Boss ───────────────────────────────────────────────────────────────────
  {
    id: 'blightedElder',
    name: 'The Blighted Elder',
    hp: 1250, atk: 42, def: 18, mag: 38, res: 16, spd: 12,
    xp: 300, gold: 250,
    weak: ['fire'], resist: ['frost'],
    skills: [
      { name: 'Root Lash', chance: 0.3, kind: 'phys', element: 'phys', power: 85, target: 'all' },
      { name: 'Rot Breath', chance: 0.2, kind: 'magic', element: 'frost', power: 90, target: 'all' },
      { name: 'Trunk Slam', chance: 0.2, kind: 'phys', element: 'phys', power: 190, target: 'one' },
    ],
    art: { shape: 'treant', color: '#5a4636', accent: '#c4ff6a', size: 1.6 },
  },
  {
    id: 'rootgnawer',
    name: 'The Rootgnawer',
    hp: 2500, atk: 62, def: 30, mag: 58, res: 28, spd: 19,
    xp: 1500, gold: 1200,
    weak: ['frost'], resist: ['fire'],
    skills: [
      { name: 'Gnashing Coil', chance: 0.3, kind: 'phys', element: 'phys', power: 90, target: 'all' },
      { name: 'Bile Torrent', chance: 0.2, kind: 'magic', element: 'fire', power: 95, target: 'all' },
      { name: 'Devour', chance: 0.2, kind: 'phys', element: 'phys', power: 200, target: 'one' },
    ],
    art: { shape: 'wyrm', color: '#3a2a30', accent: '#ff5a2a', size: 1.6 },
  },
];

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(list.map((e) => [e.id, e]));
