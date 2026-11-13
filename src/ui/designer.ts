/**
 * The drafting table: a screen to draw your own floors, check them, test-play them
 * and share them as a code.
 */
import { MAX_LEVEL } from '../core/party';
import { ENEMIES } from '../core/data/enemies';
import { chapterOf } from '../core/data/chapters';
import { DESIGN_FLOORS as FLOORS } from '../core/data/marrowdeep';
import {
  BOSS_CHOICES,
  MAX_PROWLERS,
  MAX_ROUTE,
  MAX_SIZE,
  MIN_SIZE,
  NAME_MAX,
  PROWLER_CHOICES,
  THEMES,
  CHAPTER_FLOORS,
  GATE_CELLS,
  LINK_CELLS,
  blankChapter,
  marrowdeepTemplate,
  rootdeepChapter,
  blankChapterFloor,
  cellAt,
  chapterProblems,
  decodeChapter,
  encodeChapter,
  isGate,
  isLink,
  paint,
  placeLink,
  removeLink,
  resizeChapter,
  type Cell,
  type ChapterDesign,
  type FloorDesign,
  type GateCell,
  type LinkCell,
} from '../core/designer';
import { el } from './dom';
import { shade } from '../render/color';

/** `link` places numbered stairs, `gate` a root gate; the number and side are chosen in the panel. */
type Tool = Cell | 'route' | 'link' | 'gate';

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: '#', label: 'Wall', key: '1' },
  { id: '.', label: 'Floor', key: '2' },
  { id: 'S', label: 'Entrance', key: '3' },
  { id: 'link', label: 'Stairs 1–9', key: '4' },
  { id: '>', label: 'Next chapter', key: 'q' },
  { id: 'gate', label: 'Root gate', key: 'g' },
  { id: 'T', label: 'Chest', key: '5' },
  { id: '~', label: 'Spring', key: '6' },
  { id: 'B', label: 'Boss', key: '7' },
  { id: 'route', label: 'Prowler', key: '8' },
  { id: 'P', label: 'Forage', key: '9' },
  { id: 'O', label: 'Mine', key: '0' },
  { id: 'W', label: 'Fell', key: '-' },
  { id: 'F', label: 'Fish', key: '=' },
];

/** Party level suggested for testing a floor with the monsters of Rootdeep floor i. */
const SUGGESTED_LEVEL = [3, 5, 7, 10, 14, 18, 20, 23, 25, 28, 37, 39, 41, 43, 45];
const ROUTE_COLORS = ['#ff7a4a', '#c58af0', '#6fd3ff', '#f2d14e'];

const DRAFT_KEY = 'ygdrassil-draft-v2';
const OLD_DRAFT_KEY = 'ygdrassil-draft-v1';
const SAVED_KEY = 'ygdrassil-chapters-v1';
const OLD_SAVED_KEY = 'ygdrassil-floors-v1';
const GATE_NAMES: Record<GateCell, string> = { n: 'north', e: 'east', s: 'south', w: 'west' };
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

/** The last drawing, so leaving the table (or a test run) never loses work. Older single-floor drafts still open. */
export function loadDraft(): ChapterDesign {
  const code = readJson<string | null>(DRAFT_KEY, null) ?? readJson<string | null>(OLD_DRAFT_KEY, null);
  return (code && decodeChapter(code)) || blankChapter();
}

