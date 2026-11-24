import { CLASSES } from './data/classes';
import { EQUIPMENT } from './data/equipment';
import type { SkillDef } from './data/skills';
import { autoSpend, passiveBonus, skillFor } from './skilltree';
import type { ClassId, Member, Stats } from './types';

export const MAX_LEVEL = 150;

export function createMember(name: string, classId: ClassId, look?: number): Member {
  const def = CLASSES[classId];
  const m: Member = { name, classId, row: def.row, level: 1, xp: 0, hp: def.base.hp, sp: def.base.sp, skills: {} };
  if (look !== undefined && Number.isInteger(look) && look >= 0 && look < 8) m.look = look;
  autoSpend(m);
  // Start whole: passive skills from the first point can raise the maximum above the class's base.
  const max = memberStats(m);
  m.hp = max.hp;
  m.sp = max.sp;
  return m;
}

/** At most this many adventurers stand in one row (front or back) of a party. */
export const MAX_PER_ROW = 3;

/** Moves adventurers so no row holds more than MAX_PER_ROW: the last ones in an overfull row step to the other. */
export function fitRows(party: Member[]): void {
  for (const row of ['front', 'back'] as const) {
    const inRow = party.filter((m) => m.row === row);
    for (const m of inRow.slice(MAX_PER_ROW)) m.row = row === 'front' ? 'back' : 'front';
  }
}

/** The row a newcomer to `party` takes: the one they want, unless it is full. */
export function rowFor(party: Member[], wanted: Member['row']): Member['row'] {
  return party.filter((m) => m.row === wanted).length < MAX_PER_ROW ? wanted : wanted === 'front' ? 'back' : 'front';
}

export function createStartingParty(): Member[] {
  return [
    createMember('Bram', 'bastion', 0),
    createMember('Sela', 'strider', 4),
    createMember('Wren', 'mender', 2),
    createMember('Orrin', 'runecaller', 1),
    createMember('Ragna', 'berserker', 5),
  ];
}

/** Stats from class and level alone, without equipment. */
/** Each deeper oath (src/core/oaths.ts) adds this share to an adventurer's own stats. Kept small: levels stay what counts. */
export const OATH_BONUS = 0.03;

/** First Oath 1, Second Oath 1.03, … Fifth Oath 1.12. */
export function oathMultiplier(m: Member): number {
  const o = m.oathRank ?? 0;
  return 1 + OATH_BONUS * (Number.isInteger(o) && o > 0 && o <= 4 ? o : 0);
}

export function baseStats(m: Member): Stats {
  const { base, growth } = CLASSES[m.classId];
  const mult = oathMultiplier(m);
  const at = (key: keyof Stats) => Math.round((base[key] + growth[key] * (m.level - 1)) * mult);
  return { hp: at('hp'), sp: at('sp'), atk: at('atk'), def: at('def'), mag: at('mag'), res: at('res'), spd: at('spd') };
}

export function memberStats(m: Member): Stats {
  const stats = baseStats(m);
  for (const id of [m.weapon, m.armor]) {
    const bonus = id ? EQUIPMENT[id]?.bonus : undefined;
    if (!bonus) continue;
    for (const key of Object.keys(bonus) as (keyof Stats)[]) stats[key] += bonus[key] ?? 0;
  }
  const passive = passiveBonus(m);
  for (const key of Object.keys(passive) as (keyof Stats)[]) stats[key] = Math.round(stats[key] * (1 + (passive[key] ?? 0) / 100));
  return stats;
}

/** Total XP needed to reach `level`. */
export function xpForLevel(level: number): number {
  return Math.round(18 * Math.pow(level - 1, 2.3));
}

/** The skills this adventurer can use (passives work on their own and are left out), at their ranks. */
export function knownSkills(m: Member): SkillDef[] {
  return CLASSES[m.classId].skills.flatMap((e) => {
    const skill = skillFor(m, e.skill);
    return skill && skill.kind !== 'passive' && skill.kind !== 'gather' ? [skill] : [];
  });
}

export function isAlive(m: Member): boolean {
  return m.hp > 0;
}

