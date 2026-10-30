import type { EnemyDef } from '../core/data/enemies';
import { shade } from './color';
import { sprite } from './sprites';

type Ctx = CanvasRenderingContext2D;

/** The painted sprite of an enemy (art/monsters/<id>.webp). */
export function monsterSprite(def: EnemyDef): HTMLImageElement | null {
  return sprite(`monsters/${def.id}.webp`);
}

/**
 * Draws a monster standing on (x, groundY). `u` is the base size in pixels;
 * `t` is time in ms for idle animation. Uses the painted sprite once it has
 * loaded, and the procedural shape until then.
 */
export function drawMonster(ctx: Ctx, def: EnemyDef, x: number, groundY: number, u: number, t: number): void {
  const art = def.art;
  const s = u * art.size;
  ctx.save();
  ctx.translate(x, groundY);
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.5, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  const img = monsterSprite(def);
  if (img) {
    // Fit into a box about as tall as the shape would be, and not too wide.
    const scale = Math.min((s * 1.25) / img.naturalHeight, (s * 1.7) / img.naturalWidth);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    // Slow breathing
    const breath = Math.sin(t / 520) * 0.018;
    ctx.scale(1 - breath * 0.5, 1 + breath);
    ctx.drawImage(img, -w / 2, -h + s * 0.04, w, h);
  } else {
    SHAPES[art.shape](ctx, s, art.color, art.accent, t);
  }
  ctx.restore();
}

