/**
 * Skill points and skill trees. Every level brings a skill point; points raise skills
 * in the class's tree, one rank at a time, up to rank 10.
 */
import { CLASSES, type TreeEntry } from './data/classes';
import { SKILLS, type SkillDef } from './data/skills';
import type { ClassId, Member, SkillId, Stats } from './types';

export const MAX_RANK = 10;
/** Points an adventurer starts with at level 1. */
export const START_POINTS = 3;

export function pointsFor(level: number): number {
  return START_POINTS + Math.max(0, level - 1);
}

export function rankOf(m: Member, id: SkillId): number {
  return m.skills?.[id] ?? 0;
}

export function spentPoints(m: Member): number {
  return Object.values(m.skills ?? {}).reduce((sum, r) => sum + (r ?? 0), 0);
}

export function unspentPoints(m: Member): number {
  return pointsFor(m.level) - spentPoints(m);
}

export function treeEntry(classId: ClassId, id: SkillId): TreeEntry | undefined {
  return CLASSES[classId].skills.find((e) => e.skill === id);
}

/** Why a skill cannot be raised right now, or null if it can. */
export function raiseBlocker(m: Member, id: SkillId): string | null {
  const entry = treeEntry(m.classId, id);
  if (!entry) return 'Not a skill of this class.';
  if (rankOf(m, id) >= MAX_RANK) return 'Mastered.';
  if (m.level < entry.level) return `Needs level ${entry.level}.`;
  if (entry.requires && rankOf(m, entry.requires[0]) < entry.requires[1]) {
    return `Needs ${SKILLS[entry.requires[0]].name} rank ${entry.requires[1]}.`;
  }
  if (unspentPoints(m) <= 0) return 'No skill points left.';
  return null;
}

export function raiseSkill(m: Member, id: SkillId): boolean {
  if (raiseBlocker(m, id)) return false;
  m.skills = { ...m.skills, [id]: rankOf(m, id) + 1 };
  return true;
}

export function resetSkills(m: Member): void {
  m.skills = {};
}

/** Whether a set of ranks is one the game could have produced (used to check adventurers from other players). */
export function validSkills(classId: ClassId, level: number, skills: unknown): skills is Partial<Record<SkillId, number>> {
  if (!skills || typeof skills !== 'object' || Array.isArray(skills)) return false;
  let total = 0;
  for (const [id, rank] of Object.entries(skills)) {
    const entry = treeEntry(classId, id as SkillId);
    if (!entry || typeof rank !== 'number' || !Number.isInteger(rank) || rank < 0 || rank > MAX_RANK) return false;
    if (rank > 0 && level < entry.level) return false;
    if (rank > 0 && entry.requires && ((skills as Record<string, number>)[entry.requires[0]] ?? 0) < entry.requires[1]) return false;
    total += rank;
  }
  return total <= pointsFor(level);
}

/** A skill as it works at `rank`: stronger hits and heals, surer ailments, longer effects; a little more SP. */
export function rankedSkill(def: SkillDef, rank: number): SkillDef {
  const r = Math.max(1, Math.min(MAX_RANK, rank)) - 1;
  const out: SkillDef = { ...def };
  if (def.kind === 'phys' || def.kind === 'magic' || def.kind === 'heal') {
    out.power = Math.round(def.power * (1 + 0.05 * r));
    out.sp = def.sp + Math.floor(r / 3);
  } else if (def.kind === 'revive') {
    out.power = def.power + 4 * r;
  }
  if (def.inflict) out.inflict = { ...def.inflict, chance: Math.min(0.95, def.inflict.chance + 0.03 * r) };
  if (def.turns) out.turns = def.turns + Math.floor((r + 1) / 5);
  if (def.mods) {
    out.mods = def.mods.map((m) => ({ ...m, amount: Math.round(m.amount * (1 + 0.06 * r)) }));
    out.sp = def.sp + Math.floor(r / 3);
  }
  return out;
}

/** The skill as this adventurer knows it, or null if they have not learnt it. */
export function skillFor(m: Member, id: SkillId): SkillDef | null {
  const rank = rankOf(m, id);
  return rank > 0 && treeEntry(m.classId, id) ? rankedSkill(SKILLS[id], rank) : null;
}

/** Percent bonuses to stats from passive skills. */
export function passiveBonus(m: Member): Partial<Stats> {
  const out: Partial<Stats> = {};
  for (const [id, rank] of Object.entries(m.skills ?? {})) {
    const p = SKILLS[id as SkillId]?.passive;
    if (p && rank) out[p.stat] = (out[p.stat] ?? 0) + p.perRank * rank;
  }
  return out;
}

/**
 * A sensible build, as a list of [skill, rank] goals worked through in order.
 * Used for the starting party, new recruits, saves from before skill points and the computer player.
 */
