/**
 * Plays an expedition on screen. The server owns the expedition; this keeps a local
 * copy of the shared game (the "mirror") for drawing, sends the player's actions, and
 * plays back what happened whenever a new state arrives.
 */
import { audio } from '../audio/audio';
import type { Combat, CombatEvent, Command } from '../core/combat';
import { FLOORS } from '../core/data/floors';
import { GATHER_KINDS } from '../core/data/gathering';
import { gatherPrompt } from './gatherView';
import { ITEMS } from '../core/data/items';
import { leaderSeat, type Action, type ExpeditionState, type LogEntry } from '../core/expedition';
import { Game, type StepEvent } from '../core/game';
import { online, OnlineError, type ExpeditionRow } from '../net/online';
import type { RoundDriver } from './combatView';

export interface CoopHost {
  game: Game;
  toast(text: string): void;
  confirm(title: string, text: string, yes: () => void): void;
  viewFx(kind: 'step' | 'turn' | 'bump' | 'encounter'): void;
  shakeView(): void;
  enterExplore(): void;
  updateHud(): void;
  startCombat(combat: Combat, driver: RoundDriver): void;
  /** Ends the command phase of the shown fight (its round was settled without us). */
  forceCombatRound(): void;
  /** The expedition is over (or we left): show the results and go home. */
  finishExpedition(row: ExpeditionRow | null): void;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
/** Ask the server to settle a round this long after its deadline, in case everyone is idle. */
const TICK_GRACE_MS = 1500;

export class CoopSession {
  state: ExpeditionState;
  private mirror: Game;
  private combat: Combat | null = null;
  private unwatch: (() => void) | null = null;
  private timer = 0;
  private lastTick = 0;
  /** Playback runs one state change at a time, in order. */
  private queue: Promise<void> = Promise.resolve();
  /** Leader's moves waiting to be sent (already shown on screen). */
  private outbox: Action[] = [];
  /** The leader waits for the server before moving on (it has something to decide). */
  private blocked = false;
  /** Settled round(s) that arrived before the fight view asked for them. */
  private arrived: CombatEvent[] | null = null;
  private waiting: ((events: CombatEvent[]) => void) | null = null;
  private ended = false;

  constructor(
    private readonly host: CoopHost,
    readonly id: string,
    readonly code: string,
    state: ExpeditionState,
  ) {
    this.state = state;
    this.mirror = Game.fromState(clone(state.game!));
  }

  get me(): string {
    return online.userId ?? '';
  }

  get isLeader(): boolean {
    return this.state.seats[leaderSeat(this.state)]?.user === this.me;
  }

  get leaderName(): string {
    return this.state.seats[leaderSeat(this.state)]?.player ?? 'The leader';
  }

  /** Player names per party slot, for the party cards. */
  get owners(): string[] {
    return this.state.seats.map((s) => (s.left ? `${s.player} (away)` : s.player));
  }

  start(): void {
    this.host.game = this.mirror;
    this.unwatch = online.watch(this.id, (row) => this.receive(row));
    this.timer = window.setInterval(() => this.tick(), 1000);
    if (this.state.phase === 'combat') this.beginCombat();
    else this.host.enterExplore();
  }

