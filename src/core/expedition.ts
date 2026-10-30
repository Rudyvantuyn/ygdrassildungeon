/**
 * Expeditions: up to four players from different halls descend together. Each player
 * brings one of their own adventurers; the first seat (the host) leads the way through
 * the corridors, and in a fight everyone picks the command for their own adventurer.
 *
 * This module is the whole rulebook and is run by the server: clients only send
 * actions and show the state they get back. Everything here is plain JSON so it can be
 * stored in a database row between actions.
 */
import type { CombatEvent, CombatSnapshot, Command } from './combat';
import { CLASSES } from './data/classes';
import { EQUIPMENT } from './data/equipment';
import { FLOORS } from './data/floors';
import { ITEMS, makeInventory } from './data/items';
import { SKILLS } from './data/skills';
import { Game, type GameState, type StepEvent } from './game';
import { NAME_MAX_LENGTH } from './guild';
import { fullRestore, isAlive, knownSkills, MAX_LEVEL, memberStats, xpForLevel } from './party';
import { validSkills } from './skilltree';
import { chooseCommands } from './tactics';
import type { ClassId, ItemId, Member } from './types';

export const EXPEDITION_VERSION = 1;
export const MAX_SEATS = 4;
/** Time each player has to pick a command before their adventurer acts on their own. */
export const ROUND_SECONDS = 40;
/** Entries kept in the log; clients that fall further behind simply resync. */
const LOG_SIZE = 16;
/** Supplies the Hornstone hands out per player at the start of an expedition. */
const KIT: Partial<Record<ItemId, number>> = { sapTonic: 3, spiritDew: 1, clearwater: 1, kindlingMoss: 1 };

export interface Seat {
  /** Account id of the player who controls this adventurer. */
  user: string;
  /** The player's display name. */
  player: string;
  member: Member;
  /** The player has left; the adventurer now fights on its own. */
  left: boolean;
}

export type Phase = 'lobby' | 'explore' | 'combat' | 'ended';
export type EndReason = 'returned' | 'wiped' | 'disbanded';

export type LogEntry =
  | { seq: number; kind: 'step'; events: StepEvent[] }
  | { seq: number; kind: 'round'; events: CombatEvent[] }
  | { seq: number; kind: 'note'; text: string };

/** What one player takes home at the end. */
export interface Share {
  user: string;
  /** Their adventurers as they came back (levels and XP gained), by seat order. */
  members: Member[];
  gold: number;
  materials: Record<string, number>;
  kills: Record<string, number>;
}

export interface ExpeditionState {
  version: number;
  host: string;
  phase: Phase;
  /** Floor the expedition starts on (the host must have reached it). */
  startFloor: number;
  seats: Seat[];
  /** The shared run once it has started: party = the seats' adventurers, in seat order. */
  game: GameState | null;
  combat: CombatSnapshot | null;
  /** Commands chosen so far this round, by seat. */
  pending: (Command | null)[];
  /** When the current round resolves without waiting any longer (ms since epoch). */
  deadline: number;
  /** Bumped by every change; also the version used to detect concurrent writes. */
  seq: number;
  log: LogEntry[];
  result: { reason: EndReason; shares: Share[] } | null;
}

export type Action =
  | { type: 'join'; player: string; member: Member }
  | { type: 'leave' }
  /** Host only: set out. `fill` adds more of the host's own adventurers to empty seats. */
  | { type: 'start'; fill?: Member[] }
  | { type: 'turn'; delta: -1 | 1 }
  | { type: 'step'; forward: number; right: number }
  | { type: 'interact' }
  | { type: 'descend' }
  | { type: 'ascend' }
  | { type: 'drink' }
  | { type: 'feather' }
  /** `round` guards against a choice arriving after its round was already settled. */
  | { type: 'command'; seat: number; command: Command | null; round?: number }
  /** Anyone: resolve the round if its time is up. */
  | { type: 'tick' };

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Checks that an adventurer sent by a client is one the game could have produced. */
export function validMember(raw: unknown): Member | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Partial<Member>;
  if (typeof m.name !== 'string') return null;
  const name = m.name.trim();
  if (!name || name.length > NAME_MAX_LENGTH) return null;
  if (typeof m.classId !== 'string' || !(m.classId in CLASSES)) return null;
  const level = m.level;
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > MAX_LEVEL) return null;
  const xp = m.xp;
  if (typeof xp !== 'number' || !Number.isInteger(xp) || xp < xpForLevel(level)) return null;
  if (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) return null;
  const classId = m.classId as ClassId;
  const gear = (id: unknown, slot: 'weapon' | 'armor'): string | undefined | false => {
    if (id === undefined || id === null) return undefined;
    if (typeof id !== 'string') return false;
    const def = EQUIPMENT[id];
    if (!def || def.slot !== slot || !def.classes.includes(classId)) return false;
    return id;
  };
  const weapon = gear(m.weapon, 'weapon');
  const armor = gear(m.armor, 'armor');
  if (weapon === false || armor === false) return null;
  const skills = m.skills ?? {};
  if (!validSkills(classId, level, skills)) return null;
  const member: Member = { name, classId, row: m.row === 'back' ? 'back' : 'front', level, xp, hp: 1, sp: 0, skills: { ...skills } };
  if (weapon) member.weapon = weapon;
  if (armor) member.armor = armor;
  fullRestore([member]);
  return member;
}

