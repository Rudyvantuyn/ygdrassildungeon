/**
 * The town of Lindholm at dusk, at the roots of the Great Tree.
 * `focus` lights up the building that matches the selected town menu entry.
 */
import { sprite } from './sprites';

export type TownSpot = 'inn' | 'hall' | 'shop' | 'board' | 'rootdeep' | 'horn';

const SPOTS: Record<TownSpot, { x: number; label: string }> = {
  inn: { x: 92, label: 'Inn' },
  hall: { x: 260, label: 'Oath Hall' },
  shop: { x: 428, label: 'Shop' },
  board: { x: 545, label: 'Notices' },
  rootdeep: { x: 662, label: 'Rootdeep' },
  horn: { x: 798, label: 'Hornstone' },
};

export function drawTown(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, focus: TownSpot | null): void {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.75);
  sky.addColorStop(0, '#0d1230');
  sky.addColorStop(0.55, '#3a2a55');
  sky.addColorStop(1, '#d9875a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Stars
  for (let i = 0; i < 70; i++) {
    const sx = (i * 137.5) % w;
    const sy = ((i * 71.3) % (h * 0.4));
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(time / 900 + i));
    ctx.fillStyle = `rgba(255,255,240,${0.6 * twinkle * (1 - sy / (h * 0.45))})`;
    ctx.fillRect(sx, sy, 2, 2);
  }

  drawWorldTree(ctx, w, h, time);

  // Distant hills
  ctx.fillStyle = '#2a2440';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.68);
  for (let x = 0; x <= w; x += 40) ctx.lineTo(x, h * 0.66 - Math.sin(x / 120) * 18 - Math.sin(x / 47) * 6);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  // Rooftops
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let x = -20; x < w; ) {
    const bw = 50 + rand() * 60;
    const bh = 50 + rand() * 70;
    const top = h * 0.8 - bh;
    ctx.fillStyle = '#1a1626';
    ctx.fillRect(x, top, bw, h - top);
    ctx.beginPath();
    ctx.moveTo(x - 6, top);
    ctx.lineTo(x + bw / 2, top - 24 - rand() * 16);
    ctx.lineTo(x + bw + 6, top);
    ctx.fillStyle = '#24182a';
    ctx.fill();
    for (let wy = top + 14; wy < h * 0.8 - 12; wy += 22) {
      for (let wx = x + 10; wx < x + bw - 12; wx += 18) {
        if (rand() < 0.45) continue;
        const flicker = 0.75 + 0.25 * Math.sin(time / 300 + wx * 0.1 + wy);
        ctx.fillStyle = `rgba(255,196,110,${0.85 * flicker})`;
        ctx.fillRect(wx, wy, 7, 10);
      }
    }
    x += bw + 4;
  }

  // Street
  const street = ctx.createLinearGradient(0, h * 0.8, 0, h);
  street.addColorStop(0, '#2a2230');
  street.addColorStop(1, '#120e16');
  ctx.fillStyle = street;
  ctx.fillRect(0, h * 0.8, w, h * 0.2);

  for (const [spot, def] of Object.entries(SPOTS) as [TownSpot, (typeof SPOTS)[TownSpot]][]) {
    drawSign(ctx, def.x, h * 0.8, def.label, spot === focus, time, spot);
  }

  // Fireflies
  for (let i = 0; i < 26; i++) {
    const fx = (i * 97 + Math.sin(time / 1700 + i) * 40 + time * 0.01 * ((i % 3) - 1)) % w;
    const fy = h * 0.45 + ((i * 53) % (h * 0.45)) + Math.cos(time / 1300 + i * 2) * 14;
    const a = 0.35 + 0.65 * Math.abs(Math.sin(time / 500 + i * 1.7));
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 8);
    g.addColorStop(0, `rgba(220,255,140,${a})`);
    g.addColorStop(1, 'rgba(220,255,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(fx - 8, fy - 8, 16, 16);
  }

  // Vignette
  const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function drawWorldTree(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  const cx = w * 0.72;
  const base = h * 0.72;
  // Trunk
  ctx.fillStyle = '#2b2236';
  ctx.beginPath();
  ctx.moveTo(cx - 90, base);
  ctx.bezierCurveTo(cx - 40, base - 120, cx - 60, base - 260, cx - 20, h * 0.12);
  ctx.lineTo(cx + 30, h * 0.12);
  ctx.bezierCurveTo(cx + 60, base - 260, cx + 40, base - 120, cx + 100, base);
  ctx.fill();
  // Branches
  ctx.strokeStyle = '#2b2236';
  ctx.lineCap = 'round';
  for (const [dx, dy, ex, ey, lw] of [
    [-10, 0.3, -230, 0.1, 22],
    [10, 0.25, 220, 0.06, 20],
    [0, 0.2, -120, -0.02, 14],
    [5, 0.18, 130, -0.03, 14],
  ]) {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(cx + dx, h * dy);
    ctx.quadraticCurveTo(cx + ex * 0.5, h * (dy - 0.1), cx + ex, h * ey);
    ctx.stroke();
  }
  // Glowing canopy
  const blobs: [number, number, number][] = [
    [-240, 0.08, 90], [-140, 0.0, 110], [0, -0.04, 130], [150, 0.0, 110], [250, 0.07, 90],
    [-60, 0.12, 80], [90, 0.12, 80], [-190, 0.17, 60], [200, 0.16, 60],
  ];
  for (const [dx, dy, r] of blobs) {
    const x = cx + dx;
    const y = h * dy + Math.sin(time / 1500 + dx) * 3;
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, 'rgba(120,200,150,0.55)');
    g.addColorStop(0.7, 'rgba(60,120,100,0.45)');
    g.addColorStop(1, 'rgba(40,80,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSign(ctx: CanvasRenderingContext2D, x: number, ground: number, label: string, lit: boolean, time: number, spot: TownSpot): void {
  // Building front
  const bw = spot === 'rootdeep' ? 150 : spot === 'hall' ? 160 : 140;
  const bh = spot === 'rootdeep' ? 120 : 130;
  const top = ground - bh;
  ctx.save();
  if (spot === 'horn') {
    drawHornstone(ctx, x, ground, label, lit, time);
    ctx.restore();
    return;
  }
  if (spot === 'board') {
    // A notice board on two posts, pinned with papers
    ctx.fillStyle = lit ? '#7a5a36' : '#4a3620';
    ctx.fillRect(x - 34, ground - 74, 6, 74);
    ctx.fillRect(x + 28, ground - 74, 6, 74);
    ctx.fillStyle = lit ? '#8a6a40' : '#54402a';
    ctx.fillRect(x - 40, ground - 92, 80, 46);
    const papers: [number, number, number][] = [[-30, -88, -0.1], [-6, -86, 0.08], [16, -89, -0.05], [-20, -70, 0.12], [6, -68, -0.1]];
    for (const [dx, dy, rot] of papers) {
      ctx.save();
      ctx.translate(x + dx + 8, ground + dy + 9);
      ctx.rotate(rot);
      ctx.fillStyle = lit ? '#f4ead0' : '#a8a08a';
      ctx.fillRect(-8, -9, 16, 18);
      ctx.restore();
    }
    if (lit) {
      const g = ctx.createRadialGradient(x, ground - 70, 0, x, ground - 70, 70);
      g.addColorStop(0, 'rgba(255,220,150,0.3)');
      g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 70, ground - 140, 140, 140);
    }
    ctx.restore();
    ctx.save();
    ctx.font = '800 16px Cinzel, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = lit ? '#f0cf6a' : '#c9c0a8';
    ctx.fillText(label, x, ground - 100);
    ctx.restore();
    return;
  }
  if (spot === 'rootdeep') {
    // A stone gate into the roots
    ctx.fillStyle = lit ? '#5a5070' : '#3a3450';
    ctx.beginPath();
    ctx.moveTo(x - bw / 2, ground);
    ctx.lineTo(x - bw / 2, top + 40);
    ctx.quadraticCurveTo(x, top - 30, x + bw / 2, top + 40);
    ctx.lineTo(x + bw / 2, ground);
    ctx.fill();
    ctx.fillStyle = '#05040a';
    ctx.beginPath();
    ctx.moveTo(x - 40, ground);
    ctx.lineTo(x - 40, top + 60);
    ctx.quadraticCurveTo(x, top + 10, x + 40, top + 60);
    ctx.lineTo(x + 40, ground);
    ctx.fill();
    if (lit) {
      const g = ctx.createRadialGradient(x, ground - 30, 0, x, ground - 30, 60);
      g.addColorStop(0, `rgba(140,255,180,${0.35 + 0.15 * Math.sin(time / 300)})`);
      g.addColorStop(1, 'rgba(140,255,180,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 60, ground - 90, 120, 90);
    }
  } else {
    ctx.fillStyle = lit ? '#4a3a40' : '#2e2430';
    ctx.fillRect(x - bw / 2, top, bw, bh);
    ctx.beginPath();
    ctx.moveTo(x - bw / 2 - 12, top);
    ctx.lineTo(x, top - 46);
    ctx.lineTo(x + bw / 2 + 12, top);
    ctx.fillStyle = lit ? '#6a3a32' : '#3e2226';
    ctx.fill();
    if (spot === 'hall') {
      // Crossed gable beams, carved like dragon heads
      ctx.strokeStyle = lit ? '#c89a5a' : '#6a4a2a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 22, top - 56);
      ctx.quadraticCurveTo(x - 8, top - 40, x + 6, top - 40);
      ctx.moveTo(x + 22, top - 56);
      ctx.quadraticCurveTo(x + 8, top - 40, x - 6, top - 40);
      ctx.stroke();
    }
    // Door and windows
    ctx.fillStyle = lit ? '#ffcf7a' : '#c08a4a';
    ctx.fillRect(x - 18, ground - 52, 36, 52);
    ctx.fillRect(x - bw / 2 + 18, top + 26, 30, 26);
    ctx.fillRect(x + bw / 2 - 48, top + 26, 30, 26);
    if (lit) {
      const g = ctx.createRadialGradient(x, ground - 30, 0, x, ground - 30, 110);
      g.addColorStop(0, 'rgba(255,200,120,0.35)');
      g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 110, ground - 140, 220, 160);
    }
  }
  // Hanging sign
  const sy = top - (spot === 'rootdeep' ? 50 : 70);
  ctx.font = '800 22px Cinzel, Georgia, serif';
  const tw = ctx.measureText(label).width + 28;
  ctx.fillStyle = lit ? '#f0cf6a' : '#8a7444';
  ctx.fillRect(x - 1, sy - 22, 2, 22);
  ctx.fillStyle = lit ? 'rgba(20,30,36,0.95)' : 'rgba(14,20,24,0.85)';
  ctx.strokeStyle = lit ? '#f0cf6a' : '#8a7444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - tw / 2, sy - 2, tw, 34, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = lit ? '#f0cf6a' : '#c9c0a8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, sy + 15);
  ctx.restore();
}

