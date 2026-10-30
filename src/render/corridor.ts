import { ENEMIES } from '../core/data/enemies';
import type { Palette } from '../core/data/floors';
import { relCell, tileAt } from '../core/dungeon';
import type { Game } from '../core/game';
import { mix, shade, withAlpha } from './color';
import { drawMonster } from './monsters';
import { sprite } from './sprites';

/**
 * First-person grid view, drawn with the painter's algorithm.
 *
 * World space relative to the player: x = right, y = down (wall spans -0.5..0.5),
 * z = forward. The player's own cell spans z 0..1 and the eye stands inside it,
 * a little behind its centre, so the walls at the screen edges are the walls right
 * beside the party. Geometry behind the near plane is clipped.
 */
const EYE = -0.3; // eye at z = 0.3
const NEAR = 0.06; // closest distance from the eye that is still drawn
const Z_CLIP = NEAR - EYE;
/** Half-width of the front wall one step ahead, as a fraction of the view width. */
const RING_1 = 0.27;
const MAX_DEPTH = 7;
/** Width in pixels of the vertical slices side walls are drawn in. */
const STRIP = 3;
/** Height in pixels of the rows the floor and ceiling are drawn in. */
const ROW = 2;

type P3 = [number, number, number];

interface TextureSet {
  /** The wall texture at full size and halved down to 32 px, to pick from by on-screen size (less shimmer). */
  wall: CanvasImageSource[];
  floor: CanvasPattern;
  ceiling: CanvasPattern;
  size: number;
}