export function cleanPlayerName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ').slice(0, 16) : '';
  return name || 'Adventurer';
}

export function createExpedition(host: string, player: string, member: Member, startFloor: number): ExpeditionState {
  return {
    version: EXPEDITION_VERSION,
    host,
    phase: 'lobby',
    startFloor: Math.max(0, Math.min(FLOORS.length - 1, Math.floor(startFloor))),
    seats: [{ user: host, player: cleanPlayerName(player), member, left: false }],
    game: null,
    combat: null,
    pending: [],
    deadline: 0,
    seq: 1,
    log: [],
    result: null,
  };
}

/** Index of the seat that leads the way: the first player still present. */
export function leaderSeat(state: ExpeditionState): number {
  return state.seats.findIndex((s) => !s.left);
}

export function leaderUser(state: ExpeditionState): string | null {
  return state.seats[leaderSeat(state)]?.user ?? null;
}

/** Distinct players (account ids) in seat order. */
export function players(state: ExpeditionState): string[] {
  return [...new Set(state.seats.map((s) => s.user))];
}

/** Seats `user` gives commands for (their own adventurers, while they are still present). */
export function seatsControlledBy(state: ExpeditionState, user: string): number[] {
  return state.seats.flatMap((s, i) => (s.user === user && !s.left ? [i] : []));
}

/**
 * Applies one action by `user` at time `now` (ms). Mutates `state`.
 * Returns an error message when the action is not allowed (state is then unchanged),
 * or null on success. `seed` is only used when the expedition starts.
 */
export function applyAction(state: ExpeditionState, user: string, action: Action, now: number, seed = 1): string | null {
  const before = JSON.stringify(state);
  const error = run(state, user, action, now, seed);
  if (error) {
    Object.assign(state, JSON.parse(before));
    return error;
  }
  if (JSON.stringify(state) !== before) state.seq += 1;
  return null;
}

function run(state: ExpeditionState, user: string, action: Action, now: number, seed: number): string | null {
  const seat = state.seats.findIndex((s) => s.user === user);
  const isLeader = leaderUser(state) === user;
  if (state.phase === 'ended') return 'This expedition is over.';

  switch (action.type) {
    case 'join': {
      if (state.phase !== 'lobby') return 'This expedition has already set out.';
      if (seat >= 0) return 'You are already part of this expedition.';
      if (state.seats.length >= MAX_SEATS) return 'This expedition is full.';
      const member = validMember(action.member);
      if (!member) return 'That adventurer cannot join.';
      state.seats.push({ user, player: cleanPlayerName(action.player), member, left: false });
      return null;
    }

    case 'leave': {
      if (seat < 0) return 'You are not part of this expedition.';
      if (state.phase === 'lobby') {
        if (user === state.host) {
          end(state, 'disbanded');
          return null;
        }
        state.seats = state.seats.filter((s) => s.user !== user);
        return null;
      }
      for (const s of state.seats) if (s.user === user) s.left = true;
      if (leaderSeat(state) < 0) {
        // Everybody is gone: the adventurers find their own way home.
        end(state, 'returned');
        return null;
      }
      note(state, `${state.seats[seat].player} has left. Their adventurer fights on alone.`);
      if (state.phase === 'combat') settleRound(state, now, false);
      return null;
    }

    case 'start': {
      if (state.phase !== 'lobby') return 'This expedition has already set out.';
      if (user !== state.host) return 'Only the host can set out.';
      for (const raw of action.fill ?? []) {
        if (state.seats.length >= MAX_SEATS) break;
        const member = validMember(raw);
        if (!member) return 'One of your adventurers cannot join.';
        if (state.seats.some((s) => s.user === user && s.member.name === member.name)) continue;
        state.seats.push({ user, player: state.seats[0].player, member, left: false });
      }
      const game = Game.newGame(seed);
      const s = game.state;
      s.party = state.seats.map((st) => clone(st.member));
      s.reserve = [];
      s.gold = 0;
      const kit: Partial<Record<ItemId, number>> = { homingFeather: 1 };
      for (const id of Object.keys(KIT) as ItemId[]) kit[id] = (KIT[id] ?? 0) * players(state).length;
      s.inventory = makeInventory(kit);
      s.story = [];
      game.enterFloor(state.startFloor, true);
      state.game = JSON.parse(game.serialize()) as GameState;
      state.phase = 'explore';
      note(state, 'The expedition sets out into the Rootdeep.');
      return null;
    }

    case 'turn':
    case 'step':
    case 'interact':
    case 'descend':
    case 'ascend':
    case 'drink':
    case 'feather':
      if (state.phase !== 'explore') return state.phase === 'combat' ? 'Not during a fight.' : 'The expedition has not set out yet.';
      if (!isLeader) return 'Only the leader can do that.';
      return explore(state, action, now);

    case 'command': {
      if (state.phase !== 'combat' || !state.combat || !state.game) return 'There is no fight going on.';
      const target = state.seats[action.seat];
      if (!target || target.user !== user || target.left) return 'That is not your adventurer.';
      if (action.round !== undefined && action.round !== state.combat.round) return 'That round is already over.';
      if (action.command !== null) {
        const problem = checkCommand(state, action.seat, action.command);
        if (problem) return problem;
      }
      state.pending[action.seat] = action.command;
      settleRound(state, now, false);
      return null;
    }

    case 'tick':
      if (state.phase !== 'combat') return null;
      settleRound(state, now, false);
      return null;
  }
}

