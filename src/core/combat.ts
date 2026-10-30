import { CLASSES } from './data/classes';
import { ENEMIES, type EnemyDef, type EnemySkill } from './data/enemies';
import { ITEMS } from './data/items';
import { skillFor } from './skilltree';
import { grantXp, healAmount, healMember, isAlive, memberStats, restoreSp, revive } from './party';
import type { Rng } from './rng';
import type { Ailment, Element, Inflict, ItemId, Member, ModStat, SkillId } from './types';

/** Something in the fight that can suffer an ailment. */
interface Afflictable {
  ailment: Ailment | null;
  ailmentTurns: number;
  /** Raised or lowered stats (percent) and the rounds they still last. */
  mods?: Mods;
}

export type Mods = Partial<Record<ModStat, { amount: number; turns: number }>>;

/**
 * How buffs and debuffs change a hit: the attacker's attack (or magic) raises the damage by its
 * percent, the defender's defence (or resistance) lowers it by its percent.
 */
function modFactor(attacker: Mods | undefined, defender: Mods | undefined, kind: 'phys' | 'magic'): number {
  const up = attacker?.[kind === 'phys' ? 'atk' : 'mag']?.amount ?? 0;
  const guard = defender?.[kind === 'phys' ? 'def' : 'res']?.amount ?? 0;
  return Math.max(0.2, 1 + up / 100) * Math.max(0.2, 1 - guard / 100);
}

function tickMods(unit: Afflictable): void {
  if (!unit.mods) return;
  for (const stat of Object.keys(unit.mods) as ModStat[]) {
    const m = unit.mods[stat]!;
    m.turns -= 1;
    if (m.turns <= 0) delete unit.mods[stat];
  }
}

export interface EnemyUnit extends Afflictable {
  def: EnemyDef;
  name: string;
  hp: number;
  maxHp: number;
}

export interface PartyStatus extends Afflictable {
  defending: boolean;
  /** Rounds left in which enemies prefer to attack this member. */
  taunt: number;
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
  /** Material ids, one entry per piece. */
  materials: string[];
  levelUps: { member: number; level: number }[];
}

export type CombatEvent =
  | { type: 'act'; side: Side; actor: number; text: string }
  | { type: 'damage'; side: Side; target: number; amount: number; hp: number; crit: boolean; weak: boolean; resist: boolean; element: Element }
  | { type: 'heal'; target: number; amount: number; hp: number }
  | { type: 'sp'; target: number; sp: number }
  | { type: 'miss'; side: Side; target: number }
  | { type: 'down'; side: Side; target: number; text: string }
  /** An ailment starts (ailment set) or ends (null). */
  | { type: 'ailment'; side: Side; target: number; ailment: Ailment | null; text: string }
  | { type: 'info'; text: string }
  | { type: 'end'; outcome: Outcome; rewards?: Rewards };

/** Everything about a fight that changes while it runs, in plain JSON (for saving or sending). */
export interface CombatSnapshot {
  enemies: { id: string; name: string; hp: number; ailment: Ailment | null; ailmentTurns: number; mods?: Mods }[];
  status: PartyStatus[];
  round: number;
  outcome: Outcome | null;
  rewards: Rewards | null;
  boss: boolean;
  prowler: boolean;
}

export interface CombatOptions {
  boss?: boolean;
  prowler?: boolean;
}

const WEAK_MULT = 1.5;
/**
 * The pace of growth: share of the listed XP and gold an enemy gives. Below 1 on purpose, so getting
 * stronger takes time (the owner wants a game that rewards grinding).
 */
export const XP_RATE = 0.7;
export const GOLD_RATE = 0.75;
/** Prowlers are hard to shake off, whatever the party's speed. */
export const PROWLER_FLEE_CHANCE = 0.3;
const RESIST_MULT = 0.5;

const STAT_WORDS: Record<ModStat, string> = { atk: 'attack', def: 'defence', mag: 'magic', res: 'resistance' };
const clone = <T>(value: T): T => (value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T));

