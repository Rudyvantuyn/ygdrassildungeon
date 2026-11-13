import { ENEMIES } from '../core/data/enemies';
import type { Palette } from '../core/data/floors';
import { isGatherTile, relCell, tileAt } from '../core/dungeon';
import { GATHER_KINDS, type GatherKind } from '../core/data/gathering';
import { drawIcon, type IconId } from './icons';
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

    // Per screen column, the nearest depth with a wall face across it: walls hidden behind it are skipped.
    const cov = (this.cover ??= new Uint8Array(w));
    cov.fill(255);
    for (let d = 1; d <= MAX_DEPTH; d++) {
      const lat = Math.ceil(((d + 1 + EYE) * this.w) / (2 * this.sx) + 0.5);
      for (let s = -lat; s <= lat; s++) {
        const c = relCell(px, py, dir, d, s);
        if (tileAt(game.map, c.x, c.y) !== 'wall') continue;
        const [x0] = this.project([s - 0.5, -0.5, d]);
        const [x1] = this.project([s + 0.5, 0.5, d]);
        for (let i = Math.max(0, Math.ceil(x0)); i < Math.min(w, Math.floor(x1)); i++) if (cov[i] > d) cov[i] = d;
      }
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
          if (d > 0) {
            // Everything standing in the corridor is modelled in 3D from the floor's own stone and drawn at a
            // third of the resolution, so it has the same chunky pixels as the walls around it.
            const down = tile === 'stairs' || (tile === 'link' && game.linkGoesDown(cell.x, cell.y));
            const up = tile === 'up' || (tile === 'link' && !down);
            if (down || up || tile === 'chest' || tile === 'spring' || tile === 'gate' || isGatherTile(tile)) {
              this.pixelated(() => {
                if (down) this.stairs(s, d, pal, time);
                else if (up) this.upStairs(s, d, pal, time);
                else if (tile === 'chest') this.chest(s, d, game.isChestOpened(cell.x, cell.y), pal);
                else if (tile === 'spring') this.spring(s, d, time, game.progress.springUsed, pal);
                else if (tile === 'gate') this.rootGate(s, d, pal, time);
                else if (isGatherTile(tile)) this.gatherSpot(s, d, tile, time, pal);
              });
            }
          }
          if (tile === 'boss' && d > 0 && !game.progress.bossDefeated) this.bossSigil(s, d, time);
          if (isGatherTile(tile) && d > 0) this.gatherSpot(s, d, tile, time, pal);
          const prowler = d > 0 ? game.prowlerAt(cell.x, cell.y) : -1;
          if (prowler >= 0) {
            const def = ENEMIES[game.floorDef.prowlers[prowler].enemies[0]];
            this.prowler(s, d, def, time + prowler * 911, game.progress.prowlers[prowler].chasing);
          }
        }
      }
    }

    // The party's torchlight and the vignette never change: they are painted once and reused.
    const key = `${w}x${h}`;
    if (this.overlayCache?.key !== key) {
      const layer = () => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
      };
      const glowCanvas = layer();
      const g = glowCanvas.getContext('2d')!;
      const glow = g.createRadialGradient(this.cx, h * 0.95, 0, this.cx, h * 0.8, w * 0.6);
      glow.addColorStop(0, 'rgba(255,170,90,0.16)');
      glow.addColorStop(1, 'rgba(255,170,90,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);
      const canvas = layer();
      const v = canvas.getContext('2d')!;
      const vignette = v.createRadialGradient(this.cx, this.cy, h * 0.25, this.cx, this.cy, w * 0.75);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
      v.fillStyle = vignette;
      v.fillRect(0, 0, w, h);
      this.overlayCache = { key, canvas, glow: glowCanvas };
    }
    // The torchlight (a soft warm glow on what is close) only on painted floors.
    if (tex) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(this.overlayCache.glow, 0, 0);
      ctx.restore();
    }
    ctx.drawImage(this.overlayCache.canvas, 0, 0);
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
    const cov = this.cover!;
    for (let sxp = lo; sxp < hi; sxp += STRIP) {
      // Behind a nearer wall face on both edges of this strip: nothing of it would show.
      const ci = sxp | 0;
      if (cov[ci] <= d && cov[Math.min(this.w - 1, ci + STRIP)] <= d) continue;
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

  /**
   * Fills the current path with this floor's wall texture (so stairs are built from the same stone as the
   * corridor), darkened by `dark` (0–1) and by the fog at depth z. Falls back to a flat colour.
   */
  private stoneFill(pal: Palette, z: number, dark: number, base = pal.wall): void {
    const ctx = this.ctx;
    const tex = this.textureSet(pal);
    const f = this.fog(z);
    if (tex) {
      const px = Math.max(16, 260 * this.scaleAt(z));
      const img = this.wallFor(tex, px);
      const pattern = ctx.createPattern(img, 'repeat')!;
      const k = px / img.width;
      pattern.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
      ctx.fillStyle = pattern;
      ctx.fill();
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.92, dark)})`;
      ctx.fill();
      if (f > 0.02) {
        ctx.fillStyle = withAlpha(pal.fog, f);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = mix(shade(base, -dark), pal.fog, f);
      ctx.fill();
    }
  }

  /** Stairs going down: a stone stairwell in the floor, steps sinking into the dark, a warm glow from below. */
  private stairs(s: number, d: number, pal: Palette, time: number): void {
    const ctx = this.ctx;
    const x0 = s - 0.4;
    const x1 = s + 0.4;
    const z0 = d + 0.12;
    const z1 = d + 0.9;
    const f = this.fog(d + 0.5);
    // The opening, as seen on the floor: everything below it is clipped to it.
    this.poly([[x0, 0.5, z0], [x1, 0.5, z0], [x1, 0.5, z1], [x0, 0.5, z1]]);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = mix('#020202', pal.fog, f * 0.5);
    ctx.fill();
    // The steps start at the far rim and go down towards you, so their treads face up into view.
    const steps = 6;
    const rise = 0.07;
    const run = (z1 - z0) / steps;
    for (let k = 0; k < steps; k++) {
      const zFar = z1 - k * run;
      const zNear = zFar - run;
      const top = 0.5 + (k + 1) * rise;
      // Tread, then the drop to the next step down (it faces you).
      this.poly([[x0, top, zNear], [x1, top, zNear], [x1, top, zFar], [x0, top, zFar]]);
      this.stoneFill(pal, zFar, 0.12 + k * 0.1);
      {
        ctx.fillStyle = `rgba(232,220,192,${0.2 * (1 - k / steps) * (1 - f)})`;
        ctx.fill();
        ctx.beginPath();
        this.line([x0, top, zNear], [x1, top, zNear]);
        ctx.strokeStyle = `rgba(232,220,192,${0.45 * (1 - k / steps) * (1 - f)})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      this.poly([[x0, top, zNear], [x1, top, zNear], [x1, top + rise, zNear], [x0, top + rise, zNear]]);
      this.stoneFill(pal, zNear, 0.75);
    }
    // The far wall of the stairwell, above the first step.
    this.poly([[x0, 0.5, z1], [x1, 0.5, z1], [x1, 0.5 + rise, z1], [x0, 0.5 + rise, z1]]);
    this.stoneFill(pal, z1, 0.6);
    // Warm light breathing up out of the dark.
    const [gx, gy] = this.project([s, 0.5 + rise * steps, z0 + run]);
    const r = 120 * this.scaleAt(d + 0.5);
    const pulse = 0.35 + 0.15 * Math.sin(time / 450);
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    glow.addColorStop(0, `rgba(255,180,90,${pulse * (1 - f)})`);
    glow.addColorStop(1, 'rgba(255,180,90,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
    ctx.restore();
    // A stone rim around the opening.
    this.poly([[x0, 0.5, z0], [x1, 0.5, z0], [x1, 0.5, z1], [x0, 0.5, z1]]);
    ctx.strokeStyle = mix('#0a0a0a', pal.fog, f, 0.9);
    ctx.lineWidth = Math.max(1, 5 * this.scaleAt(d + 0.5));
    ctx.stroke();
    this.curb(s, d, pal);
  }

  /** Stairs going up: solid stone steps climbing to a pale light at the ceiling. */
  private upStairs(s: number, d: number, pal: Palette, time: number): void {
    if (d === 0) return; // standing on it: nothing to see
    const ctx = this.ctx;
    const x0 = s - 0.42;
    const x1 = s + 0.42;
    const steps = 6;
    const zStart = d + 0.1;
    const run = 0.85 / steps;
    const rise = 0.075;
    const edge = Math.max(1, 2 * this.scaleAt(d + 0.5));
    // From the far (high) steps to the near (low) ones, so nearer steps cover the ones behind.
    for (let k = steps - 1; k >= 0; k--) {
      const za = zStart + k * run;
      const top = 0.5 - (k + 1) * rise;
      // The side facing the middle of the view, for stairs off to one side.
      if (s !== 0) {
        const xs = s < 0 ? x1 : x0;
        this.poly([[xs, top, za], [xs, top, d + 1], [xs, 0.5, d + 1], [xs, 0.5, za]]);
        this.stoneFill(pal, za, 0.55);
      }
      this.poly([[x0, top, za], [x1, top, za], [x1, top, za + run], [x0, top, za + run]]);
      this.stoneFill(pal, za, 0.05);
      ctx.fillStyle = `rgba(232,220,192,${0.18 * (1 - this.fog(za))})`;
      ctx.fill();
      this.poly([[x0, top, za], [x1, top, za], [x1, top + rise, za], [x0, top + rise, za]]);
      this.stoneFill(pal, za, 0.7);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = edge;
      ctx.stroke();
    }
    // Pale daylight falling from above.
    const [gx, gy] = this.project([s, -0.45, d + 0.95]);
    const r = 110 * this.scaleAt(d + 0.5);
    const pulse = 0.3 + 0.12 * Math.sin(time / 500);
    const f = this.fog(d + 0.5);
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    glow.addColorStop(0, `rgba(220,240,255,${pulse * (1 - f)})`);
    glow.addColorStop(1, 'rgba(220,240,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
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
  /** Nearest covering wall depth per screen column, for the frame being drawn. */
  private cover: Uint8Array | null = null;
  /** The torchlight and vignette, which never change: drawn once. */
  private overlayCache: { key: string; canvas: HTMLCanvasElement; glow: HTMLCanvasElement } | null = null;

  private scratch(size: number): HTMLCanvasElement {
    if (!this.scratchCanvas) this.scratchCanvas = document.createElement('canvas');
    if (this.scratchCanvas.width < size || this.scratchCanvas.height < size) {
      this.scratchCanvas.width = size;
      this.scratchCanvas.height = size;
    }
    return this.scratchCanvas;
  }

  /** A painted icon hovering in the corridor, with a soft glow; fades with the fog. False until it has loaded. */
  private floatingIcon(id: IconId, x: number, y: number, size: number, fog: number, glowColor: string): boolean {
    const ctx = this.ctx;
    if (size < 6 || fog > 0.92) return true;
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = size * 0.35;
    const drawn = drawIcon(ctx, id, x, y, size, false, 1 - fog);
    ctx.restore();
    return drawn;
  }

  /** A gathering spot, modelled like the other props, with the kind's medallion hovering above it. */
  private gatherSpot(s: number, d: number, kind: GatherKind, time: number, pal: Palette): void {
    const ctx = this.ctx;
    const cz = d + 0.5;
    const f = this.fog(cz);
    if (kind === 'forage') this.herbs(s, cz, pal);
    else if (kind === 'mine') this.oreRock(s, cz, time, pal);
    else if (kind === 'fell') this.stump(s, cz, pal);
    else this.pool(s, cz, time, pal);
    const [cx, cy] = this.project([s, 0.5, cz]);
    const [ex] = this.project([s + 0.3, 0.5, cz]);
    const rx = ex - cx;
    const bob = Math.sin(time / 500 + s) * rx * 0.08;
    if (!this.floatingIcon(kind, cx, cy - rx * 1.75 + bob, rx * 0.6, f, GATHER_KINDS[kind].color)) {
      ctx.fillStyle = withAlpha(GATHER_KINDS[kind].color, 1 - f);
      ctx.fillRect(cx - 4, cy - rx * 1.75 - 4, 8, 8);
    }
  }

  /** A flat disc on the floor, as a polygon. */
  private disc(x: number, z: number, rx: number, rz: number, y = 0.5, n = 18): P3[] {
    return Array.from({ length: n }, (_, i): P3 => [x + Math.cos((i / n) * Math.PI * 2) * rx, y, z + Math.sin((i / n) * Math.PI * 2) * rz]);
  }

  /** Herbs: a mossy mound with ferns and a cluster of mushrooms. */
  private herbs(s: number, cz: number, pal: Palette): void {
    this.face(this.disc(s, cz, 0.32, 0.22), '#1e2a16', cz, pal);
    this.face(this.disc(s, cz, 0.24, 0.15, 0.49), '#2f4220', cz, pal);
    // Fern fronds fanning out behind the mushrooms.
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.12 + (i / 6) * 0.76);
      const bx = s + Math.cos(a) * 0.05, tipX = s + Math.cos(a) * 0.3, tipY = 0.5 - Math.sin(a) * 0.26;
      this.face([[bx - 0.02, 0.5, cz + 0.06], [tipX, tipY, cz + 0.08], [bx + 0.02, 0.5, cz + 0.06]], i % 2 ? '#4a6a2c' : '#6f8f3a', cz, pal);
    }
    const shrooms: [number, number, number, number][] = [[-0.13, 0.04, 0.17, 0.095], [0.11, 0.02, 0.22, 0.12], [0.0, -0.07, 0.11, 0.08], [0.23, -0.05, 0.08, 0.06], [-0.23, -0.06, 0.07, 0.055]];
    for (const [dx, dz, h, r] of shrooms) {
      const x = s + dx, z = cz + dz, top = 0.5 - h;
      this.face([[x - r * 0.28, top, z], [x + r * 0.28, top, z], [x + r * 0.28, 0.5, z], [x - r * 0.28, 0.5, z]], '#c2b98c', z, pal);
      const cap: P3[] = [];
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI;
        cap.push([x + Math.cos(a) * r, top - Math.sin(a) * r * 0.75, z]);
      }
      this.face(cap, '#a8461f', z, pal);
      this.face(cap.slice(2, 7).map(([px, py, pz]): P3 => [x + (px - x) * 0.6, top - (top - py) * 1.0 - 0.003, pz]), '#e2672a', z, pal);
      this.face([[x - r * 0.2, top - r * 0.45, z], [x - r * 0.05, top - r * 0.45, z], [x - r * 0.05, top - r * 0.3, z], [x - r * 0.2, top - r * 0.3, z]], '#e8dcc0', z, pal);
      this.poly(cap);
      this.ctx.strokeStyle = mix('#3a1610', pal.fog, this.fog(z));
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  /** An ore rock: a boulder with gold veins that glint. */
  private oreRock(s: number, cz: number, time: number, pal: Palette): void {
    const ctx = this.ctx;
    const f = this.fog(cz);
    const z0 = cz - 0.08, z1 = cz + 0.18;
    const front: [number, number][] = [[-0.32, 0.5], [-0.36, 0.3], [-0.22, 0.12], [0.0, 0.05], [0.2, 0.1], [0.35, 0.28], [0.31, 0.5]];
    this.face(this.disc(s, cz + 0.04, 0.4, 0.22), '#0b0907', cz, pal);
    // Top: the upper edge pulled back, so the rock has a lit top.
    const ridge = front.slice(1, 6);
    this.poly([...ridge.map(([x, y]): P3 => [s + x, y, z0]), ...ridge.slice().reverse().map(([x, y]): P3 => [s + x * 0.8, y + 0.03, z1])]);
    this.stoneFill(pal, cz, 0.0);
    ctx.fillStyle = `rgba(194,185,140,${0.5 * (1 - f)})`;
    ctx.fill();
    this.poly(front.map(([x, y]): P3 => [s + x, y, z0]));
    this.stoneFill(pal, z0, 0.1);
    ctx.fillStyle = `rgba(115,112,82,${0.45 * (1 - f)})`;
    ctx.fill();
    ctx.strokeStyle = mix('#0b0907', pal.fog, f);
    ctx.lineWidth = 3;
    ctx.stroke();
    // Veins
    const veins: [number, number][][] = [[[-0.25, 0.4], [-0.12, 0.3], [-0.02, 0.33], [0.1, 0.22]], [[0.02, 0.46], [0.12, 0.38], [0.24, 0.36]], [[-0.18, 0.22], [-0.08, 0.18]]];
    ctx.beginPath();
    for (const v of veins) for (let i = 0; i + 1 < v.length; i++) this.line([s + v[i][0], v[i][1], z0 - 0.002], [s + v[i + 1][0], v[i + 1][1], z0 - 0.002]);
    ctx.strokeStyle = mix('#d6a95c', pal.fog, f);
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = mix('#f0cf6a', pal.fog, f);
    ctx.lineWidth = 3;
    ctx.stroke();
    // Glints
    for (let i = 0; i < 3; i++) {
      const v = veins[i][1];
      const a = Math.max(0, Math.sin(time / 300 + i * 2.1));
      const [gx, gy] = this.project([s + v[0], v[1], z0]);
      ctx.fillStyle = `rgba(255,248,220,${a * (1 - f)})`;
      ctx.fillRect(gx - 9, gy - 3, 18, 6);
      ctx.fillRect(gx - 3, gy - 9, 6, 18);
    }
    // Rubble
    for (const [dx, dz, r] of [[-0.36, -0.12, 0.04], [0.38, -0.1, 0.035], [0.2, -0.16, 0.03]]) {
      this.poly([[s + dx - r, 0.5, cz + dz], [s + dx + r, 0.5, cz + dz], [s + dx + r * 0.6, 0.5 - r * 1.2, cz + dz], [s + dx - r * 0.7, 0.5 - r, cz + dz]]);
      this.stoneFill(pal, cz, 0.2);
    }
  }

  /** A felled tree: a stump with its rings showing, roots and chips around it. */
  private stump(s: number, cz: number, pal: Palette): void {
    const ctx = this.ctx;
    const f = this.fog(cz);
    const R = 0.2, top = 0.3, N = 16;
    const at = (r: number, a: number, y: number): P3 => [s + Math.cos(a) * r, y, cz + Math.sin(a) * r * 0.9];
    this.face(this.disc(s, cz, 0.36, 0.26), '#0b0907', cz, pal);
    // Roots spreading over the floor.
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.85 + (i / 4) * 1.3);
      this.face([at(R * 0.8, a - 0.25, 0.5), at(R * 2.0, a, 0.5), at(R * 0.8, a + 0.25, 0.5), at(R * 0.95, a, 0.44)], '#3a281a', cz, pal);
    }
    // Bark, only the half facing us.
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      if (Math.sin((a0 + a1) / 2) > 0) continue;
      const lit = 0.5 - 0.5 * Math.cos((a0 + a1) / 2 + 0.6);
      const ragged = 0.012 * Math.sin(i * 2.7);
      this.face([at(R, a0, top + ragged), at(R, a1, top - ragged), at(R, a1, 0.5), at(R, a0, 0.5)], mix('#241a12', '#6b4a2c', lit), cz, pal);
    }
    // The cut face with its rings.
    this.face(this.disc(s, cz, R, R * 0.9, top, N), '#d6a95c', cz, pal);
    ctx.lineWidth = 2;
    ctx.strokeStyle = mix('#8a6238', pal.fog, f);
    for (const k of [0.75, 0.5, 0.25]) {
      this.poly(this.disc(s, cz, R * k, R * 0.9 * k, top, N));
      ctx.stroke();
    }
    this.poly(this.disc(s, cz, R, R * 0.9, top, N));
    ctx.strokeStyle = mix('#241a12', pal.fog, f);
    ctx.lineWidth = 3;
    ctx.stroke();
    // Chips
    for (const [dx, dz] of [[-0.3, -0.15], [0.27, -0.2], [0.05, -0.27], [-0.12, -0.3]]) {
      this.face([[s + dx, 0.5, cz + dz], [s + dx + 0.05, 0.5, cz + dz + 0.01], [s + dx + 0.04, 0.5, cz + dz + 0.04], [s + dx - 0.01, 0.5, cz + dz + 0.03]], '#ad8248', cz, pal);
    }
  }

  /** A fishing pool: dark water in the floor, a stone edge, reeds at the back and a fish circling. */
  private pool(s: number, cz: number, time: number, pal: Palette): void {
    const ctx = this.ctx;
    const f = this.fog(cz);
    // Reeds at the back.
    for (let i = 0; i < 9; i++) {
      const x = s - 0.3 + (i / 8) * 0.6, z = cz + 0.22 + (i % 3) * 0.02, hgt = 0.18 + ((i * 37) % 10) / 60;
      const sway = Math.sin(time / 900 + i) * 0.015;
      ctx.beginPath();
      this.line([x, 0.5, z], [x + sway, 0.5 - hgt, z]);
      ctx.strokeStyle = mix(i % 2 ? '#4a6a2c' : '#6f8f3a', pal.fog, f);
      ctx.lineWidth = 3;
      ctx.stroke();
      if (i % 2 === 0) this.face([[x + sway - 0.012, 0.5 - hgt, z], [x + sway + 0.012, 0.5 - hgt, z], [x + sway + 0.012, 0.5 - hgt + 0.05, z], [x + sway - 0.012, 0.5 - hgt + 0.05, z]], '#4f3a26', z, pal);
    }
    this.face(this.disc(s, cz, 0.36, 0.24), '#0e1c24', cz, pal);
    this.face(this.disc(s, cz, 0.3, 0.19, 0.5), '#183140', cz, pal);
    // A fish's shadow circling under the surface.
    const a = time / 1400;
    const fx = s + Math.cos(a) * 0.15, fz = cz + Math.sin(a) * 0.09;
    this.face(this.disc(fx, fz, 0.05, 0.025, 0.5, 8), '#0e1c24', cz, pal);
    for (let k = 0; k < 2; k++) {
      const t = (time / 1700 + k * 0.5) % 1;
      this.poly(this.disc(s, cz, 0.06 + 0.2 * t, 0.04 + 0.13 * t));
      ctx.strokeStyle = `rgba(159,207,212,${(1 - t) * 0.7 * (1 - f)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Edge stones on the near side.
    for (let i = 0; i < 7; i++) {
      const ang = Math.PI * (1.05 + (i / 6) * 0.9);
      const x = s + Math.cos(ang) * 0.36, z = cz + Math.sin(ang) * 0.24, r = 0.045 + (i % 2) * 0.015;
      this.poly([[x - r, 0.5, z], [x + r, 0.5, z], [x + r * 0.7, 0.5 - r * 0.9, z], [x - r * 0.8, 0.5 - r * 0.8, z]]);
      this.stoneFill(pal, z, 0.1);
    }
  }

  /** A closed root gate: twisted roots grown across the passage, bound together, with a glowing knot. */
  private rootGate(s: number, d: number, pal: Palette, time: number): void {
    const ctx = this.ctx;
    const z = d + 0.5;
    const f = this.fog(z);
    const bar = (x: number, w: number, phase: number): P3[] => {
      const left: P3[] = [], right: P3[] = [];
      for (let i = 0; i <= 10; i++) {
        const y = -0.5 + i / 10;
        const wob = Math.sin(i * 0.9 + phase) * 0.025;
        left.push([x + wob - w, y, z]);
        right.push([x + wob + w, y, z]);
      }
      return [...left, ...right.reverse()];
    };
    for (let i = -2; i <= 2; i++) {
      const x = s + i * 0.19;
      this.face(bar(x, 0.045, i * 1.7), '#3a281a', z, pal);
      this.face(bar(x - 0.015, 0.02, i * 1.7), '#6b4a2c', z, pal);
      this.poly(bar(x, 0.045, i * 1.7));
      ctx.strokeStyle = mix('#0b0907', pal.fog, f);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    for (const y of [-0.22, 0.2]) {
      this.poly([[s - 0.48, y - 0.03, z - 0.01], [s + 0.48, y + 0.01, z - 0.01], [s + 0.48, y + 0.06, z - 0.01], [s - 0.48, y + 0.03, z - 0.01]]);
      ctx.fillStyle = mix('#4f3a26', pal.fog, f);
      ctx.fill();
      ctx.strokeStyle = mix('#0b0907', pal.fog, f);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    const [kx, ky] = this.project([s, 0, z - 0.02]);
    const r = 34 * this.scaleAt(z);
    const pulse = 0.55 + 0.25 * Math.sin(time / 500);
    const glow = ctx.createRadialGradient(kx, ky, 0, kx, ky, r * 2.2);
    glow.addColorStop(0, `rgba(240,207,106,${pulse * 0.6 * (1 - f)})`);
    glow.addColorStop(1, 'rgba(240,207,106,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(kx - r * 2.2, ky - r * 2.2, r * 4.4, r * 4.4);
    ctx.beginPath();
    ctx.arc(kx, ky, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(240,207,106,${(0.6 + 0.4 * pulse) * (1 - f)})`;
    ctx.lineWidth = Math.max(3, r * 0.3);
    ctx.stroke();
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
    // The guardian's medallion hovers over the sigil, so it reads from a distance.
    const bob = Math.sin(time / 450 + s) * rx * 0.06;
    this.floatingIcon('boss', cx, cy - rx * 1.25 + bob, rx * 1.05, f, '#ff5a40');
  }

  // ── Props, modelled in 3D ──────────────────────────────────────────────────

  private lowCanvas: HTMLCanvasElement | null = null;
  /** Draws fn into a canvas at a third of the resolution, then scales it up with hard pixel edges. */
  private pixelated(fn: () => void): void {
    const P = 3;
    const lw = Math.ceil(this.w / P), lh = Math.ceil(this.h / P);
    const low = (this.lowCanvas ??= document.createElement('canvas'));
    if (low.width !== lw) { low.width = lw; low.height = lh; }
    const g = low.getContext('2d')!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, lw, lh);
    g.setTransform(1 / P, 0, 0, 1 / P, 0, 0);
    g.imageSmoothingEnabled = false;
    const self = this as unknown as { ctx: CanvasRenderingContext2D };
    const real = self.ctx;
    self.ctx = g;
    try { fn(); } finally { self.ctx = real; }
    real.imageSmoothingEnabled = false;
    real.drawImage(low, 0, 0, lw, lh, 0, 0, lw * P, lh * P);
    real.imageSmoothingEnabled = true;
  }

  private face(points: P3[], color: string, z: number, pal: Palette): void {
    this.poly(points);
    this.ctx.fillStyle = mix(color, pal.fog, this.fog(z));
    this.ctx.fill();
  }

  /** A raised stone curb around a stairwell, so the opening reads from afar. */
  private curb(s: number, d: number, pal: Palette): void {
    const x0 = s - 0.46, x1 = s + 0.46, z0 = d + 0.06, z1 = d + 0.96, t = 0.06, hgt = 0.035;
    const top = 0.5 - hgt;
    this.poly([[x0, top, z1 - t], [x1, top, z1 - t], [x1, top, z1], [x0, top, z1]]);
    this.stoneFill(pal, z1, 0.1);
    for (const [a, b] of [[x0, x0 + t], [x1 - t, x1]]) {
      this.poly([[a, top, z0], [b, top, z0], [b, top, z1], [a, top, z1]]);
      this.stoneFill(pal, d + 0.5, 0.0);
    }
    this.poly([[x0, top, z0], [x1, top, z0], [x1, top, z0 + t], [x0, top, z0 + t]]);
    this.stoneFill(pal, z0, 0.0);
    this.poly([[x0, top, z0], [x1, top, z0], [x1, 0.5, z0], [x0, 0.5, z0]]);
    this.stoneFill(pal, z0, 0.35);
  }


  /** A wooden chest with iron bands and a rounded lid, modelled in 3D. */
  private chest(s: number, d: number, opened: boolean, pal: Palette): void {
    const ctx = this.ctx;
    const z0 = d + 0.28, z1 = d + 0.62, xa = s - 0.3, xb = s + 0.3, yb = 0.5, yt = 0.27;
    const zc = (z0 + z1) / 2, f = this.fog(zc);
    this.poly([[xa - 0.05, yb, z0 - 0.04], [xb + 0.05, yb, z0 - 0.04], [xb + 0.05, yb, z1 + 0.05], [xa - 0.05, yb, z1 + 0.05]]);
    ctx.fillStyle = `rgba(0,0,0,${0.45 * (1 - f)})`;
    ctx.fill();
    if (s !== 0) {
      const xs = s < 0 ? xb : xa;
      this.face([[xs, yt, z0], [xs, yt, z1], [xs, yb, z1], [xs, yb, z0]], '#3a281a', zc, pal);
    }
    const R = (z1 - z0) / 2;
    const seg = 6;
    const lidPt = (a: number, x: number): P3 => [x, yt - Math.sin(a) * R * 0.75, zc + Math.cos(a) * R];
    if (opened) {
      this.face([[xa, yt, z0], [xb, yt, z0], [xb, yt, z1], [xa, yt, z1]], '#0b0907', zc, pal);
      this.face([[xa, yt, z1], [xb, yt, z1], [xb, yt - 0.28, z1 + 0.04], [xa, yt - 0.28, z1 + 0.04]], '#4f3a26', z1, pal);
    } else {
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI, a1 = ((i + 1) / seg) * Math.PI;
        const lit = Math.sin((a0 + a1) / 2 + 0.5);
        const col = mix('#4f3a26', '#ad8248', Math.max(0, lit));
        this.face([lidPt(a0, xa), lidPt(a0, xb), lidPt(a1, xb), lidPt(a1, xa)], col, zc, pal);
        ctx.strokeStyle = mix('#241a12', pal.fog, f);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      for (const bx of [xa + 0.06, xb - 0.06]) {
        for (let i = 0; i < seg; i++) {
          const a0 = (i / seg) * Math.PI, a1 = ((i + 1) / seg) * Math.PI;
          this.face([lidPt(a0, bx - 0.025), lidPt(a0, bx + 0.025), lidPt(a1, bx + 0.025), lidPt(a1, bx - 0.025)], i > 2 ? '#737052' : '#3b3a2c', zc, pal);
        }
      }
    }
    this.face([[xa, yt, z0], [xb, yt, z0], [xb, yb, z0], [xa, yb, z0]], '#6b4a2c', z0, pal);
    ctx.beginPath();
    for (const y of [0.37, 0.44]) this.line([xa, y, z0], [xb, y, z0]);
    ctx.strokeStyle = mix('#3a281a', pal.fog, f);
    ctx.lineWidth = 3;
    ctx.stroke();
    for (const bx of [xa + 0.06, xb - 0.06]) this.face([[bx - 0.025, yt, z0], [bx + 0.025, yt, z0], [bx + 0.025, yb, z0], [bx - 0.025, yb, z0]], '#55533e', z0, pal);
    if (!opened) {
      this.face([[s - 0.045, yt - 0.01, z0 - 0.005], [s + 0.045, yt - 0.01, z0 - 0.005], [s + 0.045, yt + 0.08, z0 - 0.005], [s - 0.045, yt + 0.08, z0 - 0.005]], '#d6a95c', z0, pal);
      this.face([[s - 0.01, yt + 0.025, z0 - 0.006], [s + 0.01, yt + 0.025, z0 - 0.006], [s + 0.01, yt + 0.06, z0 - 0.006], [s - 0.01, yt + 0.06, z0 - 0.006]], '#17110b', z0, pal);
    }
    this.poly([[xa, yt, z0], [xb, yt, z0], [xb, yb, z0], [xa, yb, z0]]);
    ctx.strokeStyle = mix('#17110b', pal.fog, f);
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  /** A round stone basin of spring water with a carved standing stone behind it. */
  private spring(s: number, d: number, time: number, used: boolean, pal: Palette): void {
    const ctx = this.ctx;
    const cz = d + 0.5, R = 0.3, r = 0.24, yt = 0.33, yw = 0.37, yb = 0.5, N = 20;
    const f = this.fog(cz);
    const at = (rad: number, a: number, y: number): P3 => [s + Math.cos(a) * rad, y, cz + Math.sin(a) * rad];
    const sz = cz + R + 0.02;
    this.poly([[s - 0.1, 0.5, sz], [s + 0.1, 0.5, sz], [s + 0.09, -0.02, sz], [s, -0.08, sz], [s - 0.09, -0.02, sz]]);
    this.stoneFill(pal, sz, 0.0);
    ctx.fillStyle = `rgba(194,185,140,${0.25 * (1 - f)})`;
    ctx.fill();
    ctx.strokeStyle = mix('#0b0907', pal.fog, f);
    ctx.lineWidth = 3;
    ctx.stroke();
    const glowA = used ? 0 : 0.6 + 0.3 * Math.sin(time / 400);
    ctx.beginPath();
    this.line([s, 0.02, sz], [s, 0.26, sz]);
    this.line([s, 0.08, sz], [s - 0.045, 0.03, sz]);
    this.line([s, 0.08, sz], [s + 0.045, 0.03, sz]);
    this.line([s, 0.16, sz], [s - 0.045, 0.11, sz]);
    this.line([s, 0.16, sz], [s + 0.045, 0.11, sz]);
    ctx.strokeStyle = used ? mix('#241a12', pal.fog, f) : `rgba(159,207,212,${glowA * (1 - f)})`;
    ctx.lineWidth = 9;
    ctx.stroke();
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      if (Math.sin((a0 + a1) / 2) < 0) continue;
      this.poly([at(r, a0, yt), at(r, a1, yt), at(r, a1, yw), at(r, a0, yw)]);
      this.stoneFill(pal, cz, 0.6);
    }
    this.poly(Array.from({ length: N }, (_, i) => at(r, (i / N) * Math.PI * 2, yw)));
    ctx.fillStyle = mix(used ? '#183140' : '#3a6f80', pal.fog, f);
    ctx.fill();
    if (!used) {
      for (let k = 0; k < 2; k++) {
        const t = ((time / 1600 + k * 0.5) % 1);
        this.poly(Array.from({ length: N }, (_, i) => at(r * (0.2 + 0.75 * t), (i / N) * Math.PI * 2, yw)));
        ctx.strokeStyle = `rgba(159,207,212,${(1 - t) * 0.8 * (1 - f)})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      this.poly([at(r, a0, yt), at(R, a0, yt), at(R, a1, yt), at(r, a1, yt)]);
      this.stoneFill(pal, cz, 0.0);
      ctx.fillStyle = `rgba(232,220,192,${0.22 * (1 - f)})`;
      ctx.fill();
    }
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      if (Math.sin((a0 + a1) / 2) > 0) continue;
      this.poly([at(R, a0, yt), at(R, a1, yt), at(R, a1, yb), at(R, a0, yb)]);
      this.stoneFill(pal, cz, 0.25 + 0.3 * Math.abs(Math.cos((a0 + a1) / 2)));
    }
    this.poly(Array.from({ length: N }, (_, i) => at(R, (i / N) * Math.PI * 2, yt)));
    ctx.strokeStyle = mix('#0b0907', pal.fog, f, 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/** The point on segment a→b where it crosses the near plane. */
function cut(a: P3, b: P3): P3 {
  const t = (Z_CLIP - a[2]) / (b[2] - a[2]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Z_CLIP];
}
