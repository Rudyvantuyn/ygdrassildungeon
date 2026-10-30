/** The skill tree screen: spend skill points, one rank at a time. Used from the Oath Hall and the pack. */
import { CLASSES } from '../core/data/classes';
import { SKILLS, type SkillDef } from '../core/data/skills';
import { MAX_RANK, rankOf, rankedSkill, raiseBlocker, raiseSkill, unspentPoints } from '../core/skilltree';
import type { Member, SkillId, Stats } from '../core/types';
import { audio } from '../audio/audio';
import { el } from './dom';
import { ListMenu, type MenuItem } from './menu';

const STAT_NAMES: Record<keyof Stats, string> = { hp: 'max HP', sp: 'max SP', atk: 'attack', def: 'defence', mag: 'magic', res: 'resistance', spd: 'speed' };

/** What a skill does at one rank, in a few words. */
export function rankEffect(skill: SkillDef, rank: number): string {
  if (skill.passive) return `+${skill.passive.perRank * rank}% ${STAT_NAMES[skill.passive.stat]}`;
  const s = rankedSkill(skill, rank);
  const parts: string[] = [];
  if (s.kind === 'phys' || s.kind === 'magic') parts.push(`power ${s.power}%`);
  if (s.kind === 'heal') parts.push(`healing ${s.power}%`);
  if (s.kind === 'revive') parts.push(`wakes with ${s.power}% HP`);
  for (const mod of s.mods ?? []) parts.push(`${mod.amount > 0 ? '+' : ''}${mod.amount}% ${STAT_NAMES[mod.stat]}`);
  if (s.hpCost) parts.push(`costs ${s.hpCost}% HP`);
  if (s.inflict) parts.push(`${Math.round(s.inflict.chance * 100)}% ${s.inflict.ailment}`);
  if (s.turns) parts.push(`${s.turns} turns`);
  parts.push(`${s.sp} SP`);
  return parts.join(' · ');
}

export interface SkillsHost {
  /** Shows a dialog with a title, some lines above the menu and the menu (with a description box). */
  dialog(title: string, body: HTMLElement[], menu: ListMenu): void;
  /** Called after every point spent (to save and refresh the party cards). */
  changed(): void;
}

export function showSkillTree(host: SkillsHost, m: Member, back: () => void, start = 0): void {
  const items: MenuItem[] = CLASSES[m.classId].skills.map((entry, i) => {
    const id: SkillId = entry.skill;
    const def = SKILLS[id];
    const rank = rankOf(m, id);
    const blocker = raiseBlocker(m, id);
    const locked = rank === 0 && !!blocker && blocker !== 'No skill points left.';
    const now = rank > 0 ? `Rank ${rank}: ${rankEffect(def, rank)}` : 'Not learnt yet.';
    const next = rank < MAX_RANK ? `Rank ${rank + 1}: ${rankEffect(def, rank + 1)}` : '';
    const need = blocker && blocker !== 'Mastered.' ? ` (${blocker})` : '';
    return {
      label: `${def.passive ? '◇ ' : ''}${def.name}`,
      detail: locked ? 'locked' : `${rank}/${MAX_RANK}`,
      description: [def.description, now, next && `Next — ${next}${need}`].filter(Boolean).join('\n'),
      disabled: !!blocker,
      onSelect: () => {
        if (raiseSkill(m, id)) {
          audio.play('levelUp');
          host.changed();
        }
        showSkillTree(host, m, back, i);
      },
    };
  });
  items.push({ label: 'Done', onSelect: back });
  const menu = new ListMenu(items, { onCancel: back, startIndex: start });
  const points = unspentPoints(m);
  host.dialog(`${m.name} · ${CLASSES[m.classId].name} skills`, [
    el('p', { className: 'gold-line', text: points > 0 ? `Skill points to spend: ${points}` : 'No skill points left. Every level brings a new one.' }),
  ], menu);
}

/** A short list for picking whose skills to look at. */
export function memberPicker(party: Member[], pick: (m: Member) => void, back: () => void): MenuItem[] {
  return [
    ...party.map((m) => ({
      label: m.name,
      detail: unspentPoints(m) > 0 ? `${unspentPoints(m)} point${unspentPoints(m) === 1 ? '' : 's'}` : `Lv ${m.level}`,
      description: `${CLASSES[m.classId].name}, level ${m.level}.`,
      onSelect: () => pick(m),
    })),
    { label: 'Back', onSelect: back },
  ];
}
