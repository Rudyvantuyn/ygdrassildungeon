/**
 * Gathering: spots in the Rootdeep where adventurers with the right skill can forage, mine,
 * fell wood or fish. What they find depends on the chapter; better ranks find more, and rarer things.
 */
import type { SkillId } from '../types';

export type GatherKind = 'forage' | 'mine' | 'fell' | 'fish';

export interface GatherKindDef {
  kind: GatherKind;
  skill: SkillId;
  /** Map character in FloorDef rows. */
  char: string;
  /** What the spot looks like, for messages ("a bed of herbs"). */
  spot: string;
  verb: string;
  color: string;
  glyph: string;
}

export const GATHER_KINDS: Record<GatherKind, GatherKindDef> = {
  forage: { kind: 'forage', skill: 'forage', char: 'P', spot: 'a patch of wild plants', verb: 'Forage', color: '#7cc85a', glyph: '✿' },
  mine: { kind: 'mine', skill: 'mine', char: 'O', spot: 'a glittering vein of ore', verb: 'Mine', color: '#c8a46a', glyph: '◆' },
  fell: { kind: 'fell', skill: 'fell', char: 'W', spot: 'a fallen, sturdy root', verb: 'Fell', color: '#b07a4a', glyph: '♠' },
  fish: { kind: 'fish', skill: 'fish', char: 'F', spot: 'a pool where fish are rising', verb: 'Fish', color: '#5ab0e0', glyph: '≈' },
};

/** Common, uncommon and rare finds, per chapter (index) and kind. Material ids live in materials.ts. */
export const GATHER_TABLES: Record<GatherKind, [string, string, string]>[] = [
  {
    forage: ['wildSorrel', 'bitterroot', 'moonpetal'],
    mine: ['copperNugget', 'ironOre', 'starsilver'],
    fell: ['ashwoodLog', 'blackoakLog', 'heartoakBurl'],
    fish: ['riverPerch', 'rootcarp', 'glimmerTrout'],
  },
  {
    forage: ['seaLettuce', 'glasswort', 'pearlKelp'],
    mine: ['rockSalt', 'coralOre', 'deepiron'],
    fell: ['driftwood', 'drownedOak', 'ghostwood'],
    fish: ['silverSprat', 'stormfin', 'moonscaleEel'],
  },
];

/** How often a spot can be gathered from per visit (spots recover while the party is in town). */
export const GATHER_USES = 2;
/** Chance that the noise draws monsters. */
export const GATHER_AMBUSH = 0.1;
