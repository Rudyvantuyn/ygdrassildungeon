import { describe, expect, it } from 'vitest';
import { applyAction, claimShare, createExpedition, leaderUser, validMember, type ExpeditionState } from './expedition';
import { Game } from './game';
import { createMember, grantXp, xpForLevel } from './party';
import type { ClassId, Member } from './types';

function member(name: string, classId: ClassId, level = 1): Member {
  const m = createMember(name, classId);
  if (level > 1) grantXp(m, xpForLevel(level));
  return m;
}

/** Host plus three players, set out on the first floor. */
function started(): ExpeditionState {
  const ex = createExpedition('host', 'Hana', member('Bram', 'bastion', 3), 0);
  expect(applyAction(ex, 'p2', { type: 'join', player: 'Piet', member: member('Sela', 'strider', 3) }, 0)).toBeNull();
  expect(applyAction(ex, 'p3', { type: 'join', player: 'Mila', member: member('Wren', 'mender', 3) }, 0)).toBeNull();
  expect(applyAction(ex, 'p4', { type: 'join', player: 'Joost', member: member('Orrin', 'runecaller', 3) }, 0)).toBeNull();
  expect(applyAction(ex, 'host', { type: 'start' }, 0, 42)).toBeNull();
  return ex;
}

/** Walks the leader forward and back until a fight starts. */
function walkIntoFight(ex: ExpeditionState): void {
  ex.game!.encounterAt = 1;
  for (let i = 0; i < 40 && ex.phase === 'explore'; i++) {
    const before = { x: ex.game!.x, y: ex.game!.y };
    applyAction(ex, 'host', { type: 'step', forward: 1, right: 0 }, 0);
    if (ex.game!.x === before.x && ex.game!.y === before.y) applyAction(ex, 'host', { type: 'turn', delta: 1 }, 0);
  }
  expect(ex.phase).toBe('combat');
}

describe('expedition lobby', () => {
  it('only lets in adventurers the game could have made', () => {
    expect(validMember(member('Bram', 'bastion', 5))).not.toBeNull();
    expect(validMember({ ...member('Bram', 'bastion'), level: 20 })).toBeNull(); // level without the XP
    expect(validMember({ ...member('Bram', 'bastion'), classId: 'wizard' })).toBeNull();
    expect(validMember({ ...member('Bram', 'bastion'), weapon: 'ashwoodBow' })).toBeNull(); // a bow on a Bastion
    expect(validMember({ ...member('Bram', 'bastion'), weapon: 'copperEdge' })).not.toBeNull();
    expect(validMember({ ...member('', 'bastion') })).toBeNull();
    // HP sent by the client is ignored: everyone sets out rested.
    expect(validMember({ ...member('Bram', 'bastion'), hp: 9999 })!.hp).toBe(member('Bram', 'bastion').hp);
  });

  it('seats up to four players, once each', () => {
    const ex = createExpedition('host', 'Hana', member('Bram', 'bastion'), 0);
    expect(applyAction(ex, 'host', { type: 'join', player: 'Hana', member: member('Sela', 'strider') }, 0)).toMatch(/already/);
    for (const p of ['a', 'b', 'c']) expect(applyAction(ex, p, { type: 'join', player: p, member: member('X' + p, 'strider') }, 0)).toBeNull();
    expect(applyAction(ex, 'd', { type: 'join', player: 'd', member: member('Xd', 'strider') }, 0)).toMatch(/full/);
    expect(ex.seats).toHaveLength(4);
  });

  it('lets only the host set out, and can fill empty seats with the host’s own adventurers', () => {
    const ex = createExpedition('host', 'Hana', member('Bram', 'bastion'), 0);
    applyAction(ex, 'p2', { type: 'join', player: 'Piet', member: member('Sela', 'strider') }, 0);
    expect(applyAction(ex, 'p2', { type: 'start' }, 0)).toMatch(/host/);
    expect(applyAction(ex, 'host', { type: 'start', fill: [member('Wren', 'mender'), member('Orrin', 'runecaller')] }, 0)).toBeNull();
    expect(ex.phase).toBe('explore');
    expect(ex.game!.party.map((m) => m.name)).toEqual(['Bram', 'Sela', 'Wren', 'Orrin']);
    expect(ex.seats[2].user).toBe('host');
    // Supplies for two players, one feather to get home.
    expect(ex.game!.inventory.sapTonic).toBe(6);
    expect(ex.game!.inventory.homingFeather).toBe(1);
  });

  it('is disbanded when the host leaves the lobby', () => {
    const ex = createExpedition('host', 'Hana', member('Bram', 'bastion'), 0);
    applyAction(ex, 'p2', { type: 'join', player: 'Piet', member: member('Sela', 'strider') }, 0);
    applyAction(ex, 'p2', { type: 'leave' }, 0);
    expect(ex.seats).toHaveLength(1);
    applyAction(ex, 'host', { type: 'leave' }, 0);
    expect(ex.phase).toBe('ended');
    expect(ex.result!.reason).toBe('disbanded');
  });
});

