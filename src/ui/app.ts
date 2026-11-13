import type { ChartMode } from '../core/chart';
import type { Combat } from '../core/combat';
import { ENEMIES } from '../core/data/enemies';
import { ELEMENTS, bestiaryOrder, elementKnown } from '../core/bestiary';
import { EQUIPMENT } from '../core/data/equipment';
import { ITEMS } from '../core/data/items';
import { MATERIALS } from '../core/data/materials';
import { DIR_NAMES } from '../core/dungeon';
import { Game, type StepEvent } from '../core/game';
import { MAX_LEVEL, healAmount, healMember, isAlive, knownSkills, memberStats, restoreSp, revive, xpForLevel } from '../core/party';
import { randomSeed } from '../core/rng';
import type { ItemId, Loot, Member } from '../core/types';
import { CLASSES } from '../core/data/classes';
import { CorridorRenderer } from '../render/corridor';
import { drawMinimap } from '../render/minimap';
import { drawTownScene, preloadTownScenes } from '../render/town';
import { preload, sprite } from '../render/sprites';
import { audio } from '../audio/audio';
import { themeFor } from '../audio/compose';
import { CombatView, type CombatHost, type RoundDriver } from './combatView';
import { CoopSession, type CoopHost } from './coopSession';
import { Hornstone, shareLines, type HornstoneHost } from './hornstone';
import { online, type ExpeditionRow } from '../net/online';
import { el, floater } from './dom';
import { MapEditor } from './mapEditor';
import { Designer, isMaker, loadDraft } from './designer';
import { memberPicker, showSkillTree } from './skillsView';
import { gatherPrompt } from './gatherView';
import { Founding } from './founding';
import { TIPS, TIP_BY_ID, type TipDef } from '../core/data/tutorials';
import { GATHER_KINDS } from '../core/data/gathering';
import { describeFinds } from '../core/expedition';
import { unspentPoints } from '../core/skilltree';
import { toFloorDefs, type ChapterDesign } from '../core/designer';
import { movementKey, prefs, setPref, TEXT_SPEED_NAMES, TEXT_SPEED_STEP, type BattleSpeed, type TextSpeed } from './prefs';
import { sendReport, type ReportKind } from '../net/reports';
import { choose, markSeen, pendingScene, STORY, type StoryLine, type StoryScene } from '../core/data/story';
import { drawPortrait } from '../render/portraits';
import { npcFromName, npcSays } from './npc';
import { ListMenu, type MenuItem } from './menu';
import { PartyView } from './partyView';
import { readSave, writeSave } from './storage';
import { TownView, type TownHost } from './townView';

/** Phones and tablets: the help shows taps instead of keys. */
const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

const VIEW_W = 860;
const VIEW_H = 520;
const MAP_SIZE = 270;
const MOVE_COOLDOWN = 150;

type Mode = 'title' | 'town' | 'explore' | 'combat' | 'overlay' | 'editor' | 'drafting' | 'story' | 'busy';
type SidePanel = 'explore' | 'combat' | 'town';
type MenuTab = 'party' | 'bag' | 'journal' | 'options';
type ViewFx = { kind: 'step' | 'turn' | 'bump' | 'encounter' | 'shake'; start: number };

export class App implements CombatHost, TownHost, CoopHost, HornstoneHost {
  game!: Game;
  private keyHint!: HTMLElement;
  private actPrompt!: HTMLElement;
  /** The scenery game behind the title screen; replaced as soon as a real game starts. */
  private titleGame: Game | null = null;
  /** While on an expedition: the player's own game, kept aside (`game` is then the shared one). */
  private home: Game | null = null;
  private coop: CoopSession | null = null;
  private readonly hornstone = new Hornstone(this);
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

  private currentMode: Mode = 'title';
  /** The last mode that was not a dialog on top of something else. */
  private baseMode: Mode = 'title';
  private townGrid!: HTMLElement;

  private get mode(): Mode {
    return this.currentMode;
  }

  private set mode(mode: Mode) {
    this.currentMode = mode;
    if (mode !== 'overlay' && mode !== 'busy') this.baseMode = mode;
    // The town screen stays up behind the town's own dialogs, and hides for everything else.
    this.townGrid?.classList.toggle('hidden', this.baseMode !== 'town');
  }
  private overlayMenu: ListMenu | null = null;
  private combatView: CombatView | null = null;
  private mapEditor: MapEditor | null = null;
  private designer: Designer | null = null;
  /** The floor being test-played from the drafting table (nothing is saved meanwhile). */
  private trial: ChapterDesign | null = null;
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
    this.actPrompt = el('button', { id: 'act-prompt', className: 'hidden' });
    this.actPrompt.addEventListener('click', () => this.onKey(' '));
    this.viewWrap = el('div', { id: 'view-wrap' }, [viewCanvas, this.message, this.toastEl, this.actPrompt]);

    this.floorName = el('div', { id: 'floor-name' });
    this.compass = el('div', { id: 'compass' });
    const minimapCanvas = el('canvas', { id: 'minimap' });
    minimapCanvas.width = MAP_SIZE;
    minimapCanvas.height = MAP_SIZE;
    this.dangerOrb = el('div', { id: 'danger-orb' });
    this.goldEl = el('div', { id: 'gold' });
    this.keyHint = el('div', { id: 'key-hint' });
    const mapPanel = el('div', { id: 'map-panel', className: 'panel' }, [minimapCanvas, this.keyHint]);
    const statusRow = el('div', { id: 'status-row', className: 'panel' }, [
      el('div', { id: 'danger' }, [this.dangerOrb, el('span', { text: 'Danger' })]),
      this.goldEl,
    ]);
    const controls = el('div', { id: 'controls', className: 'panel' });
    // Act spans both rows; the grid places the rest around it.
    const buttons: [string, string, string?][] = [
      // Top row: side-step, forward, side-step. Bottom row: turn, back, turn.
      ['⇠', 'q'], ['▲', 'ArrowUp'], ['⇢', 'e'], ['Act', ' ', 'act'], ['Menu', 'c'],
      ['↶', 'ArrowLeft'], ['▼', 'ArrowDown'], ['↷', 'ArrowRight'], ['Map', 'm'],
    ];
    const tips: Record<string, string> = { q: 'Step left', e: 'Step right', ArrowUp: 'Forward', ArrowDown: 'Back', ArrowLeft: 'Turn left', ArrowRight: 'Turn right' };
    for (const [label, key, className] of buttons) {
      const b = el('button', { text: label, className });
      if (tips[key]) b.title = tips[key];
      b.addEventListener('click', () => this.onKey(key));
      controls.appendChild(b);
    }
    this.commandPanel = el('div', { id: 'command-panel', className: 'panel hidden' });
    this.townPanel = el('div', { id: 'town-panel', className: 'panel hidden' });
    this.explorePanels = [mapPanel, statusRow, controls];
    // Mouse players open the menu here; on touch screens the Menu button among the controls does it.
    const menuIcon = el('button', { className: 'menu-icon', text: '☰' });
    menuIcon.title = 'Menu (Esc)';
    menuIcon.addEventListener('click', () => this.onKey('c'));
    const side = el('aside', { id: 'side' }, [
      el('div', { id: 'floor-panel', className: 'panel' }, [this.floorName, this.compass, menuIcon]),
      mapPanel,
      statusRow,
      controls,
      this.commandPanel,
      this.townPanel,
    ]);

