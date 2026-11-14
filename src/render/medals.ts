/**
 * Medals for the Book of Deeds: a round medal on a ribbon, drawn as 48×64 pixel art. The ribbon tells the kind of
 * deed, the metal how hard it was (bronze, silver, gold; rune-blue for the secret ones). The sign in the middle is a
 * game-icons.net icon (CC BY 3.0), loaded from art/medals/icons.json the first time a medal is drawn.
 */
import type { DeedKind, DeedTier } from '../core/deeds';

const METALS: Record<DeedTier, [string, string, string, string]> = {
  bronze: ['#5a3418', '#a8642c', '#e0a060', '#3a200c'],
  silver: ['#4a5058', '#a8b0b8', '#f0f4f8', '#2a2e34'],
  gold: ['#6a4a10', '#d8a030', '#ffe890', '#3a2808'],
  rune: ['#1c2a30', '#3a5a64', '#9fe4ff', '#0c1418'],
};

const RIBBONS: Record<DeedKind, [string, string]> = {
  explore: ['#2a6a4a', '#d8c070'],
  battle: ['#8a2a2a', '#e8c070'],
  craft: ['#6a5a2a', '#e8e0b0'],
  hall: ['#2a4a7a', '#e8d090'],
  ravens: ['#2a2a3a', '#a0a8c0'],
  together: ['#2a6a7a', '#e8e0b0'],
  story: ['#6a3a1a', '#f0cf6a'],
  odd: ['#5a5a5a', '#e8a0c0'],
  secret: ['#4a2a6a', '#9fe4ff'],
};

let icons: Record<string, string[]> | null = null;
let loading: Promise<void> | null = null;

function loadIcons(): Promise<void> {
  loading ??= fetch('art/medals/icons.json')
    .then((r) => r.json() as Promise<Record<string, string[]>>)
    .then((j) => {
      icons = j;
    })
    .catch(() => {
      loading = null;
    });
  return loading;
}

function drawIcon(ctx: CanvasRenderingContext2D, icon: string, cx: number, cy: number, size: number, dark: string, light: string): void {
  const paths = icons?.[icon];
  if (!paths) return;
  const k = size / 512;
  for (const [dx, color] of [[0.6, light], [0, dark]] as const) {
    ctx.save();
    ctx.translate(cx - size / 2 + dx, cy - size / 2 + dx);
    ctx.scale(k, k);
    ctx.fillStyle = color;
    for (const d of paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }
}

/** The medal at 48×64, sharp-edged. */
function paint(low: CanvasRenderingContext2D, kind: DeedKind, tier: DeedTier, icon: string): void {
  const [dark, mid, light, line] = METALS[tier];
  const [rib, stripe] = RIBBONS[kind];
  const ctx = low;
  ctx.clearRect(0, 0, 48, 64);
  ctx.fillStyle = rib;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(34, 0);
  ctx.lineTo(30, 26);
  ctx.lineTo(18, 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = stripe;
  ctx.fillRect(22, 0, 4, 24);
  ctx.fillStyle = line;
  ctx.beginPath();
  ctx.arc(24, 40, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mid;
  ctx.beginPath();
  ctx.arc(24, 40, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(23, 39, 19, Math.PI * 1.05, Math.PI * 1.7);
  ctx.lineTo(23, 39);
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(24, 40, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mid;
  ctx.beginPath();
  ctx.arc(24, 40, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = line;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.fillRect(24 + Math.cos(a) * 17 - 0.5, 40 + Math.sin(a) * 17 - 0.5, 1, 1);
  }
  drawIcon(ctx, icon, 24, 40, 20, dark, light);
  // Hard pixels: no half-transparent edges.
  const im = ctx.getImageData(0, 0, 48, 64);
  for (let i = 3; i < im.data.length; i += 4) im.data[i] = im.data[i] > 110 ? 255 : 0;
  ctx.putImageData(im, 0, 0);
}

/** Draws a medal onto `canvas` (any size with a 3:4 shape); redraws once the signs have loaded. */
export function drawMedal(canvas: HTMLCanvasElement, kind: DeedKind, tier: DeedTier, icon: string): void {
  const low = document.createElement('canvas');
  low.width = 48;
  low.height = 64;
  const paintAll = () => {
    paint(low.getContext('2d', { willReadFrequently: true })!, kind, tier, icon);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, canvas.width, canvas.height);
  };
  paintAll();
  if (!icons) void loadIcons().then(paintAll);
}

/** An empty hook in the Book of Deeds, where a medal may hang one day. */
export function drawEmptyHook(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  const s = canvas.width / 48;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(24 * s, 40 * s, 18 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(22 * s, 6 * s, 4 * s, 14 * s);
}