describe('expedition play', () => {
  it('lets only the leader walk', () => {
    const ex = started();
    const seq = ex.seq;
    expect(applyAction(ex, 'p2', { type: 'turn', delta: 1 }, 0)).toMatch(/leader/);
    expect(ex.seq).toBe(seq);
    expect(applyAction(ex, 'host', { type: 'turn', delta: 1 }, 0)).toBeNull();
    expect(ex.seq).toBe(seq + 1);
  });

  it('waits for every player before a round resolves', () => {
    const ex = started();
    walkIntoFight(ex);
    const round = ex.combat!.round;
    expect(applyAction(ex, 'host', { type: 'command', seat: 1, command: { kind: 'defend' } }, 0)).toMatch(/not your/);
    for (const [user, seat] of [['host', 0], ['p2', 1], ['p3', 2]] as const) {
      applyAction(ex, user, { type: 'command', seat, command: { kind: 'defend' } }, 0);
    }
    expect(ex.combat!.round).toBe(round);
    applyAction(ex, 'p4', { type: 'command', seat: 3, command: { kind: 'defend' } }, 0);
    expect(ex.phase === 'explore' || ex.combat!.round === round + 1).toBe(true);
    expect(ex.log.some((e) => e.kind === 'round')).toBe(true);
  });

  it('lets idle adventurers act on their own once time is up', () => {
    const ex = started();
    walkIntoFight(ex);
    const round = ex.combat!.round;
    applyAction(ex, 'p2', { type: 'tick' }, 1000);
    expect(ex.combat!.round).toBe(round);
    applyAction(ex, 'p2', { type: 'tick' }, ex.deadline + 1);
    expect(ex.phase === 'explore' || ex.combat!.round === round + 1).toBe(true);
  });

  it('rejects skills an adventurer does not know', () => {
    const ex = started();
    walkIntoFight(ex);
    expect(applyAction(ex, 'host', { type: 'command', seat: 0, command: { kind: 'skill', skill: 'wildfire', target: 0 } }, 0)).toMatch(/not known/);
    const round = ex.combat!.round;
    expect(applyAction(ex, 'host', { type: 'command', seat: 0, command: { kind: 'defend' }, round: round + 1 }, 0)).toMatch(/over/);
  });

  it('fights through to the end and goes on exploring', () => {
    const ex = started();
    walkIntoFight(ex);
    for (let t = 0; t < 60 && ex.phase === 'combat'; t++) applyAction(ex, 'host', { type: 'tick' }, ex.deadline + 1);
    expect(ex.phase).toBe('explore');
    expect(ex.game!.battles).toBe(1);
    expect(ex.game!.party[0].xp).toBeGreaterThan(xpForLevel(3));
  });

  it('passes the lead on when the leader leaves, and ends when everyone has gone', () => {
    const ex = started();
    applyAction(ex, 'host', { type: 'leave' }, 0);
    expect(leaderUser(ex)).toBe('p2');
    for (const p of ['p2', 'p3', 'p4']) applyAction(ex, p, { type: 'leave' }, 0);
    expect(ex.phase).toBe('ended');
    expect(ex.result!.reason).toBe('returned');
  });
});

describe('expedition rewards', () => {
  it('splits the gold and materials and brings the XP home', () => {
    const ex = started();
    walkIntoFight(ex);
    for (let t = 0; t < 60 && ex.phase === 'combat'; t++) applyAction(ex, 'host', { type: 'tick' }, ex.deadline + 1);
    ex.game!.gold = 401;
    ex.game!.materials = { mossPelt: 3 };
    expect(applyAction(ex, 'host', { type: 'feather' }, 0)).toBeNull();
    expect(ex.phase).toBe('ended');
    const shares = ex.result!.shares;
    expect(shares).toHaveLength(4);
    expect(shares.every((s) => s.gold === 100)).toBe(true);
    expect(shares.reduce((n, s) => n + (s.materials.mossPelt ?? 0), 0)).toBe(3);

    const home = Game.newGame(1).state; // Bram is in the starting party
    home.party[0] = member('Bram', 'bastion', 3);
    const gold = home.gold;
    expect(claimShare(home, shares[0])).toEqual(['Bram']);
    expect(home.gold).toBe(gold + 100);
    expect(home.party[0].xp).toBe(shares[0].members[0].xp);
  });

  it('keeps the XP but loses the loot when the party falls', () => {
    const ex = started();
    walkIntoFight(ex);
    ex.game!.gold = 300;
    for (const m of ex.game!.party) m.hp = 1;
    for (let t = 0; t < 200 && ex.phase === 'combat'; t++) {
      for (const m of ex.game!.party) m.hp = Math.min(m.hp, 1);
      applyAction(ex, 'host', { type: 'tick' }, ex.deadline + 1);
      if ((ex.phase as string) === 'explore') walkIntoFight(ex);
    }
    expect(ex.phase).toBe('ended');
    expect(ex.result!.reason).toBe('wiped');
    expect(ex.result!.shares.every((s) => s.gold === 0)).toBe(true);
  });
});