    const partyEl = el('div', { id: 'party' });
    this.floaters = el('div', { id: 'floaters' });
    this.overlay = el('div', { id: 'overlay', className: 'hidden' });
    // Tapping the dark area around a dialog goes back, like Escape (not on the title screen).
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay && this.mode === 'overlay') this.overlayMenu?.handleKey('Escape');
    });
    this.townGrid = el('div', { id: 'town-grid', className: 'hidden' });
    this.stage.append(this.viewWrap, side, this.townGrid, partyEl, this.floaters, this.overlay);

    this.view = viewCanvas.getContext('2d')!;
    this.minimap = minimapCanvas.getContext('2d')!;
    this.corridor = new CorridorRenderer(this.view, VIEW_W, VIEW_H);
    // Count time played while the game is in view (not on the title screen); it goes along with feedback.
    window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !this.game || this.game === this.titleGame || this.mode === 'title') return;
      this.game.state.playSeconds = (this.game.state.playSeconds ?? 0) + 10;
    }, 10_000);
    this.party = new PartyView(partyEl);
    this.town = new TownView(this, this.townGrid);

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Text fields keep their keys; sliders and buttons leave them to the menus.
      if ((e.target instanceof HTMLInputElement && e.target.type !== 'range') || e.target instanceof HTMLTextAreaElement) return;
      if (this.onKey(e.key)) e.preventDefault();
    });

    this.swipeControls();
    // During a story scene a tap anywhere on the picture moves the story on, not just on the text box.
    this.viewWrap.addEventListener('click', (e) => {
      if (this.mode === 'story' && this.story && !this.story.box.contains(e.target as Node)) this.storyKey('Enter');
    });

    // The title needs only its own painting; the town paintings and portraits follow once the page is idle.
    sprite('places/title.webp');
    const later = (cb: () => void) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(cb, { timeout: 2500 }) : setTimeout(cb, 800));
    later(() => {
      preloadTownScenes();
      preload(['gerd', 'hilde', 'brynja', 'sigrid', 'ketil'].map((id) => `people/${id}.webp`));
    });
    this.showTitle();
  }

  /** On touch screens: swipe the dungeon view to walk (up/down) and turn (left/right). */
  private swipeControls(): void {
    let start: { x: number; y: number } | null = null;
    this.viewWrap.addEventListener('touchstart', (e) => {
      start = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    }, { passive: true });
    this.viewWrap.addEventListener('touchend', (e) => {
      if (!start || this.mode !== 'explore') return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
      // Dragging the world: swipe left to turn right, swipe up to step forward.
      if (Math.abs(dx) > Math.abs(dy)) this.onKey(dx < 0 ? 'ArrowRight' : 'ArrowLeft');
      else this.onKey(dy < 0 ? 'ArrowUp' : 'ArrowDown');
    }, { passive: true });
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
      // During the story the whole town is shown, without a caption under the text box.
      const story = this.mode === 'story';
      drawTownScene(ctx, VIEW_W, VIEW_H, time, this.mode === 'title' || story ? null : this.town.focus, this.mode === 'title', !story);
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
      // No flashing (it can hurt players sensitive to flicker): the view darkens in one smooth sweep,
      // with a red glow closing in from the edges.
      const k = t / 700;
      if (k >= 1) return void (this.fx = null);
      const ease = k * k * (3 - 2 * k);
      const glow = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * (0.75 - 0.5 * ease), VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.75);
      glow.addColorStop(0, 'rgba(60,0,0,0)');
      glow.addColorStop(1, `rgba(90,10,6,${0.75 * ease})`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = `rgba(0,0,0,${0.55 * ease})`;
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
      case 'drafting':
        return this.designer?.handleKey(key) ?? false;
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
    const k = movementKey(key.length === 1 ? key.toLowerCase() : key);
    if (this.coop) return this.coopKey(k);
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
        this.openMenu();
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

  /** Exploring on an expedition: moves go to the server. */
  private coopKey(k: string): boolean {
    const coop = this.coop!;
    const moves: Record<string, Parameters<CoopSession['exploreKey']>[0]> = {
      ArrowUp: { type: 'step', forward: 1, right: 0 },
      w: { type: 'step', forward: 1, right: 0 },
      ArrowDown: { type: 'step', forward: -1, right: 0 },
      s: { type: 'step', forward: -1, right: 0 },
      ArrowLeft: { type: 'turn', delta: -1 },
      a: { type: 'turn', delta: -1 },
      ArrowRight: { type: 'turn', delta: 1 },
      d: { type: 'turn', delta: 1 },
      q: { type: 'step', forward: 0, right: -1 },
      e: { type: 'step', forward: 0, right: 1 },
      ' ': { type: 'interact' },
      Enter: { type: 'interact' },
    };
    const action = moves[k];
    if (action) {
      if (this.now - this.lastMove < MOVE_COOLDOWN) return true;
      this.lastMove = this.now;
      coop.exploreKey(action);
      return true;
    }
    switch (k) {
      case 'c':
      case 'Escape':
        this.openMenu();
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
    this.titleGame = this.game;
    this.showSide('town');
    this.town.show();
    this.updateHud();
    this.party.render(this.game.state.party);
    const hasSave = readSave() !== null;
    const menu = new ListMenu(
      [
        { label: 'New Game', onSelect: () => this.newGame() },
        { label: 'Continue', disabled: !hasSave, onSelect: () => this.loadSave() },
        ...(isMaker() ? [{ label: 'Drafting Table', onSelect: () => this.showDesigner() }] : []),
        { label: 'How to Play', onSelect: () => this.showHelp(() => this.showTitle()) },
        { label: 'Settings', onSelect: () => this.settings(() => this.showTitle()) },
        { label: 'Feedback', onSelect: () => this.showFeedback(() => this.showTitle()) },
        { label: 'Privacy & Terms', onSelect: () => window.open('privacy.html', '_blank', 'noopener') },
        { label: 'Credits', onSelect: () => window.open('credits.html', '_blank', 'noopener') },
      ],
      { startIndex: hasSave ? 1 : 0 },
    );
    const screen = el('div', { className: 'title-screen' }, [
      el('div', { className: 'playtest-badge' }, [
        el('strong', { text: 'Early playtest' }),
        el('span', { text: 'Chapters I and II are open. Saves may be reset before release. Found a bug or have an idea? Use Feedback here or in the menu (Options).' }),
      ]),
      el('div', { className: 'logo', text: 'YGDRASSIL' }),
      el('div', { className: 'tagline', text: 'The road to Asgard runs through Ymir' }),
      el('div', { className: 'panel dialog' }, [menu.el]),
      ...(notice ? [el('div', { className: 'title-notice panel', text: notice })] : []),
      el('div', { className: 'title-foot', text: 'Arrow keys / WASD to move · Enter to confirm · Esc to go back' }),
    ]);
    this.openOverlay(screen, menu, 'title');
  }

  private newGame(): void {
    const founding = new Founding(
      {
        openOverlay: (content, menu) => this.openOverlay(content, menu),
        confirm: (title, text, yes, back) => this.confirm(title, text, yes, back),
        preview: (party) => this.party.render(party),
      },
      (party) => {
        this.game = Game.newGame(randomSeed(), party);
        this.save();
        this.closeOverlay();
        this.enterTown();
      },
      () => this.showTitle(),
    );
    founding.start();
  }

  private loadSave(): void {
    const data = readSave();
    if (!data) return;
    try {
      this.game = Game.load(data);
    } catch {
      // Keep the save as it is (it may load in a later version); a new game would replace it.
      this.showTitle('This save could not be loaded. It is kept for now; starting a new game will replace it.');
      return;
    }
    this.closeOverlay();
    this.resume();
    this.toast('Game loaded.');
  }

  save(): void {
    // Never let the title screen's scenery overwrite a real save.
    if (this.trial || this.game === this.titleGame) return;
    writeSave((this.home ?? this.game).serialize());
  }

  loadSaveData(data: string): boolean {
    try {
      this.game = Game.load(data);
      return true;
    } catch {
      return false;
    }
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
    const tips = () => this.townTips();
    // Scenes waiting in town play one after the other.
    const story = (): void => {
      if (!pendingScene(this.game, 'town')) return tips();
      this.playStory('town', (id) => (id === 'chapterTwoEnd' ? this.showCredits() : story()));
    };
    story();
  }

  /** Tips for the town, each shown once: the town itself, then whatever has come up. */
  private townTips(): void {
    const s = this.game.state;
    const back = () => {
      this.closeOverlay();
      this.mode = 'town';
    };
    const queue = ['town'];
    if (s.party.some((m) => unspentPoints(m) > 0)) queue.push('skillPoints');
    if ((s.inventory.oathToken ?? 0) > 0) queue.push('oath');
    this.tips(queue, back);
  }

  enterDungeon(): void {
    this.enterExplore();
  }

  openHornstone(): void {
    void this.hornstone.open();
  }

  enterExplore(): void {
    audio.music(themeFor({ location: 'dungeon', floor: this.trial ? this.trial.floors[this.game.state.floor]?.monsters ?? 0 : this.game.state.floor }));
    // Load this floor's monster art before the first fight.
    const def = this.game.floorDef;
    const ids = [...def.encounters.flatMap((e) => e.enemies), ...(def.boss ?? []), ...def.prowlers.flatMap((p) => p.enemies)];
    preload([...[...new Set(ids)].map((id) => `monsters/${id}.webp`)]);
    this.mode = 'explore';
    this.showSide('explore');
    this.message.classList.add('hidden');
    this.updateHud();
    // The story belongs to your own hall; expeditions skip it.
    if (this.coop) return;
    const tips = () => {
      const queue = ['firstStep', ...this.tipQueue.splice(0)];
      if (def.prowlers.length) queue.push('prowler');
      if (def.boss && !this.game.progress.bossDefeated) queue.push('boss');
      this.tips(queue, () => {
        this.closeOverlay();
        this.mode = 'explore';
      });
    };
    if (pendingScene(this.game, 'floor')) this.playStory('floor', tips);
    else tips();
  }

  // ── Tips ───────────────────────────────────────────────────────────────────

  private resumeExplore(): void {
    this.closeOverlay();
    this.mode = 'explore';
  }

  /** Tips noticed during a fight, shown once the party is exploring again. */
  private tipQueue: string[] = [];

  /** Remembers a tip to show at the next calm moment (used during fights). */
  noticeTip(id: string): void {
    if (!this.tipQueue.includes(id)) this.tipQueue.push(id);
  }

  /** Shows the tips in `ids` that have not been seen yet, one after another, then calls `then`. */
  tips(ids: string[], then: () => void): void {
    const s = this.game.state;
    const next = ids.find((id) => !s.tips?.includes(id) && TIP_BY_ID[id]);
    if (!next || this.coop || this.trial || s.tipsOff) return then();
    (s.tips ??= []).push(next);
    this.save();
    this.showTip(TIP_BY_ID[next], 0, () => this.tips(ids, then), true);
  }

  /** One tip, page by page. `live` tips offer to switch tips off; tips read from the Guidebook do not. */
  showTip(tip: TipDef, page: number, then: () => void, live = false): void {
    const last = page === tip.pages.length - 1;
    const items: MenuItem[] = [
      { label: last ? 'Got it' : 'Next', onSelect: () => (last ? then() : this.showTip(tip, page + 1, then, live)) },
    ];
    if (live) {
      items.push({
        label: 'No more tips',
        description: 'Stop showing tips. You can read them all in the Guidebook, and switch them back on in Settings.',
        onSelect: () => {
          this.game.state.tipsOff = true;
          this.save();
          then();
        },
      });
    }
    const menu = new ListMenu(items, { onCancel: () => then() });
    this.openOverlay(
      el('div', { className: 'panel dialog wide tip' }, [
        el('h2', { text: tip.title }),
        npcSays(tip.speaker, tip.pages[page]),
        el('p', { className: 'tip-page', text: tip.pages.length > 1 ? `${page + 1} / ${tip.pages.length}` : '' }),
        menu.el,
      ]),
      menu,
    );
  }

  /** Every tip, to read again. */
  /** Where the player is, sent along with bug and crash reports. */
  reportContext(): Record<string, unknown> {
    const screen = `${window.innerWidth}x${window.innerHeight}`;
    // On the title screen the game behind it is only scenery: don't report its party.
    if (this.game === this.titleGame) return { location: 'title', screen };
    const s = this.game.state;
    return {
      mode: this.mode,
      location: s.location,
      floor: s.floor,
      pos: [s.x, s.y],
      levels: s.party.map((m) => `${m.classId} ${m.level}`),
      battles: s.battles,
      minutesPlayed: Math.round((s.playSeconds ?? 0) / 60),
      coop: !!this.coop,
      screen,
    };
  }

  /** Send a bug report or an idea to the makers. */
  showFeedback(back: () => void): void {
    const kinds: [ReportKind, string, string][] = [
      ['bug', 'Report a bug', 'Something broke, looks wrong, or did not do what you expected.'],
      ['idea', 'Share an idea', 'Something you would like to see, or change.'],
      ['other', 'Something else', 'Praise, questions, anything.'],
    ];
    const menu = new ListMenu(
      [
        ...kinds.map(([kind, label, description]) => ({ label, description, onSelect: () => this.writeFeedback(kind, label, back) })),
        { label: 'Back', onSelect: back },
      ],
      { onCancel: back },
    );
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.openOverlay(
      el('div', { className: 'panel dialog' }, [
        el('h2', { text: 'Feedback' }),
        el('p', { text: 'Your message goes straight to the makers, with where you are in the game, your screen size and browser type. See Privacy & Terms on the title screen.' }),
        menu.el,
        desc,
      ]),
      menu,
    );
  }

  private writeFeedback(kind: ReportKind, title: string, back: () => void): void {
    const input = el('textarea', { className: 'feedback-input' });
    input.maxLength = 4000;
    const contact = el('input', { className: 'feedback-contact' });
    contact.maxLength = 80;
    contact.placeholder = 'Your name or Reddit/itch name (optional)';
    contact.addEventListener('keydown', (e) => e.stopPropagation());
    input.placeholder = kind === 'bug' ? 'What happened? What did you expect?' : 'Tell us...';
    const status = el('p', { className: 'form-error' });
    let sending = false;
    const send = async () => {
      const text = input.value.trim();
      if (text.length < 3) return void (status.textContent = 'Write a few words first.');
      if (sending) return;
      sending = true;
      status.textContent = 'Sending...';
      const ok = await sendReport(kind, text, this.reportContext(), contact.value);
      sending = false;
      if (!ok) return void (status.textContent = 'Could not send it. Check your connection and try again.');
      back();
      this.toast('Thank you! Your message was sent.');
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this.showFeedback(back);
    });
    const menu = new ListMenu(
      [
        { label: 'Send', onSelect: () => void send() },
        { label: 'Back', onSelect: () => this.showFeedback(back) },
      ],
      { onCancel: () => this.showFeedback(back) },
    );
    const why = el('p', { className: 'feedback-why', text: 'Leave a name if you would like a reply, or to be thanked on the Wayfinders\' Stone in Lindholm. Only the makers see it.' });
    this.openOverlay(el('div', { className: 'panel dialog wide' }, [el('h2', { text: title }), input, contact, why, status, menu.el]), menu);
    input.focus();
  }

  /** The bestiary: monsters met so far, one page each. */
  showBestiary(back: () => void, start = 0): void {
    const book = this.game.state.bestiary ?? {};
    const rows = bestiaryOrder();
    const seen = rows.filter((r) => book[r.def.id]?.seen).length;
    const items: MenuItem[] = rows.map((r, i) => {
      const e = book[r.def.id];
      if (!e?.seen) return { label: '???', detail: '', description: `Not met yet. Lives on floor ${r.floors.join(', ')}.`, disabled: true, onSelect: () => {} };
      const tag = r.kind === 'boss' ? ' ♛' : r.kind === 'prowler' ? ' ☠' : '';
      return {
        label: `${r.def.name}${tag}`,
        detail: e.defeated ? `×${e.defeated}` : 'seen',
        description: `Floor ${r.floors.join(', ')} · ${e.defeated ? `defeated ${e.defeated}` : 'not defeated yet'}`,
        onSelect: () => this.showBeast(r.def.id, () => this.showBestiary(back, i)),
      };
    });
    items.push({ label: 'Back', onSelect: back });
    const menu = new ListMenu(items, { onCancel: back, startIndex: start });
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.openOverlay(
      el('div', { className: 'panel dialog wide' }, [el('h2', { text: 'Bestiary' }), el('p', { className: 'gold-line', text: `${seen} of ${rows.length} monsters met` }), menu.el, desc]),
      menu,
    );
  }

  private showBeast(id: string, back: () => void): void {
    const row = bestiaryOrder().find((r) => r.def.id === id)!;
    const def = row.def;
    const e = this.game.state.bestiary?.[id];
    const known = (e?.defeated ?? 0) > 0;
    const pic = el('img', { className: 'beast-pic' });
    pic.src = `art/monsters/${id}.webp`;
    pic.alt = def.name;
    const lines: HTMLElement[] = [];
    const kind = row.kind === 'boss' ? 'Guardian of the chapter' : row.kind === 'prowler' ? 'Prowler: roams the floor, best avoided' : 'Monster';
    lines.push(el('p', { text: `${kind} · floor ${row.floors.join(', ')} · met ${e?.seen ?? 0}, defeated ${e?.defeated ?? 0}` }));
    const ELEMENT_NAMES = { phys: 'Physical', fire: 'Fire', frost: 'Frost', storm: 'Storm' } as const;
    const WORDS = { weak: 'weak!', resists: 'resists', normal: 'normal', unknown: '?' } as const;
    lines.push(
      el('div', { className: 'beast-elements' }, ELEMENTS.map((x) => {
        const k = elementKnown(def, e, x);
        return el('span', { className: `beast-el ${k}`, text: `${ELEMENT_NAMES[x]}: ${WORDS[k]}` });
      })),
    );
    if (known) {
      lines.push(el('p', { text: `HP ${def.hp} · ATK ${def.atk} · DEF ${def.def} · MAG ${def.mag} · RES ${def.res} · SPD ${def.spd}${def.ranged ? ' · reaches the back row' : ''}` }));
      if (def.skills?.length) lines.push(el('p', { text: `Uses: ${def.skills.map((x) => x.name).join(', ')}` }));
      const leaves = [def.material && MATERIALS[def.material.id]?.name, def.drop && ITEMS[def.drop.item]?.name].filter(Boolean);
      if (leaves.length) lines.push(el('p', { text: `Leaves behind: ${leaves.join(', ')}` }));
    } else {
      lines.push(el('p', { className: 'muted', text: 'Defeat one to learn its strength and what it leaves behind. Weaknesses show as you try each element on it.' }));
    }
    const menu = new ListMenu([{ label: 'Back', onSelect: back }], { onCancel: back });
    this.openOverlay(el('div', { className: 'panel dialog wide beast' }, [el('h2', { text: def.name }), pic, ...lines, menu.el]), menu);
  }

  showGuidebook(back: () => void, start = 0): void {
    const items: MenuItem[] = TIPS.map((tip, i) => ({
      label: tip.title,
      detail: this.game.state.tips?.includes(tip.id) ? '' : 'new',
      onSelect: () => this.showTip(tip, 0, () => this.showGuidebook(back, i)),
    }));
    items.push({
      label: this.game.state.tipsOff ? 'Tips: off' : 'Tips: on',
      description: 'Whether tips appear when something new comes up.',
      onSelect: () => {
        this.game.state.tipsOff = !this.game.state.tipsOff;
        this.save();
        this.showGuidebook(back, items.length - 2);
      },
    });
    items.push({ label: 'Back', onSelect: back });
    const menu = new ListMenu(items, { onCancel: back, startIndex: start });
    this.openOverlay(el('div', { className: 'panel dialog wide' }, [el('h2', { text: 'Guidebook' }), menu.el]), menu);
  }

  // ── Expeditions ────────────────────────────────────────────────────────────

  startExpedition(row: ExpeditionRow): void {
    if (this.coop) return;
    this.closeOverlay();
    this.home = this.game;
    this.coop = new CoopSession(this, row.id, row.code, row.state);
    this.coop.start();
    this.toast(this.coop.isLeader ? 'You lead the way. The others follow your steps.' : `${this.coop.leaderName} leads the way.`);
  }

  get partyOwners(): string[] | undefined {
    return this.coop?.owners;
  }

  viewFx(kind: 'step' | 'turn' | 'bump' | 'encounter'): void {
    this.fx = { kind, start: this.now };
  }

  forceCombatRound(): void {
    this.combatView?.forceRound();
  }

  finishExpedition(row: ExpeditionRow | null): void {
    const coop = this.coop;
    this.coop = null;
    this.combatView = null;
    this.game = this.home ?? this.game;
    this.home = null;
    const state = row?.state;
    const share = state?.phase === 'ended' ? state.result?.shares.find((s) => s.user === online.userId) : undefined;
    let body: HTMLElement[];
    if (row && state && share) {
      this.game.state.claimed = [...(this.game.state.claimed ?? []), row.id];
      body = shareLines(this.game, share, state);
    } else {
      body = [el('p', { text: 'You head home. Your adventurer stays with the others; collect their share at the Hornstone once the expedition is over.' })];
    }
    this.save();
    audio.music(null);
    audio.play(state?.result?.reason === 'wiped' ? 'defeat' : 'stairs');
    const done = () => {
      this.closeOverlay();
      this.enterTown();
    };
    const menu = new ListMenu([{ label: 'Back to Lindholm', onSelect: done }], { onCancel: done });
    const title = state?.result?.reason === 'wiped' ? 'The expedition has fallen' : coop && state?.phase === 'ended' ? 'Home again' : 'You left the expedition';
    this.showSide('town');
    this.updateHud();
    this.openOverlay(el('div', { className: 'panel dialog' }, [el('h2', { text: title }), ...body, menu.el]), menu);
  }



  // ── Help & credits ─────────────────────────────────────────────────────────

  showHelp(back: () => void): void {
    const section = (title: string, rows: [string, string][]) =>
      el('div', { className: 'help-section' }, [
        el('h3', { text: title }),
        ...rows.map(([k, v]) => el('div', { className: 'help-row' }, [el('span', { className: 'help-key', text: k }), el('span', { text: v })])),
      ]);
    const menu = new ListMenu([{ label: 'Close', onSelect: back }], { onCancel: back });
    const touch = TOUCH || document.body.classList.contains('phone');
    const controls = touch
      ? [
          section('Exploring', [
            ['▲ ▼', 'Step forward or back'],
            ['↶ ↷', 'Turn left or right'],
            ['⇠ ⇢', 'Side-step'],
            ['Swipe', 'Up/down on the view to walk, sideways to turn'],
            ['Act', 'Open chests, drink from springs, gather'],
            ['Map', 'Draw walls, marks and notes on your map'],
            ['Menu', 'Party, Bag, Journal and Options: skills, items, the map, settings, feedback'],
          ]),
          section('Fighting', [
            ['Commands', 'Tap one, then a target'],
            ['Back', 'Undo the previous member\'s choice'],
            ['Tap', 'During a round: speed it up'],
            ['Repeat', 'Everyone does what they did last round'],
            ['Auto', 'The party fights on its own; tap to stop'],
          ]),
        ]
      : [
          section('Exploring', [
            ['↑ / W', 'Step forward'],
            ['↓ / S', 'Step back'],
            [prefs.strafeKeys ? '← → / Q E  ↶ ↷' : '← → / A D  ↶ ↷', 'Turn'],
            [prefs.strafeKeys ? 'A / D  ⇠ ⇢' : 'Q / E  ⇠ ⇢', 'Side-step'],
            ['Swipe', 'Up/down to walk, sideways to turn'],
            ['Space / Act', 'Open chests, drink from springs, gather'],
            ['M', 'Map: draw walls, marks and notes (1–9, 0 pick a tool, N a note)'],
            ['C / Esc', 'Menu: Party, Bag, Journal, Options'],
            ['H', 'This help'],
          ]),
          section('Fighting', [
            ['↑↓ Enter', 'Choose a command for each member'],
            ['← →', 'Pick a target'],
            ['Esc', 'Back to the previous member'],
            ['Enter', 'Speed up the round'],
            ['R', 'Repeat last round'],
            ['O', 'Auto battle (Esc or tap to stop)'],
          ]),
        ];
    this.openOverlay(
      el('div', { className: 'panel dialog wide help' }, [
        el('h2', { text: 'How to Play' }),
        el('div', { className: 'help-grid' }, [
          ...controls,
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
        el('div', { className: 'tagline', text: 'The road to Asgard runs through Ymir' }),
        el('p', { className: 'credits-line', text: 'End of Chapter II. The road goes on, deeper than the sea.' }),
        el('p', { className: 'credits-line big', text: 'To be continued' }),
        el('p', { className: 'credits-line small', text: 'Chapter III is being written. Your Wayfinders, your choices and your map will be waiting.' }),
        el('div', { className: 'rewards' }, [
          el('span', { text: 'Party' }), el('span', { className: 'v', text: s.party.map((m) => `${m.name} Lv ${m.level}`).join(', ') }),
          el('span', { text: 'Steps taken' }), el('span', { className: 'v', text: String(s.steps) }),
          el('span', { text: 'Battles fought' }), el('span', { className: 'v', text: String(s.battles) }),
          el('span', { text: 'Requests completed' }), el('span', { className: 'v', text: `${quests}` }),
          el('span', { text: 'Gold' }), el('span', { className: 'v', text: `${s.gold} G` }),
        ]),
        el('p', { className: 'credits-line small', text: 'A game by Rudy van Tuijn · story by Thijs · built with Claude' }),
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
    this.playLines(scene.lines, () => {
      if (scene.choice && !this.game.state.choices?.[scene.id]) this.tips(['choice'], () => this.storyChoice(scene, () => then(scene.id)));
      else then(scene.id);
    });
  }

  /** Shows story lines one box at a time, then calls `then`. */
  private playLines(lines: StoryLine[], then: () => void): void {
    const box = el('div', { className: 'story-box panel' });
    box.addEventListener('click', () => this.storyKey('Enter'));

    this.viewWrap.appendChild(box);
    this.story = { lines, index: 0, shown: 0, then, box };
    this.mode = 'story';
    this.toastEl.classList.add('hidden');
    this.showStoryLine();
  }

  /** The choice at the end of a scene. It cannot be skipped; what was chosen is said, then the story goes on. */
  private storyChoice(scene: StoryScene, then: () => void): void {
    const choice = scene.choice!;
    const items: MenuItem[] = choice.options.map((o) => ({
      label: o.label,
      onSelect: () => {
        this.closeOverlay();
        choose(this.game, scene.id, o.id);
        this.save();
        this.playLines(o.reply, then);
      },
    }));
    const menu = new ListMenu(items);
    this.openOverlay(
      el('div', { className: 'panel dialog story-choice' }, [
        el('h2', { text: scene.title }),
        el('p', { text: choice.prompt }),
        el('p', { className: 'muted', text: 'This choice will be remembered.' }),
        menu.el,
      ]),
      menu,
    );
  }

  /** The Chronicle: every scene seen so far, to read again, with the choices made. */
  showChronicle(back: () => void, start = 0): void {
    const seen = STORY.filter((sc) => this.game.state.story.includes(sc.id));
    const items: MenuItem[] = seen.map((sc, i) => {
      const picked = sc.choice?.options.find((o) => o.id === this.game.state.choices?.[sc.id]);
      return {
        label: sc.title,
        detail: picked ? '◆' : '',
        description: picked ? `You chose: ${picked.label}.` : '',
        onSelect: () => {
          this.closeOverlay();
          this.playLines([...sc.lines, ...(picked?.reply ?? [])], () => this.showChronicle(back, i));
        },
      };
    });
    items.push({ label: 'Back', onSelect: back });
    const menu = new ListMenu(items, { onCancel: back, startIndex: Math.min(start, items.length - 1) });
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.openOverlay(el('div', { className: 'panel dialog wide' }, [el('h2', { text: 'Chronicle' }), menu.el, desc]), menu);
  }

  private showStoryLine(): void {
    const st = this.story!;
    const line = st.lines[st.index];
    st.box.innerHTML = '';
    st.box.classList.toggle('narrator', !line.speaker);
    if (line.speaker) {
      const portrait = el('canvas', { className: 'story-portrait' });
      portrait.width = portrait.height = 192;
      drawPortrait(portrait.getContext('2d')!, 192, npcFromName(line.speaker) ?? 'sigrid', line.speaker, '#8aa0c0');
      st.box.append(portrait);
    }
    const text = el('div', { className: 'story-text' });
    const body = el('p');
    if (line.speaker) text.append(el('div', { className: 'story-speaker', text: line.speaker }));
    text.append(body, el('div', { className: 'story-more', text: st.index < st.lines.length - 1 ? '▼' : '■' }));
    st.box.append(text);
    // A Skip button ends the scene (Escape does the same on a keyboard).
    const skip = el('button', { className: 'story-skip', text: 'Skip ▸▸' });
    skip.addEventListener('click', (e) => {
      e.stopPropagation();
      this.storyKey('Escape');
    });
    st.box.append(skip);
    // Typewriter: reveal the line a few letters at a time.
    st.shown = 0;
    const step = () => {
      if (this.story !== st || st.lines[st.index] !== line) return;
      st.shown = Math.min(line.text.length, st.shown + TEXT_SPEED_STEP[prefs.textSpeed]);
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
    for (const gold of this.townGrid.querySelectorAll('.town-gold')) gold.textContent = `${g.state.gold} G`;
    const level = g.dangerLevel;
    const color = level < 0.45 ? '#3fb6e8' : level < 0.75 ? '#e8c43f' : '#e8483f';
    this.dangerOrb.style.background = `radial-gradient(circle at 35% 30%, #fff, ${color} 55%, #000 120%)`;
    this.dangerOrb.style.color = color;
    this.goldEl.textContent = `${g.state.gold} G`;
    this.party.render(g.state.party, { owners: this.coop?.owners });
    this.keyHint.textContent = prefs.strafeKeys
      ? 'W S: walk · A D: side-step · Q E: turn · Space: act · M: map · Esc: menu'
      : 'W S: walk · A D: turn · Q E: side-step · Space: act · M: map · Esc: menu';
    this.updateActPrompt();
  }

  /** The action button in the view: only there when there is something to do where the party stands. */
  private updateActPrompt(): void {
    const g = this.game;
    const action = g.state.location === 'dungeon' && this.mode === 'explore' ? g.actionHere() : null;
    this.actPrompt.classList.toggle('hidden', !action);
    if (!action) return;
    const what = action.kind === 'chest' ? 'Open the chest' : action.kind === 'gate' ? 'Open the root gate' : `${GATHER_KINDS[action.gather].verb} here`;
    this.actPrompt.textContent = TOUCH ? what : `${what}  [Space]`;
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
        if (!ev.opened) this.tips(['chest'], () => this.resumeExplore());
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
      case 'link': {
        const to = this.game.floors[ev.floor].name;
        this.confirm(ev.down ? 'Stairs down' : 'Stairs up', ev.down ? `Descend to ${to}?` : `Climb up to ${to}?`, () => {
          audio.play('stairs');
          this.game.takeLink();
          this.save();
          this.enterExplore();
          this.toast(`${this.game.floorDef.name} — game saved.`);
        });
        return;
      }
      case 'gateOpened':
        audio.play('chest');
        this.save();
        this.toast('You pull the roots apart. This way stays open now.');
        this.tips(['gate'], () => this.resumeExplore());
        return;
      case 'gateSealed':
        audio.play('bump');
        this.toast('A root gate, grown shut. It can only be opened from the other side.');
        this.tips(['gate'], () => this.resumeExplore());
        return;
      case 'stairs':
        if (this.trial && this.game.isLastFloor) return this.confirm('Stairs down', 'Your chapter ends here. Head back to the drafting table?', () => this.endTrial());
        if (this.game.isLastFloor) return;
        this.confirm('Stairs down', `Descend to ${this.game.floors[this.game.state.floor + 1].name}?`, () => {
          audio.play('stairs');
          this.game.descend();
          this.save();
          this.enterExplore();
          this.toast(`${this.game.floorDef.name} — game saved.`);
        });
        return;
      case 'upstairs': {
        if (this.trial && this.game.state.floor === 0) return this.confirm('Stairs up', 'Stop the test and head back to the drafting table?', () => this.endTrial());
        const leaving = this.game.state.floor === 0;
        const text = leaving ? 'Leave the Rootdeep and return to Lindholm?' : `Climb up to ${this.game.floors[this.game.state.floor - 1].name}?`;
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
        if (!this.game.state.tips?.includes('spring') && !this.game.state.tipsOff && !this.trial) return this.tips(['spring'], () => this.handleStep(ev));
        this.confirm('Healing spring', 'Drink from the spring? It fully restores the party and saves your game. It only works once.', () => {
          audio.play('spring');
          this.game.drinkSpring();
          this.save();
          this.enterExplore();
          this.toast('The party feels refreshed. Game saved.');
        });
        return;
      case 'gatherSpot': {
        if (!this.game.state.tips?.includes('gather') && !this.game.state.tipsOff && !this.trial) return this.tips(['gather'], () => this.handleStep(ev));
        const message = gatherPrompt(ev);
        if (!message.ask) return this.toast(message.text);
        this.confirm(GATHER_KINDS[ev.kind].verb, message.text, () => {
          const found = this.game.gather();
          if (!found) return;
          audio.play('chest');
          this.save();
          this.enterExplore();
          this.toast(`Found ${describeFinds(found.finds)}!`);
          if (found.ambush) {
            const ambush = found.ambush;
            const where = { floor: this.game.state.floor, game: this.game };
            window.setTimeout(() => {
              // Only if the party is still standing there (not back in town, on another floor, or in a menu).
              const s = this.game.state;
              if (this.game !== where.game || s.location !== 'dungeon' || s.floor !== where.floor || this.mode !== 'explore') return;
              this.toast('The noise has drawn monsters!');
              this.handleStep({ type: 'encounter', enemies: ambush });
            }, 900);
          }
        });
        return;
      }
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

  startCombat(combat: Combat, driver: RoundDriver | null = null): void {
    // A fight ends any story scene still on screen.
    if (this.story) {
      this.story.box.remove();
      this.story = null;
    }
    if (!this.coop && !this.trial && !this.game.state.tips?.includes('battle') && !this.game.state.tipsOff) {
      this.mode = 'busy';
      return this.tips(['battle'], () => this.startCombat(combat, driver));
    }
    this.closeOverlay();
    this.mode = 'combat';
    this.toastEl.classList.add('hidden');
    this.showSide('combat');
    audio.music(themeFor({ location: 'dungeon', combat: combat.boss ? 'boss' : combat.prowler ? 'prowler' : 'normal' }));
    this.combatView = new CombatView(this, combat, (c) => this.endCombat(c), driver);
    void this.combatView.start();
  }

  private endCombat(combat: Combat): void {
    // On an expedition the server has already settled the fight.
    if (!this.coop) this.game.finishCombat(combat);
    this.combatView = null;
    this.showSide('explore');
    this.updateHud();

    if (combat.outcome === 'defeat') {
      audio.music(null);
      audio.play('defeat');
      if (this.coop) return this.coop.combatOver();
      return this.showGameOver();
    }
    if (combat.outcome === 'fled') {
      if (this.coop) {
        this.coop.combatOver();
        this.toast('The party got away.');
        return;
      }
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
      ...tally(r.drops).flatMap(([id, n]) => [el('span', { text: 'Found' }), el('span', { className: 'v', text: `${ITEMS[id as ItemId].name}${n > 1 ? ` ×${n}` : ''}` })]),
      ...tally(r.materials).flatMap(([id, n]) => [el('span', { text: 'Material' }), el('span', { className: 'v', text: `${MATERIALS[id].name}${n > 1 ? ` ×${n}` : ''}` })]),
    ]);
    const levelUps = r.levelUps.map((l) =>
      el('div', { className: 'levelup', text: `${this.game.state.party[l.member].name} reached level ${l.level}! A new skill point to spend.` }),
    );
    this.noticeTip('victory');
    if (r.levelUps.length) this.noticeTip('skillPoints');
    const done = () => {
      this.closeOverlay();
      if (this.coop) return this.coop.combatOver();
      if (!combat.boss) return this.enterExplore();
      this.playStory('victory', () => {
        if (this.game.state.cleared && !this.trial) return this.showCleared();
        this.enterExplore();
        this.toast(`${combat.enemies[0].def.name} has fallen. The way down lies open.`);
      });
    };
    const menu = new ListMenu([{ label: 'Continue', onSelect: done }], { onCancel: done });
    this.openOverlay(
      el('div', { className: 'panel dialog' }, [el('h2', { text: 'Victory!' }), lines, ...levelUps, menu.el]),
      menu,
    );
  }

  private showSide(panel: SidePanel): void {
    for (const p of this.explorePanels) p.classList.toggle('hidden', panel !== 'explore');
    if (panel !== 'explore') this.actPrompt.classList.add('hidden');
    this.commandPanel.classList.toggle('hidden', panel !== 'combat');
    this.townPanel.classList.toggle('hidden', panel !== 'town');
  }

  private showGameOver(): void {
    if (this.trial) {
      const design = this.trial;
      const menu = new ListMenu([
        { label: 'Try again', onSelect: () => this.startTrial(design, this.game.state.party[0].level) },
        { label: 'Back to the drafting table', onSelect: () => this.endTrial() },
      ]);
      this.openOverlay(el('div', { className: 'panel dialog' }, [el('h2', { text: 'Your party has fallen' }), el('p', { text: 'Too hard? Try a higher test level, or soften the floor.' }), menu.el]), menu);
      return;
    }
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
        el('h2', { text: 'The first ward has fallen!' }),
        el('p', { text: 'The Hafgufa has sunk into the dark, and the first of the gods\' wards is broken.' }),
        el('p', { text: `Steps: ${s.steps} · Battles: ${s.battles} · Gold: ${s.gold} G` }),
        menu.el,
      ]),
      menu,
    );
  }

  // ── Menu ───────────────────────────────────────────────────────────────────

  /** Opens the menu fresh, on the Party tab (Esc, C, the ☰ button). */
  openMenu(): void {
    this.openPack('party');
  }

  /** The menu tab last shown, so sub-screens come back to it. */
  private menuTab: MenuTab = 'party';

  /**
   * The one menu (Esc, C or the ☰ button), the same in town, in the dungeon and on expeditions: four tabs,
   * each showing only what can be done here. Sub-screens return to it through `openPack()`.
   */
  openPack(tab: MenuTab = this.menuTab): void {
    this.menuTab = tab;
    const s = this.game.state;
    const inTown = s.location === 'town' && !this.coop;
    const coop = this.coop;
    const close = () => {
      this.closeOverlay();
      if (inTown) {
        this.mode = 'town';
        this.town.show();
      } else this.enterExplore();
    };
    const back = () => this.openPack();
    const quit = (): MenuItem =>
      coop
        ? { label: 'Leave the expedition', description: 'Go home alone. Your adventurer fights on without you and comes home with the others.', onSelect: () => this.confirm('Leave', 'Leave the expedition and head home?', () => coop.leave(), back) }
        : this.trial
          ? { label: 'End the test', description: 'Back to the drafting table.', onSelect: () => this.endTrial() }
          : { label: 'Quit to title', description: 'Return to the title screen. Anything since your last save is lost.', onSelect: () => this.confirm('Quit to title', 'Return to the title screen? Anything since your last save is lost.', () => this.showTitle(), back) };
    const feathers = s.inventory.homingFeather ?? 0;
    const feather: MenuItem = coop
      ? {
          label: 'Homing Feather',
          detail: `×${feathers}`,
          description: coop.isLeader ? 'Take everyone home and end the expedition.' : `Only ${coop.leaderName} can use it.`,
          disabled: !coop.isLeader || feathers <= 0,
          onSelect: () => this.confirm('Homing Feather', 'Take the whole expedition back to Lindholm?', () => { audio.play('spring'); coop.useFeather(); this.enterExplore(); }, back),
        }
      : {
          label: 'Homing Feather',
          detail: `×${feathers}`,
          description: 'Return to Lindholm right away. Saves on arrival.',
          disabled: feathers <= 0,
          onSelect: () =>
            this.confirm('Homing Feather', 'Follow the Homing Feather back to Lindholm?', () => {
              audio.play('spring');
              this.game.useFeather();
              this.save();
              this.enterTown();
              this.toast('The feather carries you home. Game saved.');
            }, back),
        };
    const points = s.party.some((m) => unspentPoints(m) > 0);
    const tabs: Record<MenuTab, MenuItem[]> = {
      party: [
        { label: 'Stats & gear', description: 'Everyone\'s stats, weapons and armour.', onSelect: () => this.partyStatus(back) },
        ...(coop
          ? []
          : [
              { label: 'Skill tree', detail: points ? 'points to spend' : undefined, description: 'Spend skill points. Every level brings one; each skill goes up to rank 10.', onSelect: () => this.packSkillTree() },
              { label: 'Use a skill', description: 'Use a healing skill outside of a fight.', onSelect: () => this.packSkills() },
            ]),
      ],
      bag: [
        ...(coop ? [] : [{ label: 'Items', description: 'Use a potion or tonic on someone.', onSelect: () => this.packItems() }]),
        ...(inTown ? [] : [feather]),
        ...(coop ? [] : [{ label: 'Materials', description: 'Monster parts and gathered goods, to sell in town.', onSelect: () => this.materialsList(back) }]),
      ],
      journal: [
        ...(inTown ? [] : [{ label: 'Map', description: 'Your map of this floor: draw walls, marks and notes.', onSelect: () => { this.closeOverlay(); this.showMapOverlay(); } }]),
        ...(coop
          ? []
          : [
              { label: 'Chronicle', description: 'The story so far: read every scene again.', onSelect: () => this.showChronicle(back) },
              { label: 'Guidebook', description: 'Read every tip again, and switch tips on or off.', onSelect: () => this.showGuidebook(back) },
              { label: 'Bestiary', description: 'Every monster you have met: where it lives, what it leaves behind, and the weaknesses you have found.', onSelect: () => this.tips(['bestiary'], () => this.showBestiary(back)) },
            ]),
      ],
      options: [
        { label: 'Settings', description: 'Sound, speed, keys, map drawing and tips.', onSelect: () => this.settings(back) },
        ...(coop || this.trial
          ? []
          : [
              inTown
                ? { label: 'Save', description: 'Save your progress.', onSelect: () => { this.save(); this.toast('Game saved.'); } }
                : { label: 'Save', description: 'In the Rootdeep the game saves at every stair and spring; in town you can save any time.', disabled: true, onSelect: () => {} },
            ]),
        { label: 'Help', description: 'Controls and how to play.', onSelect: () => this.showHelp(back) },
        ...(coop ? [] : [{ label: 'Feedback', description: 'Report a bug or share an idea with the makers.', onSelect: () => this.showFeedback(back) }]),
        { label: 'Privacy & Terms', description: 'What the game stores about you (opens a new page).', onSelect: () => window.open('privacy.html', '_blank', 'noopener') },
        { label: 'Credits', description: 'The photographers, artists and icon makers whose work is in the game (opens a new page).', onSelect: () => window.open('credits.html', '_blank', 'noopener') },
        quit(),
      ],
    };
    const order: MenuTab[] = ['party', 'bag', 'journal', 'options'];
    const names: Record<MenuTab, string> = { party: 'Party', bag: 'Bag', journal: 'Journal', options: 'Options' };
    const menu = new ListMenu(tabs[tab], { onCancel: close, backRow: false });
    // ← → (or tapping a tab) switches tabs.
    const handle = menu.handleKey.bind(menu);
    const step = (d: number) => {
      audio.play('menuMove');
      this.openPack(order[(order.indexOf(tab) + d + order.length) % order.length]);
    };
    menu.handleKey = (key: string): boolean => {
      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        step(key === 'ArrowLeft' ? -1 : 1);
        return true;
      }
      return handle(key);
    };
    const bar = el(
      'div',
      { className: 'menu-tabs' },
      order.map((t) => {
        const b = el('button', { className: t === tab ? 'on' : '', text: names[t] });
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (t !== tab) this.openPack(t);
        });
        return b;
      }),
    );
    const head: HTMLElement[] = [];
    if (tab === 'party') {
      head.push(
        el(
          'div',
          { className: 'menu-party' },
          s.party.map((m) => {
            const c = el('canvas', { className: 'menu-portrait' });
            c.width = 64;
            c.height = 64;
            drawPortrait(c.getContext('2d')!, 64, m.classId, m.name, CLASSES[m.classId].color);
            const pts = unspentPoints(m);
            return el('div', { className: 'menu-member' }, [
              c,
              el('div', {}, [
                el('b', { text: m.name }),
                el('span', { text: `Lv ${m.level} ${CLASSES[m.classId].name} · HP ${m.hp} · SP ${m.sp}` }),
              ]),
              el('span', { className: 'menu-points', text: pts ? `${pts} skill point${pts > 1 ? 's' : ''}` : '' }),
            ]);
          }),
        ),
      );
    }
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    const hint = el('div', { className: 'menu-hint', text: TOUCH ? 'Tap a tab to switch' : '← → switch tab · ↑↓ choose · Esc close' });
    this.openOverlay(el('div', { className: 'panel dialog wide game-menu' }, [bar, ...head, menu.el, desc, hint]), menu);
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
            else this.pickAlly(`${skill.name} on whom?`, (t) => cast([t]), () => this.packSkills(), skill.kind === 'revive', skill.kind === 'revive' ? undefined : 'hp');
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
    // Ailments only exist in a fight, so cures are left out here; feathers and tokens have their own uses.
    const usable = (Object.keys(ITEMS) as ItemId[]).filter((id) => !['warp', 'token', 'cure'].includes(ITEMS[id].effect));
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
        }, () => this.packItems(), ITEMS[id].effect === 'revive', ITEMS[id].effect === 'sp' ? 'sp' : ITEMS[id].effect === 'hp' ? 'hp' : undefined),
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
  /** Volume sliders, battle and text speed, and (for the save in hand) tips. */
  settings(back: () => void, start = 0): void {
    const s = this.game.state;
    // Tips belong to a saved game, so the title screen leaves them out.
    const solo = !this.coop && !this.trial && this.game !== this.titleGame;
    /** A 0–100% slider; keys move it in steps of 5. */
    const slider = (kind: 'music' | 'sfx') => {
      const input = el('input', { className: 'slider' });
      input.type = 'range';
      input.min = '0';
      input.max = '100';
      input.step = '5';
      input.value = String(Math.round(audio.settings[kind] * 100));
      const value = el('span', { className: 'slider-value', text: `${input.value}%` });
      const set = (pct: number) => {
        const v = Math.max(0, Math.min(100, Math.round(pct / 5) * 5));
        input.value = String(v);
        value.textContent = `${v}%`;
        input.style.setProperty('--fill', `${v}%`);
        audio.setVolume(kind, v / 100);
      };
      input.style.setProperty('--fill', `${input.value}%`);
      input.addEventListener('input', () => set(Number(input.value)));
      input.addEventListener('change', () => kind === 'sfx' && audio.play('chest'));
      // After a drag the slider gives the keyboard back to the menu.
      input.addEventListener('change', () => input.blur());
      return {
        control: el('div', { className: 'slider-wrap' }, [input, value]),
        onAdjust: (step: -1 | 1) => {
          set(Number(input.value) + step * 5);
          if (kind === 'sfx') audio.play('menuMove');
        },
      };
    };
    /** A row of choices; the chosen one is lit. */
    const choices = <T extends string | number>(options: [T, string][], current: () => T, pick: (v: T) => void) => {
      const wrap = el('div', { className: 'choice-set' });
      const draw = () => {
        wrap.replaceChildren(
          ...options.map(([v, label]) => {
            const b = el('button', { className: v === current() ? 'choice on' : 'choice', text: label });
            b.addEventListener('click', (e) => {
              e.stopPropagation();
              pick(v);
              draw();
            });
            return b;
          }),
        );
      };
      draw();
      const step = (dir: -1 | 1) => {
        const i = options.findIndex(([v]) => v === current());
        const next = options[Math.max(0, Math.min(options.length - 1, i + dir))][0];
        pick(next);
        draw();
        audio.play('menuMove');
      };
      return { control: wrap, onAdjust: step, cycle: () => step(options.findIndex(([v]) => v === current()) === options.length - 1 ? -1 : 1) };
    };
    const music = slider('music');
    const sfx = slider('sfx');
    const battle = choices<BattleSpeed>([[0, 'Slow'], [1, 'Normal'], [2, 'Fast'], [3, 'Fastest']], () => prefs.battleSpeed, (v) => setPref('battleSpeed', v));
    const text = choices<TextSpeed>(
      (Object.keys(TEXT_SPEED_NAMES) as TextSpeed[]).map((v) => [v, TEXT_SPEED_NAMES[v]]),
      () => prefs.textSpeed,
      (v) => setPref('textSpeed', v),
    );
    const tips = choices<'on' | 'off'>([['on', 'On'], ['off', 'Off']], () => (s.tipsOff ? 'off' : 'on'), (v) => {
      s.tipsOff = v === 'off';
      this.save();
    });
    const keys = choices<'turn' | 'step'>([['turn', 'Turn'], ['step', 'Side-step']], () => (prefs.strafeKeys ? 'step' : 'turn'), (v) => setPref('strafeKeys', v === 'step'));
    const chart = choices<ChartMode>(
      [['assisted', 'Assisted'], ['manual', 'Manual'], ['auto', 'Auto']],
      () => s.chartMode,
      (v) => {
        s.chartMode = v;
        this.save();
      },
    );
    const items: MenuItem[] = [
      { label: 'Music', description: 'Drag the slider, or use ← →.', control: music.control, onAdjust: music.onAdjust, onSelect: () => music.onAdjust(1) },
      { label: 'Effects', description: 'Drag the slider, or use ← →.', control: sfx.control, onAdjust: sfx.onAdjust, onSelect: () => sfx.onAdjust(1) },
      { label: 'Battle speed', description: 'How fast the rounds of a fight play out. Enter during a round speeds it up even more.', control: battle.control, onAdjust: battle.onAdjust, onSelect: battle.cycle },
      { label: 'Text speed', description: 'How fast story lines appear.', control: text.control, onAdjust: text.onAdjust, onSelect: text.cycle },
      { label: 'A / D keys', description: 'Turn: A and D turn, Q and E side-step. Side-step: the other way round. The arrow keys always turn.', control: keys.control, onAdjust: keys.onAdjust, onSelect: keys.cycle },
      ...(solo
        ? [{ label: 'Map drawing', description: 'Assisted: your steps fill in, you draw walls and marks. Manual: you draw everything. Auto: the map draws itself.', control: chart.control, onAdjust: chart.onAdjust, onSelect: chart.cycle }]
        : []),
      ...(solo ? [{ label: 'Tips', description: 'Whether tips appear when something new comes up.', control: tips.control, onAdjust: tips.onAdjust, onSelect: tips.cycle }] : []),
      { label: 'Back', onSelect: back },
    ];
    const menu = new ListMenu(items, { onCancel: back, startIndex: start });
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.openOverlay(el('div', { className: 'panel dialog wide settings' }, [el('h2', { text: 'Settings' }), menu.el, desc]), menu);
  }

  partyStatus(back: () => void): void {
    const gear = (id?: string) => (id ? EQUIPMENT[id]?.name ?? '—' : '—');
    const row = (m: Member, reserve = false) => {
      const s = memberStats(m);
      const next = m.level >= MAX_LEVEL ? '—' : String(xpForLevel(m.level + 1) - m.xp);
      return `<tr class="${reserve ? 'reserve' : ''}"><td class="name">${escapeHtml(m.name)}</td><td>${CLASSES[m.classId].name}</td><td>${m.level}</td><td>${m.hp}/${s.hp}</td><td>${m.sp}/${s.sp}</td><td>${s.atk}</td><td>${s.def}</td><td>${s.mag}</td><td>${s.res}</td><td>${s.spd}</td><td>${next}</td><td class="gear">${gear(m.weapon)}</td><td class="gear">${gear(m.armor)}</td></tr>`;
    };
    const st = this.game.state;
    const table = el('table', { className: 'stats' });
    table.innerHTML =
      '<thead><tr><th>Name</th><th>Class</th><th>Lv</th><th>HP</th><th>SP</th><th>ATK</th><th>DEF</th><th>MAG</th><th>RES</th><th>SPD</th><th title="Experience needed for the next level">XP to next</th><th class="gear">Weapon</th><th class="gear">Armour</th></tr></thead>' +
      `<tbody>${st.party.map((m) => row(m)).join('')}${st.reserve.length ? `<tr class="divider"><td colspan="13">In the Oath Hall (reserve)</td></tr>${st.reserve.map((m) => row(m, true)).join('')}` : ''}</tbody>`;
    const menu = new ListMenu([{ label: 'Back', onSelect: back }], { onCancel: back });
    this.openOverlay(el('div', { className: 'panel dialog party-status' }, [el('h2', { text: 'Party' }), el('div', { className: 'stats-wrap' }, [table]), menu.el]), menu);
  }

  /** `fallen`: pick among the fallen (for reviving) instead of the living. */
  /**
   * Choose a party member. `fallen`: pick among the fallen (for reviving). `needs`: only those missing HP or SP,
   * so a heal is never wasted on someone who is already full.
   */
  private pickAlly(title: string, pick: (i: number) => void, back: () => void, fallen = false, needs?: 'hp' | 'sp'): void {
    const party = this.game.state.party;
    const full = (m: Member) => (needs === 'hp' ? m.hp >= memberStats(m).hp : needs === 'sp' ? m.sp >= memberStats(m).sp : false);
    const eligible = (m: Member) => isAlive(m) !== fallen && !full(m);
    const items = party.map((m, i) => ({
      label: m.name,
      detail: isAlive(m) ? `${m.hp}/${memberStats(m).hp} HP · ${m.sp} SP` : 'fallen',
      description: !isAlive(m) && !fallen ? 'Fallen: wake them first.' : full(m) ? `Already at full ${needs === 'sp' ? 'SP' : 'HP'}.` : '',
      disabled: !eligible(m),
      onSelect: () => pick(i),
    }));
    this.subMenu(title, items, back, Math.max(0, party.findIndex(eligible)));
  }

  private subMenu(title: string, items: MenuItem[], back: () => void, start = 0): void {
    const menu = new ListMenu(items, { onCancel: back, startIndex: start });
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.openOverlay(el('div', { className: 'panel dialog' }, [el('h2', { text: title }), menu.el, desc]), menu);
  }

  private showMapOverlay(): void {
    if (!this.game.state.tips?.includes('map') && !this.game.state.tipsOff && !this.trial && !this.coop) return this.tips(['map'], () => this.showMapOverlay());
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

  private packSkillTree(): void {
    const host = {
      dialog: (title: string, body: HTMLElement[], menu: ListMenu) => {
        const desc = el('div', { className: 'menu-desc' });
        menu.describeInto(desc);
        this.openOverlay(el('div', { className: 'panel dialog wide' }, [el('h2', { text: title }), ...body, menu.el, desc]), menu);
      },
      changed: () => {
        this.save();
        this.updateHud();
      },
    };
    const pick = () => {
      const menu = new ListMenu(memberPicker(this.game.state.party, (m) => showSkillTree(host, m, pick), () => this.openPack()), { onCancel: () => this.openPack() });
      host.dialog('Skill tree', [], menu);
    };
    pick();
  }

  // ── Drafting table ─────────────────────────────────────────────────────────

  private showDesigner(design: ChapterDesign = loadDraft()): void {
    this.designer = new Designer(design, {
      onTest: (d, level) => this.startTrial(d, level),
      onClose: () => {
        this.designer = null;
        this.showTitle();
      },
    });
    this.overlay.innerHTML = '';
    this.overlay.appendChild(this.designer.el);
    this.overlay.classList.remove('hidden');
    this.overlayMenu = null;
    this.mode = 'drafting';
  }

  private startTrial(design: ChapterDesign, level: number): void {
    this.designer = null;
    this.closeOverlay();
    this.trial = design;
    this.game = Game.trial(toFloorDefs(design), level, design.floors[0].monsters, randomSeed());
    this.party.render(this.game.state.party);
    this.enterExplore();
    this.toast(`Testing ${design.name} with a level ${level} party.`);
  }

  private endTrial(): void {
    const design = this.trial ?? undefined;
    this.trial = null;
    this.closeOverlay();
    this.game = Game.newGame(1); // background scenery only
    this.showSide('town');
    this.town.show();
    this.updateHud();
    this.party.render(this.game.state.party);
    audio.music(themeFor({ location: 'title' }));
    this.showDesigner(design);
  }

  // ── Overlay helpers ────────────────────────────────────────────────────────

  /** Yes/no question. Saying no goes back to `back`, or to exploring when there is none. */
  confirm(title: string, text: string, yes: () => void, back?: () => void): void {
    const no = () => {
      this.closeOverlay();
      if (back) back();
      else this.enterExplore();
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

  toast(text: string, ms = 2400): void {
    if (this.story) return; // the story box has the stage
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.add('hidden'), ms);
  }

  /** News that must not be missed: a dialog while exploring, a long toast in the middle of anything else. */
  notice(title: string, text: string): void {
    if (this.mode !== 'explore') {
      this.toast(text, 6000);
      return;
    }
    const ok = () => {
      this.closeOverlay();
      this.enterExplore();
    };
    const menu = new ListMenu([{ label: 'OK', onSelect: ok }], { onCancel: ok });
    this.openOverlay(el('div', { className: 'panel dialog' }, [el('h2', { text: title }), el('p', { text }), menu.el]), menu);
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

/** Text made safe to put inside HTML (player-chosen names). */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** [id, count] pairs for a list with repeats, in order of first appearance. */
function tally(ids: string[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts];
}
