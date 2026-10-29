import type { Combat, CombatEvent, Command } from '../core/combat';
import { ITEMS, usableInCombat } from '../core/data/items';
import type { SkillDef } from '../core/data/skills';
import type { Game } from '../core/game';
import { isAlive, knownSkills, memberStats } from '../core/party';
import type { ItemId } from '../core/types';
import type { CorridorRenderer } from '../render/corridor';
import { drawMonster } from '../render/monsters';
import { el, floater } from './dom';
import { ListMenu, type MenuItem } from './menu';
import type { PartyView } from './partyView';

export interface CombatHost {
  game: Game;
  party: PartyView;
  corridor: CorridorRenderer;
  floaters: HTMLElement;
  commandPanel: HTMLElement;
  message: HTMLElement;
  shakeView(): void;
}

interface EnemyFx {
  flashUntil: number;
  lungeUntil: number;
  dyingSince: number | null;
}

/** View offset of the corridor canvas inside the stage. */
const VIEW_X = 20;
const VIEW_Y = 20;

export class CombatView {
  private fx: EnemyFx[];
  private enemyHp: number[];
  private partyHp: number[] = [];
  private partySp: number[] = [];
  private commands: (Command | null)[] = [];
  private current = -1;
  private menu: ListMenu | null = null;
  private target: number | null = null;
  private playing = false;
  private fast = false;
  private time = 0;

  constructor(
    private readonly host: CombatHost,
    private readonly combat: Combat,
    private readonly onDone: (combat: Combat) => void,
  ) {
    this.fx = combat.enemies.map(() => ({ flashUntil: 0, lungeUntil: 0, dyingSince: null }));
    this.enemyHp = combat.enemies.map((e) => e.hp);
  }

  async start(): Promise<void> {
    this.syncParty();
    this.renderParty();
    const names = this.combat.enemies.map((e) => e.name).join(', ');
    this.say(this.combat.boss ? `${names} blocks the way!` : `${names} ${this.combat.enemies.length > 1 ? 'appear' : 'appears'}!`);
    this.showPanel('', null, 'Get ready...');
    await this.wait(900);
    this.beginRound();
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    this.time = time;
    this.host.corridor.draw(this.host.game, time);
    ctx.fillStyle = this.combat.boss ? 'rgba(40,0,0,0.5)' : 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, w, h);

    this.combat.enemies.forEach((enemy, i) => {
      const fx = this.fx[i];
      const { x, ground, u } = this.layout(i);
      let alpha = 1;
      let sink = 0;
      if (fx.dyingSince !== null) {
        const k = Math.min(1, (time - fx.dyingSince) / 550);
        alpha = 1 - k;
        sink = k * 30;
        if (k >= 1) return;
      }
      const flashing = time < fx.flashUntil;
      if (flashing && Math.floor(time / 60) % 2 === 0) alpha *= 0.25;
      const shake = flashing ? Math.sin(time / 18) * 8 : 0;
      const lunge = time < fx.lungeUntil ? 1 + 0.08 * Math.sin(((fx.lungeUntil - time) / 400) * Math.PI) : 1;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x + shake, ground + sink);
      ctx.scale(lunge, lunge);
      drawMonster(ctx, enemy.def.art, 0, 0, u, time + i * 777);
      ctx.restore();

      if (fx.dyingSince === null) {
        // HP gauge
        const bw = Math.min(160, u * 0.7);
        const ratio = this.enemyHp[i] / enemy.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x - bw / 2 - 2, ground + 14, bw + 4, 10);
        ctx.fillStyle = ratio > 0.5 ? '#e0a030' : ratio > 0.25 ? '#e07030' : '#e0483a';
        ctx.fillRect(x - bw / 2, ground + 16, bw * ratio, 6);
      }

