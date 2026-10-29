import { CLASSES } from './data/classes';
import { ENEMIES, type EnemyDef, type EnemySkill } from './data/enemies';
import { ITEMS } from './data/items';
import { SKILLS } from './data/skills';
import { grantXp, healAmount, healMember, isAlive, memberStats, restoreTp } from './party';
import type { Rng } from './rng';
import type { Element, ItemId, Member, SkillId } from './types';

export interface EnemyUnit {
  def: EnemyDef;
  name: string;
  hp: number;
  maxHp: number;
}

export interface PartyStatus {
  defending: boolean;
  /** Rounds left in which enemies prefer to attack this member. */
  provoke: number;
  /** Rounds left of reduced incoming damage. */
  guard: number;
}

export type Command =
  | { kind: 'attack'; target: number }
  | { kind: 'skill'; skill: SkillId; target: number }
  | { kind: 'defend' }
  | { kind: 'item'; item: ItemId; target: number }
  | { kind: 'flee' };

export type Side = 'party' | 'enemy';
export type Outcome = 'victory' | 'defeat' | 'fled';

export interface Rewards {
  xp: number;
  gold: number;
  drops: ItemId[];
  levelUps: { member: number; level: number }[];
}

export type CombatEvent =
  | { type: 'act'; side: Side; actor: number; text: string }
  | { type: 'damage'; side: Side; target: number; amount: number; hp: number; crit: boolean; weak: boolean; resist: boolean }
  | { type: 'heal'; target: number; amount: number; hp: number }
  | { type: 'tp'; target: number; tp: number }
  | { type: 'miss'; side: Side; target: number }
  | { type: 'down'; side: Side; target: number; text: string }
  | { type: 'info'; text: string }
  | { type: 'end'; outcome: Outcome; rewards?: Rewards };

export interface CombatOptions {
  boss?: boolean;
}

const WEAK_MULT = 1.5;
const RESIST_MULT = 0.5;

export class Combat {
  readonly enemies: EnemyUnit[];
  readonly status: PartyStatus[];
  readonly boss: boolean;
  round = 1;
  outcome: Outcome | null = null;
  rewards: Rewards | null = null;

  constructor(
    readonly party: Member[],
    enemyIds: string[],
    readonly inventory: Record<ItemId, number>,
    private readonly rng: Rng,
    opts: CombatOptions = {},
  ) {
    this.boss = !!opts.boss;
    this.enemies = enemyIds.map((id) => {
      const def = ENEMIES[id];
      if (!def) throw new Error(`Unknown enemy "${id}"`);
      return { def, name: def.name, hp: def.hp, maxHp: def.hp };
    });
    // "Moss Slime A", "Moss Slime B" when an enemy appears more than once.
    for (const e of this.enemies) {
      const same = this.enemies.filter((o) => o.def.id === e.def.id);
      if (same.length > 1) e.name = `${e.def.name} ${String.fromCharCode(65 + same.indexOf(e))}`;
    }
    this.status = party.map(() => ({ defending: false, provoke: 0, guard: 0 }));
  }

  get canFlee(): boolean {
    return !this.boss;
  }

  livingEnemies(): number[] {
    return this.enemies.flatMap((e, i) => (e.hp > 0 ? [i] : []));
  }

  livingParty(): number[] {
    return this.party.flatMap((m, i) => (isAlive(m) ? [i] : []));
  }

  /**
   * Resolves one full round. `commands[i]` is the command for party member i
   * (ignored for fallen members). Mutates party, enemies and inventory.
   */
  resolveRound(commands: (Command | null)[]): CombatEvent[] {
    if (this.outcome) return [];
    const events: CombatEvent[] = [];

    type Turn = { side: Side; index: number; initiative: number };
    const turns: Turn[] = [];
    for (const i of this.livingParty()) {
      const cmd = commands[i];
      if (!cmd) continue;
      const spd = memberStats(this.party[i]).spd;
      // Defending always happens before anything else this round.
      const initiative = cmd.kind === 'defend' ? 1e6 : spd * this.rng.range(0.8, 1.2);
      turns.push({ side: 'party', index: i, initiative });
    }
    for (const i of this.livingEnemies()) {
      turns.push({ side: 'enemy', index: i, initiative: this.enemies[i].def.spd * this.rng.range(0.8, 1.2) });
    }
    turns.sort((a, b) => b.initiative - a.initiative);

    for (const turn of turns) {
      if (turn.side === 'party') {
        if (!isAlive(this.party[turn.index])) continue;
        this.partyAct(turn.index, commands[turn.index]!, events);
      } else {
        if (this.enemies[turn.index].hp <= 0) continue;
        this.enemyAct(turn.index, events);
      }
      if (this.outcome) break;
      if (this.checkEnd(events)) break;
    }

    for (const s of this.status) {
      s.defending = false;
      s.provoke = Math.max(0, s.provoke - 1);
      s.guard = Math.max(0, s.guard - 1);
    }
    if (!this.outcome) this.round += 1;
    return events;
  }