const SHAPES: Record<EnemyDef['art']['shape'], (ctx: Ctx, s: number, color: string, accent: string, t: number) => void> = {
  slime(ctx, s, color, accent, t) {
    const squish = 1 + Math.sin(t / 260) * 0.05;
    const w = s * 0.5 * squish;
    const h = s * 0.62 / squish;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.bezierCurveTo(-w * 1.05, -h * 0.7, -w * 0.4, -h, 0, -h);
    ctx.bezierCurveTo(w * 0.4, -h, w * 1.05, -h * 0.7, w, 0);
    ctx.closePath();
    ctx.fillStyle = body(ctx, color, -h, 0);
    ctx.fill();
    outline(ctx, color, s);
    // Moss tuft
    ctx.fillStyle = accent;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(i * w * 0.18, -h * 0.95, s * 0.06, s * 0.03, i * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    shine(ctx, -w * 0.45, -h * 0.65, s * 0.08);
    eyes(ctx, 0, -h * 0.45, s * 0.16, s * 0.07, '#1b1b1b', t);
  },

  bat(ctx, s, color, accent, t) {
    const flap = Math.sin(t / 90);
    const y = -s * 0.75 + Math.sin(t / 300) * s * 0.06;
    ctx.save();
    ctx.translate(0, y);
    ctx.fillStyle = shade(color, -0.15);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * s * 0.12, -s * 0.05);
      ctx.lineTo(side * s * 0.75, -s * (0.25 + flap * 0.2));
      ctx.lineTo(side * s * 0.62, s * 0.02);
      ctx.lineTo(side * s * 0.45, -s * 0.04);
      ctx.lineTo(side * s * 0.32, s * 0.12);
      ctx.lineTo(side * s * 0.12, s * 0.06);
      ctx.closePath();
      ctx.fill();
      outline(ctx, color, s);
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.17, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = body(ctx, color, -s * 0.2, s * 0.2);
    ctx.fill();
    outline(ctx, color, s);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * s * 0.05, -s * 0.15);
      ctx.lineTo(side * s * 0.15, -s * 0.32);
      ctx.lineTo(side * s * 0.16, -s * 0.12);
      ctx.fillStyle = color;
      ctx.fill();
    }
    eyes(ctx, 0, -s * 0.04, s * 0.07, s * 0.035, accent, t);
    ctx.restore();
  },

  beast(ctx, s, color, accent, t) {
    const breathe = Math.sin(t / 400) * s * 0.01;
    // Tail
    ctx.strokeStyle = shade(color, -0.2);
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(s * 0.3, -s * 0.2);
    ctx.quadraticCurveTo(s * 0.6, -s * 0.3, s * 0.55, -s * 0.6);
    ctx.stroke();
    // Body
    ctx.beginPath();
    ctx.ellipse(s * 0.05, -s * 0.25 - breathe, s * 0.36, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = body(ctx, color, -s * 0.47, 0);
    ctx.fill();
    outline(ctx, color, s);
    // Legs
    ctx.fillStyle = shade(color, -0.25);
    for (const lx of [-0.22, -0.05, 0.15, 0.3]) ctx.fillRect(lx * s, -s * 0.12, s * 0.07, s * 0.12);
    // Spines
    ctx.fillStyle = shade(color, -0.35);
    for (let i = 0; i < 5; i++) {
      const bx = -s * 0.15 + i * s * 0.1;
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.04, -s * 0.42);
      ctx.lineTo(bx, -s * 0.56);
      ctx.lineTo(bx + s * 0.04, -s * 0.42);
      ctx.fill();
    }
    // Head
    ctx.beginPath();
    ctx.ellipse(-s * 0.32, -s * 0.38 - breathe, s * 0.17, s * 0.15, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = body(ctx, color, -s * 0.55, -s * 0.2);
    ctx.fill();
    outline(ctx, color, s);
    // Snout + ears
    ctx.beginPath();
    ctx.ellipse(-s * 0.47, -s * 0.33, s * 0.08, s * 0.06, 0, 0, Math.PI * 2);
    ctx.fillStyle = shade(color, 0.1);
    ctx.fill();
    ctx.fillStyle = color;
    for (const ex of [-0.38, -0.24]) {
      ctx.beginPath();
      ctx.moveTo(ex * s - s * 0.05, -s * 0.48);
      ctx.lineTo(ex * s, -s * 0.64);
      ctx.lineTo(ex * s + s * 0.05, -s * 0.48);
      ctx.fill();
    }
    eyes(ctx, -s * 0.33, -s * 0.42, s * 0.1, s * 0.03, accent, t);
  },

  shroom(ctx, s, color, accent, t) {
    const sway = Math.sin(t / 500) * 0.04;
    ctx.save();
    ctx.rotate(sway);
    ctx.fillStyle = body(ctx, '#e8dcc0', -s * 0.5, 0);
    ctx.beginPath();
    ctx.moveTo(-s * 0.13, 0);
    ctx.quadraticCurveTo(-s * 0.18, -s * 0.3, -s * 0.1, -s * 0.48);
    ctx.lineTo(s * 0.1, -s * 0.48);
    ctx.quadraticCurveTo(s * 0.18, -s * 0.3, s * 0.13, 0);
    ctx.closePath();
    ctx.fill();
    outline(ctx, '#c8b890', s);
    eyes(ctx, 0, -s * 0.3, s * 0.11, s * 0.035, '#2a1a10', t);
    ctx.beginPath();
    ctx.moveTo(-s * 0.48, -s * 0.45);
    ctx.bezierCurveTo(-s * 0.45, -s * 0.95, s * 0.45, -s * 0.95, s * 0.48, -s * 0.45);
    ctx.quadraticCurveTo(0, -s * 0.52, -s * 0.48, -s * 0.45);
    ctx.fillStyle = body(ctx, color, -s * 0.85, -s * 0.45);
    ctx.fill();
    outline(ctx, color, s);
    ctx.fillStyle = accent;
    for (const [dx, dy, r] of [[-0.25, -0.62, 0.07], [0.05, -0.75, 0.08], [0.28, -0.6, 0.06], [-0.05, -0.56, 0.04]]) {
      ctx.beginPath();
      ctx.arc(dx * s, dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  beetle(ctx, s, color, accent, t) {
    const step = Math.sin(t / 150) * s * 0.02;
    ctx.strokeStyle = shade(color, -0.4);
    ctx.lineWidth = s * 0.035;
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * s * 0.2, -s * (0.2 + i * 0.08));
        ctx.lineTo(side * s * (0.45 + i * 0.03), -s * (0.15 + i * 0.05) + (i % 2 ? step : -step));
        ctx.lineTo(side * s * (0.5 + i * 0.03), 0);
        ctx.stroke();
      }
    }
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.32, s * 0.36, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = body(ctx, color, -s * 0.62, -s * 0.02);
    ctx.fill();
    outline(ctx, color, s);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6);
    ctx.lineTo(0, -s * 0.05);
    ctx.strokeStyle = shade(color, -0.45);
    ctx.lineWidth = s * 0.02;
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = s * 0.015;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * s * 0.15, -s * 0.32, s * 0.12, 0, Math.PI * 2);
      ctx.stroke();
    }
    shine(ctx, -s * 0.18, -s * 0.48, s * 0.06);
    // Horn
    ctx.beginPath();
    ctx.moveTo(-s * 0.06, -s * 0.6);
    ctx.quadraticCurveTo(0, -s * 0.9, s * 0.1, -s * 0.85);
    ctx.quadraticCurveTo(s * 0.02, -s * 0.75, s * 0.06, -s * 0.6);
    ctx.fillStyle = shade(color, -0.3);
    ctx.fill();
    eyes(ctx, 0, -s * 0.56, s * 0.12, s * 0.025, accent, t);
  },

  moth(ctx, s, color, accent, t) {
    const flap = 0.8 + Math.sin(t / 120) * 0.2;
    const y = -s * 0.85 + Math.sin(t / 400) * s * 0.05;
    ctx.save();
    ctx.translate(0, y);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * flap, 1);
      ctx.beginPath();
      ctx.ellipse(s * 0.32, -s * 0.15, s * 0.32, s * 0.24, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = body(ctx, color, -s * 0.4, s * 0.1);
      ctx.fill();
      outline(ctx, color, s);
      ctx.beginPath();
      ctx.ellipse(s * 0.25, s * 0.15, s * 0.2, s * 0.15, 0.5, 0, Math.PI * 2);
      ctx.fillStyle = shade(color, -0.15);
      ctx.fill();
      outline(ctx, color, s);
      ctx.beginPath();
      ctx.arc(s * 0.35, -s * 0.16, s * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.35, -s * 0.16, s * 0.035, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1020';
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.07, s * 0.24, 0, 0, Math.PI * 2);
    ctx.fillStyle = shade(color, -0.3);
    ctx.fill();
    ctx.strokeStyle = shade(color, -0.3);
    ctx.lineWidth = s * 0.015;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.2);
      ctx.quadraticCurveTo(side * s * 0.08, -s * 0.4, side * s * 0.16, -s * 0.42);
      ctx.stroke();
    }
    eyes(ctx, 0, -s * 0.16, s * 0.07, s * 0.025, accent, t);
    ctx.restore();
  },

  golem(ctx, s, color, accent, t) {
    const hover = Math.sin(t / 600) * s * 0.01;
    const block = (bx: number, by: number, bw: number, bh: number) => {
      ctx.beginPath();
      ctx.roundRect(bx * s, by * s + hover, bw * s, bh * s, s * 0.05);
      ctx.fillStyle = body(ctx, color, by * s, (by + bh) * s);
      ctx.fill();
      outline(ctx, color, s);
    };
    block(-0.22, -0.32, 0.16, 0.32);
    block(0.06, -0.32, 0.16, 0.32);
    block(-0.32, -0.75, 0.64, 0.45);
    block(-0.5, -0.72, 0.17, 0.42);
    block(0.33, -0.72, 0.17, 0.42);
    block(-0.18, -0.98, 0.36, 0.25);
    // Roots / glowing cracks
    ctx.strokeStyle = accent;
    ctx.lineWidth = s * 0.018;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.7 + hover);
    ctx.lineTo(-s * 0.05, -s * 0.55 + hover);
    ctx.lineTo(-s * 0.12, -s * 0.4 + hover);
    ctx.moveTo(s * 0.18, -s * 0.68 + hover);
    ctx.lineTo(s * 0.06, -s * 0.5 + hover);
    ctx.stroke();
    ctx.fillStyle = '#3f6a2a';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.98 + hover, s * 0.2, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    eyes(ctx, 0, -s * 0.86 + hover, s * 0.13, s * 0.03, accent, t);
  },

  treant(ctx, s, color, accent, t) {
    const sway = Math.sin(t / 700) * 0.03;
    // Roots
    ctx.fillStyle = shade(color, -0.2);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * s * 0.12, -s * 0.15);
      ctx.quadraticCurveTo(side * s * 0.35, -s * 0.05, side * s * 0.55, 0);
      ctx.lineTo(side * s * 0.15, 0);
      ctx.fill();
    }
    ctx.save();
    ctx.rotate(sway);
    // Branch arms
    ctx.strokeStyle = shade(color, -0.1);
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.lineWidth = s * 0.07;
      ctx.beginPath();
      ctx.moveTo(side * s * 0.15, -s * 0.55);
      ctx.quadraticCurveTo(side * s * 0.45, -s * 0.6, side * s * 0.52, -s * 0.85);
      ctx.stroke();
      ctx.lineWidth = s * 0.035;
      ctx.beginPath();
      ctx.moveTo(side * s * 0.42, -s * 0.66);
      ctx.lineTo(side * s * 0.62, -s * 0.62);
      ctx.moveTo(side * s * 0.52, -s * 0.85);
      ctx.lineTo(side * s * 0.6, -s * 1.0);
      ctx.moveTo(side * s * 0.52, -s * 0.85);
      ctx.lineTo(side * s * 0.42, -s * 0.98);
      ctx.stroke();
    }
    // Trunk
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, 0);
    ctx.quadraticCurveTo(-s * 0.13, -s * 0.5, -s * 0.18, -s * 0.95);
    ctx.lineTo(s * 0.18, -s * 0.95);
    ctx.quadraticCurveTo(s * 0.13, -s * 0.5, s * 0.2, 0);
    ctx.closePath();
    ctx.fillStyle = body(ctx, color, -s * 0.95, 0);
    ctx.fill();
    outline(ctx, color, s);
    // Bark lines
    ctx.strokeStyle = shade(color, -0.35);
    ctx.lineWidth = s * 0.012;
    for (const bx of [-0.09, 0.0, 0.1]) {
      ctx.beginPath();
      ctx.moveTo(bx * s, -s * 0.1);
      ctx.quadraticCurveTo((bx + 0.03) * s, -s * 0.3, bx * s, -s * 0.45);
      ctx.stroke();
    }
    // Withered canopy
    ctx.fillStyle = shade('#4a5a2a', -0.1);
    for (const [cx, cy, r] of [[-0.2, -1.0, 0.18], [0.18, -1.02, 0.2], [0, -1.15, 0.22], [-0.32, -0.9, 0.12], [0.34, -0.92, 0.13]]) {
      ctx.beginPath();
      ctx.arc(cx * s, cy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // Face
    ctx.fillStyle = '#120a06';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.48, s * 0.08, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    eyes(ctx, 0, -s * 0.72, s * 0.16, s * 0.04, accent, t);
  },

  wyrm(ctx, s, color, accent, t) {
    const sway = Math.sin(t / 650);
    // Spine: an S-curve rising out of the ground; drawn tail-first so the head ends on top.
    const point = (k: number): [number, number] => {
      const x = Math.sin(k * 3.4 + 0.6) * s * 0.32 * (1 - k * 0.4) + sway * s * 0.05 * k;
      const y = -k * s * 0.78;
      return [x, y];
    };
    const segments = 22;
    for (let i = 0; i <= segments; i++) {
      const k = i / segments;
      const [x, y] = point(k);
      const r = s * (0.2 - k * 0.09);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = body(ctx, i % 2 ? color : shade(color, 0.08), y - r, y + r);
      ctx.fill();
      // Glowing belly scales
      ctx.fillStyle = shade(accent, -0.35);
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(x + r * 0.35, y, r * 0.35, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Spikes along the back
    ctx.fillStyle = shade(color, -0.4);
    for (let i = 3; i < segments; i += 3) {
      const [x, y] = point(i / segments);
      const r = s * (0.2 - (i / segments) * 0.09);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.9, y - r * 0.2);
      ctx.lineTo(x - r * 1.6, y - r * 0.9);
      ctx.lineTo(x - r * 0.5, y - r * 0.8);
      ctx.fill();
    }
    // Head
    const [hx, hy] = point(1);
    const jaw = 0.15 + 0.1 * Math.max(0, Math.sin(t / 400));
    ctx.save();
    ctx.translate(hx, hy - s * 0.05);
    ctx.fillStyle = body(ctx, color, -s * 0.15, s * 0.15);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.2, s * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    outline(ctx, color, s);
    // Lower jaw
    ctx.beginPath();
    ctx.moveTo(-s * 0.05, s * 0.05);
    ctx.lineTo(s * 0.26, s * (0.05 + jaw));
    ctx.lineTo(s * 0.05, s * 0.12);
    ctx.closePath();
    ctx.fillStyle = shade(color, -0.2);
    ctx.fill();
    // Snout and fangs
    ctx.beginPath();
    ctx.moveTo(s * 0.1, -s * 0.06);
    ctx.lineTo(s * 0.3, s * 0.02);
    ctx.lineTo(s * 0.1, s * 0.07);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#f0e8d0';
    for (const fx of [0.14, 0.2, 0.26]) {
      ctx.beginPath();
      ctx.moveTo(s * fx, s * 0.03);
      ctx.lineTo(s * (fx + 0.015), s * 0.08);
      ctx.lineTo(s * (fx + 0.03), s * 0.03);
      ctx.fill();
    }
    // Horns
    ctx.fillStyle = shade(color, 0.35);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.06 * side - s * 0.04);
      ctx.quadraticCurveTo(-s * 0.3, -s * 0.18 - side * s * 0.04, -s * 0.36, -s * 0.3 - side * s * 0.05);
      ctx.lineTo(-s * 0.04, -s * 0.1);
      ctx.fill();
    }
    ctx.restore();
    eyes(ctx, hx + s * 0.02, hy - s * 0.09, s * 0.12, s * 0.03, accent, t);
  },
};

function body(ctx: Ctx, color: string, top: number, bottom: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, shade(color, 0.22));
  g.addColorStop(1, shade(color, -0.25));
  return g;
}

function outline(ctx: Ctx, color: string, s: number): void {
  ctx.strokeStyle = shade(color, -0.55);
  ctx.lineWidth = Math.max(1.5, s * 0.015);
  ctx.stroke();
}

function shine(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.6, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function eyes(ctx: Ctx, x: number, y: number, spread: number, r: number, color: string, t: number): void {
  // Blink every ~4 seconds
  const blink = (t % 4000) < 120 ? 0.15 : 1;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + (side * spread) / 2, y, r, r * blink, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 2;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
