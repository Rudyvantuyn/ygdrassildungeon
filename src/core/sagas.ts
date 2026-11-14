/**
 * Sagas: what each adventurer has done, and the bynames it earns them ("Bram Wolf-Feeder", "Sela the Unbroken").
 * Every fight adds to a member's tally (finishing blows, healing, falls, …); a byname is earned once its tally is
 * reached, and the player chooses which one the adventurer bears. Bynames change nothing in a fight: they are
 * the party's story, and something to show.
 */
import { ENEMIES } from './data/enemies';
import { FLOORS } from './data/floors';
import type { Member } from './types';

export interface SagaTally {
  /** Fights fought (and survived to the end of). */
  battles: number;
  /** Finishing blows. */
  kills: number;
  crits: number;
  /** Hits on a weakness. */
  weakHits: number;
  /** HP healed on others and themself. */
  healed: number;
  /** Fallen allies brought back. */
  revives: number;
  /** Damage taken. */
  taken: number;
  /** Times fallen in a fight that was still won (or fled). */
  falls: number;
  /** Won a fight standing on a tenth of their HP or less. */
  closeCalls: number;
  /** Guardians felled with their own blow (enemy ids). */
  guardians: string[];
  /** Prowlers felled with their own blow. */
  prowlers: number;
  /** Raven Runs scouted. */
  runs: number;
}

export function emptyTally(): SagaTally {
  return { battles: 0, kills: 0, crits: 0, weakHits: 0, healed: 0, revives: 0, taken: 0, falls: 0, closeCalls: 0, guardians: [], prowlers: 0, runs: 0 };
}

export interface Byname {
  id: string;
  /** As it follows the name: "Wolf-Feeder", "the Kind", ", Bane of the Hafgufa". */
  name: string;
  /** Why they bear it, for the saga. */
  text: string;
  earned: (t: SagaTally) => boolean;
}

const RAW: Byname[] = [
  { id: 'wolfFeeder', name: 'Wolf-Feeder', text: 'Struck down fifty foes. The wolves of the roots ate well.', earned: (t) => t.kills >= 50 },
  { id: 'ravenFeeder', name: 'Raven-Feeder', text: 'Struck down three hundred foes. The ravens follow them now.', earned: (t) => t.kills >= 300 },
  { id: 'keenEdge', name: 'Keen-Edge', text: 'Landed forty crushing blows.', earned: (t) => t.crits >= 40 },
  { id: 'theWise', name: 'the Wise', text: 'Found a weakness two hundred times.', earned: (t) => t.weakHits >= 200 },
  { id: 'theKind', name: 'the Kind', text: 'Healed five thousand wounds, give or take.', earned: (t) => t.healed >= 5000 },
  { id: 'lifeGiver', name: 'Life-Giver', text: 'Healed thirty thousand HP. Half the party owes them their life.', earned: (t) => t.healed >= 30000 },
  { id: 'helDenier', name: 'Hel-Denier', text: 'Brought fifteen fallen friends back to their feet.', earned: (t) => t.revives >= 15 },
  { id: 'theAnvil', name: 'the Anvil', text: 'Took ten thousand HP of blows for the party.', earned: (t) => t.taken >= 10000 },
  { id: 'shieldWall', name: 'Shield-Wall', text: 'Took fifty thousand HP of blows and stood.', earned: (t) => t.taken >= 50000 },
  { id: 'manyLives', name: 'Many-Lives', text: 'Fell ten times, and got up every time.', earned: (t) => t.falls >= 10 },
  { id: 'hairsBreadth', name: "Hair's-Breadth", text: 'Won five fights on their last few drops of blood.', earned: (t) => t.closeCalls >= 5 },
  { id: 'theUnbroken', name: 'the Unbroken', text: 'Fought two hundred fights and never fell once.', earned: (t) => t.battles >= 200 && t.falls === 0 },
  { id: 'theSeasoned', name: 'the Seasoned', text: 'Fought a thousand fights.', earned: (t) => t.battles >= 1000 },
  { id: 'prowlerBane', name: 'Prowler-Bane', text: 'Struck the last blow on three prowlers.', earned: (t) => t.prowlers >= 3 },
  { id: 'ravenFriend', name: 'Raven-Friend', text: 'Went scouting with the ravens twenty times.', earned: (t) => t.runs >= 20 },
];

/** A byname for every guardian: "Bane of the Blighted Elder", for the one who struck it down. */
const GUARDIANS: Byname[] = [...new Set(FLOORS.flatMap((f) => (f.boss ?? []).slice(0, 1)))].flatMap((id) => {
  const def = ENEMIES[id];
  if (!def) return [];
  const the = /^the /i.test(def.name) ? def.name.replace(/^The /, 'the ') : `the ${def.name}`;
  return [{ id: `bane-${id}`, name: `, Bane of ${the}`, text: `Struck the last blow on ${the}.`, earned: (t: SagaTally) => t.guardians.includes(id) }];
});

export const BYNAMES: Byname[] = [...RAW, ...GUARDIANS];
export const BYNAME_BY_ID: Record<string, Byname> = Object.fromEntries(BYNAMES.map((b) => [b.id, b]));

/** Bynames this adventurer has earned, in the order they are listed. */
export function bynamesOf(m: Member): Byname[] {
  const t = m.saga;
  return t ? BYNAMES.filter((b) => m.bynames?.includes(b.id) || b.earned(t)) : [];
}

/** "Bram Wolf-Feeder": the name with the byname they bear, if any. */
export function fullName(m: Pick<Member, 'name' | 'byname'>): string {
  const b = m.byname ? BYNAME_BY_ID[m.byname] : undefined;
  if (!b) return m.name;
  return b.name.startsWith(',') ? `${m.name}${b.name}` : `${m.name} ${b.name}`;
}

/**
 * Adds a fight (or a run) to an adventurer's saga. Returns the bynames earned just now. The first one earned is
 * taken up at once; after that the player chooses.
 */
export function addToSaga(m: Member, add: Partial<SagaTally>): Byname[] {
  const t = (m.saga ??= emptyTally());
  for (const [k, v] of Object.entries(add) as [keyof SagaTally, number | string[]][]) {
    if (k === 'guardians') {
      for (const id of v as string[]) if (!t.guardians.includes(id)) t.guardians.push(id);
    } else {
      t[k] += v as number;
    }
  }
  const had = new Set(m.bynames ?? []);
  const fresh = BYNAMES.filter((b) => !had.has(b.id) && b.earned(t));
  if (fresh.length) {
    m.bynames = [...had, ...fresh.map((b) => b.id)];
    m.byname ??= fresh[0].id;
  }
  return fresh;
}
