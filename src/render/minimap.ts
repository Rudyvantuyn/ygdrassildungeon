import { tileAt } from '../core/dungeon';
import type { Game } from '../core/game';

/** Auto-map: only cells the party has seen are drawn. */
export function drawMinimap(ctx: CanvasRenderingContext2D, size: number, game: Game, time: number): void {
  const { map } = game;
  const cell = Math.floor(size / Math.max(map.width, map.height));
  const ox = Math.floor((size - cell * map.width) / 2);
  const oy = Math.floor((size - cell * map.height) / 2);

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#0d1418';
  ctx.fillRect(0, 0, size, size);

  // Grid paper
  ctx.strokeStyle = 'rgba(120,170,190,0.08)';
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
      if (!game.isExplored(x, y)) continue;
      const tile = tileAt(map, x, y);
      const px = ox + x * cell;
      const py = oy + y * cell;
      if (tile === 'wall') {
        ctx.fillStyle = '#3a4c55';
        ctx.fillRect(px, py, cell, cell);
        continue;
      }
      ctx.fillStyle = '#c9dfe6';
      ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
      const mid = cell / 2;
      if (tile === 'stairs') icon(ctx, px + mid, py + mid, cell, '#d08a1a', '▼');
      if (tile === 'up') icon(ctx, px + mid, py + mid, cell, '#2a9a5a', '▲');
      if (tile === 'chest') icon(ctx, px + mid, py + mid, cell, game.isChestOpened(x, y) ? '#9a9a9a' : '#c27a12', '■');
      if (tile === 'spring') icon(ctx, px + mid, py + mid, cell, game.progress.springUsed ? '#7a9aa8' : '#1d8ec2', '●');
      if (tile === 'boss' && !game.progress.bossDefeated) icon(ctx, px + mid, py + mid, cell, '#d0302a', '✸');
    }
  }

  // Prowlers, shown on cells the party has mapped
  game.progress.prowlers.forEach((p) => {
    if (p.defeated || !game.isExplored(p.x, p.y)) return;
    icon(ctx, ox + p.x * cell + cell / 2, oy + p.y * cell + cell / 2, cell, p.chasing ? '#e8402a' : '#e08a1a', '◆');
  });

  // Party arrow
  const { x, y, dir } = game.state;
  const cx = ox + x * cell + cell / 2;
  const cy = oy + y * cell + cell / 2;
  ctx.save();
  ctx.translate(cx, cy);
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
}

function icon(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, color: string, glyph: string): void {
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.floor(cell * 0.7)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, x, y + 1);
}