      if (this.target === i) {
        const top = ground - u * enemy.def.art.size * 1.05 - 26 + Math.sin(time / 160) * 6;
        ctx.fillStyle = '#f0cf6a';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 16, top - 18);
        ctx.lineTo(x + 16, top - 18);
        ctx.lineTo(x, top);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        ctx.font = '800 20px "Nunito Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeText(enemy.name, x, top - 26);
        ctx.fillStyle = '#fff';
        ctx.fillText(enemy.name, x, top - 26);
      }
    });
  }

  private layout(i: number): { x: number; ground: number; u: number } {
    const n = this.combat.enemies.length;
    const spacing = Math.min(260, 780 / n);
    const u = this.combat.boss ? 215 : n >= 3 ? 190 : 220;
    return { x: 430 + (i - (n - 1) / 2) * spacing, ground: 455, u };
  }

  private enemyAnchor(i: number): { x: number; y: number } {
    const { x, ground, u } = this.layout(i);
    const size = this.combat.enemies[i].def.art.size;
    return { x: VIEW_X + x, y: VIEW_Y + ground - u * size * 0.5 };
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleKey(key: string): boolean {
    if (this.playing) {
      if (key === 'Enter' || key === ' ' || key === 'z' || key === 'Z') this.fast = true;
      return true;
    }
    if (!this.menu) return false;
    if (this.target !== null && (key === 'ArrowLeft' || key === 'a' || key === 'A')) return this.menu.handleKey('ArrowUp');
    if (this.target !== null && (key === 'ArrowRight' || key === 'd' || key === 'D')) return this.menu.handleKey('ArrowDown');
    return this.menu.handleKey(key);
  }

  // ── Command phase ──────────────────────────────────────────────────────────

  private beginRound(): void {
    this.commands = this.combat.party.map(() => null);
    this.syncParty();
    this.current = -1;
    this.nextMember();
  }

  private nextMember(): void {
    const party = this.combat.party;
    for (let i = this.current + 1; i < party.length; i++) {
      if (isAlive(party[i])) {
        this.current = i;
        this.showCommandMenu();
        return;
      }
    }
    void this.execute();
  }

  private previousMember(): void {
    const party = this.combat.party;
    for (let i = this.current - 1; i >= 0; i--) {
      if (isAlive(party[i])) {
        this.commands[i] = null;
        this.current = i;
        this.showCommandMenu();
        return;
      }
    }
  }

  private setCommand(cmd: Command): void {
    this.commands[this.current] = cmd;
    this.target = null;
    this.nextMember();
  }

  private showCommandMenu(): void {
    const m = this.combat.party[this.current];
    this.target = null;
    this.renderParty();
    this.say(`What will ${m.name} do?`);
    const items: MenuItem[] = [
      { label: 'Attack', description: 'A basic attack on one enemy.', onSelect: () => this.chooseEnemy((t) => this.setCommand({ kind: 'attack', target: t }), () => this.showCommandMenu()) },
      { label: 'Skills', detail: '▸', description: 'Use a class skill (costs SP).', onSelect: () => this.showSkillMenu() },
      { label: 'Defend', description: 'Halve damage taken this turn. Acts first.', onSelect: () => this.setCommand({ kind: 'defend' }) },
      { label: 'Items', detail: '▸', description: 'Use an item from the bag.', onSelect: () => this.showItemMenu() },
      {
        label: 'Flee',
        description: this.combat.canFlee ? `Try to escape (${Math.round(this.combat.fleeChance() * 100)}%).` : 'There is no escape from this fight!',
        disabled: !this.combat.canFlee,
        onSelect: () => this.setCommand({ kind: 'flee' }),
      },
    ];
    this.showPanel(`${m.name}`, new ListMenu(items, { onCancel: () => this.previousMember() }), '↑↓ choose · Enter confirm · Esc back');
  }

  private showSkillMenu(): void {
    const m = this.combat.party[this.current];
    const items: MenuItem[] = knownSkills(m).map((skill) => ({
      label: skill.name,
      detail: `${skill.sp} SP`,
      description: skill.description,
      disabled: m.sp < skill.sp,
      onSelect: () => this.chooseSkillTarget(skill),
    }));
    this.showPanel(`${m.name} · Skills`, new ListMenu(items, { onCancel: () => this.showCommandMenu() }), 'Esc back');
  }

  private chooseSkillTarget(skill: SkillDef): void {
    const set = (target: number) => this.setCommand({ kind: 'skill', skill: skill.id, target });
    const back = () => this.showSkillMenu();
    if (skill.target === 'enemy') this.chooseEnemy(set, back);
    else if (skill.target === 'ally') this.chooseAlly(set, back);
    else set(-1);
  }

  private showItemMenu(): void {
    const reserved = (id: ItemId) => this.commands.filter((c) => c?.kind === 'item' && c.item === id).length;
    const items: MenuItem[] = (Object.keys(ITEMS) as ItemId[]).filter(usableInCombat).map((id) => {
      const left = (this.combat.inventory[id] ?? 0) - reserved(id);
      return {
        label: ITEMS[id].name,
        detail: `×${left}`,
        description: ITEMS[id].description,
        disabled: left <= 0,
        onSelect: () => this.chooseAlly((t) => this.setCommand({ kind: 'item', item: id, target: t }), () => this.showItemMenu()),
      };
    });
    this.showPanel('Items', new ListMenu(items, { onCancel: () => this.showCommandMenu() }), 'Esc back');
  }

  private chooseEnemy(pick: (i: number) => void, cancel: () => void): void {
    const living = this.combat.livingEnemies();
    const items: MenuItem[] = living.map((i) => ({
      label: this.combat.enemies[i].name,
      onFocus: () => (this.target = i),
      onSelect: () => pick(i),
    }));
    this.showPanel('Choose a target', new ListMenu(items, { onCancel: () => { this.target = null; cancel(); } }), '←→ / ↑↓ choose · Enter confirm · Esc back');
  }

  private chooseAlly(pick: (i: number) => void, cancel: () => void): void {
    const party = this.combat.party;
    const items: MenuItem[] = party.map((m, i) => ({
      label: m.name,
      detail: `${m.hp}/${memberStats(m).hp} HP`,
      disabled: !isAlive(m),
      onSelect: () => pick(i),
    }));
    const start = party.findIndex((m) => isAlive(m));
    this.showPanel('Choose an ally', new ListMenu(items, { onCancel: cancel, startIndex: start }), 'Esc back');
  }

  // ── Resolution ─────────────────────────────────────────────────────────────

  private async execute(): Promise<void> {
    this.playing = true;
    this.fast = false;
    this.current = -1;
    this.target = null;
    this.menu = null;
    this.showPanel(`Round ${this.combat.round}`, null, 'Enter: speed up');
    this.renderParty();

    const events = this.combat.resolveRound(this.commands);
    for (const ev of events) await this.play(ev);

    this.playing = false;
    if (this.combat.outcome) {
      if (this.combat.outcome === 'victory') this.say('Victory!');
      await this.wait(700);
      this.host.message.classList.add('hidden');
      this.onDone(this.combat);
    } else {
      this.beginRound();
    }
  }

  private async play(ev: CombatEvent): Promise<void> {
    switch (ev.type) {
      case 'act':
        this.say(ev.text);
        if (ev.side === 'enemy') this.fx[ev.actor].lungeUntil = this.time + 400;
        await this.wait(480);
        return;
      case 'damage': {
        if (ev.side === 'enemy') {
          this.enemyHp[ev.target] = ev.hp;
          this.fx[ev.target].flashUntil = this.time + 300;
          const { x, y } = this.enemyAnchor(ev.target);
          const cls = ev.weak ? 'weak' : ev.resist ? 'resist' : '';
          floater(this.host.floaters, x, y, `${ev.amount}${ev.crit ? '!' : ''}`, cls);
          if (ev.weak) floater(this.host.floaters, x, y - 46, 'WEAK', 'weak small');
        } else {
          this.partyHp[ev.target] = ev.hp;
          this.host.party.flash(ev.target, 'hit');
          this.renderParty();
          const { x, y } = this.host.party.anchor(ev.target);
          floater(this.host.floaters, x, y, `${ev.amount}`, 'party');
          if (ev.crit || ev.amount > 25) this.host.shakeView();
        }
        await this.wait(340);
        return;
      }
      case 'heal': {
        this.partyHp[ev.target] = ev.hp;
        this.host.party.flash(ev.target, 'healed');
        this.renderParty();
        const { x, y } = this.host.party.anchor(ev.target);
        floater(this.host.floaters, x, y, `+${ev.amount}`, 'heal');
        await this.wait(300);
        return;
      }
      case 'sp':
        this.partySp[ev.target] = ev.sp;
        this.renderParty();
        return;
      case 'miss': {
        const { x, y } = ev.side === 'enemy' ? this.enemyAnchor(ev.target) : this.host.party.anchor(ev.target);
        floater(this.host.floaters, x, y, 'Miss', 'resist small');
        await this.wait(300);
        return;
      }
      case 'down':
        this.say(ev.text);
        if (ev.side === 'enemy') this.fx[ev.target].dyingSince = this.time;
        await this.wait(520);
        return;
      case 'info':
        this.say(ev.text);
        await this.wait(650);
        return;
      case 'end':
        return;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private syncParty(): void {
    this.partyHp = this.combat.party.map((m) => m.hp);
    this.partySp = this.combat.party.map((m) => m.sp);
  }

  private renderParty(): void {
    this.host.party.render(this.combat.party, { hp: this.partyHp, sp: this.partySp, active: this.current >= 0 ? this.current : null });
  }

  private say(text: string): void {
    this.host.message.textContent = text;
    this.host.message.classList.remove('hidden');
  }

  private showPanel(title: string, menu: ListMenu | null, hint: string): void {
    const panel = this.host.commandPanel;
    panel.innerHTML = '';
    const desc = el('div', { className: 'menu-desc' });
    panel.append(el('div', { className: 'cmd-title', text: title }));
    if (menu) panel.append(menu.el);
    panel.append(desc, el('div', { className: 'cmd-hint', text: hint }));
    this.menu = menu;
    menu?.describeInto(desc);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, this.fast ? ms / 3 : ms));
  }
}