/** Adds XP and applies level-ups. Gained max HP/SP is added to current HP/SP. Returns levels gained. */
export function grantXp(m: Member, xp: number): number {
  if (!isAlive(m)) return 0;
  m.xp += xp;
  let gained = 0;
  while (m.level < MAX_LEVEL && m.xp >= xpForLevel(m.level + 1)) {
    const before = memberStats(m);
    m.level += 1;
    gained += 1;
    const after = memberStats(m);
    m.hp += after.hp - before.hp;
    m.sp += after.sp - before.sp;
  }
  return gained;
}

export function healMember(m: Member, amount: number): number {
  if (!isAlive(m)) return 0;
  const max = memberStats(m).hp;
  const healed = Math.min(amount, max - m.hp);
  m.hp += healed;
  return healed;
}

/** Brings a fallen member back with `percent` of their max HP. Returns the HP they get back (0 if they weren't down). */
export function revive(m: Member, percent: number): number {
  if (isAlive(m)) return 0;
  m.hp = Math.max(1, Math.round((memberStats(m).hp * percent) / 100));
  return m.hp;
}

export function restoreSp(m: Member, amount: number): number {
  if (!isAlive(m)) return 0;
  const max = memberStats(m).sp;
  const restored = Math.min(amount, max - m.sp);
  m.sp += restored;
  return restored;
}

export function healAmount(m: Member, power: number): number {
  return Math.round((power / 100) * (memberStats(m).mag * 1.6 + 18));
}

export function fullRestore(party: Member[]): void {
  for (const m of party) {
    const s = memberStats(m);
    m.hp = s.hp;
    m.sp = s.sp;
  }
}

/** One cast made by `patchUp`: who cast what on whom, and how much each target got back. */
export interface PatchCast {
  caster: number;
  skill: SkillDef;
  targets: number[];
  amounts: number[];
}

/**
 * Patches the party up outside a fight with the healers' own SP, the way a careful player would: first wakes the
 * fallen, then heals until everyone standing is at `goal` of their max HP or nobody can heal any more. A group heal is
 * used when two or more need it; otherwise the cheapest single heal on whoever is worst off. Returns what was cast.
 */
export function patchUp(party: Member[], goal = 0.8): PatchCast[] {
  const casts: PatchCast[] = [];
  const frac = (m: Member) => m.hp / memberStats(m).hp;
  const cheapest = <T extends { skill: SkillDef }>(list: T[]) => [...list].sort((a, b) => a.skill.sp - b.skill.sp)[0];
  for (let guard = 0; guard < 100; guard++) {
    const options = party.flatMap((m, caster) => (isAlive(m) ? knownSkills(m).filter((s) => s.field && m.sp >= s.sp).map((skill) => ({ caster, skill })) : []));
    const fallen = party.flatMap((m, i) => (isAlive(m) ? [] : [i]));
    const hurt = party.flatMap((m, i) => (isAlive(m) && frac(m) < goal ? [i] : [])).sort((a, b) => frac(party[a]) - frac(party[b]));
    let pick: { caster: number; skill: SkillDef; targets: number[] } | undefined;
    const rekindle = cheapest(options.filter((o) => o.skill.kind === 'revive'));
    if (fallen.length && rekindle) pick = { ...rekindle, targets: [fallen[0]] };
    else if (hurt.length) {
      const heals = options.filter((o) => o.skill.kind === 'heal');
      const group = hurt.length >= 2 ? cheapest(heals.filter((o) => o.skill.target === 'allAllies')) : undefined;
      const single = cheapest(heals.filter((o) => o.skill.target === 'ally' || (o.skill.target === 'self' && hurt.includes(o.caster))));
      if (group) pick = { ...group, targets: party.flatMap((m, i) => (isAlive(m) ? [i] : [])) };
      else if (single) pick = { ...single, targets: [single.skill.target === 'self' ? single.caster : hurt[0]] };
      else if (heals.some((o) => o.skill.target === 'allAllies')) {
        const any = cheapest(heals.filter((o) => o.skill.target === 'allAllies'))!;
        pick = { ...any, targets: party.flatMap((m, i) => (isAlive(m) ? [i] : [])) };
      }
    }
    if (!pick) break;
    const caster = party[pick.caster];
    caster.sp -= pick.skill.sp;
    const amount = healAmount(caster, pick.skill.power);
    const amounts = pick.targets.map((t) => (pick!.skill.kind === 'revive' ? revive(party[t], pick!.skill.power) : healMember(party[t], amount)));
    casts.push({ caster: pick.caster, skill: pick.skill, targets: pick.targets, amounts });
  }
  return casts;
}
