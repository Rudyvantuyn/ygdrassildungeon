/**
 * The Book of Deeds (Journal tab) and the medal that appears when a deed is earned. Only earned deeds are shown:
 * no names, no hints and no total for the rest.
 */
import { earnedDeeds, type DeedDef, type EarnedDeed } from '../core/deeds';
import type { Game } from '../core/game';
import { drawEmptyHook, drawMedal } from '../render/medals';
import { el } from './dom';
import { ListMenu } from './menu';

function medal(def: DeedDef, w: number, cls = 'medal'): HTMLCanvasElement {
  const c = el('canvas', { className: cls });
  c.width = w;
  c.height = Math.round((w * 64) / 48);
  drawMedal(c, def.kind, def.tier, def.icon);
  return c;
}

/** A medal sliding in at the top of the screen; it does not stop the game. Shown one after another. */
export class DeedBanner {
  private readonly queue: DeedDef[] = [];
  private showing = false;

  constructor(
    private readonly stage: HTMLElement,
    private readonly sound: () => void,
  ) {}

  add(defs: DeedDef[]): void {
    this.queue.push(...defs);
    if (!this.showing) this.next();
  }

  private next(): void {
    const def = this.queue.shift();
    if (!def) {
      this.showing = false;
      return;
    }
    this.showing = true;
    this.sound();
    const box = el('div', { className: `deed-banner tier-${def.tier}` }, [
      medal(def, 48),
      el('div', {}, [el('div', { className: 'deed-new', text: 'A new deed' }), el('b', { text: def.name }), el('p', { text: def.text })]),
    ]);
    this.stage.append(box);
    requestAnimationFrame(() => box.classList.add('in'));
    window.setTimeout(() => {
      box.classList.remove('in');
      window.setTimeout(() => {
        box.remove();
        this.next();
      }, 400);
    }, 4600);
  }
}

/** The Book of Deeds: earned medals on hooks, the chosen one described beside them. */
export function bookOfDeeds(game: Game, open: (content: HTMLElement, menu: ListMenu) => void, back: () => void): void {
  const list = earnedDeeds(game);
  const detail = el('div', { className: 'deed-detail' });
  const describe = (def: DeedDef, e: EarnedDeed) => {
    const when = new Date(e.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    detail.replaceChildren(medal(def, 96, 'medal big'), el('h3', { text: def.name }), el('p', { text: def.text }), el('p', { className: 'deed-when', text: e.by ? `${when}, with ${e.by} leading the party` : when }));
  };
  const hooks = el('div', { className: 'deed-hooks' });
  list.forEach(({ def, earned }, i) => {
    const c = medal(def, 48);
    c.tabIndex = 0;
    c.title = def.name;
    c.addEventListener('click', () => describe(def, earned));
    c.addEventListener('mouseenter', () => describe(def, earned));
    hooks.append(c);
    if (i === 0) describe(def, earned);
  });
  // Empty hooks: room for more, without saying how many there are.
  const empty = ((8 - (list.length % 8)) % 8) + 8;
  for (let i = 0; i < empty; i++) {
    const c = el('canvas', { className: 'medal empty' });
    c.width = 48;
    c.height = 64;
    drawEmptyHook(c);
    hooks.append(c);
  }
  if (!list.length) detail.append(el('p', { className: 'deed-when', text: 'No deeds yet. Nobody will tell you what counts as one.' }));
  const menu = new ListMenu([{ label: 'Back', onSelect: back }], { onCancel: back });
  const count = list.length === 1 ? '1 deed earned' : `${list.length} deeds earned`;
  open(
    el('div', { className: 'panel dialog wide book-of-deeds' }, [
      el('h2', { text: 'Book of Deeds' }),
      el('p', { className: 'deed-count', text: count }),
      el('div', { className: 'deed-body' }, [hooks, detail]),
      menu.el,
    ]),
    menu,
  );
}
