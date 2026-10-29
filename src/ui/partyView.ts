import { CLASSES } from '../core/data/classes';
import { memberStats } from '../core/party';
import type { Member } from '../core/types';

export interface PartyDisplay {
  /** Overrides for shown HP/TP (used to animate combat playback). */
  hp?: number[];
  tp?: number[];
  active?: number | null;
}

interface Card {
  root: HTMLElement;
  level: HTMLElement;
  hpBar: HTMLElement;
  hpFill: HTMLElement;
  hpText: HTMLElement;
  tpFill: HTMLElement;
  tpText: HTMLElement;
}

export class PartyView {
  private cards: Card[] = [];

  constructor(private readonly container: HTMLElement) {}

  render(party: Member[], display: PartyDisplay = {}): void {
    if (this.cards.length !== party.length) this.build(party);
    party.forEach((m, i) => {
      const card = this.cards[i];
      const stats = memberStats(m);
      const hp = display.hp?.[i] ?? m.hp;
      const tp = display.tp?.[i] ?? m.tp;
      const ratio = hp / stats.hp;
      card.level.textContent = `${CLASSES[m.classId].name} Lv ${m.level}`;
      card.hpFill.style.width = `${Math.max(0, ratio) * 100}%`;
      card.hpBar.classList.toggle('low', ratio <= 0.5 && ratio > 0.25);
      card.hpBar.classList.toggle('crit', ratio <= 0.25);
      card.hpText.textContent = `${hp} / ${stats.hp}`;
      card.tpFill.style.width = `${(tp / stats.tp) * 100}%`;
      card.tpText.textContent = `${tp} / ${stats.tp}`;
      card.root.classList.toggle('ko', hp <= 0);
      card.root.classList.toggle('active', display.active === i);
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
        <div class="portrait" style="background: radial-gradient(circle at 35% 30%, #fff8, ${def.color} 45%, #0006)">${m.name[0]}</div>
        <div class="member-head"><span class="member-name"></span><span class="member-class"></span><span class="member-row">${m.row}</span></div>
        <div class="bar hp"><i></i><span><b>HP</b><b class="v"></b></span></div>
        <div class="bar tp"><i></i><span><b>TP</b><b class="v"></b></span></div>`;
      root.querySelector('.member-name')!.textContent = m.name;
      this.container.appendChild(root);
      const hpBar = root.querySelector<HTMLElement>('.bar.hp')!;
      const tpBar = root.querySelector<HTMLElement>('.bar.tp')!;
      return {
        root,
        level: root.querySelector<HTMLElement>('.member-class')!,
        hpBar,
        hpFill: hpBar.querySelector('i')!,
        hpText: hpBar.querySelector('.v')!,
        tpFill: tpBar.querySelector('i')!,
        tpText: tpBar.querySelector('.v')!,
      };
    });
  }
}