  // ── Party actions ──────────────────────────────────────────────────────────

  private partyAct(i: number, cmd: Command, events: CombatEvent[]): void {
    const m = this.party[i];
    switch (cmd.kind) {
      case 'defend':
        this.status[i].defending = true;
        events.push({ type: 'act', side: 'party', actor: i, text: `${m.name} defends.` });
        return;

      case 'attack': {
        const target = this.retargetEnemy(cmd.target);
        if (target < 0) return;
        events.push({ type: 'act', side: 'party', actor: i, text: `${m.name} attacks!` });
        this.hitEnemy(i, target, 100, 'phys', 'phys', events);
        return;
      }

      case 'skill': {
        const skill = SKILLS[cmd.skill];
        if (m.tp < skill.tp) {
          events.push({ type: 'info', text: `${m.name} doesn't have enough TP.` });
          return;
        }
        m.tp -= skill.tp;
        events.push({ type: 'tp', target: i, tp: m.tp });
        events.push({ type: 'act', side: 'party', actor: i, text: `${m.name} uses ${skill.name}!` });

        if (skill.kind === 'phys' || skill.kind === 'magic') {
          const first = this.retargetEnemy(cmd.target);
          const targets = skill.target === 'allEnemies' ? this.livingEnemies() : first >= 0 ? [first] : [];
          for (const t of targets) {
            for (let h = 0; h < skill.hits && this.enemies[t].hp > 0; h++) {
              this.hitEnemy(i, t, skill.power, skill.kind, skill.element, events);
            }
          }
        } else if (skill.kind === 'heal') {
          const targets = skill.target === 'allAllies' ? this.livingParty() : [this.retargetAlly(cmd.target)];
          const amount = healAmount(m, skill.power);
          for (const t of targets) {
            if (t < 0) continue;
            const healed = healMember(this.party[t], amount);
            events.push({ type: 'heal', target: t, amount: healed, hp: this.party[t].hp });
          }
        } else if (skill.kind === 'provoke') {
          this.status[i].provoke = 2;
          events.push({ type: 'info', text: `The enemies glare at ${m.name}.` });
        } else if (skill.kind === 'guard') {
          for (const s of this.status) s.guard = 3;
          events.push({ type: 'info', text: 'The party braces behind a wall of shields.' });
        }
        return;
      }

      case 'item': {
        const item = ITEMS[cmd.item];
        if ((this.inventory[cmd.item] ?? 0) <= 0) {
          events.push({ type: 'info', text: `There is no ${item.name} left.` });
          return;
        }
        const target = this.party[cmd.target];
        events.push({ type: 'act', side: 'party', actor: i, text: `${m.name} uses ${item.name}.` });
        if (!target || !isAlive(target)) {
          events.push({ type: 'info', text: 'But nothing happened.' });
          return;
        }
        this.inventory[cmd.item] -= 1;
        if (item.restores === 'hp') {
          const healed = healMember(target, item.amount);
          events.push({ type: 'heal', target: cmd.target, amount: healed, hp: target.hp });
        } else {
          restoreTp(target, item.amount);
          events.push({ type: 'tp', target: cmd.target, tp: target.tp });
        }
        return;
      }

      case 'flee': {
        events.push({ type: 'act', side: 'party', actor: i, text: `${m.name} looks for an escape...` });
        if (!this.canFlee) {
          events.push({ type: 'info', text: "There's no escape!" });
          return;
        }
        if (this.rng.chance(this.fleeChance())) {
          this.outcome = 'fled';
          events.push({ type: 'info', text: 'The party escaped!' });
          events.push({ type: 'end', outcome: 'fled' });
        } else {
          events.push({ type: 'info', text: "Couldn't get away!" });
        }
        return;
      }
    }
  }

  fleeChance(): number {
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    const partySpd = avg(this.livingParty().map((i) => memberStats(this.party[i]).spd));
    const enemySpd = avg(this.livingEnemies().map((i) => this.enemies[i].def.spd));
    return Math.min(0.9, Math.max(0.25, 0.55 + (partySpd - enemySpd) * 0.03));
  }

  private hitEnemy(
    memberIndex: number,
    enemyIndex: number,
    power: number,
    kind: 'phys' | 'magic',
    element: Element,
    events: CombatEvent[],
  ): void {
    const m = this.party[memberIndex];
    const enemy = this.enemies[enemyIndex];
    const stats = memberStats(m);

    if (kind === 'phys' && this.rng.chance(0.04)) {
      events.push({ type: 'miss', side: 'enemy', target: enemyIndex });
      return;
    }

    let base = kind === 'phys' ? stats.atk * 1.6 - enemy.def.def * 0.8 : stats.mag * 1.7 - enemy.def.res * 0.8;
    base = Math.max(stats.atk * 0.3, base);
    if (kind === 'phys' && m.row === 'back' && !CLASSES[m.classId].ranged) base *= 0.5;

    const { damage, crit, weak, resist } = this.roll(base, power, element, enemy.def.weak, enemy.def.resist, kind === 'phys');
    enemy.hp = Math.max(0, enemy.hp - damage);
    events.push({ type: 'damage', side: 'enemy', target: enemyIndex, amount: damage, hp: enemy.hp, crit, weak, resist });
    if (enemy.hp === 0) {
      events.push({ type: 'down', side: 'enemy', target: enemyIndex, text: `${enemy.name} is defeated!` });
    }
  }

