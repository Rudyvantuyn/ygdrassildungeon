import { describe, expect, it } from 'vitest';
import { advice, GUARDIAN_LEVEL, nextGuardian } from './advice';
import { ENEMIES } from './data/enemies';
import { FLOORS } from './data/floors';
import { Game } from './game';
import { fullRestore } from './party';
import { autoSpend } from './skilltree';

/** A fresh game with nothing else to do: points spent, rested, no gold for gear. */
function calm(): Game {
  const game = Game.newGame(1);
  for (const m of game.state.party) autoSpend(m);
  fullRestore(game.state.party);
  game.state.gold = 0;
  return game;
}

describe("Brynja's advice", () => {
  it('knows a fair level for every guardian in the game', () => {
    for (const def of FLOORS) for (const id of def.boss ?? []) expect(GUARDIAN_LEVEL[id], id).toBeGreaterThan(0);
    for (const id of Object.keys(GUARDIAN_LEVEL)) expect(ENEMIES[id as keyof typeof ENEMIES], id).toBeTruthy();
  });

  it('points a new party down toward the first guardian', () => {
    const game = calm();
    expect(nextGuardian(game)?.id).toBe('blightedElder');
    const a = advice(game)!;
    expect(a.spot).toBe('rootdeep');
    expect(a.text).toContain('the Blighted Elder');
  });

  it('says to train when the guardian is reached but the party is too weak, and go once it is ready', () => {
    const game = calm();
    game.state.deepest = 2;
    expect(advice(game)!.text).toMatch(/^Train to about level 8/);
    for (const m of game.state.party) m.level = 9;
    for (const m of game.state.party) autoSpend(m);
    fullRestore(game.state.party);
    expect(advice(game)!.text).toMatch(/^You look ready/);
  });

  it('moves on to the next guardian once one falls', () => {
    const game = calm();
    game.state.deepest = 2;
    game.state.progress[2].bossDefeated = true;
    expect(nextGuardian(game)?.id).toBe('rootgnawer');
  });

  it('puts unspent skill points and a needed rest before the road', () => {
    const game = calm();
    game.state.party[0].level = 3;
    expect(advice(game)!.spot).toBe('hall');
    autoSpend(game.state.party[0]);
    fullRestore(game.state.party);
    game.state.party[1].hp = 1;
    game.state.gold = 1000;
    expect(advice(game)!.spot).toBe('inn');
  });

  it('stays quiet when switched off', () => {
    const game = calm();
    game.state.adviceOff = true;
    expect(advice(game)).toBeNull();
  });
});
