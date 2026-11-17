/**
 * Photo mode: a clean picture of the current view with the party under it and the game's name, made for sharing.
 * Nothing of the interface (menus, map, buttons) is in it: only the painted view, the adventurers and a caption.
 */
import { CLASSES } from '../core/data/classes';
import type { Member } from '../core/types';
import { drawPortrait } from '../render/portraits';

const SCALE = 2;
const BAND = 250;
const GOLD = '#f1d48a';
const FONT = '"Pixelify Sans", monospace';

export interface PhotoInfo {
  /** Where the picture was taken, e.g. "Lindholm" or "Chapter II · Kelp Hollows". */
  place: string;
  party: Member[];
}

/** Draws the picture: the view (pixels kept sharp), then a dark band with the party, the place and the game's name. */
export async function makePhoto(view: HTMLCanvasElement, info: PhotoInfo): Promise<HTMLCanvasElement> {
  try {
    await Promise.all([document.fonts.load(`700 40px ${FONT}`), document.fonts.load(`400 20px ${FONT}`)]);
  } catch {
    // Falls back to the monospace font.
  }
  const w = view.width * SCALE;
  const vh = view.height * SCALE;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = vh + BAND;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(view, 0, 0, w, vh);

  // The band.
  const grad = ctx.createLinearGradient(0, vh, 0, vh + BAND);
  grad.addColorStop(0, '#10161b');
  grad.addColorStop(1, '#05080b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, vh, w, BAND);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, vh, w, 4);

  // The party, left to right.
  const size = 150;
  const slot = 176;
  const top = vh + 22;
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = size;
  const t = tmp.getContext('2d')!;
  ctx.textAlign = 'center';
  info.party.forEach((m, i) => {
    const x = 30 + i * slot;
    t.clearRect(0, 0, size, size);
    drawPortrait(t, size, m.classId, m.name, CLASSES[m.classId].color, m.look);
    ctx.drawImage(tmp, x + (slot - size) / 2, top);
    ctx.fillStyle = '#e9e2cf';
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(fit(ctx, m.name, slot - 8), x + slot / 2, top + size + 26);
    ctx.fillStyle = '#9fb0b8';
    ctx.font = `400 17px ${FONT}`;
    ctx.fillText(fit(ctx, `Lv ${m.level} ${CLASSES[m.classId].name}`, slot - 8), x + slot / 2, top + size + 50);
  });

  // The name of the game, the place and where to play it.
  const right = w - 40;
  ctx.textAlign = 'right';
  ctx.fillStyle = GOLD;
  ctx.font = `700 64px ${FONT}`;
  ctx.shadowColor = '#000';
  ctx.shadowOffsetY = 4;
  ctx.fillText('YGDRASSIL', right, vh + 98);
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#e9e2cf';
  ctx.font = `700 24px ${FONT}`;
  const textLeft = 30 + info.party.length * slot + 30;
  ctx.fillText(fit(ctx, info.place, right - textLeft), right, vh + 146);
  ctx.fillStyle = '#9fb0b8';
  ctx.font = `400 20px ${FONT}`;
  ctx.fillText('play free at ygdrassilgame.com', right, vh + 190);
  return out;
}

/** Cuts a text to fit a width, with an ellipsis. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > width) s = s.slice(0, -1);
  return `${s}…`;
}

export function photoBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** A file name with the date and time, so pictures never overwrite each other. */
export function photoName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `ygdrassil-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}.png`;
}

/** Saves the picture as a download. */
export function savePhoto(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Puts the picture on the clipboard, to paste straight into Discord. False where the browser cannot. */
export async function copyPhoto(blob: Blob): Promise<boolean> {
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

/** The phone's share sheet, where there is one that takes files. */
export function canSharePhoto(blob: Blob, name: string): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([blob], name, { type: 'image/png' })] });
  } catch {
    return false;
  }
}

export async function sharePhoto(blob: Blob, name: string): Promise<void> {
  try {
    await navigator.share({ files: [new File([blob], name, { type: 'image/png' })], text: 'Ygdrassil · https://www.ygdrassilgame.com/play' });
  } catch {
    // Cancelled.
  }
}
