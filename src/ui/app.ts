import type { Combat } from '../core/combat';
import { FLOORS } from '../core/data/floors';
import { ENEMIES } from '../core/data/enemies';
import { EQUIPMENT } from '../core/data/equipment';
import { ITEMS } from '../core/data/items';
import { MATERIALS } from '../core/data/materials';
import { DIR_NAMES } from '../core/dungeon';
import { Game, type StepEvent } from '../core/game';
import { healAmount, healMember, isAlive, knownSkills, memberStats, restoreSp, revive, xpForLevel } from '../core/party';
import { randomSeed } from '../core/rng';
import type { ItemId, Loot } from '../core/types';
import { CLASSES } from '../core/data/classes';
import { CorridorRenderer } from '../render/corridor';
import { drawMinimap } from '../render/minimap';
import { drawTown } from '../render/town';
import { audio } from '../audio/audio';
import { themeFor } from '../audio/compose';
import { CombatView, type CombatHost } from './combatView';
import { el, floater } from './dom';
import { MapEditor } from './mapEditor';
import { markSeen, pendingScene, type StoryLine } from '../core/data/story';
import { drawPortrait } from '../render/portraits';
import { ListMenu, type MenuItem } from './menu';
import { PartyView } from './partyView';
import { clearSave, readSave, writeSave } from './storage';
import { TownView, type TownHost } from './townView';

const VIEW_W = 860;
const VIEW_H = 520;
const MAP_SIZE = 270;
const MOVE_COOLDOWN = 150;

type Mode = 'title' | 'town' | 'explore' | 'combat' | 'overlay' | 'editor' | 'story' | 'busy';
type SidePanel = 'explore' | 'combat' | 'town';
type ViewFx = { kind: 'step' | 'turn' | 'bump' | 'encounter' | 'shake'; start: number };

export class App implements CombatHost, TownHost {
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
  private readonly townPanel: HTMLElement;
  private readonly town: TownView;

  private mode: Mode = 'title';
  private overlayMenu: ListMenu | null = null;
  private combatView: CombatView | null = null;
  private mapEditor: MapEditor | null = null;
  private story: { lines: StoryLine[]; index: number; shown: number; then: () => void; box: HTMLElement } | null = null;
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
    // Act spans both rows; the grid places the rest around it.
    const buttons: [string, string, string?][] = [
      ['↶', 'q'], ['▲', 'ArrowUp'], ['↷', 'e'], ['Act', ' ', 'act'], ['Pack', 'c'],
      ['◀', 'ArrowLeft'], ['▼', 'ArrowDown'], ['▶', 'ArrowRight'], ['Map', 'm'],
    ];
    for (const [label, key, className] of buttons) {
      const b = el('button', { text: label, className });
      b.addEventListener('click', () => this.onKey(key));
      controls.appendChild(b);
    }
    this.commandPanel = el('div', { id: 'command-panel', className: 'panel hidden' });
    this.townPanel = el('div', { id: 'town-panel', className: 'panel hidden' });
    this.explorePanels = [mapPanel, statusRow, controls];
    const side = el('aside', { id: 'side' }, [
      el('div', { id: 'floor-panel', className: 'panel' }, [this.floorName, this.compass]),
      mapPanel,
      statusRow,
      controls,
      this.commandPanel,
      this.townPanel,
    ]);

    const partyEl = el('div', { id: 'party' });
    this.floaters = el('div', { id: 'floaters' });
    this.overlay = el('div', { id: 'overlay', className: 'hidden' });
    this.stage.append(this.viewWrap, side, partyEl, this.floaters, this.overlay);

