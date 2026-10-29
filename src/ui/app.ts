import type { Combat } from '../core/combat';
import { FLOORS } from '../core/data/floors';
import { ITEMS } from '../core/data/items';
import { DIR_NAMES } from '../core/dungeon';
import { Game, type StepEvent } from '../core/game';
import { healAmount, healMember, isAlive, knownSkills, memberStats, restoreTp, xpForLevel } from '../core/party';
import { randomSeed } from '../core/rng';
import type { ItemId, Loot } from '../core/types';
import { CLASSES } from '../core/data/classes';
import { CorridorRenderer } from '../render/corridor';
import { drawMinimap } from '../render/minimap';
import { CombatView, type CombatHost } from './combatView';
import { el, floater } from './dom';
import { ListMenu, type MenuItem } from './menu';
import { PartyView } from './partyView';
import { clearSave, readSave, writeSave } from './storage';

const VIEW_W = 860;
const VIEW_H = 520;
const MAP_SIZE = 270;
const MOVE_COOLDOWN = 150;

type Mode = 'title' | 'explore' | 'combat' | 'overlay' | 'busy';
type ViewFx = { kind: 'step' | 'turn' | 'bump' | 'encounter' | 'shake'; start: number };

export class App implements CombatHost {
  game!: Game;
  readonly party: PartyView;
  readonly corridor: CorridorRenderer;
  readonly floaters: HTMLElement;
  readonly commandPanel: HTMLElement;
  readonly message: HTMLElement;

  private readonly stage: HTMLElement;
  private readonly viewWrap: HTMLElement;
  private readonly view: CanvasRenderingContext2D;
  private readonly minimap: CanvasRenderingContext2D;
  private readonly overlay: HTMLElement;
  private readonly toastEl: HTMLElement;
  private readonly floorName: HTMLElement;
  private readonly compass: HTMLElement;
  private readonly dangerOrb: HTMLElement;
  private readonly goldEl: HTMLElement;
  private readonly explorePanels: HTMLElement[];

  private mode: Mode = 'title';
  private overlayMenu: ListMenu | null = null;
  private combatView: CombatView | null = null;
  private fx: ViewFx | null = null;
  private lastMove = 0;
  private toastTimer = 0;
  private now = 0;

