import { CLASSES } from '../core/data/classes';
import { MAX_LEVEL, memberStats, xpForLevel } from '../core/party';
import { BYNAME_BY_ID, fullName } from '../core/sagas';
import { unspentPoints } from '../core/skilltree';
import type { Ailment, Member } from '../core/types';
import { AILMENT_BADGE } from './combatView';
import { drawPortrait } from '../render/portraits';
import { stagePoint } from './stagePoint';

export interface PartyDisplay {
  /** Overrides for shown HP/SP (used to animate combat playback). */
  hp?: number[];
  sp?: number[];
  ailments?: (Ailment | null)[];
  active?: number | null;
  /** On an expedition: the player behind each card (shown instead of the row). */
  owners?: string[];
  /** In a fight: active buffs and debuffs, shown instead of the row (e.g. "ATK▲ DEF▼"). */
  mods?: string[];
}

interface Card {
  root: HTMLElement;
  level: HTMLElement;
  hpBar: HTMLElement;
  hpFill: HTMLElement;
  hpText: HTMLElement;
  spFill: HTMLElement;
  spText: HTMLElement;
  xpBar: HTMLElement;
  xpFill: HTMLElement;
  ailment: HTMLElement;
  row: HTMLElement;
}

export class PartyView {
  private cards: Card[] = [];
  /** Who the cards were built for; rebuilt when the line-up, order or rows change. */
  private lineup = '';
  /**
   * Level and XP as they were when a fight began. A fight is worked out before it is played back, so the real
   * numbers would give the outcome away; the bar fills only once the fight is over (the victory screen).
   */
  private held: Map<Member, { level: number; xp: number }> | null = null;

  constructor(private readonly container: HTMLElement) {}

  /** Keep showing the party's level and XP as they are now, until release(). */
  holdProgress(party: Member[]): void {
    this.held = new Map(party.map((m) => [m, { level: m.level, xp: m.xp }]));
  }

  releaseProgress(): void {
    this.held = null;
  }

  render(party: Member[], display: PartyDisplay = {}): void {
    const lineup = party.map((m) => `${m.name}|${m.byname ?? ''}|${m.classId}|${m.row}|${m.look}`).join(',');
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
      const shown = this.held?.get(m) ?? { level: m.level, xp: m.xp };
      const points = this.held ? 0 : unspentPoints(m);
      card.level.textContent = `${points > 0 ? '✦ ' : ''}Lv ${shown.level} ${CLASSES[m.classId].name}`;
      card.level.title = points > 0 ? `${points} skill point${points === 1 ? '' : 's'} to spend` : '';
      card.hpFill.style.width = `${Math.max(0, ratio) * 100}%`;
      card.hpBar.classList.toggle('low', ratio <= 0.5 && ratio > 0.25);
      card.hpBar.classList.toggle('crit', ratio <= 0.25);
      card.hpText.textContent = `${hp} / ${stats.hp}`;
      card.spFill.style.width = `${(sp / stats.sp) * 100}%`;
      card.spText.textContent = `${sp} / ${stats.sp}`;
      // Experience toward the next level: fills up as the next level comes closer.
      const from = xpForLevel(shown.level);
      const to = shown.level >= MAX_LEVEL ? from : xpForLevel(shown.level + 1);
      const xpRatio = to > from ? Math.min(1, Math.max(0, (shown.xp - from) / (to - from))) : 1;
      card.xpFill.style.width = `${xpRatio * 100}%`;
      card.xpBar.title = shown.level >= MAX_LEVEL ? 'Highest level reached' : `XP ${shown.xp - from} / ${to - from} to level ${shown.level + 1}`;
      card.root.classList.toggle('ko', hp <= 0);
      const ailment = display.ailments?.[i] ?? null;
      card.ailment.textContent = ailment ? AILMENT_BADGE[ailment].short : '';
      card.ailment.style.background = ailment ? AILMENT_BADGE[ailment].color : '';
      card.ailment.classList.toggle('hidden', !ailment);
      card.root.classList.toggle('active', display.active === i);
      card.root.classList.toggle('back', m.row === 'back');
      const mods = display.mods?.[i];
      card.row.textContent = mods || (display.owners?.[i] ?? m.row);
      card.row.classList.toggle('owner', !!display.owners && !mods);
      card.row.classList.toggle('mods', !!mods);
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
    const p = stagePoint(el, 0.5, 0);
    return { x: p.x, y: p.y + 20 };
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
        <div class="bar sp"><i></i><span><b>SP</b><b class="v"></b></span></div>
        <div class="xp-bar"><i></i></div>`;
      // The byname they bear, small under the name: on an expedition everyone sees who is the Wolf-Feeder.
      const nameEl = root.querySelector('.member-name')!;
      nameEl.textContent = m.name;
      const byname = m.byname ? BYNAME_BY_ID[m.byname]?.name.replace(/^,\s*/, '') : undefined;
      if (byname) nameEl.append(Object.assign(document.createElement('small'), { className: 'member-byname', textContent: byname }));
      root.title = fullName(m);
      drawPortrait(root.querySelector<HTMLCanvasElement>('canvas.portrait')!.getContext('2d')!, 132, m.classId, m.name, def.color, m.look);
      this.container.appendChild(root);
      const hpBar = root.querySelector<HTMLElement>('.bar.hp')!;
      const spBar = root.querySelector<HTMLElement>('.bar.sp')!;
      const xpBar = root.querySelector<HTMLElement>('.xp-bar')!;
      return {
        root,
        level: root.querySelector<HTMLElement>('.member-class')!,
        hpBar,
        hpFill: hpBar.querySelector('i')!,
        hpText: hpBar.querySelector('.v')!,
        spFill: spBar.querySelector('i')!,
        spText: spBar.querySelector('.v')!,
        xpBar,
        xpFill: xpBar.querySelector('i')!,
        ailment: root.querySelector<HTMLElement>('.ailment')!,
        row: root.querySelector<HTMLElement>('.member-row')!,
      };
    });
  }
}
