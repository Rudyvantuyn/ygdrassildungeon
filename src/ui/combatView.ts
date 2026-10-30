import type { Combat, CombatEvent, Command } from '../core/combat';
import { ITEMS, usableInCombat } from '../core/data/items';
import type { SkillDef } from '../core/data/skills';
import type { Game } from '../core/game';
import { isAlive, knownSkills, memberStats } from '../core/party';
import { rankOf, skillFor } from '../core/skilltree';
import { chooseCommands } from '../core/tactics';
import type { Mods } from '../core/combat';
import type { ModStat } from '../core/types';
import type { ItemId } from '../core/types';
import type { CorridorRenderer } from '../render/corridor';
import { drawMonster } from '../render/monsters';
import { audio, type Sfx } from '../audio/audio';
import type { Ailment, Element } from '../core/types';
import { el, floater } from './dom';
import { ListMenu, type MenuItem } from './menu';
import type { PartyView } from './partyView';
import { prefs } from './prefs';

/** How much faster each battle speed plays. */
const SPEED_FACTOR = { 1: 1, 2: 1.8, 3: 3 } as const;

export interface CombatHost {
  game: Game;
  party: PartyView;
  corridor: CorridorRenderer;
  floaters: HTMLElement;
  commandPanel: HTMLElement;
  message: HTMLElement;
  shakeView(): void;
  /** On an expedition: the player behind each party member. */
  readonly partyOwners?: string[];
  /** Something worth a tip happened (shown after the fight). */
  noticeTip?(id: string): void;
}

/**
 * Decides who picks commands and how a round gets resolved. Without one, the player
 * commands the whole party and the round is resolved right here.
 */
export interface RoundDriver {
  /** Whether this player picks the command for party member `i`. */
  controls(i: number): boolean;
  /** Hands over this player's commands; resolves with the round's events once it is settled. */
  resolve(commands: (Command | null)[]): Promise<CombatEvent[]>;
  /** A short line shown while choosing (for example the time left). */
  status?(): string;
}

interface EnemyFx {
  flashUntil: number;
  lungeUntil: number;
  dyingSince: number | null;
}

export const AILMENT_BADGE: Record<Ailment, { short: string; color: string }> = {
  poison: { short: 'PSN', color: '#9be05a' },
  sleep: { short: 'SLP', color: '#8ab4ff' },
  paralysis: { short: 'PAR', color: '#f0d050' },
};

const HIT_SOUND: Record<Element, Sfx> = { phys: 'hitPhys', fire: 'hitFire', frost: 'hitFrost', storm: 'hitStorm' };

/** View offset of the corridor canvas inside the stage. */
const VIEW_X = 20;
const VIEW_Y = 20;

export class CombatView {
  private fx: EnemyFx[];
  private enemyAilment: (Ailment | null)[];
  private partyAilment: (Ailment | null)[] = [];
  private enemyHp: number[];
  private partyHp: number[] = [];
  private partySp: number[] = [];
  private commands: (Command | null)[] = [];
  private current = -1;
  private menu: ListMenu | null = null;
  private target: number | null = null;
  private playing = false;
  private fast = false;
  /** The commands of the last round, for "Repeat". */
  private lastCommands: (Command | null)[] | null = null;
  /** Auto battle: the party picks its own commands every round until stopped. */
  private auto = false;
  private time = 0;
  private statusEl: HTMLElement | null = null;

  constructor(
    private readonly host: CombatHost,
    private readonly combat: Combat,
    private readonly onDone: (combat: Combat) => void,
    private readonly driver: RoundDriver | null = null,
  ) {
    this.fx = combat.enemies.map(() => ({ flashUntil: 0, lungeUntil: 0, dyingSince: null }));
    this.enemyHp = combat.enemies.map((e) => e.hp);
    this.enemyAilment = combat.enemies.map(() => null);
    this.partyAilment = combat.party.map(() => null);
  }

