/**
 * The drafting table: a screen to draw your own floors, check them, test-play them
 * and share them as a code.
 */
import { ENEMIES } from '../core/data/enemies';
import { chapterOf } from '../core/data/chapters';
import { FLOORS } from '../core/data/floors';
import {
  BOSS_CHOICES,
  MAX_PROWLERS,
  MAX_ROUTE,
  MAX_SIZE,
  MIN_SIZE,
  NAME_MAX,
  PROWLER_CHOICES,
  THEMES,
  blankDesign,
  cellAt,
  decodeDesign,
  encodeDesign,
  paint,
  problems,
  resize,
  type Cell,
  type FloorDesign,
} from '../core/designer';
import { el } from './dom';

type Tool = Cell | 'route';

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: '#', label: 'Wall', key: '1' },
  { id: '.', label: 'Floor', key: '2' },
  { id: 'S', label: 'Start', key: '3' },
  { id: '>', label: 'Stairs', key: '4' },
  { id: 'T', label: 'Chest', key: '5' },
  { id: '~', label: 'Spring', key: '6' },
  { id: 'B', label: 'Boss', key: '7' },
  { id: 'route', label: 'Prowler', key: '8' },
];

/** Party level suggested for testing a floor with the monsters of Rootdeep floor i. */
const SUGGESTED_LEVEL = [3, 5, 7, 10, 14, 18, 20, 23, 25, 28];
const ROUTE_COLORS = ['#ff7a4a', '#c58af0', '#6fd3ff', '#f2d14e'];

const DRAFT_KEY = 'ygdrassil-draft-v1';
const SAVED_KEY = 'ygdrassil-floors-v1';
const CANVAS = 660;

interface SavedFloor {
  name: string;
  code: string;
  at: number;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the drawing still works, it just is not kept.
  }
}

const MAKER_KEY = 'ygdrassil-maker';

/**
 * The drafting table is a tool for the game's makers, not a player feature. It shows up on the
 * title screen only on devices that once opened the game with `?maker` in the address
 * (and `?maker=off` hides it again).
 */
export function isMaker(): boolean {
  try {
    const flag = new URLSearchParams(location.search).get('maker');
    if (flag === 'off') localStorage.removeItem(MAKER_KEY);
    else if (flag !== null) localStorage.setItem(MAKER_KEY, '1');
    return localStorage.getItem(MAKER_KEY) === '1';
  } catch {
    return false;
  }
}

/** The last drawing, so leaving the table (or a test run) never loses work. */
export function loadDraft(): FloorDesign {
  const code = readJson<string | null>(DRAFT_KEY, null);
  return (code && decodeDesign(code)) || blankDesign();
}

export class Designer {
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly side: HTMLElement;
  private readonly toolButtons = new Map<Tool, HTMLButtonElement>();
  private readonly problemsEl: HTMLElement;
  private readonly settingsEl: HTMLElement;
  private readonly prowlerEl: HTMLElement;
  private readonly nameInput: HTMLInputElement;
  private readonly testButton: HTMLButtonElement;
  private tool: Tool = '#';
  private prowler = 0;
  private painting = false;
  private level: number;
  private modal: HTMLElement | null = null;

