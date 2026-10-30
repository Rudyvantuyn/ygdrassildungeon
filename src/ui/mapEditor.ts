import { CHART_MODES, MARKS, NOTE_MAX_LENGTH, eraseCell, setMark, setNote, setTerrain, type ChartMode, type MarkId } from '../core/chart';
import type { Game } from '../core/game';
import { MARK_ICONS, drawMinimap, mapLayout } from '../render/minimap';
import { iconPath } from '../render/icons';
import { el } from './dom';

type Tool = 'floor' | 'wall' | 'erase' | MarkId;

const TOOLS: { id: Tool; label: string; glyph: string; color: string }[] = [
  { id: 'floor', label: 'Floor', glyph: '■', color: '#d8c9a4' },
  { id: 'wall', label: 'Wall', glyph: '■', color: '#8a6a44' },
  { id: 'erase', label: 'Erase', glyph: '⌫', color: '#e8e2d0' },
  ...(Object.keys(MARKS) as MarkId[]).map((id) => ({ id, label: MARKS[id].label, glyph: MARKS[id].glyph, color: MARKS[id].color })),
];

const MODE_LABELS: Record<ChartMode, string> = {
  assisted: 'Assisted — your steps are filled in, you draw the rest',
  manual: 'Manual — you draw everything yourself',
  auto: 'Auto — the map draws itself',
};

const SIZE = 480;

/** Full-size map where the player draws walls, floor, marks and notes. */
export class MapEditor {
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly toolButtons = new Map<Tool, HTMLButtonElement>();
  private readonly modeButton: HTMLButtonElement;
  private readonly noteInput: HTMLInputElement;
  private readonly cellInfo: HTMLElement;
  private cursor: { x: number; y: number };
  private tool: Tool = 'wall';
  private painting = false;