  async start(): Promise<void> {
    this.syncParty();
    this.renderParty();
    const names = this.combat.enemies.map((e) => e.name).join(', ');
    const plural = this.combat.enemies.length > 1;
    this.say(
      this.combat.boss
        ? `${names} blocks the way!`
        : this.combat.prowler
          ? `${names} ${plural ? 'lunge' : 'lunges'} out of the dark!`
          : `${names} ${plural ? 'appear' : 'appears'}!`,
    );
    this.showPanel('', null, 'Get ready...');
    await this.wait(900);
    this.beginRound();
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    this.time = time;
    this.host.corridor.draw(this.host.game, time);
    if (this.statusEl && this.driver?.status) this.statusEl.textContent = this.driver.status();
    ctx.fillStyle = this.combat.boss ? 'rgba(40,0,0,0.5)' : this.combat.prowler ? 'rgba(40,16,0,0.5)' : 'rgba(0,0,0,0.45)';
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
      drawMonster(ctx, enemy.def, 0, 0, u, time + i * 777);
      ctx.restore();

      if (fx.dyingSince === null) {
        // HP gauge: a dark trough with a bronze rim, like the party's bars
        const bw = Math.min(160, u * 0.7);
        const ratio = Math.max(0, this.enemyHp[i] / enemy.maxHp);
        const top = ground + 14;
        ctx.beginPath();
        ctx.roundRect(x - bw / 2 - 3, top - 2, bw + 6, 12, 6);
        ctx.fillStyle = '#6b5128';
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(x - bw / 2 - 2, top - 1, bw + 4, 10, 5);
        ctx.fillStyle = '#0c0907';
        ctx.fill();
        if (ratio > 0) {
          const fill = ctx.createLinearGradient(0, top, 0, top + 8);
          const [hi, mid, lo] = ratio > 0.5 ? ['#ffcf6a', '#d88a26', '#7a4410'] : ratio > 0.25 ? ['#ffa070', '#d8562a', '#7a2410'] : ['#ff8a7a', '#e0302a', '#8a0a06'];
          fill.addColorStop(0, hi);
          fill.addColorStop(0.55, mid);
          fill.addColorStop(1, lo);
          ctx.beginPath();
          ctx.roundRect(x - bw / 2, top, Math.max(8, bw * ratio), 8, 4);
          ctx.fillStyle = fill;
          ctx.fill();
        }
        const ailment = this.enemyAilment[i];
        const mods = modText(enemy.mods);
        if (mods) {
          // Next to the ailment badge when there is one, else in its place.
          ctx.font = '800 12px "Nunito Sans", sans-serif';
          ctx.textAlign = ailment ? 'left' : 'center';
          ctx.fillStyle = '#f0e0b0';
          ctx.fillText(mods, ailment ? x + 28 : x, ground + 41);
        }
        if (ailment) {
          const badge = AILMENT_BADGE[ailment];
          ctx.font = '800 13px "Nunito Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = badge.color;
          ctx.fillRect(x - 22, ground + 28, 44, 18);
          ctx.fillStyle = '#000';
          ctx.fillText(badge.short, x, ground + 41);
        }
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
        ctx.font = '800 20px Cinzel, Georgia, serif';
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
      if (this.auto && (key === 'Escape' || key === 'x' || key === 'X')) this.stopAuto();
      return true;
    }
    if (!this.menu) return false;
    if (this.target === null && (key === 'r' || key === 'R') && this.lastCommands) {
      this.repeat();
      return true;
    }
    if (this.target === null && (key === 'o' || key === 'O')) {
      this.startAuto();
      return true;
    }
    if (this.target !== null && (key === 'ArrowLeft' || key === 'a' || key === 'A')) return this.menu.handleKey('ArrowUp');
    if (this.target !== null && (key === 'ArrowRight' || key === 'd' || key === 'D')) return this.menu.handleKey('ArrowDown');
    return this.menu.handleKey(key);
  }

  // ── Command phase ──────────────────────────────────────────────────────────

  private beginRound(): void {
    this.commands = this.combat.party.map(() => null);
    this.syncParty();
    this.current = -1;
    if (this.auto) return this.fillAndGo(chooseCommands(this.combat));
    this.nextMember();
  }

