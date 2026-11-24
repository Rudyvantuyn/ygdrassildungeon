/**
 * Brynja's advice: one short line in Lindholm with the next thing worth doing. New players often win their first
 * fight and then lose the thread (the progress counts show it); this line always points at one next step.
 */
import { ENEMIES } from './data/enemies';
import { FLOORS } from './data/floors';
import type { Game } from './game';
import { memberStats } from './party';
import { questStage, boardQuests } from './quests';
import { unspentPoints } from './skilltree';
import { featuredGear, innCost, netPrice } from './town';

/** Where the advice points: a place in town to open when the line is clicked. */
export type AdviceSpot = 'rootdeep' | 'inn' | 'shop' | 'hall' | 'board';

export interface Advice {
  text: string;
  spot: AdviceSpot;
}

/**
 * The party level each guardian is about a fair fight at, from the balance tests (src/core/balance.test.ts):
 * well-trained parties in shop gear win there most of the time. Brynja rounds a little up, as a mentor would.
 */
export const GUARDIAN_LEVEL: Record<string, number> = {
  blightedElder: 8,
  rootgnawer: 13,
  drownedJarl: 26,
  hafgufa: 32,
  ribwarden: 40,
  hrungnir: 44,
  fogWatcher: 48,
  dreamwarden: 54,
  rimewell: 60,
  gapwarden: 66,
  svafnir: 72,
  nidhogg: 74,
};

/** The first guardian (in floor order) the party has not beaten yet. */
export function nextGuardian(game: Game): { floor: number; id: string } | null {
  for (const [floor, def] of FLOORS.entries()) {
    const id = def.boss?.[0];
    if (id && !game.state.progress[floor]?.bossDefeated) return { floor, id };
  }
  return null;
}

/** One next step for the party in town, or null when there is nothing to say (or advice is off). */
export function advice(game: Game): Advice | null {
  const s = game.state;
  if (s.adviceOff || s.expedition || game.floors !== FLOORS || !s.party.length) return null;

  // Skill points first: they are free strength, and new players miss them most.
  const unspent = s.party.find((m) => unspentPoints(m) > 0);
  if (unspent) {
    const n = unspentPoints(unspent);
    return { text: `${unspent.name} has ${n} skill point${n === 1 ? '' : 's'} to spend. The Oath Hall, Skills.`, spot: 'hall' };
  }

  // Never down the roots hurt.
  const hurt = s.party.some((m) => {
    const max = memberStats(m);
    return m.hp < max.hp || m.sp < max.sp * 0.6;
  });
  if (hurt && s.gold >= innCost(game)) return { text: 'Rest at the Sleeping Stag before you go down again.', spot: 'inn' };

  // Finished work pays.
  const ready = boardQuests(game).find((q) => questStage(game, q) === 'ready');
  if (ready) return { text: `${ready.giver} is waiting: hand in "${ready.title}" at the Notice Board.`, spot: 'board' };

  // Better gear someone can pay for.
  for (const m of s.party) {
    const up = featuredGear(game, m).find((o) => o.upgrade && netPrice(m, o.gear) <= s.gold);
    if (up) return { text: `Hilde has better gear for ${m.name} (${up.gear.name}), and you can pay for it.`, spot: 'shop' };
  }

  const next = nextGuardian(game);
  if (!next) return null;
  // Names carry their own article ("The Rootgnawer"); mid-sentence it is lower case.
  const name = (ENEMIES[next.id]?.name ?? 'the guardian').replace(/^The /, 'the ');
  const place = FLOORS[next.floor].name;
  const want = GUARDIAN_LEVEL[next.id] ?? 0;
  const level = Math.round(s.party.reduce((sum, m) => sum + m.level, 0) / s.party.length);
  if (s.deepest < next.floor) {
    if (level < want - 3) return { text: `Head deeper, toward ${place}, and fight what you meet: ${name} waits there, and wants a party of about level ${want}.`, spot: 'rootdeep' };
    return { text: `Find the way down to ${place}, where ${name} waits.`, spot: 'rootdeep' };
  }
  if (level < want) return { text: `Train to about level ${want} before you face ${name} in ${place}. Your party is level ${level}.`, spot: 'rootdeep' };
  return { text: `You look ready for ${name} in ${place}. Take tonics, and go.`, spot: 'rootdeep' };
}
