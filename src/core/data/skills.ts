import type { Element, Inflict, ModStat, SkillId, Stats } from '../types';
import type { GatherKind } from './gathering';

export type SkillTarget = 'enemy' | 'allEnemies' | 'ally' | 'allAllies' | 'self';

export interface SkillDef {
  id: SkillId;
  name: string;
  sp: number;
  target: SkillTarget;
  kind: 'phys' | 'magic' | 'heal' | 'revive' | 'cure' | 'ailment' | 'challenge' | 'guard' | 'passive' | 'gather' | 'buff' | 'debuff';
  element: Element;
  /** Percent of a normal attack (damage) or of the heal formula. */
  power: number;
  hits: number;
  /** Usable outside combat from the pack menu. */
  field: boolean;
  /** Chance to inflict an ailment on each enemy hit (or, for kind 'ailment', on each target). */
  inflict?: Inflict;
  /** Challenge and guard: how many turns the effect lasts. */
  turns?: number;
  /** Passive skills: a stat raised by this many percent per rank. */
  passive?: { stat: keyof Stats; perRank: number };
  /** Buffs and debuffs: stats raised (or lowered, if negative) by this many percent for `turns` rounds. */
  mods?: { stat: ModStat; amount: number }[];
  /** Paid in HP, as a percent of max HP, on top of the SP cost. */
  hpCost?: number;
  /** Gathering skills: what kind of spot they work on. */
  gather?: GatherKind;
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
    turns: 2,
    description: 'Bang your shield and dare the enemy to strike you.',
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
    turns: 3,
    description: 'Rally the party into a tight formation: 30% less damage for a few turns.',
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
  rekindle: skill({
    id: 'rekindle',
    name: 'Rekindle',
    sp: 10,
    target: 'ally',
    kind: 'revive',
    power: 30,
    field: true,
    description: 'Call a fallen ally back to their feet with 30% HP.',
  }),
  cleanse: skill({
    id: 'cleanse',
    name: 'Cleanse',
    sp: 3,
    target: 'ally',
    kind: 'cure',
    power: 0,
    description: 'Wash away poison, sleep and paralysis from one ally.',
  }),
  venomArrow: skill({
    id: 'venomArrow',
    name: 'Venom Arrow',
    sp: 5,
    target: 'enemy',
    kind: 'phys',
    power: 90,
    inflict: { ailment: 'poison', chance: 0.65 },
    description: 'A barbed arrow dipped in nightshade. Often poisons the target.',
  }),
  slumberRune: skill({
    id: 'slumberRune',
    name: 'Slumber Rune',
    sp: 8,
    target: 'allEnemies',
    kind: 'ailment',
    power: 0,
    inflict: { ailment: 'sleep', chance: 0.5 },
    description: 'A drowsy rune that may put every enemy to sleep. Hits wake them.',
  }),
  rampartCrash: skill({
    id: 'rampartCrash',
    name: 'Rampart Crash',
    sp: 10,
    target: 'allEnemies',
    kind: 'phys',
    power: 105,
    description: 'Charge behind your shield and bowl through the whole enemy line.',
  }),
  galePiercer: skill({
    id: 'galePiercer',
    name: 'Gale Piercer',
    sp: 9,
    target: 'enemy',
    kind: 'phys',
    element: 'storm',
    power: 230,
    description: 'An arrow riding a crack of lightning. Strikes one enemy with storm.',
  }),
  wellspring: skill({
    id: 'wellspring',
    name: 'Wellspring',
    sp: 16,
    target: 'allAllies',
    kind: 'heal',
    power: 125,
    description: 'Call up a spring of clear water that heals the whole party deeply.',
  }),
  thunderhead: skill({
    id: 'thunderhead',
    name: 'Thunderhead',
    sp: 16,
    target: 'allEnemies',
    kind: 'magic',
    element: 'storm',
    power: 135,
    description: 'Carve a rune of rolling thunder. Strikes every enemy with storm.',
  }),
  stoutHeart: skill({
    id: 'stoutHeart',
    name: 'Stout Heart',
    sp: 0,
    target: 'self',
    kind: 'passive',
    power: 0,
    passive: { stat: 'hp', perRank: 4 },
    description: 'A tough frame and a stubborn will. Raises max HP.',
  }),
  ironSkin: skill({
    id: 'ironSkin',
    name: 'Iron Skin',
    sp: 0,
    target: 'self',
    kind: 'passive',
    power: 0,
    passive: { stat: 'def', perRank: 3 },
    description: 'Years behind the shield harden the body. Raises defence.',
  }),
  keenEye: skill({
    id: 'keenEye',
    name: 'Keen Eye',
    sp: 0,
    target: 'self',
    kind: 'passive',
    power: 0,
    passive: { stat: 'atk', perRank: 3 },
    description: 'Spot the gap in any armour. Raises attack.',
  }),
  fleetFoot: skill({
    id: 'fleetFoot',
    name: 'Fleet Foot',
    sp: 0,
    target: 'self',
    kind: 'passive',
    power: 0,
    passive: { stat: 'spd', perRank: 4 },
    description: 'Light on your feet, first to act. Raises speed.',
  }),
  gentleHands: skill({
    id: 'gentleHands',
    name: 'Gentle Hands',
    sp: 0,
    target: 'self',
    kind: 'passive',
    power: 0,
    passive: { stat: 'mag', perRank: 3 },
    description: 'Steady hands for mending. Raises magic, and so all healing.',
  }),
  runeLore: skill({
    id: 'runeLore',
    name: 'Rune Lore',
    sp: 0,
    target: 'self',
    kind: 'passive',
    power: 0,
    passive: { stat: 'mag', perRank: 3 },
    description: 'Older, deeper runes. Raises magic.',
  }),
  deepWell: skill({
    id: 'deepWell',
    name: 'Deep Well',
    sp: 0,
    target: 'self',
    kind: 'passive',
    power: 0,
    passive: { stat: 'sp', perRank: 5 },
    description: 'A calm mind holds more power. Raises max SP.',
  }),
  forage: skill({
    id: 'forage',
    name: 'Forage',
    sp: 0,
    target: 'self',
    kind: 'gather',
    power: 0,
    gather: 'forage',
    description: 'Gather plants, herbs and seaweed at green spots. Higher ranks find more, and rarer things.',
  }),
  mine: skill({
    id: 'mine',
    name: 'Mine',
    sp: 0,
    target: 'self',
    kind: 'gather',
    power: 0,
    gather: 'mine',
    description: 'Dig ore and crystals from glittering veins. Higher ranks find more, and rarer things.',
  }),
  fell: skill({
    id: 'fell',
    name: 'Fell',
    sp: 0,
    target: 'self',
    kind: 'gather',
    power: 0,
    gather: 'fell',
    description: 'Cut good wood from fallen roots and sunken trees. Higher ranks find more, and rarer things.',
  }),
  fish: skill({
    id: 'fish',
    name: 'Fish',
    sp: 0,
    target: 'self',
    kind: 'gather',
    power: 0,
    gather: 'fish',
    description: 'Catch fish in pools and tidewater. Higher ranks find more, and rarer things.',
  }),