  // ── Enemy actions ──────────────────────────────────────────────────────────

  private enemyAct(i: number, events: CombatEvent[]): void {
    const enemy = this.enemies[i];
    if (this.livingParty().length === 0) return;

    let skill: EnemySkill | null = null;
    for (const s of enemy.def.skills ?? []) {
      if (this.rng.chance(s.chance)) {
        skill = s;
        break;
      }
    }
    const action: EnemySkill = skill ?? { name: 'Attack', chance: 1, kind: 'phys', element: 'phys', power: 100, target: 'one' };

    events.push({
      type: 'act',
      side: 'enemy',
      actor: i,
      text: skill ? `${enemy.name} uses ${skill.name}!` : `${enemy.name} attacks!`,
    });

    const targets = action.target === 'all' ? this.livingParty() : [this.pickPartyTarget()];
    for (const t of targets) this.hitParty(enemy, t, action, events);
  }

  private pickPartyTarget(): number {
    const living = this.livingParty();
    const provoker = living.find((i) => this.status[i].provoke > 0);
    if (provoker !== undefined && this.rng.chance(0.85)) return provoker;
    return this.rng.weighted(living.map((i) => ({ i, weight: this.party[i].row === 'front' ? 2 : 1 }))).i;
  }

  private hitParty(enemy: EnemyUnit, memberIndex: number, action: EnemySkill, events: CombatEvent[]): void {
    const m = this.party[memberIndex];
    const stats = memberStats(m);
    const status = this.status[memberIndex];

    if (action.kind === 'phys' && this.rng.chance(0.05)) {
      events.push({ type: 'miss', side: 'party', target: memberIndex });
      return;
    }

    let base =
      action.kind === 'phys' ? enemy.def.atk * 1.6 - stats.def * 0.8 : enemy.def.mag * 1.7 - stats.res * 0.8;
    base = Math.max(enemy.def.atk * 0.3, base);
    if (action.kind === 'phys' && m.row === 'back' && !enemy.def.ranged) base *= 0.5;
    if (status.defending) base *= 0.5;
    if (status.guard > 0) base *= 0.7;

    const { damage, crit } = this.roll(base, action.power, action.element, [], [], action.kind === 'phys');
    m.hp = Math.max(0, m.hp - damage);
    events.push({ type: 'damage', side: 'party', target: memberIndex, amount: damage, hp: m.hp, crit, weak: false, resist: false });
    if (m.hp === 0) {
      events.push({ type: 'down', side: 'party', target: memberIndex, text: `${m.name} falls!` });
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private roll(base: number, power: number, element: Element, weakTo: Element[], resists: Element[], canCrit: boolean) {
    let value = base * (power / 100) * this.rng.range(0.9, 1.1);
    const weak = weakTo.includes(element);
    const resist = resists.includes(element);
    if (weak) value *= WEAK_MULT;
    if (resist) value *= RESIST_MULT;
    const crit = canCrit && this.rng.chance(0.06);
    if (crit) value *= 1.5;
    return { damage: Math.max(1, Math.round(value)), crit, weak, resist };
  }

  /** The chosen enemy, or a random living one if it already fell. -1 if none are left. */
  private retargetEnemy(target: number): number {
    if (this.enemies[target]?.hp > 0) return target;
    const living = this.livingEnemies();
    return living.length ? this.rng.pick(living) : -1;
  }

  private retargetAlly(target: number): number {
    if (this.party[target] && isAlive(this.party[target])) return target;
    return -1;
  }

  private checkEnd(events: CombatEvent[]): boolean {
    if (this.livingEnemies().length === 0) {
      this.outcome = 'victory';
      this.rewards = this.grantRewards();
      events.push({ type: 'end', outcome: 'victory', rewards: this.rewards });
      return true;
    }
    if (this.livingParty().length === 0) {
      this.outcome = 'defeat';
      events.push({ type: 'end', outcome: 'defeat' });
      return true;
    }
    return false;
  }

  private grantRewards(): Rewards {
    const xp = this.enemies.reduce((sum, e) => sum + e.def.xp, 0);
    const gold = this.enemies.reduce((sum, e) => sum + e.def.gold, 0);
    const drops: ItemId[] = [];
    for (const e of this.enemies) {
      if (e.def.drop && this.rng.chance(e.def.drop.chance)) drops.push(e.def.drop.item);
    }
    for (const item of drops) this.inventory[item] = (this.inventory[item] ?? 0) + 1;

    const levelUps: Rewards['levelUps'] = [];
    this.party.forEach((m, i) => {
      if (grantXp(m, xp) > 0) levelUps.push({ member: i, level: m.level });
    });
    return { xp, gold, drops, levelUps };
  }
}