/** Saved chapters, plus floors saved before chapters existed. */
function savedList(): SavedFloor[] {
  return [...readJson<SavedFloor[]>(SAVED_KEY, []), ...readJson<SavedFloor[]>(OLD_SAVED_KEY, [])];
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
  private readonly floorTabs: HTMLElement;
  private floor = 0;
  private linkNo: LinkCell = '1';
  /** The floor new numbered stairs lead to (null: the next floor, or the one before on the last). */
  private linkTo: number | null = null;
  private gateSide: GateCell = 'n';
  private tool: Tool = '#';
  private prowler = 0;
  private painting = false;
  private level: number;
  private modal: HTMLElement | null = null;

  /** The floor being drawn. */
  private get design(): FloorDesign {
    return this.chapter.floors[this.floor];
  }

  constructor(
    private chapter: ChapterDesign,
    private readonly actions: { onTest: (chapter: ChapterDesign, level: number) => void; onClose: () => void },
  ) {
    const design = chapter.floors[0];
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
    this.nameInput.value = chapter.name;
    this.nameInput.placeholder = 'Chapter name';
    this.nameInput.addEventListener('keydown', (e) => e.stopPropagation());
    this.nameInput.addEventListener('input', () => {
      this.chapter.name = this.nameInput.value;
      this.changed();
    });
    this.floorTabs = el('div', { className: 'draft-floors' });

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
      this.floorTabs,
      tools,
      this.prowlerEl,
      this.settingsEl,
      this.problemsEl,
      el('div', { className: 'draft-actions' }, [
        this.testButton,
        this.button('Save', () => this.save()),
        this.button('My chapters', () => this.showSaved()),
        this.button('Examples', () => this.showExamples()),
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
    if (this.tool === 'link') {
      if (!first) return;
      // Tapping numbered stairs removes both ends; anywhere else places them here and on the same square below/above.
      const here = cellAt(this.design, x, y);
      if (isLink(here)) removeLink(this.chapter, here);
      else if (!placeLink(this.chapter, this.linkNo, this.floor, this.linkTarget(), x, y)) return;
      this.changed();
      return;
    }
    const cell: Cell = this.tool === 'gate' ? this.gateSide : this.tool;
    // Tapping a gate again clears it.
    if (first && this.tool === 'gate' && cellAt(this.design, x, y) === cell) {
      paint(this.design, x, y, '.');
      this.changed();
      return;
    }
    if (paint(this.design, x, y, cell)) {
      if (this.tool === 'B' && !this.design.boss) this.design.boss = BOSS_CHOICES[0];
      this.drawGrid();
      if (first && this.tool !== '#' && this.tool !== '.') this.changed();
    }
  }

  private routePoint(x: number, y: number): void {
    const c = cellAt(this.design, x, y);
    if (c !== '.') return; // prowlers only walk plain floor
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
    ctx.font = `bold ${Math.floor(size * 0.62)}px "Pixelify Sans", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    d.rows.forEach((row, y) =>
      [...row].forEach((c, x) => {
        const px = ox + x * size;
        const py = oy + y * size;
        ctx.fillStyle = c === '#' ? wallInk(pal.wall) : '#d8c9a4';
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
          P: ['✿', '#4a9a2a'],
          O: ['◆', '#9a7a3a'],
          W: ['♠', '#8a5a2a'],
          F: ['≈', '#2a7ab0'],
        };
        const g = glyph[c as Cell];
        if (g) {
          ctx.fillStyle = g[1];
          ctx.fillText(g[0], px + size / 2, py + size / 2 + 1);
        }
        if (isLink(c)) {
          // Numbered stairs: the number, with ▼ or ▲ for where its other end lies.
          const other = this.chapter.floors.findIndex((f, i) => i !== this.floor && f.rows.some((r) => r.includes(c)));
          ctx.fillStyle = other < 0 ? '#c23a2a' : other > this.floor ? '#b8862a' : '#3f8f4a';
          ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
          ctx.fillStyle = '#fff6dc';
          ctx.fillText(`${c}${other < 0 ? '?' : other > this.floor ? '▼' : '▲'}`, px + size / 2, py + size / 2 + 1);
        }
        if (isGate(c)) {
          // A root gate: bars, and a gold wedge on the side it opens from.
          ctx.fillStyle = '#5a3e22';
          for (let i = 1; i <= 3; i++) ctx.fillRect(px + (i * size) / 4 - 2, py + 2, 4, size - 4);
          ctx.fillRect(px + 2, py + size / 2 - 2, size - 4, 4);
          ctx.fillStyle = '#f0c040';
          const side = GATE_CELLS.indexOf(c);
          const tri: [number, number][][] = [
            [[px + size / 2, py + 1], [px + size * 0.3, py + size * 0.25], [px + size * 0.7, py + size * 0.25]],
            [[px + size - 1, py + size / 2], [px + size * 0.75, py + size * 0.3], [px + size * 0.75, py + size * 0.7]],
            [[px + size / 2, py + size - 1], [px + size * 0.3, py + size * 0.75], [px + size * 0.7, py + size * 0.75]],
            [[px + 1, py + size / 2], [px + size * 0.25, py + size * 0.3], [px + size * 0.25, py + size * 0.7]],
          ];
          ctx.beginPath();
          tri[side].forEach(([tx, ty], j) => (j ? ctx.lineTo(tx, ty) : ctx.moveTo(tx, ty)));
          ctx.fill();
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
    const c = this.chapter;
    // Floor tabs: one per floor, plus adding and removing floors.
    this.floorTabs.innerHTML = '';
    c.floors.forEach((_, i) => {
      const tab = this.button(`Floor ${i + 1}`, () => {
        this.floor = i;
        this.linkTo = null;
        this.prowler = 0;
        this.refresh();
      }, i === this.floor ? 'tab on' : 'tab');
      this.floorTabs.append(tab);
    });
    if (c.floors.length < CHAPTER_FLOORS) {
      this.floorTabs.append(this.button('+ Floor', () => {
        c.floors.push(blankChapterFloor(this.design));
        this.floor = c.floors.length - 1;
        this.changed();
      }, 'tab'));
    }
    if (c.floors.length > 1) {
      this.floorTabs.append(this.button('− This floor', () => {
        c.floors.splice(this.floor, 1);
        this.floor = Math.max(0, this.floor - 1);
        this.changed();
      }, 'tab'));
    }
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
        this.level = Math.max(1, Math.min(MAX_LEVEL, this.level + dir));
        this.refresh();
      }),
    );

    if (this.tool === 'link') {
      if (c.floors.length < 2) {
        this.settingsEl.prepend(el('p', { className: 'draft-hint', text: 'Add a second floor (+ Floor) to join floors with stairs.' }));
      } else {
        const others = c.floors.map((_, i) => i).filter((i) => i !== this.floor);
        const to = this.linkTarget();
        this.settingsEl.prepend(
          this.stepper('Stairs no.', this.linkNo, (dir) => {
            this.linkNo = cycle(LINK_CELLS, this.linkNo, dir);
            this.refresh();
          }),
          this.stepper('Leads to', `Floor ${to + 1} ${to > this.floor ? '▼' : '▲'}`, (dir) => {
            this.linkTo = cycle(others, to, dir);
            this.refresh();
          }),
          el('p', { className: 'draft-hint', text: 'Tap a square: the stairs appear here and on the same square of the other floor. Tap stairs again to remove both ends.' }),
        );
      }
    }
    if (this.tool === 'gate') {
      this.settingsEl.prepend(
        this.stepper('Opens from', GATE_NAMES[this.gateSide], (dir) => {
          this.gateSide = cycle(GATE_CELLS, this.gateSide, dir);
          this.refresh();
        }),
        el('p', { className: 'draft-hint', text: 'A root gate opens only for a party standing on the gold side, and then stays open: a shortcut.' }),
      );
    }

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

    const list = chapterProblems(c);
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
    // All floors of a chapter share one size, so stairs line up.
    resizeChapter(this.chapter, w, h);
    this.changed();
  }

  /** The floor that new stairs from this floor lead to. */
  private linkTarget(): number {
    const n = this.chapter.floors.length;
    if (this.linkTo !== null && this.linkTo !== this.floor && this.linkTo < n) return this.linkTo;
    return this.floor + 1 < n ? this.floor + 1 : Math.max(0, this.floor - 1);
  }

  /** After every edit: keep the draft and update the panel. */
  private changed(): void {
    writeJson(DRAFT_KEY, encodeChapter(this.chapter));
    this.refresh();
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  private test(): void {
    if (chapterProblems(this.chapter).length) return;
    this.actions.onTest(this.chapter, this.level);
  }

  private save(): void {
    const saved = readJson<SavedFloor[]>(SAVED_KEY, []);
    const name = this.chapter.name.trim() || 'My Chapter';
    const entry = { name, code: encodeChapter(this.chapter), at: Date.now() };
    const i = saved.findIndex((s) => s.name === name);
    if (i >= 0) saved[i] = entry;
    else saved.unshift(entry);
    writeJson(SAVED_KEY, saved);
    this.flash(`Saved "${name}".`);
  }

  private newFloor(): void {
    this.chapter = blankChapter();
    this.floor = 0;
    this.nameInput.value = this.chapter.name;
    this.prowler = 0;
    this.changed();
  }

  private load(chapter: ChapterDesign): void {
    this.chapter = chapter;
    this.floor = 0;
    this.nameInput.value = chapter.name;
    this.prowler = 0;
    this.level = SUGGESTED_LEVEL[chapter.floors[0].monsters] ?? this.level;
    this.closeModal();
    this.changed();
  }

  private showSaved(): void {
    const saved = savedList();
    const list = el('div', { className: 'draft-list' });
    if (!saved.length) list.append(el('p', { text: 'No saved chapters yet. Use Save to keep the one you are drawing.' }));
    saved.forEach((s) => {
      const open = this.button(s.name, () => {
        const d = decodeChapter(s.code);
        if (d) this.load(d);
      });
      const remove = this.button('✕', () => {
        for (const key of [SAVED_KEY, OLD_SAVED_KEY]) writeJson(key, readJson<SavedFloor[]>(key, []).filter((x) => x.code !== s.code));
        this.showSaved();
      }, 'step');
      list.append(el('div', { className: 'draft-row' }, [open, remove]));
    });
    this.openModal('My chapters', [list]);
  }

  /** The Rootdeep's own chapters to look at, and the starting point for chapter III. */
  private showExamples(): void {
    const pick = (make: () => ChapterDesign) => () => {
      if (!confirm('This replaces what you are drawing now. Save it first (Save) if you want to keep it. Continue?')) return;
      this.load(make());
    };
    const list = el('div', { className: 'draft-list' }, [
      el('p', { text: 'Look at how the chapters in the game are built, or start chapter III with everything already set up.' }),
      el('div', { className: 'draft-row' }, [this.button('Chapter I: The Greenwood Roots (floors 1–5)', pick(() => rootdeepChapter(0, 'The Greenwood Roots')))]),
      el('div', { className: 'draft-row' }, [this.button('Chapter II: The Drowned Roots (floors 6–10)', pick(() => rootdeepChapter(5, 'The Drowned Roots')))]),
      el('div', { className: 'draft-row' }, [this.button('Start chapter III: The Marrowdeep', pick(() => marrowdeepTemplate()), 'primary')]),
      el('p', {
        text: 'Chapters I and II were made before numbered stairs existed: every floor has its own entrance and stairs down. From chapter III on, only the first floor has an entrance, and floors are joined by numbered stairs (also back up) and root gates.',
      }),
    ]);
    this.openModal('Examples', [list]);
  }

  private showShare(): void {
    const code = encodeChapter(this.chapter);
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
    input.placeholder = 'Paste a chapter or floor code here…';
    input.addEventListener('keydown', (e) => e.stopPropagation());
    const load = this.button('Load code', () => {
      const d = decodeChapter(input.value);
      if (d) this.load(d);
      else this.flash('That is not a chapter or floor code.');
    });
    this.openModal('Share this chapter', [
      el('p', { text: 'Send this code to the makers of the game to have your chapter added, or keep it as a backup.' }),
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

/** Walls drawn dark enough to stand out from the pale floor cells, even for pale stone like the Marrowdeep's. */
function wallInk(color: string): string {
  const n = parseInt(color.slice(1), 16);
  const lum = (0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
  return lum > 0.45 ? shade(color, -0.55) : color;
}
