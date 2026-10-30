import { MARKS, terrainAt } from '../core/chart';
import { tileAt, type FloorMap } from '../core/dungeon';
import type { Game } from '../core/game';

export interface MapLayout {
  cell: number;
  ox: number;
  oy: number;
}

/** Cell size and offset that fit the floor into a square of `size` pixels. */
export function mapLayout(size: number, map: FloorMap): MapLayout {
  const cell = Math.floor(size / Math.max(map.width, map.height));
  return { cell, ox: Math.floor((size - cell * map.width) / 2), oy: Math.floor((size - cell * map.height) / 2) };
}

const FLOOR = '#d8c9a4';
const WALL = '#5a4630';

/**
 * Draws the floor map: the player's own chart (manual/assisted), or the
 * automatic map (auto). Player marks and notes are always shown.
 * `cursor` highlights a cell for the map editor.
 */
export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  size: number,
  game: Game,
  time: number,
  cursor?: { x: number; y: number },
): void {
  const { map, chart } = game;
  const { cell, ox, oy } = mapLayout(size, map);
  const auto = game.state.chartMode === 'auto';

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#16110c';
  ctx.fillRect(0, 0, size, size);

  // Grid paper
  ctx.strokeStyle = 'rgba(212,169,87,0.09)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= map.width; i++) {
    ctx.moveTo(ox + i * cell + 0.5, oy);
    ctx.lineTo(ox + i * cell + 0.5, oy + map.height * cell);
  }
  for (let i = 0; i <= map.height; i++) {
    ctx.moveTo(ox, oy + i * cell + 0.5);
    ctx.lineTo(ox + map.width * cell, oy + i * cell + 0.5);
  }
  ctx.stroke();

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const px = ox + x * cell;
      const py = oy + y * cell;
      const mid = cell / 2;
      const index = y * map.width + x;

      if (auto) {
        if (game.isExplored(x, y)) {
          const tile = tileAt(map, x, y);
          if (tile === 'wall') {
            ctx.fillStyle = WALL;
            ctx.fillRect(px, py, cell, cell);
          } else {
            ctx.fillStyle = FLOOR;
            ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
            if (tile === 'stairs') glyph(ctx, px + mid, py + mid, cell, MARKS.down.color, MARKS.down.glyph);
            if (tile === 'up') glyph(ctx, px + mid, py + mid, cell, MARKS.up.color, MARKS.up.glyph);
            if (tile === 'chest') glyph(ctx, px + mid, py + mid, cell, game.isChestOpened(x, y) ? '#9a9a9a' : MARKS.chest.color, MARKS.chest.glyph);
            if (tile === 'spring') glyph(ctx, px + mid, py + mid, cell, game.progress.springUsed ? '#7a9aa8' : MARKS.spring.color, MARKS.spring.glyph);
            if (tile === 'boss' && !game.progress.bossDefeated) glyph(ctx, px + mid, py + mid, cell, '#d0302a', '✸');
          }
        }
      } else {
        const terrain = terrainAt(chart, index);
        if (terrain === 'wall') {
          ctx.fillStyle = WALL;
          ctx.fillRect(px, py, cell, cell);
        } else if (terrain === 'floor') {
          ctx.fillStyle = FLOOR;
          ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
        }
      }

      const mark = chart.marks[index];
      if (mark) glyph(ctx, px + mid, py + mid, cell, MARKS[mark].color, MARKS[mark].glyph);
    }
  }

  // Prowlers the party has seen
  game.progress.prowlers.forEach((p) => {
    if (p.defeated || !game.isExplored(p.x, p.y)) return;
    glyph(ctx, ox + p.x * cell + cell / 2, oy + p.y * cell + cell / 2, cell, p.chasing ? '#e8402a' : '#e08a1a', '◆');
  });

  // Party arrow
  const { x, y, dir } = game.state;
  ctx.save();
  ctx.translate(ox + x * cell + cell / 2, oy + y * cell + cell / 2);
  ctx.rotate((dir * Math.PI) / 2);
  ctx.beginPath();
  ctx.moveTo(0, -cell * 0.42);
  ctx.lineTo(cell * 0.34, cell * 0.32);
  ctx.lineTo(0, cell * 0.14);
  ctx.lineTo(-cell * 0.34, cell * 0.32);
  ctx.closePath();
  ctx.fillStyle = '#e8402a';
  ctx.shadowColor = 'rgba(255,90,60,0.9)';
  ctx.shadowBlur = 4 + 3 * Math.sin(time / 300);
  ctx.fill();
  ctx.restore();

  if (cursor) {
    const blink = 0.55 + 0.45 * Math.sin(time / 180);
    ctx.strokeStyle = `rgba(240,207,106,${blink})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + cursor.x * cell + 1, oy + cursor.y * cell + 1, cell - 2, cell - 2);
  }
}

function glyph(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, color: string, text: string): void {
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.floor(cell * 0.7)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
}