    this.view = viewCanvas.getContext('2d')!;
    this.minimap = minimapCanvas.getContext('2d')!;
    this.corridor = new CorridorRenderer(this.view, VIEW_W, VIEW_H);
    this.party = new PartyView(partyEl);
    this.town = new TownView(this, this.townPanel);

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
    } else if (this.game?.state.location === 'town') {
      drawTown(ctx, VIEW_W, VIEW_H, time, this.mode === 'title' ? null : this.town.focus);
    } else if (this.game) {
      this.corridor.draw(this.game, time);
    }
    ctx.restore();
    this.drawFx(time);
    if (this.mode === 'editor') this.mapEditor?.draw(time);
    if (this.game && this.mode !== 'combat' && this.game.state.location === 'dungeon') drawMinimap(this.minimap, MAP_SIZE, this.game, time);
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
      case 'story':
        return this.storyKey(key);
      case 'editor':
        return this.mapEditor?.handleKey(key) ?? false;
      case 'town':
        if (key === 'h' || key === 'H') {
          this.showHelp(() => {
            this.closeOverlay();
            this.enterTown();
          });
          return true;
        }
        return this.town.menu?.handleKey(key) ?? false;
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
      case ' ':
      case 'Enter':
        this.handleStep(this.game.interact());
        this.updateHud();
        return true;
      case 'c':
      case 'Escape':
        this.openPack();
        return true;
      case 'm':
        this.showMapOverlay();
        return true;
      case 'h':
        this.showHelp(() => {
          this.closeOverlay();
          this.enterExplore();
        });
        return true;
    }
    return false;
  }

  // ── Title & game flow ──────────────────────────────────────────────────────

  showTitle(notice?: string): void {
    audio.music(themeFor({ location: 'title' }));
    this.game = Game.newGame(1); // background scenery only
    this.showSide('town');
    this.town.show();
    this.updateHud();
    this.party.render(this.game.state.party);
    const hasSave = readSave() !== null;
    const menu = new ListMenu(
      [
        { label: 'New Game', onSelect: () => this.newGame() },
        { label: 'Continue', disabled: !hasSave, onSelect: () => this.loadSave() },
        { label: 'How to Play', onSelect: () => this.showHelp(() => this.showTitle()) },
      ],
      { startIndex: hasSave ? 1 : 0 },
    );
    const screen = el('div', { className: 'title-screen' }, [
      el('div', { className: 'logo', text: 'YGDRASSIL' }),
      el('div', { className: 'tagline', text: 'Descent beneath the Great Tree' }),
      el('div', { className: 'panel dialog' }, [menu.el]),
      ...(notice ? [el('div', { className: 'title-notice panel', text: notice })] : []),
      el('div', { className: 'title-foot', text: 'Arrow keys / WASD to move · Enter to confirm · Esc to go back' }),
    ]);
    this.openOverlay(screen, menu, 'title');
  }

  private newGame(): void {
    this.game = Game.newGame(randomSeed());
    this.save();
    this.closeOverlay();
    this.enterTown();
  }

  private loadSave(): void {
    const data = readSave();
    if (!data) return;
    try {
      this.game = Game.load(data);
    } catch {
      clearSave();
      this.showTitle('Your save was made with an older version of the game and could not be loaded. Please start a new game.');
      return;
    }
    this.closeOverlay();
    this.resume();
    this.toast('Game loaded.');
  }

  save(): void {
    writeSave(this.game.serialize());
  }

  /** Back to the town menu or the dungeon, wherever the party is. */
  private resume(): void {
    if (this.game.state.location === 'town') this.enterTown();
    else this.enterExplore();
  }

  enterTown(): void {
    audio.music(themeFor({ location: 'town' }));
    this.mode = 'town';
    this.showSide('town');
    this.message.classList.add('hidden');
    this.town.show();
    this.updateHud();
    this.playStory('town', (id) => (id === 'epilogue' ? this.showCredits() : (this.mode = 'town')));
  }

  enterDungeon(): void {
    this.enterExplore();
  }

  private enterExplore(): void {
    audio.music(themeFor({ location: 'dungeon', floor: this.game.state.floor }));
    this.mode = 'explore';
    this.showSide('explore');
    this.message.classList.add('hidden');
    this.updateHud();
    this.playStory('floor', () => (this.mode = 'explore'));
  }

  // ── Help & credits ─────────────────────────────────────────────────────────

  showHelp(back: () => void): void {
    const section = (title: string, rows: [string, string][]) =>
      el('div', { className: 'help-section' }, [
        el('h3', { text: title }),
        ...rows.map(([k, v]) => el('div', { className: 'help-row' }, [el('span', { className: 'help-key', text: k }), el('span', { text: v })])),
      ]);
    const menu = new ListMenu([{ label: 'Close', onSelect: back }], { onCancel: back });
    this.openOverlay(
      el('div', { className: 'panel dialog wide help' }, [
        el('h2', { text: 'How to Play' }),
        el('div', { className: 'help-grid' }, [
          section('Exploring', [
            ['↑ / W', 'Step forward'],
            ['↓ / S', 'Step back'],
            ['← → / A D', 'Turn'],
            ['Q / E', 'Side-step'],
            ['Space / Act', 'Open a chest in front of you'],
            ['M', 'Map: draw walls, marks and notes'],
            ['C / Esc', 'Pack: skills, items, party, sound'],
            ['H', 'This help'],
          ]),
          section('Fighting', [
            ['↑↓ Enter', 'Choose a command for each member'],
            ['← →', 'Pick a target'],
            ['Esc', 'Back to the previous member'],
            ['Enter', 'Speed up the round'],
          ]),
          section('Tips', [
            ['Rows', 'The back row takes and deals less melee damage. Archers fight fine from anywhere.'],
            ['Weakness', 'Most monsters fear one element. Big yellow numbers mean you found it.'],
            ['Danger orb', 'Blue, yellow, red: the next fight is getting close.'],
            ['Prowlers', 'Glowing silhouettes on deep floors. Avoid them until you are strong.'],
            ['Town', 'Rest at the Inn, sell materials, take requests from the Notice Board.'],
          ]),
        ]),
        menu.el,
      ]),
      menu,
    );
  }

  private showCredits(): void {
    const s = this.game.state;
    const quests = Object.values(s.quests).filter((q) => q.status === 'done').length;
    const close = () => {
      this.closeOverlay();
      this.enterTown();
    };
    const menu = new ListMenu([{ label: 'Return to Lindholm', onSelect: close }], { onCancel: close });
    this.openOverlay(
      el('div', { className: 'title-screen credits' }, [
        el('div', { className: 'logo', text: 'YGDRASSIL' }),
        el('div', { className: 'tagline', text: 'Descent beneath the Great Tree' }),
        el('p', { className: 'credits-line', text: 'Thank you for playing.' }),
        el('div', { className: 'rewards' }, [
          el('span', { text: 'Party' }), el('span', { className: 'v', text: s.party.map((m) => `${m.name} Lv ${m.level}`).join(', ') }),
          el('span', { text: 'Steps taken' }), el('span', { className: 'v', text: String(s.steps) }),
          el('span', { text: 'Battles fought' }), el('span', { className: 'v', text: String(s.battles) }),
          el('span', { text: 'Requests completed' }), el('span', { className: 'v', text: `${quests}` }),
          el('span', { text: 'Gold' }), el('span', { className: 'v', text: `${s.gold} G` }),
        ]),
        el('p', { className: 'credits-line small', text: 'A game by Rudy van Tuijn · built with Claude' }),
        el('div', { className: 'panel dialog' }, [menu.el]),
      ]),
      menu,
    );
  }

  // ── Story ──────────────────────────────────────────────────────────────────

  /** Plays the next unseen story scene for this moment, then calls `then`. */
  private playStory(when: 'town' | 'floor' | 'victory', then: (sceneId?: string) => void): void {
    const scene = pendingScene(this.game, when);
    if (!scene) {
      if (when === 'victory') then();
      return;
    }
    markSeen(this.game, scene.id);
    const box = el('div', { className: 'story-box panel' });
    box.addEventListener('click', () => this.storyKey('Enter'));
    this.viewWrap.appendChild(box);
    this.story = { lines: scene.lines, index: 0, shown: 0, then: () => then(scene.id), box };
    this.mode = 'story';
    this.toastEl.classList.add('hidden');
    this.showStoryLine();
  }

  private showStoryLine(): void {
    const st = this.story!;
    const line = st.lines[st.index];
    st.box.innerHTML = '';
    st.box.classList.toggle('narrator', !line.speaker);
    if (line.speaker) {
      const portrait = el('canvas', { className: 'story-portrait' });
      portrait.width = portrait.height = 192;
      drawPortrait(portrait.getContext('2d')!, 192, 'sigrid', line.speaker, '#8aa0c0');
      st.box.append(portrait);
    }
    const text = el('div', { className: 'story-text' });
    const body = el('p');
    if (line.speaker) text.append(el('div', { className: 'story-speaker', text: line.speaker }));
    text.append(body, el('div', { className: 'story-more', text: st.index < st.lines.length - 1 ? '▼' : '■' }));
    st.box.append(text);
    // Typewriter: reveal the line a few letters at a time.
    st.shown = 0;
    const step = () => {
      if (this.story !== st || st.lines[st.index] !== line) return;
      st.shown = Math.min(line.text.length, st.shown + 2);
      body.textContent = line.text.slice(0, st.shown);
      if (st.shown < line.text.length) window.setTimeout(step, 18);
    };
    step();
  }

  private storyKey(key: string): boolean {
    const st = this.story;
    if (!st) return false;
    if (key === 'Escape') {
      st.index = st.lines.length;
    } else if (key === 'Enter' || key === ' ' || key === 'z' || key === 'Z') {
      const line = st.lines[st.index];
      if (st.shown < line.text.length) {
        st.shown = line.text.length;
        st.box.querySelector('p')!.textContent = line.text;
        return true;
      }
      audio.play('menuMove');
      st.index += 1;
    } else {
      return true;
    }
    if (st.index >= st.lines.length) {
      st.box.remove();
      this.story = null;
      st.then();
    } else {
      this.showStoryLine();
    }
    return true;
  }

  updateHud(): void {
    const g = this.game;
    const inTown = g.state.location === 'town';
    this.floorName.textContent = inTown ? 'Lindholm' : g.floorDef.name;
    this.compass.classList.toggle('hidden', inTown);
    this.compass.textContent = DIR_NAMES[g.state.dir];
    const gold = this.townPanel.querySelector('.town-gold');
    if (gold) gold.textContent = `${g.state.gold} G`;
    const level = g.dangerLevel;
    const color = level < 0.45 ? '#3fb6e8' : level < 0.75 ? '#e8c43f' : '#e8483f';
    this.dangerOrb.style.background = `radial-gradient(circle at 35% 30%, #fff, ${color} 55%, #000 120%)`;
    this.dangerOrb.style.color = color;
    this.goldEl.textContent = `${g.state.gold} G`;
    this.party.render(g.state.party);
  }

  // ── Exploration ────────────────────────────────────────────────────────────

  private turn(delta: -1 | 1): void {
    audio.play('turn');
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
        audio.play('bump');
        this.fx = { kind: 'bump', start: this.now };
        return;
      case 'chestAhead':
        audio.play('bump');
        this.toast(ev.opened ? 'An empty chest.' : 'A chest! Press Space or Act to open it.');
        return;
      case 'nothing':
        return;
      case 'moved':
        audio.play('step');
        this.fx = { kind: 'step', start: this.now };
        return;
      case 'chest':
        audio.play('chest');
        this.toast(`Found ${describeLoot(ev.loot)} in the chest!`);
        return;
      case 'emptyChest':
        this.toast('The chest is empty.');
        return;
      case 'stairs':
        if (this.game.isLastFloor) return;
        this.confirm('Stairs down', `Descend to ${FLOORS[this.game.state.floor + 1].name}?`, () => {
          audio.play('stairs');
          this.game.descend();
          this.save();
          this.enterExplore();
          this.toast(`${this.game.floorDef.name} — game saved.`);
        });
        return;
      case 'upstairs': {
        const leaving = this.game.state.floor === 0;
        const text = leaving ? 'Leave the Rootdeep and return to Lindholm?' : `Climb up to ${FLOORS[this.game.state.floor - 1].name}?`;
        this.confirm('Stairs up', text, () => {
          audio.play('stairs');
          this.game.ascend();
          this.save();
          this.resume();
          this.toast(leaving ? 'Back in Lindholm. Game saved.' : `${this.game.floorDef.name}`);
        });
        return;
      }
      case 'spring':
        if (ev.used) {
          this.toast('The spring has run dry.');
          return;
        }
        this.confirm('Healing spring', 'Drink from the spring? It fully restores the party and saves your game. It only works once.', () => {
          audio.play('spring');
          this.game.drinkSpring();
          this.save();
          this.enterExplore();
          this.toast('The party feels refreshed. Game saved.');
        });
        return;
      case 'boss':
        audio.music(null);
        audio.play('bossIntro');
        this.mode = 'busy';
        this.toast('A terrible presence stirs...');
        window.setTimeout(() => this.startCombat(this.game.startBossCombat()), 1100);
        return;
      case 'prowlerAlert':
        audio.play('prowlerAlert');
        this.toast(`${this.prowlerName(ev.index)} has caught your scent!`);
        this.shakeView();
        return;
      case 'prowler':
        audio.play('encounter');
        this.mode = 'busy';
        this.fx = { kind: 'encounter', start: this.now };
        window.setTimeout(() => this.startCombat(this.game.startProwlerCombat(ev.index)), 700);
        return;
      case 'encounter':
        audio.play('encounter');
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
    this.showSide('combat');
    audio.music(themeFor({ location: 'dungeon', combat: combat.boss ? 'boss' : combat.prowler ? 'prowler' : 'normal' }));
    this.combatView = new CombatView(this, combat, (c) => this.endCombat(c));
    void this.combatView.start();
  }

  private endCombat(combat: Combat): void {
    this.game.finishCombat(combat);
    this.combatView = null;
    this.showSide('explore');
    this.updateHud();

    if (combat.outcome === 'defeat') {
      audio.music(null);
      audio.play('defeat');
      return this.showGameOver();
    }
    if (combat.outcome === 'fled') {
      this.enterExplore();
      this.toast(combat.prowler ? `You slipped away! The ${combat.enemies[0].def.name} is dazed for a few steps.` : 'The party got away.');
      return;
    }
    const r = combat.rewards!;
    audio.music(null);
    audio.play('victory');
    if (r.levelUps.length) window.setTimeout(() => audio.play('levelUp'), 900);
    const lines = el('div', { className: 'rewards' }, [
      el('span', { text: 'Experience' }), el('span', { className: 'v', text: `+${r.xp}` }),
      el('span', { text: 'Gold' }), el('span', { className: 'v', text: `+${r.gold} G` }),
      ...r.drops.flatMap((id) => [el('span', { text: 'Found' }), el('span', { className: 'v', text: ITEMS[id].name })]),
      ...r.materials.flatMap((id) => [el('span', { text: 'Material' }), el('span', { className: 'v', text: MATERIALS[id].name })]),
    ]);
    const levelUps = r.levelUps.map((l) =>
      el('div', { className: 'levelup', text: `${this.game.state.party[l.member].name} reached level ${l.level}!` }),
    );
    const done = () => {
      this.closeOverlay();
      if (this.game.state.cleared && combat.boss) return this.playStory('victory', () => this.showCleared());
      this.enterExplore();
      if (combat.boss) this.toast(`${combat.enemies[0].def.name} has fallen. The way down lies open.`);
    };
    const menu = new ListMenu([{ label: 'Continue', onSelect: done }], { onCancel: done });
    this.openOverlay(
      el('div', { className: 'panel dialog' }, [el('h2', { text: 'Victory!' }), lines, ...levelUps, menu.el]),
      menu,
    );
  }

  private showSide(panel: SidePanel): void {
    for (const p of this.explorePanels) p.classList.toggle('hidden', panel !== 'explore');
    this.commandPanel.classList.toggle('hidden', panel !== 'combat');
    this.townPanel.classList.toggle('hidden', panel !== 'town');
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
        el('p', { text: 'The Rootdeep claims another expedition. Your last save is waiting.' }),
        menu.el,
      ]),
      menu,
    );
  }

  private showCleared(): void {
    const s = this.game.state;
    const menu = new ListMenu([
      { label: 'Return to Lindholm', onSelect: () => { this.closeOverlay(); this.game.returnToTown(); this.save(); this.enterTown(); } },
      { label: 'Keep exploring', onSelect: () => { this.closeOverlay(); this.enterExplore(); } },
    ]);
    this.save();
    this.openOverlay(
      el('div', { className: 'panel dialog' }, [
        el('h2', { text: 'The Rootdeep is cleansed!' }),
        el('p', { text: 'The Rootgnawer lies still. Its teeth will gnaw at the roots of the Great Tree no more.' }),
        el('p', { text: `Steps: ${s.steps} · Battles: ${s.battles} · Gold: ${s.gold} G` }),
        menu.el,
      ]),
      menu,
    );
  }

  // ── Pack ───────────────────────────────────────────────────────────────────

  private openPack(): void {
    const close = () => {
      this.closeOverlay();
      this.enterExplore();
    };
    const menu = new ListMenu(
      [
        { label: 'Skills', description: 'Use a healing skill.', onSelect: () => this.packSkills() },
        { label: 'Items', description: 'Use an item.', onSelect: () => this.packItems() },
        { label: 'Party', description: 'View stats and equipment.', onSelect: () => this.partyStatus(() => this.openPack()) },
        { label: 'Materials', description: 'Monster parts to sell in town.', onSelect: () => this.materialsList(() => this.openPack()) },
        {
          label: 'Homing Feather',
          detail: `×${this.game.state.inventory.homingFeather ?? 0}`,
          description: 'Return to Lindholm right away. Saves on arrival.',
          disabled: (this.game.state.inventory.homingFeather ?? 0) <= 0,
          onSelect: () =>
            this.confirm('Homing Feather', 'Follow the homingFeather back to Lindholm?', () => {
              audio.play('spring');
              this.game.useFeather();
              this.save();
              this.enterTown();
              this.toast('The homingFeather leads you home. Game saved.');
            }),
        },
        { label: 'Sound', description: 'Music and effect volume.', onSelect: () => this.soundOptions(() => this.openPack()) },
        { label: 'Quit to title', description: 'Unsaved progress since the last save is lost.', onSelect: () => this.showTitle() },
        { label: 'Close', onSelect: close },
      ],
      { onCancel: close },
    );
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.openOverlay(el('div', { className: 'panel dialog' }, [el('h2', { text: 'Pack' }), menu.el, desc]), menu);
  }

  private packSkills(): void {
    const party = this.game.state.party;
    const items: MenuItem[] = [];
    party.forEach((m) => {
      for (const skill of knownSkills(m).filter((s) => s.field)) {
        items.push({
          label: `${m.name}: ${skill.name}`,
          detail: `${skill.sp} SP`,
          description: skill.description,
          disabled: !isAlive(m) || m.sp < skill.sp,
          onSelect: () => {
            const cast = (targets: number[]) => {
              m.sp -= skill.sp;
              const amount = healAmount(m, skill.power);
              for (const t of targets) {
                const healed = skill.kind === 'revive' ? revive(party[t], skill.power) : healMember(party[t], amount);
                audio.play(skill.kind === 'revive' ? 'revive' : 'heal');
                const a = this.party.anchor(t);
                floater(this.floaters, a.x, a.y, `+${healed}`, 'heal');
              }
              this.updateHud();
              this.packSkills();
            };
            if (skill.target === 'allAllies') cast(party.flatMap((p, i) => (isAlive(p) ? [i] : [])));
            else this.pickAlly(`${skill.name} on whom?`, (t) => cast([t]), () => this.packSkills(), skill.kind === 'revive');
          },
        });
      }
    });
    if (items.length === 0) items.push({ label: 'No usable skills', disabled: true, onSelect: () => {} });
    this.subMenu('Skills', items, () => this.openPack());
  }

  private packItems(): void {
    const party = this.game.state.party;
    const inv = this.game.state.inventory;
    const usable = (Object.keys(ITEMS) as ItemId[]).filter((id) => ITEMS[id].effect !== 'warp');
    const items: MenuItem[] = usable.map((id) => ({
      label: ITEMS[id].name,
      detail: `×${inv[id] ?? 0}`,
      description: ITEMS[id].description,
      disabled: (inv[id] ?? 0) <= 0,
      onSelect: () =>
        this.pickAlly(`Use ${ITEMS[id].name} on whom?`, (t) => {
          const def = ITEMS[id];
          audio.play(def.effect === 'revive' ? 'revive' : 'heal');
          const amount =
            def.effect === 'revive' ? revive(party[t], def.amount) : def.effect === 'hp' ? healMember(party[t], def.amount) : restoreSp(party[t], def.amount);
          inv[id] -= 1;
          const a = this.party.anchor(t);
          floater(this.floaters, a.x, a.y, `+${amount}${def.effect === 'sp' ? ' SP' : ''}`, 'heal');
          this.updateHud();
          this.packItems();
        }, () => this.packItems(), ITEMS[id].effect === 'revive'),
    }));
    this.subMenu('Items', items, () => this.openPack());
  }

  materialsList(back: () => void): void {
    const entries = Object.entries(this.game.state.materials).filter(([, n]) => n > 0);
    const items: MenuItem[] = entries.length
      ? entries.map(([id, n]) => ({ label: MATERIALS[id].name, detail: `×${n} · ${MATERIALS[id].price} G each`, description: MATERIALS[id].description, onSelect: () => {} }))
      : [{ label: 'Nothing yet', disabled: true, onSelect: () => {} }];
    items.push({ label: 'Back', onSelect: back });
    const menu = new ListMenu(items, { onCancel: back });
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.openOverlay(el('div', { className: 'panel dialog wide' }, [el('h2', { text: 'Materials' }), el('p', { text: 'Sell them at the shop in Lindholm. Some unlock special gear.' }), menu.el, desc]), menu);
  }

  /** Music and effect volume, each cycling through five steps. */
  soundOptions(back: () => void, start = 0): void {
    const steps = [0, 0.25, 0.5, 0.75, 1];
    const names = ['Off', 'Low', 'Medium', 'High', 'Full'];
    const label = (v: number) => names[steps.reduce((best, s, i) => (Math.abs(s - v) < Math.abs(steps[best] - v) ? i : best), 0)];
    const next = (v: number) => steps[(steps.findIndex((s) => Math.abs(s - v) < 0.01) + 1) % steps.length];
    const menu = new ListMenu(
      [
        {
          label: 'Music',
          detail: label(audio.settings.music),
          description: 'Press Enter to change.',
          onSelect: () => {
            audio.setVolume('music', next(audio.settings.music));
            this.soundOptions(back, 0);
          },
        },
        {
          label: 'Effects',
          detail: label(audio.settings.sfx),
          description: 'Press Enter to change.',
          onSelect: () => {
            audio.setVolume('sfx', next(audio.settings.sfx));
            audio.play('chest');
            this.soundOptions(back, 1);
          },
        },
        { label: 'Back', onSelect: back },
      ],
      { onCancel: back, startIndex: start },
    );
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.openOverlay(el('div', { className: 'panel dialog' }, [el('h2', { text: 'Sound' }), menu.el, desc]), menu);
  }

  partyStatus(back: () => void): void {
    const gear = (id?: string) => (id ? EQUIPMENT[id]?.name ?? '—' : '—');
    const rows = this.game.state.party.map((m) => {
      const s = memberStats(m);
      const next = xpForLevel(m.level + 1) - m.xp;
      return `<tr><td>${m.name}</td><td>${CLASSES[m.classId].name}</td><td>${m.level}</td><td>${m.hp}/${s.hp}</td><td>${m.sp}/${s.sp}</td><td>${s.atk}</td><td>${s.def}</td><td>${s.mag}</td><td>${s.res}</td><td>${s.spd}</td><td>${next}</td><td class="gear">${gear(m.weapon)}<br>${gear(m.armor)}</td></tr>`;
    });
    const table = el('table', { className: 'stats' });
    table.innerHTML = `<thead><tr><th>Name</th><th>Class</th><th>Lv</th><th>HP</th><th>SP</th><th>ATK</th><th>DEF</th><th>MAG</th><th>RES</th><th>SPD</th><th>Next</th><th class="gear">Gear</th></tr></thead><tbody>${rows.join('')}</tbody>`;
    const menu = new ListMenu([{ label: 'Back', onSelect: back }], { onCancel: back });
    this.openOverlay(el('div', { className: 'panel dialog wide' }, [el('h2', { text: 'Party' }), table, menu.el]), menu);
  }

  /** `fallen`: pick among the fallen (for reviving) instead of the living. */
  private pickAlly(title: string, pick: (i: number) => void, back: () => void, fallen = false): void {
    const items = this.game.state.party.map((m, i) => ({
      label: m.name,
      detail: isAlive(m) ? `${m.hp}/${memberStats(m).hp} HP · ${m.sp} SP` : 'fallen',
      disabled: isAlive(m) === fallen,
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
    this.mapEditor = new MapEditor(this.game, () => {
      this.mapEditor = null;
      this.closeOverlay();
      this.enterExplore();
    });
    this.overlay.innerHTML = '';
    this.overlay.appendChild(this.mapEditor.el);
    this.overlay.classList.remove('hidden');
    this.overlayMenu = null;
    this.mode = 'editor';
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

  openOverlay(content: HTMLElement, menu: ListMenu, mode: Mode = 'overlay'): void {
    this.overlay.innerHTML = '';
    this.overlay.appendChild(content);
    this.overlay.classList.remove('hidden');
    this.overlayMenu = menu;
    this.mode = mode;
  }

  closeOverlay(): void {
    this.overlay.classList.add('hidden');
    this.overlay.innerHTML = '';
    this.overlayMenu = null;
  }

  toast(text: string): void {
    if (this.story) return; // the story box has the stage
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.add('hidden'), 2400);
  }

  private prowlerName(index: number): string {
    return ENEMIES[this.game.floorDef.prowlers[index].enemies[0]].name;
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
