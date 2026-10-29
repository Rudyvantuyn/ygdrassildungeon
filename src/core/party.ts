import { CLASSES } from './data/classes';
import { EQUIPMENT } from './data/equipment';
import { SKILLS, type SkillDef } from './data/skills';
import type { ClassId, Member, Stats } from './types';

export const MAX_LEVEL = 20;

export function createMember(name: string, classId: ClassId): Member {
  const def = CLASSES[classId];
  return { name, classId, row: def.row, level: 1, xp: 0, hp: def.base.hp, tp: def.base.tp };
}

export function createStartingParty(): Member[] {
  return [
    createMember('Lief', 'guardian'),
    createMember('Ayla', 'ranger'),
    createMember('Mira', 'mystic'),
    createMember('Corvin', 'arcanist'),
  ];
}

/** Stats from class and level alone, without equipment. */
export function baseStats(m: Member): Stats {
  const { base, growth } = CLASSES[m.classId];
  const at = (key: keyof Stats) => Math.round(base[key] + growth[key] * (m.level - 1));
  return { hp: at('hp'), tp: at('tp'), atk: at('atk'), def: at('def'), mag: at('mag'), res: at('res'), spd: at('spd') };
}

export function memberStats(m: Member): Stats {
  const stats = baseStats(m);
  for (const id of [m.weapon, m.armor]) {
    const bonus = id ? EQUIPMENT[id]?.bonus : undefined;
    if (!bonus) continue;
    for (const key of Object.keys(bonus) as (keyof Stats)[]) stats[key] += bonus[key] ?? 0;
  }
  return stats;
}

/** Total XP needed to reach `level`. */
export function xpForLevel(level: number): number {
  return Math.round(18 * Math.pow(level - 1, 2.3));
}

export function knownSkills(m: Member): SkillDef[] {
  return CLASSES[m.classId].skills.filter((s) => s.level <= m.level).map((s) => SKILLS[s.skill]);
}

export function isAlive(m: Member): boolean {
  return m.hp > 0;
}

/** Adds XP and applies level-ups. Gained max HP/TP is added to current HP/TP. Returns levels gained. */
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
    m.tp += after.tp - before.tp;
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

export function restoreTp(m: Member, amount: number): number {
  if (!isAlive(m)) return 0;
  const max = memberStats(m).tp;
  const restored = Math.min(amount, max - m.tp);
  m.tp += restored;
  return restored;
}

export function healAmount(m: Member, power: number): number {
  return Math.round((power / 100) * (memberStats(m).mag * 1.6 + 18));
}

export function fullRestore(party: Member[]): void {
  for (const m of party) {
    const s = memberStats(m);
    m.hp = s.hp;
    m.tp = s.tp;
  }
}