  constructor(
    private design: FloorDesign,
    private readonly actions: { onTest: (design: FloorDesign, level: number) => void; onClose: () => void },
  ) {
    this.level = SUGGESTED_LEVEL[design.monsters] ?? 10;
    this.canvas = el('canvas', { className: 'draft-canvas' });
    this.canvas.width = this.canvas.height = CANVAS;
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.addEventListener('pointerdown', (e) => {
      this.painting = true;
      this.canvas.setPointerCapture(e.pointerId);
      this.pointer(e, true);
    });
    this.canvas.addEventListener('pointermove', (e) => this.painting && this.pointer(e, false));
    this.canvas.addEventListener('pointerup', () => {
      this.painting = false;
      this.changed();
    });

    this.nameInput = el('input', { className: 'draft-name' });
    this.nameInput.maxLength = NAME_MAX;
    this.nameInput.value = design.name;
    this.nameInput.addEventListener('keydown', (e) => e.stopPropagation());
    this.nameInput.addEventListener('input', () => {
      this.design.name = this.nameInput.value;
      this.changed();
    });

    const tools = el('div', { className: 'draft-tools' });
    for (const t of TOOLS) {
      const b = el('button', { className: 'draft-tool' });
      b.innerHTML = `<span class="swatch"></span><span></span>`;
      b.children[1].textContent = t.label;
      (b.children[0] as HTMLElement).dataset.cell = t.id;
      b.addEventListener('click', () => this.selectTool(t.id));
      this.toolButtons.set(t.id, b);
      tools.appendChild(b);
    }

    this.prowlerEl = el('div', { className: 'draft-prowlers' });
    this.settingsEl = el('div', { className: 'draft-settings' });
    this.problemsEl = el('div', { className: 'draft-problems' });
    this.testButton = this.button('Test play', () => this.test(), 'primary');

    this.side = el('div', { className: 'draft-side' }, [
      this.nameInput,
      tools,
      this.prowlerEl,
      this.settingsEl,
      this.problemsEl,
      el('div', { className: 'draft-actions' }, [
        this.testButton,
        this.button('Save', () => this.save()),
        this.button('My floors', () => this.showSaved()),
        this.button('Share', () => this.showShare()),
        this.button('New', () => this.newFloor()),
        this.button('Back', () => this.actions.onClose()),
      ]),
    ]);
    this.el = el('div', { className: 'panel draft' }, [
      el('div', { className: 'draft-board' }, [el('h2', { text: 'The Drafting Table' }), this.canvas]),
      this.side,
    ]);
    this.selectTool('#');
    this.refresh();
  }

