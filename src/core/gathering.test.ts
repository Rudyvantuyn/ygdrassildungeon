import { describe, expect, it } from 'vitest';
import { GATHER_TABLES, GATHER_USES } from './data/gathering';
import { MATERIALS } from './data/materials';
import { FLOORS } from './data/floors';
import { Game } from './game';
import { applyAction, type ExpeditionState } from './expedition';

/** A game standing on the first gathering spot of `kind` on floor `floor`. */
function onSpot(floor: number, char: string): Game {
  const game = Game.newGame(7);
  game.enterFloor(floor, true);
  const y = FLOORS[floor].rows.findIndex((r) => r.includes(char));
  game.state.x = FLOORS[floor].rows[y].indexOf(char);
  game.state.y = y;
  return game;
}

describe('gathering', () => {
  it('every gathered material exists and every floor has spots', () => {
    for (const chapter of GATHER_TABLES) for (const ids of Object.values(chapter)) for (const id of ids) expect(MATERIALS[id], id).toBeDefined();
    for (const f of FLOORS) expect(f.rows.join('').match(/[POWF]/g)?.length ?? 0, f.name).toBeGreaterThanOrEqual(2);
  });

  it('needs someone with the skill, and the spot runs out until the next visit to town', () => {
    const game = onSpot(1, 'O');
    expect(game.interact()).toMatchObject({ type: 'gatherSpot', kind: 'mine', rank: 0 });
    expect(game.gather()).toBeNull();
    game.state.party[0].skills = { ...game.state.party[0].skills, mine: 3 };
    for (let i = 0; i < GATHER_USES; i++) {
      const found = game.gather();
      expect(found?.finds.length).toBe(1);
      expect(GATHER_TABLES[0].mine).toContain(found!.finds[0]);
    }
    expect(game.gather()).toBeNull();
    expect(Object.values(game.state.materials).reduce((a, b) => a + b, 0)).toBe(GATHER_USES);
    game.returnToTown();
    game.enterFloor(1);
    game.state.x = FLOORS[1].rows[game.state.y = FLOORS[1].rows.findIndex((r) => r.includes('O'))].indexOf('O');
    expect(game.gatherSpotHere()?.left).toBe(GATHER_USES);
  });

  it('higher ranks find more, and rarer things', () => {
    const tally = (rank: number) => {
      let items = 0;
      let rare = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const game = onSpot(5, 'F');
        (game as unknown as { rng: { state: number } }).rng.state = seed * 7919;
        game.state.party[1].skills = { ...game.state.party[1].skills, fish: rank };
        const found = game.gather()!;
        items += found.finds.length;
        rare += found.finds.filter((id) => id === GATHER_TABLES[1].fish[2]).length;
      }
      return { items, rare };
    };
    const low = tally(1);
    const high = tally(10);
    expect(high.items).toBe(600);
    expect(low.items).toBe(200);
    expect(high.rare / high.items).toBeGreaterThan(low.rare / low.items);
  });

  it('works on an expedition, decided by the server', () => {
    const game = onSpot(1, 'P');
    game.state.party[2].skills = { ...game.state.party[2].skills, forage: 1 };
    const state = {
      version: 1, host: 'a', phase: 'explore', startFloor: 1,
      seats: game.state.party.map((m, i) => ({ user: i === 0 ? 'a' : 'b' + i, player: 'P', member: m, left: false })),
      game: game.state, combat: null, pending: [], deadline: 0, seq: 1, log: [], result: null,
    } as unknown as ExpeditionState;
    expect(applyAction(state, 'b1', { type: 'gather' }, 0, 1)).toBe('Only the leader can do that.');
    expect(applyAction(state, 'a', { type: 'gather' }, 0, 1)).toBeNull();
    expect(state.log.some((l) => l.kind === 'note' && l.text.startsWith('The expedition gathers'))).toBe(true);
  });
});
