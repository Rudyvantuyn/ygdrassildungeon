/**
 * Drawing on the small map beside the view while exploring: pick Wall, Floor or Erase and draw with the mouse or a
 * finger while the keys keep walking. The full map (M) still has marks and notes.
 */
import { eraseCell, setTerrain } from '../core/chart';
import type { Game } from '../core/game';
import { mapLayout } from '../render/minimap';
import { el } from './dom';

type Pen = 'wall' | 'floor' | 'erase';
const PENS: { id: Pen; label: string; title: string }[] = [
  { id: 'wall', label: 'Wall', title: 'Draw walls on the map while you walk' },
  { id: 'floor', label: 'Floor', title: 'Draw floor on the map while you walk' },
  { id: 'erase', label: 'Erase', title: 'Erase squares on the map' },
];

export class SideMapPen {
  readonly el: HTMLElement;
  private pen: Pen = 'wall';
  private painting = false;
  private last = -1;
  private readonly buttons = new Map<Pen, HTMLButtonElement>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly size: number,
    private readonly host: { game: Game | null; canDraw(): boolean; changed(): void },
  ) {
    this.el = el('div', { id: 'map-pen' });
    for (const p of PENS) {
      const b = el('button', { text: p.label });
      b.title = p.title;
      b.addEventListener('click', () => this.select(p.id));
      this.buttons.set(p.id, b);
      this.el.append(b);
    }
    this.select('wall');
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.host.canDraw()) return;
      this.painting = true;
      this.last = -1;
      canvas.setPointerCapture(e.pointerId);
      this.apply(e);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (this.painting) this.apply(e);
    });
    const stop = () => {
      if (this.painting) this.host.changed();
      this.painting = false;
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
  }

  /** Shown only where drawing makes sense (exploring, not on an automatic map). */
  update(): void {
    this.el.classList.toggle('hidden', !this.host.canDraw());
    this.canvas.classList.toggle('drawable', this.host.canDraw());
  }

  private select(pen: Pen): void {
    this.pen = pen;
    for (const [id, b] of this.buttons) b.classList.toggle('on', id === pen);
  }

  private apply(e: PointerEvent): void {
    const game = this.host.game;
    if (!game) return;
    const rect = this.canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) * this.size) / rect.width;
    const py = ((e.clientY - rect.top) * this.size) / rect.height;
    const { cell, ox, oy } = mapLayout(this.size, game.map);
    const x = Math.floor((px - ox) / cell);
    const y = Math.floor((py - oy) / cell);
    if (x < 0 || y < 0 || x >= game.map.width || y >= game.map.height) return;
    const i = y * game.map.width + x;
    if (i === this.last) return;
    this.last = i;
    if (this.pen === 'erase') eraseCell(game.chart, i);
    else setTerrain(game.chart, i, this.pen);
  }
}