  stop(): void {
    this.unwatch?.();
    this.unwatch = null;
    window.clearInterval(this.timer);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * Movement and the action button while exploring (leader only).
   * The local copy of the game has the same random state as the server's, so plain moves are
   * played right away and give the same result there; they are sent in order behind the scenes.
   * Anything the server has to decide (a chest, a fight, stairs, a spring) waits for its answer.
   */
  exploreKey(action: Action): void {
    if (!this.isLeader) {
      this.host.toast(`${this.leaderName} leads the way.`);
      return;
    }
    if (this.blocked || this.combat || this.state.phase !== 'explore' || this.outbox.length >= 4) return;
    if (action.type === 'turn') {
      this.mirror.turn(action.delta);
      audio.play('turn');
      this.host.viewFx('turn');
      this.host.updateHud();
    } else if (action.type === 'step') {
      const events = this.mirror.step(action.forward, action.right);
      for (const ev of events) {
        if (ev.type === 'bump' || ev.type === 'moved' || ev.type === 'chestAhead') void this.showStep(ev);
        else this.blocked = true;
      }
      this.host.updateHud();
    } else {
      this.blocked = true;
    }
    this.outbox.push(action);
    if (this.outbox.length === 1) void this.flush();
  }

  /** Sends the queued moves one after another. */
  private async flush(): Promise<void> {
    while (this.outbox.length) {
      try {
        const row = await online.act(this.id, this.outbox[0]);
        this.outbox.shift();
        this.receive(row);
      } catch (e) {
        // Out of step with the server: drop what is queued and show the server's state again.
        this.outbox = [];
        this.blocked = false;
        this.host.toast(e instanceof OnlineError ? e.message : 'The Hornstone did not answer.');
        this.resync();
      }
    }
  }

  private resync(): void {
    if (this.combat || this.state.phase !== 'explore') return;
    this.mirror = Game.fromState(clone(this.state.game!));
    this.host.game = this.mirror;
    this.host.updateHud();
  }

  private async send(action: Action, quiet = false): Promise<ExpeditionRow | null> {
    try {
      const row = await online.act(this.id, action);
      this.receive(row);
      return row;
    } catch (e) {
      if (!quiet) this.host.toast(e instanceof OnlineError ? e.message : 'The Hornstone did not answer.');
      return null;
    }
  }

  leave(): void {
    void online
      .act(this.id, { type: 'leave' })
      .then((row) => this.finish(row))
      .catch(() => this.finish(null));
  }

  useFeather(): void {
    void this.send({ type: 'feather' });
  }

  // ── Receiving ──────────────────────────────────────────────────────────────

  private receive(row: ExpeditionRow): void {
    if (row.state.seq <= this.state.seq || this.ended) return;
    const fresh = row.state.log.filter((e) => e.seq > this.state.seq);
    this.state = row.state;
    const state = row.state;
    this.queue = this.queue.then(() => this.play(fresh, state, row)).catch((e) => console.error(e));
  }

  private async play(entries: LogEntry[], state: ExpeditionState, row: ExpeditionRow): Promise<void> {
    const rounds = entries.flatMap((e) => (e.kind === 'round' ? e.events : []));
    if (this.combat) {
      if (rounds.length || state.phase !== 'combat') {
        // Bring the fight on screen up to date, then let the fight view play the round.
        this.syncMembers(state);
        if (state.combat) this.combat.apply(state.combat);
        else {
          const end = rounds.find((e): e is Extract<CombatEvent, { type: 'end' }> => e.type === 'end');
          this.combat.outcome = end?.outcome ?? 'victory';
          this.combat.rewards = end?.rewards ?? null;
        }
        this.deliver(rounds);
      }
      return;
    }

    // The leader has already seen their own plain moves.
    const predicted = this.isLeader;
    for (const entry of entries) {
      if (entry.kind === 'note') this.host.toast(entry.text);
      if (entry.kind !== 'step') continue;
      for (const ev of entry.events) {
        if (predicted && (ev.type === 'bump' || ev.type === 'moved' || ev.type === 'chestAhead')) continue;
        await this.showStep(ev);
      }
    }
    if (state.phase === 'ended') return this.finish(row);
    // More of the leader's moves are on their way: keep showing the moves already made.
    if (predicted && this.outbox.length && state.phase === 'explore') return;
    if (state.phase === 'explore') this.blocked = false;

    const floorChanged = state.game!.floor !== this.mirror.state.floor;
    if (!predicted && !floorChanged && state.game!.dir !== this.mirror.state.dir) {
      audio.play('turn');
      this.host.viewFx('turn');
    }
    this.mirror = Game.fromState(clone(state.game!));
    this.host.game = this.mirror;
    if (state.phase === 'combat') {
      await wait(700);
      this.beginCombat(state);
      return;
    }
    if (floorChanged) {
      audio.play('stairs');
      this.host.enterExplore();
    }
    this.host.updateHud();
  }

  private async showStep(ev: StepEvent): Promise<void> {
    switch (ev.type) {
      case 'bump':
        audio.play('bump');
        this.host.viewFx('bump');
        return;
      case 'moved':
        audio.play('step');
        this.host.viewFx('step');
        return;
      case 'chestAhead':
        audio.play('bump');
        if (this.isLeader) this.host.toast(ev.opened ? 'An empty chest.' : 'A chest! Press Space or Act to open it.');
        return;
      case 'chest': {
        audio.play('chest');
        const loot = 'gold' in ev.loot ? `${ev.loot.gold} gold` : `${ev.loot.qty}× ${ITEMS[ev.loot.item].name}`;
        this.host.toast(`Found ${loot} in the chest! It goes into the shared pack.`);
        return;
      }
      case 'emptyChest':
        this.host.toast('The chest is empty.');
        return;
      case 'prowlerAlert':
        audio.play('prowlerAlert');
        this.host.toast('A prowler has caught your scent!');
        this.host.shakeView();
        return;
      case 'encounter':
      case 'prowler':
        audio.play('encounter');
        this.host.viewFx('encounter');
        return;
      case 'boss':
        audio.music(null);
        audio.play('bossIntro');
        this.host.toast('A terrible presence stirs...');
        await wait(600);
        return;
      case 'stairs':
      case 'upstairs':
      case 'spring':
      case 'gatherSpot':
        // Shown after the mirror is updated, so the dialog sees the new position.
        window.setTimeout(() => this.offer(ev), 0);
        return;
      case 'nothing':
        return;
    }
  }

  /** Stairs and springs: the leader decides, the others are told. */
  private offer(ev: StepEvent): void {
    if (!this.isLeader) {
      if (ev.type !== 'spring' || !ev.used) this.host.toast(`${this.leaderName} is deciding what to do...`);
      return;
    }
    const floor = this.mirror.state.floor;
    if (ev.type === 'stairs') {
      if (floor >= FLOORS.length - 1) return;
      this.host.confirm('Stairs down', `Lead everyone down to ${FLOORS[floor + 1].name}?`, () => void this.send({ type: 'descend' }));
    } else if (ev.type === 'upstairs') {
      const text = floor === 0 ? 'Lead everyone back to Lindholm? This ends the expedition.' : `Climb up to ${FLOORS[floor - 1].name}?`;
      this.host.confirm('Stairs up', text, () => void this.send({ type: 'ascend' }));
    } else if (ev.type === 'gatherSpot') {
      const message = gatherPrompt(ev);
      if (!message.ask) return this.host.toast(message.text);
      this.host.confirm(GATHER_KINDS[ev.kind].verb, message.text, () => void this.send({ type: 'gather' }));
    } else if (ev.type === 'spring') {
      if (ev.used) return this.host.toast('The spring has run dry.');
      this.host.confirm('Healing spring', 'Let everyone drink from the spring? It fully restores the party. It only works once.', () => {
        audio.play('spring');
        void this.send({ type: 'drink' });
      });
    }
  }

  // ── Combat ─────────────────────────────────────────────────────────────────

  private beginCombat(state = this.state): void {
    this.combat = this.mirror.resumeCombat(clone(state.combat!));
    this.arrived = null;
    this.waiting = null;
    const driver: RoundDriver = {
      controls: (i) => {
        const seat = this.state.seats[i];
        return !!seat && seat.user === this.me && !seat.left;
      },
      resolve: (commands) => this.resolveRound(commands),
      status: () => {
        const left = Math.max(0, Math.ceil((this.state.deadline - Date.now()) / 1000));
        return this.state.phase === 'combat' ? `${left}s left to choose` : '';
      },
    };
    this.host.startCombat(this.combat, driver);
  }

  private resolveRound(commands: (Command | null)[]): Promise<CombatEvent[]> {
    if (this.arrived) {
      const events = this.arrived;
      this.arrived = null;
      return Promise.resolve(events);
    }
    const promise = new Promise<CombatEvent[]>((resolve) => (this.waiting = resolve));
    const round = this.state.combat?.round;
    void (async () => {
      for (const [i, cmd] of commands.entries()) {
        const seat = this.state.seats[i];
        if (!cmd || !seat || seat.user !== this.me || seat.left) continue;
        await this.send({ type: 'command', seat: i, command: cmd, round }, true);
      }
    })();
    return promise;
  }

  private deliver(events: CombatEvent[]): void {
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = null;
      resolve(events);
    } else {
      this.arrived = [...(this.arrived ?? []), ...events];
      this.host.forceCombatRound();
    }
  }

  /** Called by the fight view once its fight has been played to the end. */
  combatOver(): void {
    this.combat = null;
    const state = this.state;
    if (state.phase === 'ended') {
      this.finish({ id: this.id, code: this.code, state });
      return;
    }
    this.mirror = Game.fromState(clone(state.game!));
    this.host.game = this.mirror;
    if (state.phase === 'combat') {
      // Another fight started while this one was being played back.
      this.beginCombat();
      return;
    }
    this.host.enterExplore();
  }

  private syncMembers(state: ExpeditionState): void {
    state.game!.party.forEach((m, i) => Object.assign(this.mirror.state.party[i], m));
    Object.assign(this.mirror.state.inventory, state.game!.inventory);
  }

  private tick(): void {
    const s = this.state;
    if (s.phase !== 'combat' || this.ended) return;
    const now = Date.now();
    if (now < s.deadline + TICK_GRACE_MS || now - this.lastTick < 3000) return;
    this.lastTick = now;
    void this.send({ type: 'tick' }, true);
  }

  private finish(row: ExpeditionRow | null): void {
    if (this.ended) return;
    this.ended = true;
    this.stop();
    this.host.finishExpedition(row);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