function explore(state: ExpeditionState, action: Action, now: number): string | null {
  const game = Game.fromState(state.game!);
  const events: StepEvent[] = [];
  switch (action.type) {
    case 'turn':
      game.turn(action.delta === -1 ? -1 : 1);
      break;
    case 'step': {
      const forward = Math.sign(action.forward);
      const right = Math.sign(action.right);
      if (Math.abs(forward) + Math.abs(right) !== 1) return 'Move one cell at a time.';
      events.push(...game.step(forward, right));
      break;
    }
    case 'interact':
      events.push(game.interact());
      break;
    case 'descend':
      if (game.tileHere() !== 'stairs' || game.isLastFloor) return 'There are no stairs down here.';
      game.descend();
      note(state, `The expedition descends to ${game.floorDef.name}.`);
      break;
    case 'ascend':
      if (game.tileHere() !== 'up') return 'There are no stairs up here.';
      if (game.state.floor === 0) {
        save(state, game);
        end(state, 'returned');
        return null;
      }
      game.ascend();
      note(state, `The expedition climbs up to ${game.floorDef.name}.`);
      break;
    case 'drink':
      if (!game.drinkSpring()) return 'There is nothing to drink here.';
      note(state, 'The expedition drinks from the spring and feels refreshed.');
      break;
    case 'feather':
      if ((game.state.inventory.homingFeather ?? 0) <= 0) return 'There is no Homing Feather left.';
      game.state.inventory.homingFeather -= 1;
      save(state, game);
      end(state, 'returned');
      return null;
  }

  if (events.length) log(state, { kind: 'step', events });
  // A fight starts right away; the clients play the encounter as they show the step.
  for (const ev of events) {
    const combat =
      ev.type === 'encounter'
        ? game.startCombat(ev.enemies)
        : ev.type === 'prowler'
          ? game.startProwlerCombat(ev.index)
          : ev.type === 'boss'
            ? game.startBossCombat()
            : null;
    if (combat) {
      state.combat = combat.snapshot();
      state.phase = 'combat';
      state.pending = state.seats.map(() => null);
      state.deadline = now + ROUND_SECONDS * 1000;
      break;
    }
  }
  save(state, game);
  return null;
}

function checkCommand(state: ExpeditionState, seat: number, cmd: Command): string | null {
  const member = state.game!.party[seat];
  if (!member || !isAlive(member)) return 'That adventurer cannot act.';
  const index = (n: unknown) => typeof n === 'number' && Number.isInteger(n);
  switch (cmd.kind) {
    case 'attack':
      return index(cmd.target) ? null : 'Pick a target.';
    case 'defend':
      return null;
    case 'flee':
      return state.combat!.boss ? 'There is no escape from this fight!' : null;
    case 'skill': {
      if (!SKILLS[cmd.skill] || !knownSkills(member).some((s) => s.id === cmd.skill)) return 'That skill is not known.';
      return index(cmd.target) ? null : 'Pick a target.';
    }
    case 'item':
      if (!ITEMS[cmd.item] || ITEMS[cmd.item].effect === 'warp') return 'That item cannot be used here.';
      return index(cmd.target) ? null : 'Pick a target.';
    default:
      return 'Unknown command.';
  }
}