  constructor(root: HTMLElement) {
    this.stage = el('div', { id: 'stage' });
    root.appendChild(this.stage);

    const viewCanvas = el('canvas', { id: 'view' });
    viewCanvas.width = VIEW_W;
    viewCanvas.height = VIEW_H;
    this.message = el('div', { className: 'msg panel hidden' });
    this.toastEl = el('div', { className: 'toast panel hidden' });
    this.viewWrap = el('div', { id: 'view-wrap' }, [viewCanvas, this.message, this.toastEl]);

    this.floorName = el('div', { id: 'floor-name' });
    this.compass = el('div', { id: 'compass' });
    const minimapCanvas = el('canvas', { id: 'minimap' });
    minimapCanvas.width = MAP_SIZE;
    minimapCanvas.height = MAP_SIZE;
    this.dangerOrb = el('div', { id: 'danger-orb' });
    this.goldEl = el('div', { id: 'gold' });
    const mapPanel = el('div', { id: 'map-panel', className: 'panel' }, [minimapCanvas]);
    const statusRow = el('div', { id: 'status-row', className: 'panel' }, [
      el('div', { id: 'danger' }, [this.dangerOrb, el('span', { text: 'Danger' })]),
      this.goldEl,
    ]);
    const controls = el('div', { id: 'controls', className: 'panel' });
    const buttons: [string, string][] = [
      ['↶', 'q'], ['▲', 'ArrowUp'], ['↷', 'e'], ['Camp', 'c'],
      ['◀', 'ArrowLeft'], ['▼', 'ArrowDown'], ['▶', 'ArrowRight'], ['Map', 'm'],
    ];
    for (const [label, key] of buttons) {
      const b = el('button', { text: label });
      b.addEventListener('click', () => this.onKey(key));
      controls.appendChild(b);
    }
    this.commandPanel = el('div', { id: 'command-panel', className: 'panel hidden' });
    this.explorePanels = [mapPanel, statusRow, controls];
    const side = el('aside', { id: 'side' }, [
      el('div', { id: 'floor-panel', className: 'panel' }, [this.floorName, this.compass]),
      mapPanel,
      statusRow,
      controls,
      this.commandPanel,
    ]);

    const partyEl = el('div', { id: 'party' });
    this.floaters = el('div', { id: 'floaters' });
    this.overlay = el('div', { id: 'overlay', className: 'hidden' });
    this.stage.append(this.viewWrap, side, partyEl, this.floaters, this.overlay);

    this.view = viewCanvas.getContext('2d')!;
    this.minimap = minimapCanvas.getContext('2d')!;
    this.corridor = new CorridorRenderer(this.view, VIEW_W, VIEW_H);
    this.party = new PartyView(partyEl);

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (this.onKey(e.key)) e.preventDefault();
    });

    this.showTitle();
  }

  /** Called every animation frame. */
  frame(time: number): void {
    this.now = time;
    const ctx = this.view;
    ctx.save();
    if (this.fx?.kind === 'bump' || this.fx?.kind === 'shake') {
      const k = (time - this.fx.start) / 220;
      if (k < 1) ctx.translate(Math.sin(k * 30) * 8 * (1 - k), 0);
    }
    if (this.mode === 'combat' && this.combatView) {
      this.combatView.draw(ctx, VIEW_W, VIEW_H, time);
    } else if (this.game) {
      this.corridor.draw(this.game, time);
    }
    ctx.restore();
    this.drawFx(time);
    if (this.game && this.mode !== 'combat') drawMinimap(this.minimap, MAP_SIZE, this.game, time);
  }

  private drawFx(time: number): void {
    const fx = this.fx;
    if (!fx) return;
    const ctx = this.view;
    const t = time - fx.start;
    if (fx.kind === 'step' || fx.kind === 'turn') {
      const k = t / MOVE_COOLDOWN;
      if (k >= 1) return void (this.fx = null);
      ctx.fillStyle = `rgba(0,0,0,${(fx.kind === 'turn' ? 0.5 : 0.35) * (1 - k)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    } else if (fx.kind === 'encounter') {
      const k = t / 700;
      if (k >= 1) return void (this.fx = null);
      const flicker = Math.floor(t / 70) % 2 === 0;
      ctx.fillStyle = flicker ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    } else if (t > 260) {
      this.fx = null;
    }
  }

  shakeView(): void {
    this.fx = { kind: 'shake', start: this.now };
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private onKey(key: string): boolean {
    switch (this.mode) {
      case 'title':
      case 'overlay':
        return this.overlayMenu?.handleKey(key) ?? false;
      case 'combat':
        return this.combatView?.handleKey(key) ?? false;
      case 'explore':
        return this.exploreKey(key);
      case 'busy':
        return true;
    }
  }

  private exploreKey(key: string): boolean {
    const k = key.length === 1 ? key.toLowerCase() : key;
    const move = (fn: () => void) => {
      if (this.now - this.lastMove < MOVE_COOLDOWN) return true;
      this.lastMove = this.now;
      fn();
      return true;
    };
    switch (k) {
      case 'ArrowUp':
      case 'w':
        return move(() => this.step(1, 0));
      case 'ArrowDown':
      case 's':
        return move(() => this.step(-1, 0));
      case 'ArrowLeft':
      case 'a':
        return move(() => this.turn(-1));
      case 'ArrowRight':
      case 'd':
        return move(() => this.turn(1));
      case 'q':
        return move(() => this.step(0, -1));
      case 'e':
        return move(() => this.step(0, 1));
      case 'c':
      case 'Escape':
        this.openCamp();
        return true;
      case 'm':
        this.showMapOverlay();
        return true;
    }
    return false;
  }

  // ── Title & game flow ──────────────────────────────────────────────────────

  private showTitle(): void {
    this.game = Game.newGame(1); // background scenery only
    this.hideSideForCombat(false);
    this.updateHud();
    this.party.render(this.game.state.party);
    const hasSave = readSave() !== null;
    const menu = new ListMenu(
      [
        { label: 'New Game', onSelect: () => this.newGame() },
        { label: 'Continue', disabled: !hasSave, onSelect: () => this.loadSave() },
      ],
      { startIndex: hasSave ? 1 : 0 },
    );
    const screen = el('div', { className: 'title-screen' }, [
      el('div', { className: 'logo', text: 'YGDRASSIL' }),
      el('div', { className: 'tagline', text: 'Labyrinth of the World Tree' }),
      el('div', { className: 'panel dialog' }, [menu.el]),
      el('div', { className: 'title-foot', text: 'Arrow keys / WASD to move · Enter to confirm · Esc to go back' }),
    ]);
    this.openOverlay(screen, menu, 'title');
  }

  private newGame(): void {
    this.game = Game.newGame(randomSeed());
    this.save();
    this.closeOverlay();
    this.enterExplore();
    this.toast(`${this.game.floorDef.name} — find the stairs down.`);
  }

  private loadSave(): void {
    const data = readSave();
    if (!data) return;
    try {
      this.game = Game.load(data);
    } catch {
      clearSave();
      this.showTitle();
      return;
    }
    this.closeOverlay();
    this.enterExplore();
    this.toast('Game loaded.');
  }

  private save(): void {
    writeSave(this.game.serialize());
  }

  private enterExplore(): void {
    this.mode = 'explore';
    this.hideSideForCombat(false);
    this.message.classList.add('hidden');
    this.updateHud();
  }

  private updateHud(): void {
    const g = this.game;
    this.floorName.textContent = g.floorDef.name;
    this.compass.textContent = DIR_NAMES[g.state.dir];
    const level = g.dangerLevel;
    const color = level < 0.45 ? '#3fb6e8' : level < 0.75 ? '#e8c43f' : '#e8483f';
    this.dangerOrb.style.background = `radial-gradient(circle at 35% 30%, #fff, ${color} 55%, #000 120%)`;
    this.dangerOrb.style.color = color;
    this.goldEl.textContent = `${g.state.gold} G`;
    this.party.render(g.state.party);
  }

  // ── Exploration ────────────────────────────────────────────────────────────

  private turn(delta: -1 | 1): void {
    this.game.turn(delta);
    this.fx = { kind: 'turn', start: this.now };
    this.updateHud();
  }

  private step(forward: number, right: number): void {
    const events = this.game.step(forward, right);
    for (const ev of events) this.handleStep(ev);
    this.updateHud();
  }

  private handleStep(ev: StepEvent): void {
    switch (ev.type) {
      case 'bump':
        this.fx = { kind: 'bump', start: this.now };
        return;
      case 'moved':
        this.fx = { kind: 'step', start: this.now };
        return;
      case 'chest':
        this.toast(`Found ${describeLoot(ev.loot)} in the chest!`);
        return;
      case 'emptyChest':
        this.toast('The chest is empty.');
        return;
      case 'stairs':
        if (this.game.isLastFloor) return;
        this.confirm('Stairs down', `Descend to ${FLOORS[this.game.state.floor + 1].name}?`, () => {
          this.game.descend();
          this.save();
          this.enterExplore();
          this.toast(`${this.game.floorDef.name} — game saved.`);
        });
        return;
      case 'spring':
        if (ev.used) {
          this.toast('The spring has run dry.');
          return;
        }
        this.confirm('Healing spring', 'Drink from the spring? It fully restores the party and saves your game. It only works once.', () => {
          this.game.drinkSpring();
          this.save();
          this.enterExplore();
          this.toast('The party feels refreshed. Game saved.');
        });
        return;
      case 'boss':
        this.mode = 'busy';
        this.toast('A terrible presence stirs...');
        window.setTimeout(() => this.startCombat(this.game.startBossCombat()), 1100);
        return;
      case 'encounter':
        this.mode = 'busy';
        this.fx = { kind: 'encounter', start: this.now };
        window.setTimeout(() => this.startCombat(this.game.startCombat(ev.enemies)), 700);
        return;
    }
  }

  // ── Combat ─────────────────────────────────────────────────────────────────

  private startCombat(combat: Combat): void {
    this.mode = 'combat';
    this.toastEl.classList.add('hidden');
    this.hideSideForCombat(true);
    this.combatView = new CombatView(this, combat, (c) => this.endCombat(c));
    void this.combatView.start();
  }

  private endCombat(combat: Combat): void {
    this.game.finishCombat(combat);
    this.combatView = null;
    this.hideSideForCombat(false);
    this.updateHud();

    if (combat.outcome === 'defeat') return this.showGameOver();
    if (combat.outcome === 'fled') {
      this.enterExplore();
      this.toast('The party got away.');
      return;
    }
    const r = combat.rewards!;
    const lines = el('div', { className: 'rewards' }, [
      el('span', { text: 'Experience' }), el('span', { className: 'v', text: `+${r.xp}` }),
      el('span', { text: 'Gold' }), el('span', { className: 'v', text: `+${r.gold} G` }),
      ...r.drops.flatMap((id) => [el('span', { text: 'Found' }), el('span', { className: 'v', text: ITEMS[id].name })]),
    ]);
    const levelUps = r.levelUps.map((l) =>
      el('div', { className: 'levelup', text: `${this.game.state.party[l.member].name} reached level ${l.level}!` }),
    );
    const done = () => {
      this.closeOverlay();
      if (this.game.state.cleared && combat.boss) return this.showCleared();
      this.enterExplore();
    };
    const menu = new ListMenu([{ label: 'Continue', onSelect: done }], { onCancel: done });
    this.openOverlay(
      el('div', { className: 'panel dialog' }, [el('h2', { text: 'Victory!' }), lines, ...levelUps, menu.el]),
      menu,
    );
  }

  private hideSideForCombat(combat: boolean): void {
    for (const p of this.explorePanels) p.classList.toggle('hidden', combat);
    this.commandPanel.classList.toggle('hidden', !combat);
  }

  private showGameOver(): void {
    const hasSave = readSave() !== null;
    const menu = new ListMenu([
      { label: 'Load last save', disabled: !hasSave, onSelect: () => this.loadSave() },
      { label: 'Return to title', onSelect: () => this.showTitle() },
    ]);
    this.openOverlay(
      el('div', { className: 'panel dialog' }, [
        el('h2', { text: 'Your party has fallen' }),
        el('p', { text: 'The labyrinth claims another expedition. Your last save is waiting.' }),
        menu.el,
      ]),
      menu,
    );
  }

  private showCleared(): void {
    const s = this.game.state;
    const menu = new ListMenu([
      { label: 'Keep exploring', onSelect: () => { this.closeOverlay(); this.enterExplore(); } },
      { label: 'Return to title', onSelect: () => this.showTitle() },
    ]);
    this.save();
    this.openOverlay(
      el('div', { className: 'panel dialog' }, [
        el('h2', { text: 'Stratum cleared!' }),
        el('p', { text: `The Withered Warden has fallen. The way to the World Tree lies open.` }),
        el('p', { text: `Steps: ${s.steps} · Battles: ${s.battles} · Gold: ${s.gold} G` }),
        menu.el,
      ]),
      menu,
    );
  }

  // ── Camp ───────────────────────────────────────────────────────────────────

  private openCamp(): void {
    const close = () => {
      this.closeOverlay();
      this.enterExplore();
    };
    const menu = new ListMenu(
      [
        { label: 'Skills', description: 'Use a healing skill.', onSelect: () => this.campSkills() },
        { label: 'Items', description: 'Use an item.', onSelect: () => this.campItems() },
        { label: 'Party', description: 'View stats.', onSelect: () => this.campStatus() },
        { label: 'Save', description: 'Save your progress.', onSelect: () => { this.save(); close(); this.toast('Game saved.'); } },
        { label: 'Quit to title', onSelect: () => this.showTitle() },
        { label: 'Close', onSelect: close },
      ],
      { onCancel: close },
    );
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.openOverlay(el('div', { className: 'panel dialog' }, [el('h2', { text: 'Camp' }), menu.el, desc]), menu);
  }

  private campSkills(): void {
    const party = this.game.state.party;
    const items: MenuItem[] = [];
    party.forEach((m) => {
      for (const skill of knownSkills(m).filter((s) => s.field)) {
        items.push({
          label: `${m.name}: ${skill.name}`,
          detail: `${skill.tp} TP`,
          description: skill.description,
          disabled: !isAlive(m) || m.tp < skill.tp,
          onSelect: () => {
            const cast = (targets: number[]) => {
              m.tp -= skill.tp;
              const amount = healAmount(m, skill.power);
              for (const t of targets) {
                const healed = healMember(party[t], amount);
                const a = this.party.anchor(t);
                floater(this.floaters, a.x, a.y, `+${healed}`, 'heal');
              }
              this.updateHud();
              this.campSkills();
            };
            if (skill.target === 'allAllies') cast(party.flatMap((p, i) => (isAlive(p) ? [i] : [])));
            else this.pickAlly(`${skill.name} on whom?`, (t) => cast([t]), () => this.campSkills());
          },
        });
      }
    });
    if (items.length === 0) items.push({ label: 'No usable skills', disabled: true, onSelect: () => {} });
    this.subMenu('Skills', items, () => this.openCamp());
  }

  private campItems(): void {
    const party = this.game.state.party;
    const inv = this.game.state.inventory;
    const items: MenuItem[] = (Object.keys(ITEMS) as ItemId[]).map((id) => ({
      label: ITEMS[id].name,
      detail: `×${inv[id] ?? 0}`,
      description: ITEMS[id].description,
      disabled: (inv[id] ?? 0) <= 0,
      onSelect: () =>
        this.pickAlly(`Use ${ITEMS[id].name} on whom?`, (t) => {
          const def = ITEMS[id];
          const amount = def.restores === 'hp' ? healMember(party[t], def.amount) : restoreTp(party[t], def.amount);
          inv[id] -= 1;
          const a = this.party.anchor(t);
          floater(this.floaters, a.x, a.y, `+${amount}${def.restores === 'tp' ? ' TP' : ''}`, 'heal');
          this.updateHud();
          this.campItems();
        }, () => this.campItems()),
    }));
    this.subMenu('Items', items, () => this.openCamp());
  }

  private campStatus(): void {
    const rows = this.game.state.party.map((m) => {
      const s = memberStats(m);
      const next = xpForLevel(m.level + 1) - m.xp;
      return `<tr><td>${m.name}</td><td>${CLASSES[m.classId].name}</td><td>${m.level}</td><td>${m.hp}/${s.hp}</td><td>${m.tp}/${s.tp}</td><td>${s.atk}</td><td>${s.def}</td><td>${s.mag}</td><td>${s.res}</td><td>${s.spd}</td><td>${next}</td></tr>`;
    });
    const table = el('table', { className: 'stats' });
    table.innerHTML = `<thead><tr><th>Name</th><th>Class</th><th>Lv</th><th>HP</th><th>TP</th><th>ATK</th><th>DEF</th><th>MAG</th><th>RES</th><th>SPD</th><th>Next</th></tr></thead><tbody>${rows.join('')}</tbody>`;
    const menu = new ListMenu([{ label: 'Back', onSelect: () => this.openCamp() }], { onCancel: () => this.openCamp() });
    this.openOverlay(el('div', { className: 'panel dialog' }, [el('h2', { text: 'Party' }), table, menu.el]), menu);
  }

  private pickAlly(title: string, pick: (i: number) => void, back: () => void): void {
    const items = this.game.state.party.map((m, i) => ({
      label: m.name,
      detail: `${m.hp}/${memberStats(m).hp} HP · ${m.tp} TP`,
      disabled: !isAlive(m),
      onSelect: () => pick(i),
    }));
    this.subMenu(title, items, back);
  }

  private subMenu(title: string, items: MenuItem[], back: () => void): void {
    const menu = new ListMenu(items, { onCancel: back });
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.openOverlay(el('div', { className: 'panel dialog' }, [el('h2', { text: title }), menu.el, desc]), menu);
  }

  private showMapOverlay(): void {
    const canvas = el('canvas');
    canvas.width = 480;
    canvas.height = 480;
    drawMinimap(canvas.getContext('2d')!, 480, this.game, this.now);
    const close = () => {
      this.closeOverlay();
      this.enterExplore();
    };
    const menu = new ListMenu([{ label: 'Close', onSelect: close }], { onCancel: close });
    this.openOverlay(el('div', { className: 'panel dialog' }, [el('h2', { text: this.game.floorDef.name }), canvas, menu.el]), menu);
  }

  // ── Overlay helpers ────────────────────────────────────────────────────────

  private confirm(title: string, text: string, yes: () => void): void {
    const no = () => {
      this.closeOverlay();
      this.enterExplore();
    };
    const menu = new ListMenu(
      [
        { label: 'Yes', onSelect: () => { this.closeOverlay(); yes(); } },
        { label: 'No', onSelect: no },
      ],
      { onCancel: no },
    );
    this.openOverlay(el('div', { className: 'panel dialog' }, [el('h2', { text: title }), el('p', { text }), menu.el]), menu);
  }

  private openOverlay(content: HTMLElement, menu: ListMenu, mode: Mode = 'overlay'): void {
    this.overlay.innerHTML = '';
    this.overlay.appendChild(content);
    this.overlay.classList.remove('hidden');
    this.overlayMenu = menu;
    this.mode = mode;
  }

  private closeOverlay(): void {
    this.overlay.classList.add('hidden');
    this.overlay.innerHTML = '';
    this.overlayMenu = null;
  }

  private toast(text: string): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.add('hidden'), 2400);
  }

  /** Test/debug hook: force a random encounter on the current floor. */
  debugEncounter(): void {
    if (this.mode !== 'explore') return;
    this.handleStep({ type: 'encounter', enemies: this.game.floorDef.encounters[0].enemies });
  }
}

function describeLoot(loot: Loot): string {
  if ('gold' in loot) return `${loot.gold} gold`;
  return `${loot.qty}× ${ITEMS[loot.item].name}`;
}
