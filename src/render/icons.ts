/**
 * Painted map icons (art/icons/<id>.webp): stone medallions for stairs, chests, springs, gathering spots,
 * guardians, prowlers and the player's own marks. Until one has loaded, callers draw a plain glyph instead.
 */
import { sprite } from './sprites';

export type IconId = 'down' | 'up' | 'chest' | 'spring' | 'danger' | 'note' | 'forage' | 'mine' | 'fell' | 'fish' | 'boss' | 'prowler';

export const ICON_IDS: IconId[] = ['down', 'up', 'chest', 'spring', 'danger', 'note', 'forage', 'mine', 'fell', 'fish', 'boss', 'prowler'];

export function iconPath(id: IconId): string {
  return `icons/${id}.webp`;
}

export function icon(id: IconId): HTMLImageElement | null {
  return sprite(iconPath(id));
}

/**
 * Draws icon `id` centred on (x, y), `size` across; `dim` greys it out (an opened chest, a used spring).
 * Returns false when the icon has not loaded yet, so the caller can draw a fallback.
 */
export function drawIcon(ctx: CanvasRenderingContext2D, id: IconId, x: number, y: number, size: number, dim = false, alpha = 1): boolean {
  const img = icon(id);
  if (!img) return false;
  ctx.save();
  ctx.globalAlpha = alpha * (dim ? 0.5 : 1);
  if (dim) ctx.filter = 'grayscale(1)';
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  ctx.restore();
  return true;
}
