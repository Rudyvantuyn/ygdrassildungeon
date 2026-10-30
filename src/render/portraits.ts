import type { ClassId } from '../core/types';
import { shade } from './color';
import { onSpriteLoad, sprite } from './sprites';

/** People of Lindholm with a painted portrait (art/people/<id>.webp). */
export type NpcId = 'gerd' | 'hilde' | 'brynja' | 'sigrid' | 'ketil' | 'hjalmar' | 'ylva' | 'aske' | 'torvald';
export type PortraitKind = ClassId | NpcId;

const CLASSES: readonly string[] = ['bastion', 'strider', 'mender', 'runecaller'];
const isClass = (kind: PortraitKind): kind is ClassId => CLASSES.includes(kind);

const HAIR = ['#2a1a12', '#5a3a1e', '#8a5a2a', '#c89a4a', '#e8d090', '#a0a0a8', '#6a2a1a', '#1a1a22'];
const SKIN = ['#f2d2b6', '#e0b494', '#c48a64', '#9a6a48', '#f4dcc8'];
const EYES = ['#3a6a9a', '#4a7a4a', '#6a4a2a', '#2a2a3a', '#8a6a3a'];

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** The painted portrait for a person: each class has two, picked by name; NPCs have their own. */
function paintedPath(kind: PortraitKind, name: string): string {
  if (isClass(kind)) return `heroes/${kind}-${hash(name) % 2 ? 'b' : 'a'}.webp`;
  return `people/${kind}.webp`;
}

/**
 * A portrait in a round frame: the painted one once it has loaded (the canvas is
 * redrawn then), and a procedural bust until then.
 */
export function drawPortrait(ctx: CanvasRenderingContext2D, size: number, kind: PortraitKind, name: string, accent: string): void {
  const path = paintedPath(kind, name);
  const img = sprite(path);
  if (!img) {
    drawBust(ctx, size, isClass(kind) ? kind : 'sigrid', name, accent);
    onSpriteLoad(path, () => drawPortrait(ctx, size, kind, name, accent));
    return;
  }
  const s = size;
  ctx.save();
  ctx.clearRect(0, 0, s, s);
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  ctx.clip();
  // The faces sit a little above the middle of the paintings.
  const zoom = 1.12;
  ctx.drawImage(img, (s - s * zoom) / 2, -s * 0.02, s * zoom, s * zoom);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
}

type BustKind = ClassId | 'sigrid';

/**
 * A drawn bust in a round frame. Looks are derived from the name, so every
 * adventurer gets a face of their own, while the class decides the outfit.
 */