  constructor(
    private readonly game: Game,
    private readonly onClose: () => void,
  ) {
    this.cursor = { x: game.state.x, y: game.state.y };

    this.canvas = el('canvas', { className: 'map-canvas' });
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.addEventListener('pointerdown', (e) => {
      this.painting = true;
      this.canvas.setPointerCapture(e.pointerId);
      this.pointerApply(e, true);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (this.painting) this.pointerApply(e, false);
    });
    this.canvas.addEventListener('pointerup', () => (this.painting = false));

    const tools = el('div', { className: 'map-tools' });
    TOOLS.forEach((t, i) => {
      const b = el('button', { className: 'map-tool' });
      b.innerHTML = `<span class="glyph"></span><span class="name"></span><span class="key">${(i + 1) % 10}</span>`;
      const glyph = b.querySelector('.glyph') as HTMLElement;
      if (t.id in MARK_ICONS) {
        // Marks show the same painted icon as on the map.
        const img = el('img', { className: 'map-tool-icon' });
        img.src = `art/${iconPath(MARK_ICONS[t.id as MarkId])}`;
        img.alt = '';
        glyph.append(img);
      } else {
        glyph.textContent = t.glyph;
        glyph.style.color = t.color;
      }
      b.querySelector('.name')!.textContent = t.label;
      b.addEventListener('click', () => this.selectTool(t.id));
      this.toolButtons.set(t.id, b);
      tools.appendChild(b);
    });

    this.modeButton = el('button', { className: 'map-mode' });
    this.modeButton.addEventListener('click', () => this.cycleMode());

    this.cellInfo = el('div', { className: 'map-cell-info' });
    this.noteInput = el('input', { className: 'map-note' });
    this.noteInput.maxLength = NOTE_MAX_LENGTH;
    this.noteInput.placeholder = 'Note for this cell…';
    this.noteInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        setNote(this.game.chart, this.index(), this.noteInput.value);
        this.noteInput.blur();
        this.refresh();
      } else if (e.key === 'Escape') {
        this.noteInput.blur();
        this.refresh();
      }
    });

    const close = el('button', { className: 'map-close', text: 'Close (Esc)' });
    close.addEventListener('click', () => this.onClose());

    const side = el('div', { className: 'map-side' }, [
      el('div', { className: 'map-label', text: 'Tools' }),
      tools,
      el('div', { className: 'map-label', text: 'Map mode' }),
      this.modeButton,
      this.cellInfo,
      this.noteInput,
      el('div', {
        className: 'cmd-hint',
        text: 'Click or drag to draw · Click a mark again to remove it · Arrows move the cursor · Space draws · 1–9 and 0 pick a tool · N writes a note',
      }),
      close,
    ]);
    this.el = el('div', { className: 'panel dialog map-editor' }, [
      el('h2', { text: game.floorDef.name }),
      el('div', { className: 'map-body' }, [this.canvas, side]),
    ]);
    this.selectTool('wall');
    this.refresh();
  }

  draw(time: number): void {
    drawMinimap(this.ctx, SIZE, this.game, time, this.cursor);
  }

  handleKey(key: string): boolean {
    const k = key.length === 1 ? key.toLowerCase() : key;
    const move = (dx: number, dy: number) => {
      const { width, height } = this.game.map;
      this.cursor = { x: Math.min(width - 1, Math.max(0, this.cursor.x + dx)), y: Math.min(height - 1, Math.max(0, this.cursor.y + dy)) };
      this.refresh();
      return true;
    };
    switch (k) {
      case 'ArrowUp':
      case 'w':
        return move(0, -1);
      case 'ArrowDown':
      case 's':
        return move(0, 1);
      case 'ArrowLeft':
      case 'a':
        return move(-1, 0);
      case 'ArrowRight':
      case 'd':
        return move(1, 0);
      case ' ':
      case 'Enter':
        this.apply(true);
        return true;
      case 'n':
        this.editNote();
        return true;
      case 'Escape':
      case 'm':
        this.onClose();
        return true;
    }
    // Keys 1–9 and 0 (the tenth tool).
    const n = k === '0' ? 10 : Number(k);
    if (Number.isInteger(n) && n >= 1 && n <= TOOLS.length) {
      this.selectTool(TOOLS[n - 1].id);
      return true;
    }
    return false;
  }

  private index(): number {
    return this.cursor.y * this.game.map.width + this.cursor.x;
  }

  private selectTool(tool: Tool): void {
    this.tool = tool;
    for (const [id, b] of this.toolButtons) b.classList.toggle('selected', id === tool);
  }

  private cycleMode(): void {
    const i = CHART_MODES.indexOf(this.game.state.chartMode);
    this.game.state.chartMode = CHART_MODES[(i + 1) % CHART_MODES.length];
    this.refresh();
  }

  /** `fresh` is true for a click or key press, false while dragging. */
  private apply(fresh: boolean): void {
    const chart = this.game.chart;
    const i = this.index();
    switch (this.tool) {
      case 'floor':
      case 'wall':
        setTerrain(chart, i, this.tool);
        break;
      case 'erase':
        eraseCell(chart, i);
        break;
      case 'note':
        if (fresh) this.editNote();
        break;
      default:
        // Marks toggle on a click; dragging only places them.
        if (fresh && chart.marks[i] === this.tool) setMark(chart, i, null);
        else setMark(chart, i, this.tool);
    }
    this.refresh();
  }

  private pointerApply(e: PointerEvent, fresh: boolean): void {
    const rect = this.canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) * SIZE) / rect.width;
    const py = ((e.clientY - rect.top) * SIZE) / rect.height;
    const { cell, ox, oy } = mapLayout(SIZE, this.game.map);
    const x = Math.floor((px - ox) / cell);
    const y = Math.floor((py - oy) / cell);
    if (x < 0 || y < 0 || x >= this.game.map.width || y >= this.game.map.height) return;
    if (!fresh && x === this.cursor.x && y === this.cursor.y) return;
    this.cursor = { x, y };
    // Notes and mark toggles only on the first touch, not while dragging.
    if (fresh || this.tool === 'floor' || this.tool === 'wall' || this.tool === 'erase') this.apply(fresh);
    else this.refresh();
  }

  private editNote(): void {
    this.noteInput.value = this.game.chart.notes[this.index()] ?? '';
    this.noteInput.focus();
  }

  private refresh(): void {
    this.modeButton.textContent = MODE_LABELS[this.game.state.chartMode];
    const note = this.game.chart.notes[this.index()];
    this.cellInfo.textContent = note ? `“${note}”` : 'No note on this cell.';
    if (document.activeElement !== this.noteInput) this.noteInput.value = note ?? '';
  }
}
