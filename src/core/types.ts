export type Dir = 0 | 1 | 2 | 3; // N, E, S, W

export type Element = 'phys' | 'fire' | 'frost' | 'storm';

export type Row = 'front' | 'back';

/** Lasting combat conditions. Gone when the fight ends. */
export type Ailment = 'poison' | 'sleep' | 'paralysis';

export interface Inflict {
  ailment: Ailment;
  chance: number;
}

export interface Stats {
  hp: number;
  sp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  spd: number;
}

export type ClassId = 'bastion' | 'strider' | 'mender' | 'runecaller' | 'skald' | 'berserker' | 'seeress' | 'wolfkin' | 'ravenspeaker' | 'hornbearer' | 'fylgja';

/** Stats that skills can raise or lower for a few turns in a fight. */
export type ModStat = 'atk' | 'def' | 'mag' | 'res';

export type ItemId = 'sapTonic' | 'tideDraught' | 'spiritDew' | 'clearwater' | 'kindlingMoss' | 'homingFeather' | 'oathToken';

export type SkillId =
  | 'emberArrow'
  | 'rimeFang'
  | 'thunderVerse'
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
  | 'wildfire'
  | 'rekindle'
  | 'cleanse'
  | 'venomArrow'
  | 'slumberRune'
  | 'rampartCrash'
  | 'galePiercer'
  | 'wellspring'
  | 'thunderhead'
  | 'stoutHeart'
  | 'ironSkin'
  | 'keenEye'
  | 'fleetFoot'
  | 'gentleHands'
  | 'runeLore'
  | 'deepWell'
  | 'forage'
  | 'mine'
  | 'fell'
  | 'fish'
  | 'warSong'
  | 'shieldHymn'
  | 'mockingVerse'
  | 'runicChant'
  | 'restfulTune'
  | 'heroesSaga'
  | 'cleave'
  | 'bloodPrice'
  | 'frenzy'
  | 'skullSplitter'
  | 'reavingSpin'
  | 'curseOfFrailty'
  | 'curseOfWeakness'
  | 'hollowBolt'
  | 'witherblight'
  | 'stillingGaze'
  | 'fateUnravel'
  | 'fangStrike'
  | 'packHunt'
  | 'wolfGuard'
  | 'packHowl'
  | 'hamstring'
  | 'moonfangFrenzy'
  | 'ravenStrike'
  | 'eyePeck'
  | 'stormWing'
  | 'illOmen'
  | 'huginnsWatch'
  | 'muninnsReturn'
  | 'murderOfRavens'
  | 'ravenstorm'
  | 'hornBlast'
  | 'rallyCall'
  | 'echoingBlow'
  | 'warHorn'
  | 'secondWind'
  | 'callOfGjallar'
  | 'maul'
  | 'warding'
  | 'thickHide'
  | 'lickWounds'
  | 'rendingClaws'
  | 'feralRoar'
  | 'spiritWard'
  | 'wildRush'
  | 'spiritUnbound';

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
  /** Which oath this was in its save (1, 2, …): tells apart two adventurers who share a name over time. */
  oath?: number;
  /** Ranks bought with skill points (1–10). Saves from before skill points get a recommended build. */
  skills?: Partial<Record<SkillId, number>>;
  /** How they look: 0–3 a man, 4–7 a woman (a pixel figure per class). Older saves pick one by name. */
  look?: number;
  /** Out on a Raven Run (its id): not in the party, not on expeditions, until the run is collected. */
  ravenRun?: number;
  /** Hurt on a Raven Run: rests until this time (ms), unless the Inn's healer sees to it. */
  woundedUntil?: number;
}

export type Loot = { gold: number } | { item: ItemId; qty: number };
