import { describe, expect, it } from 'vitest';
import { validMember } from './expedition';
import { Game } from './game';
import { baseStats, createMember } from './party';
import { OATH_LEVEL, changeClass, deeperOathProblem, oathName, swearDeeperOath, validOath } from './oaths';
import { unspentPoints } from './skilltree';

function ready(): Game {
  const game = Game.newGame(1);
  for (let f = 4; f < game.state.progress.length; f += 5) game.state.progress[f].bossDefeated = true;
  game.state.inventory.oathToken = 20;
  game.state.gold = 100_000;
  return game;
}

describe('deeper oaths', () => {
  it('add 3% per oath to an adventurer\'s own stats', () => {
    const m = createMember('Bram', 'bastion');
    m.level = 50;
    const plain = baseStats(m);
    m.oathRank = 4;
    const sworn = baseStats(m);
    expect(sworn.hp / plain.hp).toBeCloseTo(1.12, 1);
    expect(oathName(m)).toBe('Fifth Oath');
  });

  it('open with the chapters beaten and the level, and cost as many tokens as their number', () => {
    const game = Game.newGame(1);
    game.state.inventory.oathToken = 20;
    const m = game.state.party[0];
    m.level = 60;
    expect(deeperOathProblem(game, m)).toMatch(/chapter I has fallen/);
    game.state.progress[4].bossDefeated = true;
    expect(swearDeeperOath(game, m)).toBeNull();
    expect(game.state.inventory.oathToken).toBe(19);
    expect(deeperOathProblem(game, m)).toMatch(/chapter II/);
    const all = ready();
    const b = all.state.party[1];
    b.level = OATH_LEVEL[1] - 1;
    expect(deeperOathProblem(all, b)).toMatch(/needs level 10/);
    b.level = 60;
    for (let i = 0; i < 4; i++) expect(swearDeeperOath(all, b)).toBeNull();
    expect(all.state.inventory.oathToken).toBe(20 - 1 - 2 - 3 - 4);
    expect(swearDeeperOath(all, b)).toMatch(/deepest/);
  });

  it('cannot be faked on an expedition: an oath beyond the level is refused', () => {
    const m = createMember('Bram', 'bastion');
    expect(validOath(3, 1)).toBe(false);
    expect(validMember({ ...m, oathRank: 3 })).toBeNull();
    m.level = 45;
    m.xp = 10 ** 9;
    expect(validOath(3, 45)).toBe(true);
  });
});

describe('a change of class', () => {
  it('keeps level and oath, gives every skill point back and sells gear the new class cannot wear', () => {
    const game = ready();
    const m = game.state.party[0];
    m.level = 30;
    m.oathRank = 2;
    m.weapon = undefined;
    const gold = game.state.gold;
    expect(changeClass(game, m, 'runecaller')).toBeNull();
    expect(m.classId).toBe('runecaller');
    expect(m.level).toBe(30);
    expect(m.oathRank).toBe(2);
    expect(unspentPoints(m)).toBeGreaterThan(20);
    expect(game.state.inventory.oathToken).toBe(19);
    expect(game.state.gold).toBeLessThan(gold);
    expect(changeClass(game, m, 'runecaller')).toMatch(/already/);
  });
});