/** A tall standing stone carved with runes, a great horn hanging from an iron hook. */
function drawHornstone(ctx: CanvasRenderingContext2D, x: number, ground: number, label: string, lit: boolean, time: number): void {
  const top = ground - 118;
  if (lit) {
    const g = ctx.createRadialGradient(x, ground - 60, 0, x, ground - 60, 90);
    g.addColorStop(0, `rgba(150,200,255,${0.28 + 0.1 * Math.sin(time / 400)})`);
    g.addColorStop(1, 'rgba(150,200,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 90, ground - 150, 180, 160);
  }
  ctx.fillStyle = lit ? '#6a6878' : '#454352';
  ctx.beginPath();
  ctx.moveTo(x - 24, ground);
  ctx.lineTo(x - 28, top + 30);
  ctx.quadraticCurveTo(x - 20, top, x + 2, top - 4);
  ctx.quadraticCurveTo(x + 22, top + 4, x + 26, top + 34);
  ctx.lineTo(x + 22, ground);
  ctx.closePath();
  ctx.fill();
  // Runes down the face
  ctx.strokeStyle = lit ? '#9fd4ff' : '#6a7088';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const y = top + 24 + i * 22;
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x - 4, y + 14);
    ctx.moveTo(x - 4, y + 4);
    ctx.lineTo(x + 5, y + (i % 2 ? 0 : 9));
  }
  ctx.stroke();
  // Hook and horn
  ctx.strokeStyle = '#2a2a30';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 22, top + 40);
  ctx.lineTo(x + 34, top + 40);
  ctx.lineTo(x + 34, top + 50);
  ctx.stroke();
  ctx.fillStyle = lit ? '#e8d8b0' : '#a89a7a';
  ctx.beginPath();
  ctx.moveTo(x + 20, top + 56);
  ctx.quadraticCurveTo(x + 34, top + 46, x + 50, top + 60);
  ctx.quadraticCurveTo(x + 46, top + 80, x + 36, top + 86);
  ctx.lineTo(x + 32, top + 80);
  ctx.quadraticCurveTo(x + 38, top + 66, x + 24, top + 62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = lit ? '#c8a050' : '#7a6438';
  ctx.fillRect(x + 28, top + 52, 4, 10);
  ctx.font = '800 15px Cinzel, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = lit ? '#f0cf6a' : '#c9c0a8';
  ctx.fillText(label, x + 8, top - 14);
}

