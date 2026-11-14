import { describe, expect, it } from 'vitest';
import { Combat } from './combat';
import { EQUIPMENT_LIST } from './data/equipment';
import { FLOORS } from './data/floors';
import { ITEMS, makeInventory } from './data/items';
import { MATERIALS } from './data/materials';
import { Game } from './game';
import { moveToParty } from './guild';
import { createMember, createStartingParty, fullRestore, xpForLevel } from './party';
import { canSend, collectRun, healerCost, healWound, runsBack, sendRun, simulateRun, unavailable, WOUND_HOURS, type RunReport } from './ravens';
import { Rng } from './rng';
import { autoSpend } from './skilltree';
import { chooseCommands } from './tactics';
import type { ClassId, Member } from './types';

const HOUR = 3600_000;

function trained(classes: ClassId[], level: number, tier: number): Member[] {
  return classes.map((c, i) => {
    const m = createMember(`Scout${i}`, c);
    m.oath = 10 + i;
    m.level = level;
    m.xp = xpForLevel(level);
    m.skills = {};
    autoSpend(m);
    for (const slot of ['weapon', 'armor'] as const) {
      m[slot] = EQUIPMENT_LIST.filter((e) => e.slot === slot && !e.requires && e.tier <= tier && e.classes.includes(m.classId)).sort((a, b) => b.price - a.price)[0]?.id;
    }
    fullRestore([m]);
    return m;
  });
}

/** A game with a party of four and the given scouts in the reserve. */
function gameWith(scouts: Member[], deepest = 9): Game {
  const game = Game.newGame(1);
  game.state.deepest = deepest;
  game.state.reserve.push(...scouts);
  return game;
}

const TEAM: ClassId[] = ['bastion', 'mender', 'runecaller'];
const value = (r: RunReport) =>
  Object.entries(r.materials).reduce((s, [id, n]) => s + MATERIALS[id].price * n, 0) +
  Object.entries(r.items).reduce((s, [id, n]) => s + ITEMS[id as keyof typeof ITEMS].price * (n ?? 0), 0);

describe('Raven Runs', () => {
  it('scouts come back with finds but never stronger', () => {
    const scouts = trained(TEAM, 20, 7);
    const game = gameWith(scouts);
    const before = JSON.stringify(scouts.map((m) => [m.level, m.xp, m.skills]));
    const gold = game.state.gold;
    const run = sendRun(game, scouts.map((m) => m.oath!), 7, 'long', 0, 42);
    expect(typeof run).toBe('object');
    expect(collectRun(game, 1, 7 * HOUR)).toBeNull(); // not back yet
    const report = collectRun(game, 1, 8 * HOUR)!;
    expect(report.won).toBeGreaterThan(0);
    expect(JSON.stringify(scouts.map((m) => [m.level, m.xp, m.skills]))).toBe(before);
    expect(game.state.gold).toBe(gold);
    expect(game.state.inventory.oathToken ?? 0).toBe(0);
    for (const [id, n] of Object.entries(report.materials)) expect(game.state.materials[id]).toBe(n);
    expect(scouts.every((m) => m.ravenRun === undefined)).toBe(true);
  });

  it('the outcome is settled when the run sets out', () => {
    const scouts = trained(TEAM, 10, 4);
    expect(simulateRun(scouts, 4, 'overnight', 7)).toEqual(simulateRun(scouts, 4, 'overnight', 7));
  });

  it('scouts on a run cannot join the party, and the rules for sending hold', () => {
    const scouts = trained(TEAM, 10, 4);
    const game = gameWith(scouts, 4);
    const oaths = scouts.map((m) => m.oath!);
    expect(canSend(game, oaths, 5, 0)).toMatch(/reached/); // deeper than the party has been
    expect(canSend(game, [...oaths, 99], 0, 0)).toMatch(/1 to 3/);
    expect(canSend(game, [game.state.party[0].oath!], 0, 0)).toMatch(/reserve/);
    sendRun(game, [oaths[0]], 0, 'short', 0, 1);
    expect(unavailable(scouts[0], 0)).toMatch(/Raven Run/);
    game.state.party.pop();
    expect(moveToParty(game, game.state.reserve.indexOf(scouts[0]))).toBe(false);
    expect(canSend(game, [oaths[0]], 0, 0)).toMatch(/Raven Run/);
    sendRun(game, [oaths[1]], 0, 'short', 0, 2);
    expect(canSend(game, [oaths[2]], 0, 0)).toMatch(/At most 2/);
  });

  it('a clock turned back does not bring a run home early', () => {
    const scouts = trained(TEAM, 10, 4);
    const game = gameWith(scouts, 4);
    sendRun(game, [scouts[0].oath!], 0, 'short', 1000 * HOUR, 1);
    expect(runsBack(game, 999 * HOUR)).toHaveLength(0);
    expect(runsBack(game, 1003 * HOUR)).toHaveLength(1);
  });

  it('the wounded rest twelve hours, or pay the healer', () => {
    const scouts = trained(['strider'], 2, 0);
    const game = gameWith(scouts, 9);
    // Far too deep: routed for sure.
    let seed = 1;
    let report: RunReport | null = null;
    for (; seed < 20; seed++) {
      report = simulateRun(scouts, 9, 'short', seed);
      if (report.outcome === 'routed') break;
    }
    expect(report!.outcome).toBe('routed');
    sendRun(game, [scouts[0].oath!], 9, 'short', 0, seed);
    collectRun(game, 1, 3 * HOUR);
    expect(unavailable(scouts[0], 3 * HOUR)).toMatch(/Wounded/);
    expect(unavailable(scouts[0], (3 + WOUND_HOURS) * HOUR)).toBeNull();
    game.state.gold = healerCost(game);
    expect(healWound(game, scouts[0].oath!, 4 * HOUR)).toBe(true);
    expect(unavailable(scouts[0], 4 * HOUR)).toBeNull();
    expect(game.state.gold).toBe(0);
  });
});