export const AILMENT_NAMES: Record<Ailment, string> = { poison: 'Poison', sleep: 'Sleep', paralysis: 'Paralysis' };
const AILMENT_TURNS: Record<Ailment, number> = { poison: 4, sleep: 3, paralysis: 3 };
/** Chance that a paralysed fighter can't act on their turn. */
export const PARALYSIS_FAIL = 0.5;

export class Combat {
  readonly enemies: EnemyUnit[];
  readonly status: PartyStatus[];
  readonly boss: boolean;
  readonly prowler: boolean;
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
    this.prowler = !!opts.prowler;
    this.enemies = enemyIds.map((id) => {
      const def = ENEMIES[id];
      if (!def) throw new Error(`Unknown enemy "${id}"`);
      return { def, name: def.name, hp: def.hp, maxHp: def.hp, ailment: null, ailmentTurns: 0 };
    });
    // "Bogling A", "Bogling B" when an enemy appears more than once.
    for (const e of this.enemies) {
      const same = this.enemies.filter((o) => o.def.id === e.def.id);
      if (same.length > 1) e.name = `${e.def.name} ${String.fromCharCode(65 + same.indexOf(e))}`;
    }
    this.status = party.map(() => ({ defending: false, taunt: 0, guard: 0, ailment: null, ailmentTurns: 0 }));
  }

  snapshot(): CombatSnapshot {
    return {
      enemies: this.enemies.map((e) => ({ id: e.def.id, name: e.name, hp: e.hp, ailment: e.ailment, ailmentTurns: e.ailmentTurns, mods: clone(e.mods) })),
      status: this.status.map((s) => ({ ...s, mods: clone(s.mods) })),
      round: this.round,
      outcome: this.outcome,
      rewards: this.rewards,
      boss: this.boss,
      prowler: this.prowler,
    };
  }

  /** Rebuilds a fight from a snapshot, around the given party, pack and random source. */
  static restore(snap: CombatSnapshot, party: Member[], inventory: Record<ItemId, number>, rng: Rng): Combat {
    const combat = new Combat(party, snap.enemies.map((e) => e.id), inventory, rng, { boss: snap.boss, prowler: snap.prowler });
    combat.apply(snap);
    return combat;
  }

  /** Overwrites this fight's changing state in place with a snapshot of the same fight. */
  apply(snap: CombatSnapshot): void {
    snap.enemies.forEach((e, i) => Object.assign(this.enemies[i], { name: e.name, hp: e.hp, ailment: e.ailment, ailmentTurns: e.ailmentTurns, mods: clone(e.mods) }));
    snap.status.forEach((s, i) => {
      if (this.status[i]) Object.assign(this.status[i], { ...s, mods: clone(s.mods) });
    });
    this.round = snap.round;
    this.outcome = snap.outcome;
    this.rewards = snap.rewards;
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
        if (this.held('party', turn.index, events)) continue;
        this.partyAct(turn.index, commands[turn.index]!, events);
      } else {
        if (this.enemies[turn.index].hp <= 0) continue;
        if (this.held('enemy', turn.index, events)) continue;
        this.enemyAct(turn.index, events);
      }
      if (this.outcome) break;
      if (this.checkEnd(events)) break;
    }

    if (!this.outcome) {
      this.tickAilments(events);
      this.checkEnd(events);
    }

    for (const unit of [...this.status, ...this.enemies]) tickMods(unit);
    for (const s of this.status) {
      s.defending = false;
      s.taunt = Math.max(0, s.taunt - 1);
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
        const skill = skillFor(m, cmd.skill);
        if (!skill || skill.kind === 'passive') {
          events.push({ type: 'info', text: `${m.name} doesn't know that skill.` });
          return;
        }
        if (m.sp < skill.sp) {
          events.push({ type: 'info', text: `${m.name} doesn't have enough SP.` });
          return;
        }
        m.sp -= skill.sp;
        events.push({ type: 'sp', target: i, sp: m.sp });
        if (skill.hpCost) {
          const cost = Math.min(m.hp - 1, Math.round((memberStats(m).hp * skill.hpCost) / 100));
          m.hp -= cost;
          events.push({ type: 'damage', side: 'party', target: i, amount: cost, hp: m.hp, crit: false, weak: false, resist: false, element: 'phys' });
        }
        events.push({ type: 'act', side: 'party', actor: i, text: `${m.name} uses ${skill.name}!` });

        if (skill.kind === 'phys' || skill.kind === 'magic') {
          const first = this.retargetEnemy(cmd.target);
          const targets = skill.target === 'allEnemies' ? this.livingEnemies() : first >= 0 ? [first] : [];
          for (const t of targets) {
            for (let h = 0; h < skill.hits && this.enemies[t].hp > 0; h++) {
              this.hitEnemy(i, t, skill.power, skill.kind, skill.element, events);
            }
            if (skill.inflict && this.enemies[t].hp > 0) this.tryInflict('enemy', t, skill.inflict, events);
          }
        } else if (skill.kind === 'ailment') {
          const first = this.retargetEnemy(cmd.target);
          const targets = skill.target === 'allEnemies' ? this.livingEnemies() : first >= 0 ? [first] : [];
          for (const t of targets) {
            if (skill.inflict && !this.tryInflict('enemy', t, skill.inflict, events)) events.push({ type: 'miss', side: 'enemy', target: t });
          }
        } else if (skill.kind === 'cure') {
          const t = this.retargetAlly(cmd.target);
          if (t < 0 || !this.status[t].ailment) events.push({ type: 'info', text: 'But nothing happened.' });
          else this.clearAilment('party', t, events);
        } else if (skill.kind === 'heal') {
          const targets = skill.target === 'allAllies' ? this.livingParty() : [this.retargetAlly(cmd.target)];
          const amount = healAmount(m, skill.power);
          for (const t of targets) {
            if (t < 0) continue;
            const healed = healMember(this.party[t], amount);
            events.push({ type: 'heal', target: t, amount: healed, hp: this.party[t].hp });
          }
        } else if (skill.kind === 'revive') {
          const target = this.party[cmd.target];
          if (!target || isAlive(target)) {
            events.push({ type: 'info', text: 'But nothing happened.' });
          } else {
            const hp = revive(target, skill.power);
            events.push({ type: 'heal', target: cmd.target, amount: hp, hp });
            events.push({ type: 'info', text: `${target.name} is back on their feet!` });
          }
        } else if (skill.kind === 'buff' || skill.kind === 'debuff') {
          const enemiesHit = skill.kind === 'debuff';
          const targets = enemiesHit
            ? skill.target === 'allEnemies' ? this.livingEnemies() : [this.retargetEnemy(cmd.target)]
            : skill.target === 'allAllies' ? this.livingParty() : skill.target === 'self' ? [i] : [this.retargetAlly(cmd.target)];
          for (const t of targets) {
            if (t < 0) continue;
            const unit = enemiesHit ? this.enemies[t] : this.status[t];
            unit.mods ??= {};
            for (const mod of skill.mods ?? []) {
              const old = unit.mods[mod.stat];
              // The stronger effect wins; casting again refreshes it.
              const amount = old && Math.abs(old.amount) > Math.abs(mod.amount) && Math.sign(old.amount) === Math.sign(mod.amount) ? old.amount : mod.amount;
              unit.mods[mod.stat] = { amount, turns: skill.turns ?? 3 };
            }
          }
          const who = enemiesHit ? (skill.target === 'allEnemies' ? 'The enemies' : this.enemies[targets[0]]?.name ?? 'The enemy') : skill.target === 'allAllies' ? 'The party' : this.party[targets[0]]?.name ?? m.name;
          events.push({ type: 'info', text: `${who}: ${(skill.mods ?? []).map((x) => `${STAT_WORDS[x.stat]} ${x.amount > 0 ? 'up' : 'down'}`).join(', ')}.` });
        } else if (skill.kind === 'challenge') {
          this.status[i].taunt = skill.turns ?? 2;
          events.push({ type: 'info', text: `The enemies glare at ${m.name}.` });
        } else if (skill.kind === 'guard') {
          for (const s of this.status) s.guard = skill.turns ?? 3;
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
        // Revive items only work on the fallen; everything else only on the living.
        if (!target || isAlive(target) === (item.effect === 'revive')) {
          events.push({ type: 'info', text: 'But nothing happened.' });
          return;
        }
        this.inventory[cmd.item] -= 1;
        if (item.effect === 'warp') {
          events.push({ type: 'info', text: 'It has no effect here.' });
        } else if (item.effect === 'revive') {
          const hp = revive(target, item.amount);
          events.push({ type: 'heal', target: cmd.target, amount: hp, hp });
          events.push({ type: 'info', text: `${target.name} is back on their feet!` });
        } else if (item.effect === 'cure') {
          if (this.status[cmd.target].ailment) this.clearAilment('party', cmd.target, events);
          else events.push({ type: 'info', text: 'But nothing happened.' });
        } else if (item.effect === 'hp') {
          const healed = healMember(target, item.amount);
          events.push({ type: 'heal', target: cmd.target, amount: healed, hp: target.hp });
        } else {
          restoreSp(target, item.amount);
          events.push({ type: 'sp', target: cmd.target, sp: target.sp });
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
    if (this.prowler) return PROWLER_FLEE_CHANCE;
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
    base *= modFactor(this.status[memberIndex].mods, enemy.mods, kind);
    if (kind === 'phys' && m.row === 'back' && !CLASSES[m.classId].ranged) base *= 0.5;

    const { damage, crit, weak, resist } = this.roll(base, power, element, enemy.def.weak, enemy.def.resist, kind === 'phys');
    enemy.hp = Math.max(0, enemy.hp - damage);
    events.push({ type: 'damage', side: 'enemy', target: enemyIndex, amount: damage, hp: enemy.hp, crit, weak, resist, element });
    if (enemy.hp === 0) {
      events.push({ type: 'down', side: 'enemy', target: enemyIndex, text: `${enemy.name} is defeated!` });
    } else if (enemy.ailment === 'sleep') {
      this.clearAilment('enemy', enemyIndex, events, `${enemy.name} wakes up!`);
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
    const taunter = living.find((i) => this.status[i].taunt > 0);
    if (taunter !== undefined && this.rng.chance(0.85)) return taunter;
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
    base *= modFactor(enemy.mods, status.mods, action.kind);
    if (action.kind === 'phys' && m.row === 'back' && !enemy.def.ranged) base *= 0.5;
    if (status.defending) base *= 0.5;
    if (status.guard > 0) base *= 0.7;

    const { damage, crit } = this.roll(base, action.power, action.element, [], [], action.kind === 'phys');
    m.hp = Math.max(0, m.hp - damage);
    events.push({ type: 'damage', side: 'party', target: memberIndex, amount: damage, hp: m.hp, crit, weak: false, resist: false, element: action.element });
    if (m.hp === 0) {
      this.status[memberIndex].ailment = null;
      events.push({ type: 'down', side: 'party', target: memberIndex, text: `${m.name} falls!` });
      return;
    }
    if (status.ailment === 'sleep') this.clearAilment('party', memberIndex, events, `${m.name} wakes up!`);
    if (action.inflict) this.tryInflict('party', memberIndex, action.inflict, events);
  }

  // ── Ailments ───────────────────────────────────────────────────────────────

  private afflicted(side: Side, index: number): Afflictable {
    return side === 'party' ? this.status[index] : this.enemies[index];
  }

  private nameOf(side: Side, index: number): string {
    return side === 'party' ? this.party[index].name : this.enemies[index].name;
  }

  /** Rolls an ailment on a target. Bosses can't be put to sleep and resist the rest. Returns true if it took. */
  private tryInflict(side: Side, index: number, inflict: Inflict, events: CombatEvent[]): boolean {
    const target = this.afflicted(side, index);
    if (target.ailment) return false;
    let chance = inflict.chance;
    if (side === 'enemy' && this.boss) {
      if (inflict.ailment === 'sleep') return false;
      chance *= 0.4;
    } else if (side === 'enemy' && this.prowler) {
      chance *= 0.6;
    } else if (side === 'party') {
      chance *= 1 - Math.min(0.5, memberStats(this.party[index]).res / 120);
    }
    if (!this.rng.chance(chance)) return false;
    target.ailment = inflict.ailment;
    target.ailmentTurns = AILMENT_TURNS[inflict.ailment];
    const who = this.nameOf(side, index);
    const text = { poison: `${who} is poisoned!`, sleep: `${who} falls asleep!`, paralysis: `${who} is paralysed!` }[inflict.ailment];
    events.push({ type: 'ailment', side, target: index, ailment: inflict.ailment, text });
    return true;
  }

  private clearAilment(side: Side, index: number, events: CombatEvent[], text?: string): void {
    const target = this.afflicted(side, index);
    if (!target.ailment) return;
    target.ailment = null;
    target.ailmentTurns = 0;
    events.push({ type: 'ailment', side, target: index, ailment: null, text: text ?? `${this.nameOf(side, index)} recovers.` });
  }

  /** Sleep and paralysis can cost a fighter their turn. Returns true when they don't act. */
  private held(side: Side, index: number, events: CombatEvent[]): boolean {
    const a = this.afflicted(side, index).ailment;
    const who = this.nameOf(side, index);
    if (a === 'sleep') {
      events.push({ type: 'info', text: `${who} is fast asleep.` });
      return true;
    }
    if (a === 'paralysis' && this.rng.chance(PARALYSIS_FAIL)) {
      events.push({ type: 'info', text: `${who} is paralysed and can't move!` });
      return true;
    }
    return false;
  }

  /** End of round: poison bites, and ailments wear off. */
  private tickAilments(events: CombatEvent[]): void {
    const tick = (side: Side, index: number) => {
      const target = this.afflicted(side, index);
      if (!target.ailment) return;
      if (target.ailment === 'poison') {
        const maxHp = side === 'party' ? memberStats(this.party[index]).hp : this.enemies[index].maxHp;
        const damage = Math.max(3, Math.round(maxHp * (side === 'enemy' && this.boss ? 0.03 : 0.08)));
        if (side === 'party') {
          const m = this.party[index];
          m.hp = Math.max(0, m.hp - damage);
          events.push({ type: 'damage', side, target: index, amount: damage, hp: m.hp, crit: false, weak: false, resist: false, element: 'phys' });
          if (m.hp === 0) {
            target.ailment = null;
            events.push({ type: 'down', side, target: index, text: `${m.name} succumbs to the poison!` });
            return;
          }
        } else {
          const e = this.enemies[index];
          e.hp = Math.max(0, e.hp - damage);
          events.push({ type: 'damage', side, target: index, amount: damage, hp: e.hp, crit: false, weak: false, resist: false, element: 'phys' });
          if (e.hp === 0) {
            events.push({ type: 'down', side, target: index, text: `${e.name} succumbs to the poison!` });
            return;
          }
        }
      }
      target.ailmentTurns -= 1;
      if (target.ailmentTurns <= 0) this.clearAilment(side, index, events);
    };
    this.livingParty().forEach((i) => tick('party', i));
    this.livingEnemies().forEach((i) => tick('enemy', i));
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
    const xp = Math.round(this.enemies.reduce((sum, e) => sum + e.def.xp, 0) * XP_RATE);
    const gold = Math.round(this.enemies.reduce((sum, e) => sum + e.def.gold, 0) * GOLD_RATE);
    const drops: ItemId[] = [];
    for (const e of this.enemies) {
      if (e.def.drop && this.rng.chance(e.def.drop.chance)) drops.push(e.def.drop.item);
    }
    // Bosses and prowlers always leave an Oath Token: the way to grow the roster.
    if (this.boss || this.prowler) drops.push('oathToken');
    for (const item of drops) this.inventory[item] = (this.inventory[item] ?? 0) + 1;
    const materials: string[] = [];
    for (const e of this.enemies) {
      if (e.def.material && this.rng.chance(e.def.material.chance)) materials.push(e.def.material.id);
    }

    const levelUps: Rewards['levelUps'] = [];
    this.party.forEach((m, i) => {
      if (grantXp(m, xp) > 0) levelUps.push({ member: i, level: m.level });
    });
    return { xp, gold, drops, materials, levelUps };
  }
}