  // ── Skald ──────────────────────────────────────────────────────────────────
  warSong: skill({
    id: 'warSong', name: 'War Song', sp: 6, target: 'allAllies', kind: 'buff', power: 0, turns: 3,
    mods: [{ stat: 'atk', amount: 22 }],
    description: 'A rousing battle song. Raises the attack of the whole party.',
  }),
  shieldHymn: skill({
    id: 'shieldHymn', name: 'Shieldhymn', sp: 6, target: 'allAllies', kind: 'buff', power: 0, turns: 3,
    mods: [{ stat: 'def', amount: 20 }],
    description: 'A slow, steady hymn. Raises the defence of the whole party.',
  }),
  mockingVerse: skill({
    id: 'mockingVerse', name: 'Mocking Verse', sp: 7, target: 'allEnemies', kind: 'debuff', power: 0, turns: 3,
    mods: [{ stat: 'atk', amount: -12 }],
    description: 'A cutting verse that saps the foes\' fighting spirit. Lowers enemy attack.',
  }),
  runicChant: skill({
    id: 'runicChant', name: 'Runic Chant', sp: 6, target: 'allAllies', kind: 'buff', power: 0, turns: 3,
    mods: [{ stat: 'mag', amount: 22 }, { stat: 'res', amount: 15 }],
    description: 'Chanted runes hum in the air. Raises magic and resistance of the whole party.',
  }),
  restfulTune: skill({
    id: 'restfulTune', name: 'Restful Tune', sp: 8, target: 'allAllies', kind: 'heal', power: 45,
    field: true,
    description: 'A soft tune that eases every wound a little.',
  }),
  heroesSaga: skill({
    id: 'heroesSaga', name: "Heroes' Saga", sp: 16, target: 'allAllies', kind: 'buff', power: 0, turns: 4,
    mods: [{ stat: 'atk', amount: 20 }, { stat: 'def', amount: 20 }],
    description: 'The old saga of the first explorers. Raises attack and defence of the whole party.',
  }),
  // ── Berserker ──────────────────────────────────────────────────────────────
  cleave: skill({
    id: 'cleave', name: 'Cleave', sp: 6, target: 'allEnemies', kind: 'phys', power: 75,
    description: 'One wide swing through every enemy.',
  }),
  bloodPrice: skill({
    id: 'bloodPrice', name: 'Blood Price', sp: 3, target: 'enemy', kind: 'phys', power: 260, hpCost: 12,
    description: 'Pay in blood for a crushing blow. Costs some of your own HP.',
  }),
  frenzy: skill({
    id: 'frenzy', name: 'Frenzy', sp: 5, target: 'self', kind: 'buff', power: 0, turns: 3,
    mods: [{ stat: 'atk', amount: 35 }, { stat: 'def', amount: -20 }],
    description: 'Give in to the battle-rage: much more attack, less defence.',
  }),
  skullSplitter: skill({
    id: 'skullSplitter', name: 'Skull Splitter', sp: 9, target: 'enemy', kind: 'phys', power: 180,
    inflict: { ailment: 'paralysis', chance: 0.25 },
    description: 'A blow to the head. May leave the enemy stunned and paralysed.',
  }),
  reavingSpin: skill({
    id: 'reavingSpin', name: 'Reaving Spin', sp: 16, target: 'allEnemies', kind: 'phys', power: 140,
    description: 'Spin with the axe held out. A storm of steel that hits every enemy.',
  }),
  // ── Seeress ────────────────────────────────────────────────────────────────
  curseOfFrailty: skill({
    id: 'curseOfFrailty', name: 'Curse of Frailty', sp: 5, target: 'enemy', kind: 'debuff', power: 0, turns: 3,
    mods: [{ stat: 'def', amount: -28 }],
    description: 'Bones turn brittle. Lowers one enemy\'s defence.',
  }),
  curseOfWeakness: skill({
    id: 'curseOfWeakness', name: 'Curse of Weakness', sp: 5, target: 'enemy', kind: 'debuff', power: 0, turns: 3,
    mods: [{ stat: 'atk', amount: -22 }, { stat: 'mag', amount: -22 }],
    description: 'Strength drains away. Lowers one enemy\'s attack and magic.',
  }),
  hollowBolt: skill({
    id: 'hollowBolt', name: 'Hollow Bolt', sp: 5, target: 'enemy', kind: 'magic', element: 'frost', power: 155,
    description: 'A bolt of cold from the other side. Frost damage to one enemy.',
  }),
  witherblight: skill({
    id: 'witherblight', name: 'Witherblight', sp: 8, target: 'allEnemies', kind: 'ailment', power: 0,
    inflict: { ailment: 'poison', chance: 0.45 },
    description: 'A creeping rot. May poison every enemy.',
  }),
  stillingGaze: skill({
    id: 'stillingGaze', name: 'Stilling Gaze', sp: 6, target: 'enemy', kind: 'ailment', power: 0,
    inflict: { ailment: 'paralysis', chance: 0.55 },
    description: 'Look into its eyes and hold it still. May paralyse one enemy.',
  }),
  fateUnravel: skill({
    id: 'fateUnravel', name: 'Fate Unravelled', sp: 14, target: 'allEnemies', kind: 'debuff', power: 0, turns: 4,
    mods: [{ stat: 'def', amount: -20 }, { stat: 'res', amount: -20 }],
    description: 'Pull the threads of their fate apart. Lowers defence and resistance of every enemy.',
  }),
  // ── Wolfkin ────────────────────────────────────────────────────────────────
  fangStrike: skill({
    id: 'fangStrike', name: 'Fang Strike', sp: 4, target: 'enemy', kind: 'phys', power: 140,
    description: 'Your wolf lunges for the throat of one enemy.',
  }),
  packHunt: skill({
    id: 'packHunt', name: 'Pack Hunt', sp: 6, target: 'enemy', kind: 'phys', power: 80, hits: 2,
    description: 'You and your wolf strike the same enemy, one after the other.',
  }),
  wolfGuard: skill({
    id: 'wolfGuard', name: 'Wolf Guard', sp: 5, target: 'ally', kind: 'buff', power: 0, turns: 3,
    mods: [{ stat: 'def', amount: 30 }],
    description: 'Your wolf stands watch over an ally. Raises their defence.',
  }),
  packHowl: skill({
    id: 'packHowl', name: 'Howl of the Pack', sp: 8, target: 'allEnemies', kind: 'debuff', power: 0, turns: 3,
    mods: [{ stat: 'def', amount: -12 }],
    description: 'A howl that chills the blood. Lowers the defence of every enemy.',
  }),
  hamstring: skill({
    id: 'hamstring', name: 'Hamstring', sp: 6, target: 'enemy', kind: 'phys', power: 110,
    inflict: { ailment: 'paralysis', chance: 0.35 },
    description: 'Your wolf bites at the legs. May paralyse the enemy.',
  }),
  moonfangFrenzy: skill({
    id: 'moonfangFrenzy', name: 'Moonfang Frenzy', sp: 15, target: 'allEnemies', kind: 'phys', power: 70, hits: 2,
    description: 'Wolf and hunter tear through the enemy line twice.',
  }),
};
