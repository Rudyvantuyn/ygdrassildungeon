/**
 * Choosing how a new adventurer looks: eight pixel figures per class, four men and four women.
 * ← → (or a click on a figure) picks one; the big figure shows the choice.
 */
import { CLASSES } from '../core/data/classes';
import type { ClassId } from '../core/types';
import { LOOKS, drawPortrait } from '../render/portraits';
import { el } from './dom';
import type { MenuItem } from './menu';

export interface LookChoice {
  /** The gallery to show above the menu. */
  body: HTMLElement[];
  /** Menu rows: the look (← → to change) and "Choose", then the caller's own rows. */
  items: MenuItem[];
}

export function lookPicker(classId: ClassId, start: number, choose: (look: number) => void): LookChoice {
  const accent = CLASSES[classId].color;
  let look = Math.max(0, Math.min(LOOKS - 1, start));
  const big = el('canvas', { className: 'look-big' });
  big.width = big.height = 192;
  const label = el('span', { className: 'look-label' });
  const thumbs: HTMLCanvasElement[] = [];
  const rows = [el('div', { className: 'look-row' }), el('div', { className: 'look-row' })];
  for (let i = 0; i < LOOKS; i++) {
    const c = el('canvas', { className: 'look-thumb' });
    c.width = c.height = 64;
    drawPortrait(c.getContext('2d')!, 64, classId, '', accent, i);
    c.addEventListener('click', () => set(i));
    c.addEventListener('dblclick', () => choose(i));
    thumbs.push(c);
    rows[i < LOOKS / 2 ? 0 : 1].append(c);
  }
  const set = (i: number) => {
    look = ((i % LOOKS) + LOOKS) % LOOKS;
    drawPortrait(big.getContext('2d')!, 192, classId, '', accent, look);
    thumbs.forEach((t, j) => t.classList.toggle('on', j === look));
    label.textContent = `${look < LOOKS / 2 ? 'Man' : 'Woman'} ${(look % (LOOKS / 2)) + 1} of ${LOOKS / 2}`;
  };
  set(look);
  const gallery = el('div', { className: 'look-picker' }, [big, el('div', { className: 'look-side' }, [el('div', { className: 'look-caption', text: 'Men' }), rows[0], el('div', { className: 'look-caption', text: 'Women' }), rows[1]])]);
  return {
    body: [gallery],
    items: [
      { label: 'Look', control: label, description: '← → or click a figure to choose how they look.', onAdjust: (step) => set(look + step), onSelect: () => set(look + 1) },
      { label: 'Choose this look', onSelect: () => choose(look) },
    ],
  };
}
