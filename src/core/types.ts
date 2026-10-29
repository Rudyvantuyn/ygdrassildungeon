export type Dir = 0 | 1 | 2 | 3; // N, E, S, W

export type Element = 'phys' | 'fire' | 'frost' | 'storm';

export type Row = 'front' | 'back';

export interface Stats {
  hp: number;
  sp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  spd: number;
}

export type ClassId = 'bastion' | 'strider' | 'mender' | 'runecaller';

export type ItemId = 'sapTonic' | 'spiritDew' | 'homingFeather';

export type SkillId =
  | 'challenge'
  | 'bulwarkBash'
  | 'ironFormation'
  | 'twinFang'
  | 'scatterVolley'
  | 'mend'
  | 'verdantChorus'
  | 'emberRune'
  | 'frostRune'
  | 'stormRune'
  | 'wildfire';

export interface Member {
  name: string;
  classId: ClassId;
  row: Row;
  level: number;
  xp: number;
  hp: number;
  sp: number;
  weapon?: string;
  armor?: string;
}

export type Loot = { gold: number } | { item: ItemId; qty: number };
