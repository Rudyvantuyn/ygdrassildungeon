export type Dir = 0 | 1 | 2 | 3; // N, E, S, W

export type Element = 'phys' | 'fire' | 'ice' | 'volt';

export type Row = 'front' | 'back';

export interface Stats {
  hp: number;
  tp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  spd: number;
}

export type ClassId = 'guardian' | 'ranger' | 'mystic' | 'arcanist';

export type ItemId = 'medica' | 'amrita';

export type SkillId =
  | 'provoke'
  | 'shieldSmite'
  | 'shieldWall'
  | 'doubleShot'
  | 'arrowRain'
  | 'heal'
  | 'healCircle'
  | 'fire'
  | 'ice'
  | 'volt'
  | 'flameWave';

export interface Member {
  name: string;
  classId: ClassId;
  row: Row;
  level: number;
  xp: number;
  hp: number;
  tp: number;
}

export type Loot = { gold: number } | { item: ItemId; qty: number };