// Deterministic seeds. If a balance change breaks these, look at the numbers on purpose.
describe('Raven Runs balance', { timeout: 120_000 }, () => {
  const seeds = Array.from({ length: 30 }, (_, i) => i + 1);
  const outcomes = (team: Member[], floor: number, length: 'short' | 'overnight') => seeds.map((s) => simulateRun(team, floor, length, s));

  it('a strong team on a floor it has outgrown comes back whole', () => {
    const results = outcomes(trained(TEAM, 20, 7), 7, 'short');
    expect(results.filter((r) => r.outcome === 'good').length).toBeGreaterThanOrEqual(27);
  });

  it('a weak team sent too deep is routed', () => {
    expect(outcomes(trained(TEAM, 6, 4), 4, 'overnight').filter((r) => r.outcome === 'routed').length).toBeGreaterThanOrEqual(12);
    expect(outcomes(trained(TEAM, 30, 9), 10, 'overnight').filter((r) => r.outcome === 'routed').length).toBeGreaterThanOrEqual(25);
  });

  it('an overnight run is worth less than a short stretch of play', () => {
    // What the party itself earns in one fight there (gold and parts), averaged.
    const ownFight = (floor: number, level: number) => {
      let total = 0;
      for (const s of seeds) {
        const party = trained(['bastion', 'strider', 'mender', 'runecaller'], level, floor);
        const rng = new Rng(s);
        const c = new Combat(party, rng.weighted(FLOORS[floor].encounters).enemies, makeInventory(), rng);
        for (let r = 0; r < 200 && !c.outcome; r++) c.resolveRound(chooseCommands(c));
        if (c.rewards) total += c.rewards.gold + c.rewards.materials.reduce((x, id) => x + MATERIALS[id].price, 0);
      }
      return total / seeds.length;
    };
    for (const [floor, level] of [[2, 8], [7, 20], [9, 26]]) {
      const team = trained(TEAM, level, floor);
      team[0].skills = { ...team[0].skills, forage: 5, mine: 5, fell: 5, fish: 5 };
      const avg = outcomes(team, floor, 'overnight').reduce((s, r) => s + value(r), 0) / seeds.length;
      // About 15–20 minutes of play is a dozen fights; a run must never beat that.
      expect(avg).toBeLessThan(ownFight(floor, level) * 12);
      expect(avg).toBeGreaterThan(0);
    }
  });

  it('starting parties stay as they were (copies are fought with)', () => {
    const party = createStartingParty();
    party.forEach((m, i) => (m.oath = i + 1));
    const before = JSON.stringify(party);
    simulateRun(party.slice(0, 3), 2, 'overnight', 3);
    expect(JSON.stringify(party)).toBe(before);
  });
});