function drawBust(ctx: CanvasRenderingContext2D, size: number, kind: BustKind, name: string, accent: string): void {
  const h = hash(name + kind);
  const hair = kind === 'sigrid' ? '#d8d8e0' : HAIR[h % HAIR.length];
  const skin = SKIN[(h >>> 3) % SKIN.length];
  const eye = EYES[(h >>> 6) % EYES.length];
  const s = size;
  ctx.save();
  ctx.clearRect(0, 0, s, s);
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  ctx.clip();

  // Backdrop
  const bg = ctx.createRadialGradient(s * 0.5, s * 0.35, s * 0.1, s * 0.5, s * 0.5, s * 0.7);
  bg.addColorStop(0, shade(accent, 0.15));
  bg.addColorStop(1, shade(accent, -0.65));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, s, s);

  const cx = s / 2;
  const headY = s * 0.43;
  const headR = s * 0.19;

  // Shoulders / outfit
  const outfit: Record<BustKind, string> = {
    bastion: '#7a828c',
    strider: '#3e5a32',
    mender: '#e8e4d8',
    runecaller: '#4a2a6a',
    sigrid: '#6a3a2a',
  };
  ctx.fillStyle = outfit[kind];
  ctx.beginPath();
  ctx.ellipse(cx, s * 1.02, s * 0.46, s * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 'bastion') {
    // Pauldrons
    ctx.fillStyle = '#9aa2ac';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + side * s * 0.3, s * 0.8, s * 0.15, s * 0.1, side * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (kind === 'sigrid') {
    // Fur collar
    ctx.fillStyle = '#b8a890';
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx + i * s * 0.07, s * 0.74 + Math.abs(i) * s * 0.01, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Neck
  ctx.fillStyle = shade(skin, -0.12);
  ctx.fillRect(cx - s * 0.07, headY + headR * 0.6, s * 0.14, s * 0.14);

  // Hair behind the head
  ctx.fillStyle = hair;
  if (kind === 'mender' || kind === 'sigrid' || h % 3 === 0) {
    ctx.beginPath();
    ctx.ellipse(cx, headY + s * 0.08, headR * 1.15, headR * 1.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Head
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, headY, headR * 0.92, headR * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes, brows, mouth
  const eyeY = headY + headR * 0.05;
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx + side * headR * 0.38, eyeY, headR * 0.17, headR * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(cx + side * headR * 0.36, eyeY, headR * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = shade(hair, -0.2);
    ctx.lineWidth = Math.max(1, s * 0.018);
    ctx.beginPath();
    ctx.moveTo(cx + side * headR * 0.2, eyeY - headR * 0.24);
    ctx.lineTo(cx + side * headR * 0.56, eyeY - headR * (0.26 + (h % 2) * 0.06));
    ctx.stroke();
  }
  ctx.strokeStyle = shade(skin, -0.4);
  ctx.lineWidth = Math.max(1, s * 0.015);
  ctx.beginPath();
  ctx.arc(cx, headY + headR * 0.45, headR * 0.22, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  if (kind === 'sigrid') {
    ctx.strokeStyle = shade(skin, -0.25);
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.6, eyeY + headR * 0.25);
    ctx.lineTo(cx - headR * 0.45, eyeY + headR * 0.32);
    ctx.stroke();
  }

  // Headgear / hair on top
  switch (kind) {
    case 'bastion': {
      ctx.fillStyle = '#8a929c';
      ctx.beginPath();
      ctx.arc(cx, headY - headR * 0.15, headR * 1.02, Math.PI, 0);
      ctx.lineTo(cx + headR * 1.02, headY + headR * 0.1);
      ctx.lineTo(cx - headR * 1.02, headY + headR * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6a727c';
      ctx.fillRect(cx - headR * 0.08, headY - headR * 0.2, headR * 0.16, headR * 0.6);
      ctx.fillStyle = accent;
      ctx.fillRect(cx - headR * 1.02, headY - headR * 0.25, headR * 2.04, headR * 0.12);
      break;
    }
    case 'strider': {
      ctx.fillStyle = '#4e6a3e';
      ctx.beginPath();
      ctx.moveTo(cx - headR * 1.25, headY + headR * 1.1);
      ctx.quadraticCurveTo(cx - headR * 1.3, headY - headR * 1.5, cx, headY - headR * 1.35);
      ctx.quadraticCurveTo(cx + headR * 1.3, headY - headR * 1.5, cx + headR * 1.25, headY + headR * 1.1);
      ctx.lineTo(cx + headR * 0.95, headY + headR * 0.3);
      ctx.quadraticCurveTo(cx, headY - headR * 1.05, cx - headR * 0.95, headY + headR * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.ellipse(cx, headY - headR * 0.6, headR * 0.7, headR * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'mender':
    case 'sigrid': {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.ellipse(cx, headY - headR * 0.55, headR * 1.0, headR * 0.6, 0, Math.PI, 0);
      ctx.fill();
      // Braids
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.ellipse(cx + side * headR * 0.95, headY + headR * (0.2 + i * 0.32), headR * 0.16, headR * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Circlet
      ctx.strokeStyle = kind === 'sigrid' ? '#d8b04a' : accent;
      ctx.lineWidth = Math.max(1.5, s * 0.025);
      ctx.beginPath();
      ctx.ellipse(cx, headY - headR * 0.55, headR * 0.92, headR * 0.22, 0, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = kind === 'sigrid' ? '#8ad0ff' : '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, headY - headR * 0.34, headR * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'runecaller': {
      ctx.fillStyle = '#3a1e58';
      ctx.beginPath();
      ctx.moveTo(cx - headR * 1.3, headY + headR * 1.0);
      ctx.lineTo(cx - headR * 0.9, headY - headR * 0.6);
      ctx.quadraticCurveTo(cx + headR * 0.2, headY - headR * 2.4, cx + headR * 0.6, headY - headR * 1.9);
      ctx.quadraticCurveTo(cx + headR * 0.4, headY - headR * 1.2, cx + headR * 0.95, headY - headR * 0.5);
      ctx.lineTo(cx + headR * 1.3, headY + headR * 1.0);
      ctx.lineTo(cx + headR * 0.9, headY + headR * 0.25);
      ctx.quadraticCurveTo(cx, headY - headR * 0.95, cx - headR * 0.9, headY + headR * 0.25);
      ctx.closePath();
      ctx.fill();
      // A glowing rune on the brim
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1.5, s * 0.022);
      ctx.shadowColor = accent;
      ctx.shadowBlur = s * 0.06;
      ctx.beginPath();
      ctx.moveTo(cx - headR * 0.15, headY - headR * 1.15);
      ctx.lineTo(cx, headY - headR * 0.9);
      ctx.lineTo(cx + headR * 0.15, headY - headR * 1.15);
      ctx.moveTo(cx, headY - headR * 1.25);
      ctx.lineTo(cx, headY - headR * 0.85);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }
  }

  ctx.restore();
  // Frame
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
}