const RECOMMENDED: Record<ClassId, [SkillId, number][]> = {
  bastion: [['bulwarkBash', 1], ['challenge', 2], ['stoutHeart', 2], ['ironFormation', 1], ['bulwarkBash', 5], ['ironSkin', 3], ['ironFormation', 4], ['rampartCrash', 4], ['stoutHeart', 6], ['bulwarkBash', 8], ['rampartCrash', 8], ['ironSkin', 6], ['stoutHeart', 10], ['ironFormation', 7], ['rampartCrash', 10], ['bulwarkBash', 10], ['ironSkin', 10], ['challenge', 10], ['ironFormation', 10]],
  strider: [['twinFang', 2], ['keenEye', 1], ['venomArrow', 1], ['scatterVolley', 3], ['keenEye', 3], ['fleetFoot', 2], ['scatterVolley', 5], ['twinFang', 5], ['galePiercer', 4], ['keenEye', 6], ['scatterVolley', 8], ['galePiercer', 8], ['fleetFoot', 5], ['keenEye', 10], ['galePiercer', 10], ['twinFang', 10], ['scatterVolley', 10], ['fleetFoot', 10], ['venomArrow', 10]],
  mender: [['mend', 2], ['cleanse', 2], ['verdantChorus', 1], ['rekindle', 1], ['gentleHands', 2], ['mend', 4], ['deepWell', 2], ['verdantChorus', 5], ['gentleHands', 5], ['wellspring', 3], ['deepWell', 5], ['mend', 7], ['wellspring', 7], ['gentleHands', 10], ['verdantChorus', 8], ['rekindle', 5], ['wellspring', 10], ['deepWell', 10], ['mend', 10], ['verdantChorus', 10], ['cleanse', 10], ['rekindle', 10]],
  skald: [['warSong', 2], ['shieldHymn', 1], ['mockingVerse', 1], ['restfulTune', 1], ['shieldHymn', 2], ['runicChant', 1], ['warSong', 5], ['fleetFoot', 3], ['restfulTune', 4], ['heroesSaga', 3], ['deepWell', 3], ['mockingVerse', 5], ['heroesSaga', 7], ['warSong', 10], ['shieldHymn', 10], ['heroesSaga', 10], ['restfulTune', 10], ['fleetFoot', 10], ['deepWell', 10], ['mockingVerse', 10], ['runicChant', 10]],
  berserker: [['cleave', 2], ['bloodPrice', 1], ['frenzy', 1], ['stoutHeart', 2], ['bloodPrice', 2], ['skullSplitter', 1], ['cleave', 5], ['keenEye', 3], ['skullSplitter', 4], ['reavingSpin', 3], ['stoutHeart', 5], ['frenzy', 4], ['reavingSpin', 7], ['keenEye', 7], ['skullSplitter', 8], ['reavingSpin', 10], ['stoutHeart', 10], ['keenEye', 10], ['cleave', 10], ['skullSplitter', 10], ['frenzy', 10], ['bloodPrice', 10]],
  seeress: [['curseOfFrailty', 1], ['hollowBolt', 1], ['curseOfWeakness', 1], ['witherblight', 1], ['curseOfWeakness', 2], ['stillingGaze', 1], ['runeLore', 2], ['curseOfFrailty', 5], ['hollowBolt', 4], ['deepWell', 2], ['fateUnravel', 3], ['runeLore', 5], ['curseOfWeakness', 5], ['fateUnravel', 7], ['hollowBolt', 7], ['runeLore', 10], ['fateUnravel', 10], ['curseOfFrailty', 10], ['curseOfWeakness', 10], ['hollowBolt', 10], ['deepWell', 10], ['stillingGaze', 10], ['witherblight', 10]],
  wolfkin: [['fangStrike', 2], ['packHunt', 1], ['keenEye', 1], ['wolfGuard', 1], ['hamstring', 1], ['packHunt', 3], ['packHowl', 1], ['fleetFoot', 2], ['keenEye', 4], ['packHunt', 5], ['moonfangFrenzy', 3], ['fangStrike', 5], ['moonfangFrenzy', 7], ['keenEye', 7], ['packHunt', 8], ['moonfangFrenzy', 10], ['keenEye', 10], ['fangStrike', 10], ['packHunt', 10], ['fleetFoot', 10], ['wolfGuard', 10], ['hamstring', 10], ['packHowl', 10]],
  runecaller: [['emberRune', 1], ['frostRune', 1], ['stormRune', 1], ['emberRune', 3], ['wildfire', 1], ['frostRune', 2], ['slumberRune', 1], ['runeLore', 3], ['stormRune', 3], ['deepWell', 2], ['wildfire', 4], ['emberRune', 5], ['frostRune', 5], ['stormRune', 5], ['thunderhead', 3], ['runeLore', 6], ['wildfire', 7], ['thunderhead', 7], ['deepWell', 5], ['runeLore', 10], ['thunderhead', 10], ['wildfire', 10], ['emberRune', 10], ['frostRune', 10], ['stormRune', 10], ['deepWell', 10], ['slumberRune', 10]],
};

/** Spends all free points along the recommended build (skipping goals the adventurer cannot reach yet). */
export function autoSpend(m: Member): void {
  m.skills ??= {};
  let progress = true;
  while (unspentPoints(m) > 0 && progress) {
    progress = false;
    for (const [id, goal] of RECOMMENDED[m.classId]) {
      if (rankOf(m, id) < goal && raiseSkill(m, id)) {
        progress = true;
        break;
      }
    }
  }
}