  /** Whether this player picks for party member `i` this round. */
  private mine(i: number): boolean {
    return isAlive(this.combat.party[i]) && (this.driver?.controls(i) ?? true);
  }

  /** Sets the commands for everyone this player controls and plays the round. */
  private fillAndGo(picks: (Command | null)[]): void {
    this.commands = this.combat.party.map((_, i) => (this.mine(i) ? picks[i] : null));
    this.current = this.combat.party.length;
    void this.execute();
  }

  /** Does the same as last round, where that still works; otherwise what the party would pick itself. */
  private repeat(): void {
    const last = this.lastCommands;
    if (!last) return;
    const fallback = chooseCommands(this.combat);
    const party = this.combat.party;
    const usable = (i: number, cmd: Command | null): boolean => {
      if (!cmd) return false;
      if (cmd.kind === 'skill') {
        const skill = skillFor(party[i], cmd.skill);
        if (!skill || party[i].sp < skill.sp) return false;
        if (skill.kind === 'revive') return cmd.target >= 0 && !isAlive(party[cmd.target]);
        return true;
      }
      if (cmd.kind === 'item') {
        if ((this.combat.inventory[cmd.item] ?? 0) <= 0) return false;
        return ITEMS[cmd.item].effect === 'revive' ? !isAlive(party[cmd.target]) : isAlive(party[cmd.target]);
      }
      if (cmd.kind === 'flee') return this.combat.canFlee;
      return true;
    };
    this.fillAndGo(party.map((_, i) => (usable(i, last[i]) ? last[i] : fallback[i])));
  }

  private startAuto(): void {
    this.auto = true;
    this.fillAndGo(chooseCommands(this.combat));
  }

  private stopAuto(): void {
    this.auto = false;
    this.showPanel('Auto battle', null, 'Auto stops after this round.');
  }

