import { CLASSES } from '../core/data/classes';
import { memberStats } from '../core/party';
import type { Ailment, Member } from '../core/types';
import { AILMENT_BADGE } from './combatView';
import { drawPortrait } from '../render/portraits';

export interface PartyDisplay {
  /** Overrides for shown HP/SP (used to animate combat playback). */
  hp?: number[];
  sp?: number[];
  ailments?: (Ailment | null)[];
  active?: number | null;
  /** On an expedition: the player behind each card (shown instead of the row). */
  owners?: string[];
}

interface Card {
  root: HTMLElement;
  level: HTMLElement;
  hpBar: HTMLElement;
  hpFill: HTMLElement;
  hpText: HTMLElement;
  spFill: HTMLElement;
  spText: HTMLElement;
  ailment: HTMLElement;
  row: HTMLElement;
}

export class PartyView {
  private cards: Card[] = [];
  /** Who the cards were built for; rebuilt when the line-up, order or rows change. */
  private lineup = '';

  constructor(private readonly container: HTMLElement) {}

  render(party: Member[], display: PartyDisplay = {}): void {
    const lineup = party.map((m) => `${m.name}|${m.classId}|${m.row}`).join(',');
    if (lineup !== this.lineup) {
      this.lineup = lineup;
      this.build(party);
    }
    party.forEach((m, i) => {
      const card = this.cards[i];
      const stats = memberStats(m);
      const hp = display.hp?.[i] ?? m.hp;
      const sp = display.sp?.[i] ?? m.sp;
      const ratio = hp / stats.hp;
      card.level.textContent = `Lv ${m.level} ${CLASSES[m.classId].name}`;
      card.hpFill.style.width = `${Math.max(0, ratio) * 100}%`;
      card.hpBar.classList.toggle('low', ratio <= 0.5 && ratio > 0.25);
      card.hpBar.classList.toggle('crit', ratio <= 0.25);
      card.hpText.textContent = `${hp} / ${stats.hp}`;
      card.spFill.style.width = `${(sp / stats.sp) * 100}%`;
      card.spText.textContent = `${sp} / ${stats.sp}`;
      card.root.classList.toggle('ko', hp <= 0);
      const ailment = display.ailments?.[i] ?? null;
      card.ailment.textContent = ailment ? AILMENT_BADGE[ailment].short : '';
      card.ailment.style.background = ailment ? AILMENT_BADGE[ailment].color : '';
      card.ailment.classList.toggle('hidden', !ailment);
      card.root.classList.toggle('active', display.active === i);
      card.row.textContent = display.owners?.[i] ?? m.row;
      card.row.classList.toggle('owner', !!display.owners);
    });
  }

  flash(i: number, kind: 'hit' | 'healed'): void {
    const el = this.cards[i]?.root;
    if (!el) return;
    el.classList.remove(kind);
    void el.offsetWidth; // restart the CSS animation
    el.classList.add(kind);
    window.setTimeout(() => el.classList.remove(kind), 450);
  }

  /** Card centre in stage coordinates. */
  anchor(i: number): { x: number; y: number } {
    const el = this.cards[i]?.root;
    if (!el) return { x: 640, y: 600 };
    return { x: 20 + el.offsetLeft + el.offsetWidth / 2, y: 556 + el.offsetTop + 20 };
  }

  private build(party: Member[]): void {
    this.container.innerHTML = '';
    this.cards = party.map((m) => {
      const def = CLASSES[m.classId];
      const root = document.createElement('div');
      root.className = 'member panel';
      root.innerHTML = `
        <canvas class="portrait" width="132" height="132"></canvas>
        <div class="member-head"><span class="member-name"></span><span class="member-class"></span><span class="ailment hidden"></span><span class="member-row">${m.row}</span></div>
        <div class="bar hp"><i></i><span><b>HP</b><b class="v"></b></span></div>
        <div class="bar sp"><i></i><span><b>SP</b><b class="v"></b></span></div>`;
      root.querySelector('.member-name')!.textContent = m.name;
      drawPortrait(root.querySelector<HTMLCanvasElement>('canvas.portrait')!.getContext('2d')!, 132, m.classId, m.name, def.color);
      this.container.appendChild(root);
      const hpBar = root.querySelector<HTMLElement>('.bar.hp')!;
      const spBar = root.querySelector<HTMLElement>('.bar.sp')!;
      return {
        root,
        level: root.querySelector<HTMLElement>('.member-class')!,
        hpBar,
        hpFill: hpBar.querySelector('i')!,
        hpText: hpBar.querySelector('.v')!,
        spFill: spBar.querySelector('i')!,
        spText: spBar.querySelector('.v')!,
        ailment: root.querySelector<HTMLElement>('.ailment')!,
        row: root.querySelector<HTMLElement>('.member-row')!,
      };
    });
  }
}