// ── Painted scenes ────────────────────────────────────────────────────────────

/** The painting shown for each town spot (art/places/<name>.webp). */
const SCENES: Record<TownSpot | 'town' | 'title', { image: string; caption: string }> = {
  town: { image: 'town', caption: 'Lindholm' },
  title: { image: 'title', caption: '' },
  inn: { image: 'inn', caption: 'The Sleeping Stag' },
  hall: { image: 'hall', caption: 'The Oath Hall' },
  shop: { image: 'shop', caption: "Hilde's Supplies" },
  board: { image: 'board', caption: 'The Notice Board' },
  rootdeep: { image: 'rootdeep', caption: 'The Rootdeep' },
  horn: { image: 'hornstone', caption: 'The Hornstone' },
};

const FADE_MS = 450;
let shown: keyof typeof SCENES = 'town';
let previous: keyof typeof SCENES | null = null;
let changedAt = 0;

export function preloadTownScenes(): void {
  for (const scene of Object.values(SCENES)) sprite(`places/${scene.image}.webp`);
}

/**
 * Lindholm as paintings: the selected spot's painting (the whole town when nothing is
 * selected, the title art on the title screen), crossfading between them. Falls back to
 * the drawn town until the paintings have loaded.
 */
export function drawTownScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  focus: TownSpot | null,
  title: boolean,
  showCaption = true,
): void {
  const key: keyof typeof SCENES = title ? 'title' : (focus ?? 'town');
  if (key !== shown) {
    previous = shown;
    shown = key;
    changedAt = time;
  }
  const current = sprite(`places/${SCENES[shown].image}.webp`);
  if (!current) {
    drawTown(ctx, w, h, time, title ? null : focus);
    return;
  }
  const k = Math.min(1, (time - changedAt) / FADE_MS);
  const before = previous && k < 1 ? sprite(`places/${SCENES[previous].image}.webp`) : null;
  if (before) paintScene(ctx, before, w, h, time, 1);
  paintScene(ctx, current, w, h, time, before ? k : 1);

  // Fireflies drifting over every scene
  for (let i = 0; i < 14; i++) {
    const t = time / 1000 + i * 7.3;
    const x = ((Math.sin(t * 0.21 + i) * 0.5 + 0.5) * 0.9 + 0.05) * w;
    const y = ((Math.cos(t * 0.17 + i * 1.7) * 0.5 + 0.5) * 0.55 + 0.35) * h;
    const glow = 0.35 + 0.35 * Math.sin(t * 2.3 + i);
    ctx.fillStyle = `rgba(220,255,160,${glow})`;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vignette and caption
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  const caption = SCENES[shown].caption;
  if (caption && showCaption) {
    ctx.save();
    ctx.globalAlpha = before ? k : 1;
    ctx.font = '800 26px Cinzel, Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#f0cf6a';
    ctx.fillText(caption, 24, h - 22);
    ctx.restore();
  }
}

/** Draws a painting covering the view, with a slow drift so the scene feels alive. */
function paintScene(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, time: number, alpha: number): void {
  const zoom = 1.06 + 0.025 * Math.sin(time / 9000);
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = (w - dw) / 2 + Math.sin(time / 13000) * 8;
  const dy = (h - dh) / 2 + Math.cos(time / 11000) * 5;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}