  private nextMember(): void {
    const party = this.combat.party;
    for (let i = this.current + 1; i < party.length; i++) {
      if (isAlive(party[i]) && (this.driver?.controls(i) ?? true)) {
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
      if (isAlive(party[i]) && (this.driver?.controls(i) ?? true)) {
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
      ...(this.lastCommands
        ? [{ label: 'Repeat', detail: 'R', description: 'Everyone does what they did last round (where they still can).', onSelect: () => this.repeat() }]
        : []),
      { label: 'Auto', detail: 'O', description: 'The party fights on its own, round after round. Esc or tap the panel to stop.', onSelect: () => this.startAuto() },
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
      detail: `Rk ${rankOf(m, skill.id)} · ${skill.sp} SP`,
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
    else if (skill.target === 'ally') this.chooseAlly(set, back, skill.kind === 'revive');
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
        onSelect: () =>
          this.chooseAlly((t) => this.setCommand({ kind: 'item', item: id, target: t }), () => this.showItemMenu(), ITEMS[id].effect === 'revive'),
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

  /** `fallen`: pick among the fallen (for reviving) instead of the living. */
  private chooseAlly(pick: (i: number) => void, cancel: () => void, fallen = false): void {
    const party = this.combat.party;
    const eligible = (m: (typeof party)[number]) => isAlive(m) !== fallen;
    const items: MenuItem[] = party.map((m, i) => ({
      label: m.name,
      detail: isAlive(m) ? `${m.hp}/${memberStats(m).hp} HP` : 'fallen',
      disabled: !eligible(m),
      onSelect: () => pick(i),
    }));
    const start = Math.max(0, party.findIndex(eligible));
    this.showPanel(fallen ? 'Choose a fallen ally' : 'Choose an ally', new ListMenu(items, { onCancel: cancel, startIndex: start }), 'Esc back');
  }

  // ── Resolution ─────────────────────────────────────────────────────────────

  /** Settles the round now with whatever has been chosen so far (the others' time ran out). */
  forceRound(): void {
    if (!this.playing) void this.execute();
  }

  private async execute(): Promise<void> {
    this.playing = true;
    this.fast = false;
    this.current = -1;
    this.target = null;
    this.menu = null;
    this.renderParty();

    if (this.commands.some(Boolean)) this.lastCommands = [...this.commands];
    let events: CombatEvent[];
    const round = this.combat.round;
    const hint = this.auto ? 'Auto · Enter: speed up · Esc: stop' : 'Enter: speed up';
    if (this.driver) {
      this.showPanel(`Round ${round}`, null, 'Waiting for the others...');
      events = await this.driver.resolve(this.commands);
      this.showPanel(`Round ${round}`, null, hint);
    } else {
      this.showPanel(`Round ${round}`, null, hint);
      events = this.combat.resolveRound(this.commands);
    }
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
          audio.play(ev.crit ? 'crit' : HIT_SOUND[ev.element]);
          this.enemyHp[ev.target] = ev.hp;
          this.fx[ev.target].flashUntil = this.time + 300;
          const { x, y } = this.enemyAnchor(ev.target);
          const cls = ev.weak ? 'weak' : ev.resist ? 'resist' : '';
          floater(this.host.floaters, x, y, `${ev.amount}${ev.crit ? '!' : ''}`, cls);
          if (ev.weak) floater(this.host.floaters, x, y - 46, 'WEAK', 'weak small');
        } else {
          audio.play(ev.crit ? 'crit' : 'hurt');
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
        audio.play(this.partyHp[ev.target] <= 0 ? 'revive' : 'heal');
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
        audio.play('miss');
        const { x, y } = ev.side === 'enemy' ? this.enemyAnchor(ev.target) : this.host.party.anchor(ev.target);
        floater(this.host.floaters, x, y, 'Miss', 'resist small');
        await this.wait(300);
        return;
      }
      case 'ailment': {
        if (ev.ailment) this.host.noticeTip?.('ailment');
        audio.play(ev.ailment ? 'ailment' : 'cure');
        if (ev.side === 'enemy') this.enemyAilment[ev.target] = ev.ailment;
        else {
          this.partyAilment[ev.target] = ev.ailment;
          this.renderParty();
        }
        this.say(ev.text);
        await this.wait(ev.ailment ? 520 : 380);
        return;
      }
      case 'down':
        if (ev.side === 'party') this.host.noticeTip?.('fallen');
        if (ev.side === 'enemy') this.enemyAilment[ev.target] = null;
        else this.partyAilment[ev.target] = null;
        audio.play(ev.side === 'enemy' ? 'enemyDown' : 'allyDown');
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
    this.host.party.render(this.combat.party, {
      hp: this.partyHp,
      sp: this.partySp,
      ailments: this.partyAilment,
      mods: this.combat.status.map((s) => {
        if (s.mods && Object.keys(s.mods).length) this.host.noticeTip?.('buffs');
        return modText(s.mods);
      }),
      active: this.current >= 0 ? this.current : null,
      owners: this.host.partyOwners,
    });
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
    if (this.auto) panel.onclick = () => this.stopAuto();
    else panel.onclick = null;
    this.statusEl = this.driver?.status ? el('div', { className: 'cmd-timer' }) : null;
    if (this.statusEl) panel.append(this.statusEl);
    this.menu = menu;
    menu?.describeInto(desc);
  }

  private wait(ms: number): Promise<void> {
    const speed = SPEED_FACTOR[prefs.battleSpeed] * (this.fast ? 3 : 1);
    return new Promise((resolve) => window.setTimeout(resolve, ms / speed));
  }
}

/** "ATK▲ DEF▼" for the buffs and debuffs on a fighter. */
function modText(mods: Mods | undefined): string {
  if (!mods) return '';
  const names: Record<ModStat, string> = { atk: 'ATK', def: 'DEF', mag: 'MAG', res: 'RES' };
  return (Object.keys(mods) as ModStat[]).map((k) => `${names[k]}${mods[k]!.amount > 0 ? '▲' : '▼'}`).join(' ');
}
