/**
 * Older browsers (Safari before 16, Chrome before 99) have no `roundRect` on the 2D canvas. The game only uses it
 * with one radius, so a simple stand-in is enough.
 */
type Ctx = CanvasRenderingContext2D;
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (this: Ctx, x: number, y: number, w: number, h: number, radii?: number | DOMPointInit | (number | DOMPointInit)[]) {
    const first = Array.isArray(radii) ? radii[0] : radii;
    const r0 = typeof first === 'number' ? first : (first?.x ?? 0);
    const r = Math.max(0, Math.min(r0, Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}
export {};