  handleKey(key: string): boolean {
    if (this.modal) {
      if (key === 'Escape') this.closeModal();
      return true;
    }
    if (key === 'Escape') {
      this.actions.onClose();
      return true;
    }
    const tool = TOOLS.find((t) => t.key === key);
    if (tool) {
      this.selectTool(tool.id);
      return true;
    }
    return false;
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  private get cellSize(): number {
    const w = this.design.rows[0].length;
    const h = this.design.rows.length;
    return Math.floor(CANVAS / Math.max(w, h));
  }

  private pointer(e: PointerEvent, first: boolean): void {
    const rect = this.canvas.getBoundingClientRect();
    const size = this.cellSize;
    const x = Math.floor((((e.clientX - rect.left) / rect.width) * CANVAS) / size);
    const y = Math.floor((((e.clientY - rect.top) / rect.height) * CANVAS) / size);
    if (y < 0 || y >= this.design.rows.length || x < 0 || x >= this.design.rows[0].length) return;
    if (this.tool === 'route') {
      if (first) this.routePoint(x, y);
      return;
    }
    // Only walls and floor are dragged; everything else is placed with a single tap.
    if (!first && this.tool !== '#' && this.tool !== '.') return;
    if (paint(this.design, x, y, this.tool)) {
      if (this.tool === 'B' && !this.design.boss) this.design.boss = BOSS_CHOICES[0];
      this.drawGrid();
      if (first && this.tool !== '#' && this.tool !== '.') this.changed();
    }
  }

  private routePoint(x: number, y: number): void {
    const c = cellAt(this.design, x, y);
    if (c === '#' || c === 'T') return;
    if (!this.design.prowlers.length) this.addProwler();
    const p = this.design.prowlers[this.prowler];
    const at = p.route.findIndex(([rx, ry]) => rx === x && ry === y);
    if (at >= 0) p.route.splice(at, 1);
    else if (p.route.length < MAX_ROUTE) p.route.push([x, y]);
    this.changed();
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const d = this.design;
    const size = this.cellSize;
    const theme = THEMES.find((t) => t.id === d.theme) ?? THEMES[0];
    const pal = theme.palette;
    ctx.fillStyle = '#0d0a07';
    ctx.fillRect(0, 0, CANVAS, CANVAS);
    const ox = Math.floor((CANVAS - size * d.rows[0].length) / 2);
    const oy = Math.floor((CANVAS - size * d.rows.length) / 2);
    const center = (x: number, y: number): [number, number] => [ox + x * size + size / 2, oy + y * size + size / 2];
    ctx.font = `bold ${Math.floor(size * 0.62)}px Cinzel, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    d.rows.forEach((row, y) =>
      [...row].forEach((c, x) => {
        const px = ox + x * size;
        const py = oy + y * size;
        ctx.fillStyle = c === '#' ? pal.wall : '#d8c9a4';
        ctx.fillRect(px, py, size, size);
        if (c === '#') {
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(px, py + size - 3, size, 3);
        }
        const glyph: Partial<Record<Cell, [string, string]>> = {
          S: ['▲', '#3f8f4a'],
          '>': ['▼', '#b8862a'],
          T: ['▣', '#8a5a2b'],
          '~': ['≈', '#2f8fb8'],
          B: ['✸', '#c23a2a'],
        };
        const g = glyph[c as Cell];
        if (g) {
          ctx.fillStyle = g[1];
          ctx.fillText(g[0], px + size / 2, py + size / 2 + 1);
        }
      }),
    );
    ctx.strokeStyle = 'rgba(40,28,16,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= d.rows[0].length; x++) {
      ctx.moveTo(ox + x * size + 0.5, oy);
      ctx.lineTo(ox + x * size + 0.5, oy + size * d.rows.length);
    }
    for (let y = 0; y <= d.rows.length; y++) {
      ctx.moveTo(ox, oy + y * size + 0.5);
      ctx.lineTo(ox + size * d.rows[0].length, oy + y * size + 0.5);
    }
    ctx.stroke();
    // Prowler routes: a loop through the points, numbered in walking order.
    d.prowlers.forEach((p, i) => {
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
      const active = this.tool === 'route' && i === this.prowler;
      ctx.strokeStyle = color;
      ctx.globalAlpha = active ? 1 : 0.6;
      ctx.lineWidth = active ? 4 : 2.5;
      ctx.setLineDash([size * 0.25, size * 0.18]);
      ctx.beginPath();
      p.route.forEach(([x, y], j) => (j ? ctx.lineTo(...center(x, y)) : ctx.moveTo(...center(x, y))));
      if (p.route.length > 2) ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      p.route.forEach(([x, y], j) => {
        const [cx, cy] = center(x, y);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a0f08';
        ctx.font = `bold ${Math.floor(size * 0.4)}px sans-serif`;
        ctx.fillText(j === 0 ? '★' : String(j + 1), cx, cy + 1);
      });
      ctx.globalAlpha = 1;
    });
  }

  // ── Side panel ───────────────────────────────────────────────────────────

  private button(label: string, onClick: () => void, extra = ''): HTMLButtonElement {
    const b = el('button', { className: `draft-btn ${extra}`, text: label });
    b.addEventListener('click', onClick);
    return b;
  }

  /** A setting that steps through its choices with ‹ and › (easy to use with a thumb). */
  private stepper(label: string, value: string, step: (dir: 1 | -1) => void): HTMLElement {
    const prev = this.button('‹', () => step(-1), 'step');
    const next = this.button('›', () => step(1), 'step');
    return el('div', { className: 'draft-row' }, [el('span', { className: 'draft-label', text: label }), prev, el('span', { className: 'draft-value', text: value }), next]);
  }

  private selectTool(tool: Tool): void {
    this.tool = tool;
    for (const [id, b] of this.toolButtons) b.classList.toggle('selected', id === tool);
    this.refresh();
  }

  private refresh(): void {
    const d = this.design;
    const cycle = <T,>(list: readonly T[], current: T, dir: number): T => list[(list.indexOf(current) + dir + list.length) % list.length];

    this.settingsEl.innerHTML = '';
    const w = d.rows[0].length;
    const h = d.rows.length;
    const theme = THEMES.find((t) => t.id === d.theme) ?? THEMES[0];
    const src = FLOORS[d.monsters];
    this.settingsEl.append(
      this.stepper('Width', String(w), (dir) => this.resize(w + dir, h)),
      this.stepper('Height', String(h), (dir) => this.resize(w, h + dir)),
      this.stepper('Look', theme.name, (dir) => {
        d.theme = cycle(THEMES, theme, dir).id;
        this.changed();
      }),
      this.stepper('Monsters', src ? `${src.name} (Ch. ${chapterOf(d.monsters).numeral})` : '?', (dir) => {
        d.monsters = (d.monsters + dir + FLOORS.length) % FLOORS.length;
        this.level = SUGGESTED_LEVEL[d.monsters] ?? this.level;
        this.changed();
      }),
      this.stepper('Boss', d.boss ? ENEMIES[d.boss].name : 'None', (dir) => {
        d.boss = cycle<string | null>([null, ...BOSS_CHOICES], d.boss, dir);
        this.changed();
      }),
      this.stepper('Test level', String(this.level), (dir) => {
        this.level = Math.max(1, Math.min(40, this.level + dir));
        this.refresh();
      }),
    );

    this.prowlerEl.innerHTML = '';
    this.prowlerEl.classList.toggle('hidden', this.tool !== 'route');
    if (this.tool === 'route') {
      if (!d.prowlers.length) {
        this.prowlerEl.append(el('p', { className: 'draft-hint', text: 'Tap open cells to lay out a patrol route.' }));
      } else {
        this.prowler = Math.min(this.prowler, d.prowlers.length - 1);
        const p = d.prowlers[this.prowler];
        this.prowlerEl.append(
          this.stepper(`Prowler ${this.prowler + 1}/${d.prowlers.length}`, ENEMIES[p.enemy].name, (dir) => {
            p.enemy = cycle(PROWLER_CHOICES, p.enemy, dir);
            this.changed();
          }),
          this.stepper('Hunts', p.hunt ? `within ${p.hunt} steps` : 'never', (dir) => {
            p.hunt = Math.max(0, Math.min(4, p.hunt + dir));
            this.changed();
          }),
          el('p', { className: 'draft-hint', text: 'Tap cells to add route points, tap a point again to remove it.' }),
        );
      }
      const row = el('div', { className: 'draft-row' });
      if (d.prowlers.length > 1) row.append(this.button('Next', () => ((this.prowler = (this.prowler + 1) % d.prowlers.length), this.refresh())));
      if (d.prowlers.length < MAX_PROWLERS) row.append(this.button('Add prowler', () => (this.addProwler(), this.changed())));
      if (d.prowlers.length) row.append(this.button('Remove', () => (d.prowlers.splice(this.prowler, 1), (this.prowler = 0), this.changed())));
      this.prowlerEl.append(row);
    }

    const list = problems(d);
    this.problemsEl.innerHTML = '';
    this.problemsEl.classList.toggle('ready', list.length === 0);
    if (list.length === 0) this.problemsEl.append(el('div', { text: 'Ready to play!' }));
    else for (const p of list.slice(0, 4)) this.problemsEl.append(el('div', { text: p }));
    if (list.length > 4) this.problemsEl.append(el('div', { text: `…and ${list.length - 4} more.` }));
    this.testButton.disabled = list.length > 0;
    this.drawGrid();
  }

  private addProwler(): void {
    if (this.design.prowlers.length >= MAX_PROWLERS) return;
    this.design.prowlers.push({ enemy: PROWLER_CHOICES[this.design.prowlers.length % PROWLER_CHOICES.length], route: [], hunt: 0 });
    this.prowler = this.design.prowlers.length - 1;
  }

  private resize(w: number, h: number): void {
    if (w < MIN_SIZE || h < MIN_SIZE || w > MAX_SIZE || h > MAX_SIZE) return;
    resize(this.design, w, h);
    this.changed();
  }

  /** After every edit: keep the draft and update the panel. */
  private changed(): void {
    writeJson(DRAFT_KEY, encodeDesign(this.design));
    this.refresh();
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  private test(): void {
    if (problems(this.design).length) return;
    this.actions.onTest(this.design, this.level);
  }

  private save(): void {
    const saved = readJson<SavedFloor[]>(SAVED_KEY, []);
    const name = this.design.name.trim() || 'My Floor';
    const entry = { name, code: encodeDesign(this.design), at: Date.now() };
    const i = saved.findIndex((s) => s.name === name);
    if (i >= 0) saved[i] = entry;
    else saved.unshift(entry);
    writeJson(SAVED_KEY, saved);
    this.flash(`Saved "${name}".`);
  }

  private newFloor(): void {
    this.design = blankDesign();
    this.nameInput.value = this.design.name;
    this.prowler = 0;
    this.changed();
  }

  private load(design: FloorDesign): void {
    this.design = design;
    this.nameInput.value = design.name;
    this.prowler = 0;
    this.level = SUGGESTED_LEVEL[design.monsters] ?? this.level;
    this.closeModal();
    this.changed();
  }

  private showSaved(): void {
    const saved = readJson<SavedFloor[]>(SAVED_KEY, []);
    const list = el('div', { className: 'draft-list' });
    if (!saved.length) list.append(el('p', { text: 'No saved floors yet. Use Save to keep the one you are drawing.' }));
    saved.forEach((s, i) => {
      const open = this.button(s.name, () => {
        const d = decodeDesign(s.code);
        if (d) this.load(d);
      });
      const remove = this.button('✕', () => {
        saved.splice(i, 1);
        writeJson(SAVED_KEY, saved);
        this.showSaved();
      }, 'step');
      list.append(el('div', { className: 'draft-row' }, [open, remove]));
    });
    this.openModal('My floors', [list]);
  }

  private showShare(): void {
    const code = encodeDesign(this.design);
    const box = el('textarea', { className: 'draft-code' });
    box.value = code;
    box.readOnly = true;
    const copy = this.button('Copy code', () => {
      box.select();
      void navigator.clipboard?.writeText(code).then(
        () => this.flash('Code copied.'),
        () => this.flash('Select the code and copy it by hand.'),
      );
    }, 'primary');
    const input = el('textarea', { className: 'draft-code' });
    input.placeholder = 'Paste a floor code here…';
    input.addEventListener('keydown', (e) => e.stopPropagation());
    const load = this.button('Load code', () => {
      const d = decodeDesign(input.value);
      if (d) this.load(d);
      else this.flash('That is not a floor code.');
    });
    this.openModal('Share this floor', [
      el('p', { text: 'Send this code to a friend, or to the makers of the game to have your floor added.' }),
      box,
      copy,
      el('p', { text: 'Got a code from someone else?' }),
      input,
      load,
    ]);
  }

  private openModal(title: string, body: HTMLElement[]): void {
    this.closeModal();
    const close = this.button('Close', () => this.closeModal());
    this.modal = el('div', { className: 'panel dialog draft-modal' }, [el('h2', { text: title }), ...body, close]);
    this.el.append(this.modal);
  }

  private closeModal(): void {
    this.modal?.remove();
    this.modal = null;
  }

  private flash(text: string): void {
    const note = el('div', { className: 'draft-flash', text });
    this.el.append(note);
    window.setTimeout(() => note.remove(), 1800);
  }
}
