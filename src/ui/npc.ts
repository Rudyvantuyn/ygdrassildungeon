/** The people of Lindholm: names and painted portraits, for dialogs and the story. */
import { drawPortrait, type NpcId } from '../render/portraits';
import { el } from './dom';

export const NPC_NAMES: Record<NpcId, string> = {
  gerd: 'Gerd, keeper of the Sleeping Stag',
  hilde: 'Hilde of the shop',
  brynja: 'Brynja, Master of the Oath Hall',
  sigrid: 'Sigrid, Warden of Lindholm',
  ketil: 'Ketil the Hornwarden',
  hjalmar: 'Hjalmar the miller',
  ylva: 'Ylva the shepherd',
  aske: 'Brother Aske, healer',
  torvald: 'Torvald the carver',
};

/** The person behind a name as written in quests and the story ("Hjalmar the miller" → hjalmar). */
export function npcFromName(name: string): NpcId | null {
  const lower = name.toLowerCase();
  return (Object.keys(NPC_NAMES) as NpcId[]).find((id) => lower.includes(id)) ?? null;
}

export function npcPortrait(id: NpcId, size = 192, className = 'npc-portrait'): HTMLCanvasElement {
  const canvas = el('canvas', { className });
  canvas.width = canvas.height = size;
  drawPortrait(canvas.getContext('2d')!, size, id, NPC_NAMES[id], '#8a7444');
  return canvas;
}

/** A portrait with the speaker's name and what they say. */
export function npcSays(id: NpcId, quote: string, name = NPC_NAMES[id]): HTMLElement {
  return el('div', { className: 'npc-line' }, [
    npcPortrait(id),
    el('div', { className: 'npc-words' }, [el('div', { className: 'npc-name', text: name }), el('p', { text: quote })]),
  ]);
}