/**
 * Resolves the round once every present player has chosen (or time is up, or `force`).
 * Seats without a command, and seats of players who left, act on their own.
 */
function settleRound(state: ExpeditionState, now: number, force: boolean): void {
  const game = Game.fromState(state.game!);
  const combat = game.resumeCombat(state.combat!);
  const waiting = state.seats.some((s, i) => !s.left && isAlive(game.state.party[i]) && !state.pending[i]);
  if (waiting && !force && now < state.deadline) return;

  const auto = chooseCommands(combat);
  const commands = game.state.party.map((m, i) => (isAlive(m) ? (state.pending[i] ?? auto[i]) : null));
  const events = combat.resolveRound(commands);
  log(state, { kind: 'round', events });

  if (combat.outcome) {
    game.finishCombat(combat);
    state.combat = null;
    state.pending = [];
    save(state, game);
    if (combat.outcome === 'defeat') end(state, 'wiped');
    else state.phase = 'explore';
    return;
  }
  state.combat = combat.snapshot();
  state.pending = state.seats.map(() => null);
  state.deadline = now + ROUND_SECONDS * 1000;
  save(state, game);
}

function save(state: ExpeditionState, game: Game): void {
  state.game = JSON.parse(game.serialize()) as GameState;
}

type Unsequenced<T> = T extends unknown ? Omit<T, 'seq'> : never;

function log(state: ExpeditionState, entry: Unsequenced<LogEntry>): void {
  state.log.push({ ...entry, seq: state.seq + 1 } as LogEntry);
  if (state.log.length > LOG_SIZE) state.log.splice(0, state.log.length - LOG_SIZE);
}

function note(state: ExpeditionState, text: string): void {
  log(state, { kind: 'note', text });
}

/** Ends the expedition and works out what everyone takes home. */
function end(state: ExpeditionState, reason: EndReason): void {
  state.phase = 'ended';
  state.combat = null;
  state.pending = [];
  const users = players(state);
  const game = state.game;
  const wiped = reason === 'wiped';
  const shares: Share[] = users.map((user) => ({ user, members: [], gold: 0, materials: {}, kills: {} }));
  if (game) {
    const gold = wiped ? 0 : Math.floor(game.gold / users.length);
    const pieces = wiped ? [] : Object.entries(game.materials).flatMap(([id, n]) => Array<string>(n).fill(id));
    shares.forEach((share, u) => {
      share.gold = gold;
      share.kills = { ...game.kills };
      state.seats.forEach((s, i) => {
        if (s.user === share.user) share.members.push(clone(game.party[i]));
      });
      pieces.forEach((id, i) => {
        if (i % users.length === u) share.materials[id] = (share.materials[id] ?? 0) + 1;
      });
    });
  }
  state.result = { reason, shares };
  note(
    state,
    reason === 'returned'
      ? 'The expedition is back in Lindholm.'
      : reason === 'wiped'
        ? 'The expedition has fallen. The Rootdeep keeps what it found.'
        : 'The host called off the expedition.',
  );
}

/**
 * Brings a share home into a player's own save: adventurers get their new level and XP
 * (gear and the rest stay as they are at home), plus gold, materials and kills.
 * Returns the names of the adventurers that were updated.
 */
export function claimShare(home: GameState, share: Share): string[] {
  home.gold += share.gold;
  for (const [id, n] of Object.entries(share.materials)) home.materials[id] = (home.materials[id] ?? 0) + n;
  for (const [id, n] of Object.entries(share.kills)) home.kills[id] = (home.kills[id] ?? 0) + n;
  const updated: string[] = [];
  for (const back of share.members) {
    const mine = [...home.party, ...home.reserve].find((m) => m.name === back.name && m.classId === back.classId);
    if (!mine) continue;
    // Only ever move forward, in case an older share is claimed late.
    if (back.xp > mine.xp) {
      mine.xp = back.xp;
      mine.level = back.level;
    }
    const max = memberStats(mine);
    mine.hp = Math.min(back.hp, max.hp);
    mine.sp = Math.min(back.sp, max.sp);
    updated.push(mine.name);
  }
  return updated;
}