export class CorridorRenderer {
  private sx = 0;
  private sy = 0;
  private cx = 0;
  private cy = 0;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly w: number,
    private readonly h: number,
  ) {
    this.sx = 2 * RING_1 * w * (1 + EYE);
    this.sy = this.sx * 0.72;
    this.cx = w / 2;
    this.cy = h * 0.5;
  }

  private patterns = new Map<HTMLImageElement, CanvasPattern>();
  private mips = new Map<HTMLImageElement, HTMLCanvasElement[]>();
  /** Floor and ceiling look the same from every cell (the party always stands in a cell's middle), so they are drawn once per floor. */
  private planeCache: { key: string; canvas: HTMLCanvasElement } | null = null;

  /** The floor's painted textures, once all three have loaded. */
  private textureSet(pal: Palette): TextureSet | null {
    if (!pal.textures) return null;
    const wall = sprite(`dungeon/${pal.textures}-wall.webp`);
    const floor = sprite(`dungeon/${pal.textures}-floor.webp`);
    const ceiling = sprite(`dungeon/${pal.textures}-ceiling.webp`);
    if (!wall || !floor || !ceiling) return null;
    const pattern = (img: HTMLImageElement) => {
      let p = this.patterns.get(img);
      if (!p) {
        p = this.ctx.createPattern(img, 'repeat')!;
        this.patterns.set(img, p);
      }
      return p;
    };
    let wallMips = this.mips.get(wall);
    if (!wallMips) {
      wallMips = [];
      let source: CanvasImageSource = wall;
      for (let size = wall.naturalWidth; size >= 32; size = Math.floor(size / 2)) {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const g = c.getContext('2d')!;
        g.imageSmoothingQuality = 'high';
        g.drawImage(source, 0, 0, size, size);
        wallMips.push(c);
        source = c;
      }
      this.mips.set(wall, wallMips);
    }
    return { wall: wallMips, floor: pattern(floor), ceiling: pattern(ceiling), size: floor.naturalWidth };
  }

  /** The smallest wall mip that is still at least `px` pixels big. */
  private wallFor(tex: TextureSet, px: number): HTMLCanvasElement {
    const mips = tex.wall as HTMLCanvasElement[];
    let pick = mips[0];
    for (const m of mips) if (m.width >= px) pick = m;
    return pick;
  }

  draw(game: Game, time: number): void {
    const { ctx, w, h } = this;
    const pal = game.floorDef.palette;
    const { x: px, y: py, dir } = game.state;
    const tex = this.textureSet(pal);

    if (tex) {
      const key = `${pal.textures}|${pal.fog}`;
      if (this.planeCache?.key !== key) {
        const canvas = this.planeCache?.canvas ?? document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        this.planes(canvas.getContext('2d')!, tex, pal);
        this.planeCache = { key, canvas };
      }
      ctx.drawImage(this.planeCache.canvas, 0, 0);
    } else {
    // Ceiling and floor gradients fading into fog at the horizon.
    const sky = ctx.createLinearGradient(0, 0, 0, this.cy);
    sky.addColorStop(0, shade(pal.ceiling, 0.05));
    sky.addColorStop(1, pal.fog);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, this.cy);
    const ground = ctx.createLinearGradient(0, this.cy, 0, h);
    ground.addColorStop(0, pal.fog);
    ground.addColorStop(1, shade(pal.floor, 0.08));
    ctx.fillStyle = ground;
    ctx.fillRect(0, this.cy, w, h - this.cy);
    }

    for (let d = MAX_DEPTH; d >= 0; d--) {
      // Enough side cells to fill the view at this depth.
      const lateral = Math.ceil(((d + 1 + EYE) * this.w) / (2 * this.sx) + 0.5);
      const order: number[] = [];
      for (let s = -lateral; s <= -1; s++) order.push(s);
      for (let s = lateral; s >= 1; s--) order.push(s);
      order.push(0);

      for (const s of order) {
        const cell = relCell(px, py, dir, d, s);
        const tile = tileAt(game.map, cell.x, cell.y);
        if (tile === 'wall') {
          if (tex) {
            if (d >= 1) this.paintedFront(tex, s, d, pal);
            if (s < 0) this.paintedSide(tex, s + 0.5, d, pal, -1);
            if (s > 0) this.paintedSide(tex, s - 0.5, d, pal, 1);
          } else {
            if (d >= 1) this.wallFront(s, d, pal, cell.x, cell.y);
            if (s < 0) this.wallSide(s + 0.5, d, pal, cell.x, cell.y, -1);
            if (s > 0) this.wallSide(s - 0.5, d, pal, cell.x, cell.y, 1);
          }
        } else {
          if (!tex) this.floorCell(s, d, pal);
          if (tile === 'stairs' && d > 0) this.stairs(s, d, pal, time);
          if (tile === 'up') this.upStairs(s, d, pal, time);
          if (tile === 'chest') this.chest(s, d, game.isChestOpened(cell.x, cell.y));
          if (tile === 'spring' && d > 0) this.spring(s, d, time, game.progress.springUsed);
          if (tile === 'boss' && d > 0 && !game.progress.bossDefeated) this.bossSigil(s, d, time);
          const prowler = d > 0 ? game.prowlerAt(cell.x, cell.y) : -1;
          if (prowler >= 0) {
            const def = ENEMIES[game.floorDef.prowlers[prowler].enemies[0]];
            this.prowler(s, d, def, time + prowler * 911, game.progress.prowlers[prowler].chasing);
          }
        }
      }
    }

    // The party's torchlight: a soft warm glow on what is close.
    if (tex) {
      const glow = ctx.createRadialGradient(this.cx, h * 0.95, 0, this.cx, h * 0.8, w * 0.6);
      glow.addColorStop(0, 'rgba(255,170,90,0.16)');
      glow.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Vignette
    const vignette = ctx.createRadialGradient(this.cx, this.cy, h * 0.25, this.cx, this.cy, w * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  // ── Projection ─────────────────────────────────────────────────────────────

  private project([x, y, z]: P3): [number, number] {
    const k = 1 / Math.max(z + EYE, NEAR);
    return [this.cx + x * this.sx * k, this.cy + y * this.sy * k];
  }

  /** Screen-size factor at depth z (1 at the screen edge), for line widths and object sizes. */
  private scaleAt(z: number): number {
    return (this.sx / this.w) / Math.max(z + EYE, this.sx / this.w);
  }

  /** Starts a path for a 3D polygon, clipped to the part in front of the near plane. */
  private poly(points: P3[]): void {
    const ctx = this.ctx;
    ctx.beginPath();
    const clipped: P3[] = [];
    points.forEach((p, i) => {
      const q = points[(i + 1) % points.length];
      const pIn = p[2] >= Z_CLIP;
      const qIn = q[2] >= Z_CLIP;
      if (pIn) clipped.push(p);
      if (pIn !== qIn) clipped.push(cut(p, q));
    });
    clipped.forEach((p, i) => {
      const [x, y] = this.project(p);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (clipped.length) ctx.closePath();
  }

  private line(a: P3, b: P3): void {
    if (a[2] < Z_CLIP && b[2] < Z_CLIP) return;
    if (a[2] < Z_CLIP) a = cut(a, b);
    if (b[2] < Z_CLIP) b = cut(b, a);
    const [ax, ay] = this.project(a);
    const [bx, by] = this.project(b);
    this.ctx.moveTo(ax, ay);
    this.ctx.lineTo(bx, by);
  }

  private fog(z: number): number {
    return Math.min(1, Math.pow(z / (MAX_DEPTH + 0.5), 0.85));
  }

  // ── Painted surfaces ───────────────────────────────────────────────────────

  /**
   * Floor and ceiling as two continuous planes, drawn row by row with a repeating
   * pattern (one texture tile per cell), then darkened into the fog towards the horizon.
   */
  private planes(ctx: CanvasRenderingContext2D, tex: TextureSet, pal: Palette): void {
    const { w, h, cx, cy, sx, sy } = this;
    const T = tex.size;
    const far = MAX_DEPTH + 1 + EYE;
    ctx.fillStyle = pal.fog;
    ctx.fillRect(0, 0, w, h);
    for (const [pattern, sign] of [[tex.floor, 1], [tex.ceiling, -1]] as const) {
      const horizon = cy + sign * ((0.5 * sy) / far);
      const edge = sign > 0 ? h : 0;
      for (let y = horizon; sign > 0 ? y < edge : y > edge; y += sign * ROW) {
        const mid = y + (sign * ROW) / 2;
        const dist = (0.5 * sy) / Math.abs(mid - cy); // distance from the eye
        const z = dist - EYE;
        const k = sx / (dist * T); // screen pixels per texture pixel at this depth
        const v = ((z % 1) + 1) % 1;
        pattern.setTransform(new DOMMatrix([k, 0, 0, k, cx - 0.5 * T * k, mid - v * T * k]));
        ctx.fillStyle = pattern;
        ctx.fillRect(0, sign > 0 ? y : y - ROW, w, ROW + 0.5);
      }
      // Fog towards the horizon
      const fog = ctx.createLinearGradient(0, horizon, 0, edge);
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const yy = horizon + (edge - horizon) * t;
        const dist = (0.5 * sy) / Math.max(1, Math.abs(yy - cy));
        fog.addColorStop(t, withAlpha(pal.fog, 0.15 + 0.85 * this.fog(dist - EYE)));
      }
      ctx.fillStyle = fog;
      ctx.fillRect(0, Math.min(horizon, edge), w, Math.abs(edge - horizon));
    }
  }

  private paintedFront(tex: TextureSet, s: number, d: number, pal: Palette): void {
    const ctx = this.ctx;
    const [x0, y0] = this.project([s - 0.5, -0.5, d]);
    const [x1, y1] = this.project([s + 0.5, 0.5, d]);
    if (x1 < 0 || x0 > this.w) return;
    ctx.drawImage(this.wallFor(tex, y1 - y0), x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = withAlpha(pal.fog, 0.1 + 0.9 * this.fog(d));
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = Math.max(1, 2 * this.scaleAt(d));
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }

  /** A side face at lateral x spanning depth d..d+1, in vertical slices so the texture follows the perspective. */
  private paintedSide(tex: TextureSet, x: number, d: number, pal: Palette, side: number): void {
    const { ctx, cx, cy, sx, sy } = this;
    const zNear = Math.max(d, Z_CLIP);
    const xa = cx + (x * sx) / (zNear + EYE);
    const xb = cx + (x * sx) / (d + 1 + EYE);
    const lo = Math.max(0, Math.min(xa, xb));
    const hi = Math.min(this.w, Math.max(xa, xb));
    if (hi <= lo) return;
    for (let sxp = lo; sxp < hi; sxp += STRIP) {
      const mid = Math.min(hi, sxp + STRIP / 2);
      const dist = (x * sx) / (mid - cx);
      if (!(dist > 0)) continue;
      const u = Math.min(0.999, Math.max(0, dist - EYE - d));
      const half = (0.5 * sy) / dist;
      const img = this.wallFor(tex, half * 2);
      const T = img.width;
      // Left walls run front-to-back from the right edge of the texture, so it is never mirrored.
      const tx = (side < 0 ? 1 - u : u) * T;
      ctx.drawImage(img, Math.min(T - 1, tx), 0, 1, T, sxp, cy - half, STRIP + 0.6, half * 2);
    }
    // Shade: side walls are a little darker, and fade into the fog with depth.
    this.poly([[x, -0.5, d], [x, -0.5, d + 1], [x, 0.5, d + 1], [x, 0.5, d]]);
    const grad = ctx.createLinearGradient(xa, 0, xb, 0);
    grad.addColorStop(0, withAlpha(pal.fog, 0.22 + 0.78 * this.fog(zNear)));
    grad.addColorStop(1, withAlpha(pal.fog, 0.22 + 0.78 * this.fog(d + 1)));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = Math.max(1, 2 * this.scaleAt(d));
    ctx.stroke();
  }

  // ── Walls ──────────────────────────────────────────────────────────────────

  private wallFront(s: number, d: number, pal: Palette, cx: number, cy: number): void {
    const ctx = this.ctx;
    const x0 = s - 0.5;
    const x1 = s + 0.5;
    const f = this.fog(d);
    this.poly([[x0, -0.5, d], [x1, -0.5, d], [x1, 0.5, d], [x0, 0.5, d]]);
    ctx.fillStyle = mix(pal.wall, pal.fog, f);
    ctx.fill();

    // Stone courses
    ctx.beginPath();
    for (let r = 1; r < 5; r++) {
      const y = -0.5 + r * 0.2;
      this.line([x0, y, d], [x1, y, d]);
      const offset = r % 2 === 0 ? 0.25 : 0;
      for (let c = 0; c < 2; c++) {
        const x = x0 + offset + c * 0.5;
        if (x > x0 && x < x1) this.line([x, y - 0.2, d], [x, y, d]);
      }
    }
    ctx.strokeStyle = mix(pal.wallEdge, pal.fog, f, 0.8);
    ctx.lineWidth = Math.max(1, 3 * this.scaleAt(d));
    ctx.stroke();

    this.moss([[x0, -0.5, d], [x1, -0.5, d]], cx * 7 + cy * 13, pal, f);

    this.poly([[x0, -0.5, d], [x1, -0.5, d], [x1, 0.5, d], [x0, 0.5, d]]);
    ctx.strokeStyle = mix(pal.wallEdge, pal.fog, f);
    ctx.lineWidth = Math.max(1, 4 * this.scaleAt(d));
    ctx.stroke();
  }

  /** Side face at lateral x, spanning depth d..d+1. side = -1 for faces on the left. */
  private wallSide(x: number, d: number, pal: Palette, cx: number, cy: number, side: number): void {
    const ctx = this.ctx;
    const f = this.fog(d + 0.5);
    const base = shade(pal.wall, -0.18 - 0.04 * side);
    this.poly([[x, -0.5, d], [x, -0.5, d + 1], [x, 0.5, d + 1], [x, 0.5, d]]);
    const [gx0] = this.project([x, 0, Math.max(d, Z_CLIP)]);
    const [gx1] = this.project([x, 0, d + 1]);
    const grad = ctx.createLinearGradient(gx0, 0, gx1, 0);
    grad.addColorStop(0, mix(base, pal.fog, this.fog(d)));
    grad.addColorStop(1, mix(base, pal.fog, this.fog(d + 1)));
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    for (let r = 1; r < 5; r++) {
      const y = -0.5 + r * 0.2;
      this.line([x, y, d], [x, y, d + 1]);
      const z = d + (r % 2 === 0 ? 0.25 : 0.75);
      this.line([x, y - 0.2, z], [x, y, z]);
    }
    ctx.strokeStyle = mix(pal.wallEdge, pal.fog, f, 0.75);
    ctx.lineWidth = Math.max(1, 3 * this.scaleAt(d));
    ctx.stroke();

    this.moss([[x, -0.5, d], [x, -0.5, d + 1]], cx * 11 + cy * 5 + side, pal, f);

    this.poly([[x, -0.5, d], [x, -0.5, d + 1], [x, 0.5, d + 1], [x, 0.5, d]]);
    ctx.strokeStyle = mix(pal.wallEdge, pal.fog, f);
    ctx.lineWidth = Math.max(1, 4 * this.scaleAt(d));
    ctx.stroke();
  }

  /** Hanging moss along the top edge of a face, deterministic per cell. */
  private moss(edge: [P3, P3], seed: number, pal: Palette, f: number): void {
    const ctx = this.ctx;
    const [a, b] = edge;
    const lerp = (t: number): P3 => [a[0] + (b[0] - a[0]) * t, -0.5, a[2] + (b[2] - a[2]) * t];
    ctx.fillStyle = mix(pal.moss, pal.fog, f, 0.85);
    // Band
    const top = [lerp(0), lerp(1)];
    this.poly([top[0], top[1], [top[1][0], -0.44, top[1][2]], [top[0][0], -0.44, top[0][2]]]);
    ctx.fill();
    // Drips
    let h = Math.abs(seed * 2654435761) % 1000;
    for (let i = 0; i < 5; i++) {
      h = (h * 9301 + 49297) % 233280;
      const t = 0.08 + (i / 5) * 0.84 + (h % 100) / 1200;
      const len = 0.06 + (h % 17) / 100;
      const p0 = lerp(t - 0.03);
      const p1 = lerp(t + 0.03);
      const tip = lerp(t);
      this.poly([[p0[0], -0.45, p0[2]], [p1[0], -0.45, p1[2]], [tip[0], -0.44 + len, tip[2]]]);
      ctx.fill();
    }
  }

  // ── Floor & objects ────────────────────────────────────────────────────────

  private floorCell(s: number, d: number, pal: Palette): void {
    const ctx = this.ctx;
    const x0 = s - 0.5;
    const x1 = s + 0.5;
    const f = this.fog(d + 0.5);
    this.poly([[x0, 0.5, d], [x1, 0.5, d], [x1, 0.5, d + 1], [x0, 0.5, d + 1]]);
    ctx.fillStyle = mix((s + d) % 2 === 0 ? pal.floor : shade(pal.floor, -0.08), pal.fog, f);
    ctx.fill();
    ctx.strokeStyle = mix(shade(pal.floor, -0.35), pal.fog, f, 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();

    this.poly([[x0, -0.5, d], [x1, -0.5, d], [x1, -0.5, d + 1], [x0, -0.5, d + 1]]);
    ctx.fillStyle = mix(pal.ceiling, pal.fog, f);
    ctx.fill();
  }

  private stairs(s: number, d: number, pal: Palette, time: number): void {
    const ctx = this.ctx;
    const z = d + 0.5;
    const f = this.fog(z);
    // Dark opening with steps going down
    this.poly([[s - 0.32, 0.5, z - 0.3], [s + 0.32, 0.5, z - 0.3], [s + 0.32, 0.5, z + 0.3], [s - 0.32, 0.5, z + 0.3]]);
    ctx.fillStyle = mix('#050505', pal.fog, f * 0.6);
    ctx.fill();
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      const zz = z - 0.3 + i * 0.15;
      this.line([s - 0.32, 0.5, zz], [s + 0.32, 0.5, zz]);
    }
    ctx.strokeStyle = mix('#8a7a5a', pal.fog, f, 0.9);
    ctx.lineWidth = Math.max(1, 3 * this.scaleAt(d));
    ctx.stroke();
    // Glow marker
    const [gx, gy] = this.project([s, 0.38, z]);
    const r = 60 * this.scaleAt(z);
    const pulse = 0.55 + 0.25 * Math.sin(time / 400);
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    glow.addColorStop(0, `rgba(255,220,140,${pulse * (1 - f)})`);
    glow.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
  }

  /** Stairs going up: a few steps rising towards a soft light from above. */
  private upStairs(s: number, d: number, pal: Palette, time: number): void {
    if (d === 0) return; // standing on it: nothing to see
    const ctx = this.ctx;
    const z = d + 0.5;
    const f = this.fog(z);
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const z0 = z - 0.35 + i * 0.17;
      const top = 0.5 - (i + 1) * 0.09;
      this.poly([[s - 0.3, top, z0], [s + 0.3, top, z0], [s + 0.3, top + 0.09, z0], [s - 0.3, top + 0.09, z0]]);
      ctx.fillStyle = mix(shade(pal.wall, 0.1 - i * 0.05), pal.fog, f);
      ctx.fill();
      this.poly([[s - 0.3, top, z0], [s + 0.3, top, z0], [s + 0.3, top, z0 + 0.17], [s - 0.3, top, z0 + 0.17]]);
      ctx.fillStyle = mix(shade(pal.wall, 0.25), pal.fog, f);
      ctx.fill();
    }
    const [gx, gy] = this.project([s, -0.3, z + 0.3]);
    const r = 90 * this.scaleAt(z);
    const pulse = 0.4 + 0.2 * Math.sin(time / 500);
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    glow.addColorStop(0, `rgba(200,255,210,${pulse * (1 - f)})`);
    glow.addColorStop(1, 'rgba(200,255,210,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
  }

  private chest(s: number, d: number, opened: boolean): void {
    const ctx = this.ctx;
    const z = d + 0.5;
    const f = this.fog(z);
    const wd = 0.22;
    const dp = 0.14;
    const top = opened ? 0.33 : 0.28;
    const wood = mix('#8a5a2b', '#000000', f);
    const dark = mix('#5a3a1b', '#000000', f);
    const gold = mix('#e8c25a', '#000000', f);
    // Front
    this.poly([[s - wd, top, z - dp], [s + wd, top, z - dp], [s + wd, 0.5, z - dp], [s - wd, 0.5, z - dp]]);
    ctx.fillStyle = wood;
    ctx.fill();
    // Lid
    if (opened) {
      this.poly([[s - wd, top, z + dp], [s + wd, top, z + dp], [s + wd, top - 0.16, z + dp + 0.02], [s - wd, top - 0.16, z + dp + 0.02]]);
      ctx.fillStyle = dark;
      ctx.fill();
      this.poly([[s - wd, top, z - dp], [s + wd, top, z - dp], [s + wd, top, z + dp], [s - wd, top, z + dp]]);
      ctx.fillStyle = '#100a05';
      ctx.fill();
    } else {
      this.poly([[s - wd, top, z - dp], [s + wd, top, z - dp], [s + wd, top - 0.04, z + dp], [s - wd, top - 0.04, z + dp]]);
      ctx.fillStyle = dark;
      ctx.fill();
      // Lock
      const [lx, ly] = this.project([s, top + 0.06, z - dp]);
      ctx.fillStyle = gold;
      const r = 14 * this.scaleAt(z);
      ctx.fillRect(lx - r / 2, ly - r / 2, r, r);
    }
    // Bands
    ctx.beginPath();
    this.line([s - wd * 0.6, top, z - dp], [s - wd * 0.6, 0.5, z - dp]);
    this.line([s + wd * 0.6, top, z - dp], [s + wd * 0.6, 0.5, z - dp]);
    ctx.strokeStyle = gold;
    ctx.lineWidth = Math.max(1, 6 * this.scaleAt(z));
    ctx.stroke();
  }

  private spring(s: number, d: number, time: number, used: boolean): void {
    const ctx = this.ctx;
    const z = d + 0.5;
    const f = this.fog(z);
    const [cx, cy] = this.project([s, 0.5, z]);
    const [ex] = this.project([s + 0.36, 0.5, z]);
    const rx = ex - cx;
    const ry = rx * 0.32;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = mix(used ? '#3a5a6a' : '#3fb6d8', '#000000', f);
    ctx.fill();
    ctx.strokeStyle = mix('#a8e8f8', '#000000', f, 0.8);
    ctx.lineWidth = Math.max(1, 4 * this.scaleAt(z));
    ctx.stroke();
    if (!used) {
      const shimmer = 0.4 + 0.3 * Math.sin(time / 300);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.55, ry * 0.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(220,250,255,${shimmer * (1 - f)})`;
      ctx.stroke();
      const glow = ctx.createRadialGradient(cx, cy - ry, 0, cx, cy - ry, rx * 1.4);
      glow.addColorStop(0, `rgba(120,220,255,${0.35 * (1 - f)})`);
      glow.addColorStop(1, 'rgba(120,220,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - rx * 1.4, cy - ry - rx * 1.4, rx * 2.8, rx * 2.8);
    }
  }

  /** A prowler: the monster's dark silhouette wrapped in a smouldering aura. */
  private prowler(s: number, d: number, def: (typeof ENEMIES)[string], time: number, chasing: boolean): void {
    const ctx = this.ctx;
    const z = d + 0.5;
    const f = this.fog(z);
    const [gx, gy] = this.project([s, 0.5, z]);
    const u = this.w * this.scaleAt(z) * 0.5;
    const pulse = 0.5 + 0.5 * Math.sin(time / (chasing ? 120 : 380));

    // Aura
    const aura = ctx.createRadialGradient(gx, gy - u * 0.5, 0, gx, gy - u * 0.5, u * 1.1);
    const glow = chasing ? '255,60,30' : '255,140,40';
    aura.addColorStop(0, `rgba(${glow},${(0.35 + 0.25 * pulse) * (1 - f)})`);
    aura.addColorStop(1, `rgba(${glow},0)`);
    ctx.fillStyle = aura;
    ctx.fillRect(gx - u * 1.1, gy - u * 1.6, u * 2.2, u * 2.2);

    // Silhouette, drawn off-screen so it can be filled with a single dark tone
    const size = Math.ceil(u * 2.6);
    if (size < 4) return;
    const off = this.scratch(size);
    const octx = off.getContext('2d')!;
    octx.clearRect(0, 0, size, size);
    drawMonster(octx, def, size / 2, size * 0.92, u, time);
    octx.globalCompositeOperation = 'source-atop';
    octx.fillStyle = `rgba(12,6,16,${0.88 - 0.3 * f})`;
    octx.fillRect(0, 0, size, size);
    octx.globalCompositeOperation = 'source-over';
    ctx.drawImage(off, 0, 0, size, size, gx - size / 2, gy - size * 0.92, size, size);
  }

  private scratchCanvas: HTMLCanvasElement | null = null;

  private scratch(size: number): HTMLCanvasElement {
    if (!this.scratchCanvas) this.scratchCanvas = document.createElement('canvas');
    if (this.scratchCanvas.width < size) {
      this.scratchCanvas.width = size;
      this.scratchCanvas.height = size;
    }
    return this.scratchCanvas;
  }

  private bossSigil(s: number, d: number, time: number): void {
    const ctx = this.ctx;
    const z = d + 0.5;
    const f = this.fog(z);
    const [cx, cy] = this.project([s, 0.5, z]);
    const [ex] = this.project([s + 0.42, 0.5, z]);
    const rx = ex - cx;
    const pulse = 0.5 + 0.35 * Math.sin(time / 250);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.32);
    ctx.strokeStyle = `rgba(255,70,60,${pulse * (1 - f * 0.7)})`;
    ctx.lineWidth = Math.max(1.5, 8 * this.scaleAt(z));
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5 + time / 3000;
      const px = Math.cos(a) * rx * 0.85;
      const py = Math.sin(a) * rx * 0.85;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * 1.5);
    glow.addColorStop(0, `rgba(255,60,40,${0.3 * pulse * (1 - f)})`);
    glow.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - rx * 1.5, cy - rx * 1.5, rx * 3, rx * 3);
  }
}

/** The point on segment a→b where it crosses the near plane. */
function cut(a: P3, b: P3): P3 {
  const t = (Z_CLIP - a[2]) / (b[2] - a[2]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Z_CLIP];
}
