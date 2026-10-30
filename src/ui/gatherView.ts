/** Words for gathering spots, shared by solo play and expeditions. */
import { GATHER_KINDS, type GatherKind } from '../core/data/gathering';

/** What to say when the party stands on a gathering spot, and whether to offer to gather. */
export function gatherPrompt(spot: { kind: GatherKind; left: number; rank: number }): { text: string; ask: boolean } {
  const def = GATHER_KINDS[spot.kind];
  const there = def.spot[0].toUpperCase() + def.spot.slice(1);
  if (spot.rank <= 0) return { text: `${there}. Nobody here knows how to ${def.verb.toLowerCase()} (learn it in the skill tree).`, ask: false };
  if (spot.left <= 0) return { text: `${there}, picked clean for now. It recovers while you rest in town.`, ask: false };
  return { text: `${there}. ${def.verb} here? (${spot.left} ${spot.left === 1 ? 'try' : 'tries'} left · rank ${spot.rank})`, ask: true };
}
