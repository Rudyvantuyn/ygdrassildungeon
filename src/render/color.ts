type RGB = [number, number, number];

const cache = new Map<string, RGB>();

function parse(hex: string): RGB {
  let rgb = cache.get(hex);
  if (!rgb) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Expected #rrggbb colour, got "${hex}"`);
    const n = parseInt(hex.slice(1), 16);
    rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    cache.set(hex, rgb);
  }
  return rgb;
}

function hex(c: number[]): string {
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Linear mix of two #rrggbb colours; t = 0 gives a, t = 1 gives b. Returns #rrggbb, or rgba() when alpha < 1. */
export function mix(a: string, b: string, t: number, alpha = 1): string {
  const ca = parse(a);
  const cb = parse(b);
  const k = Math.min(1, Math.max(0, t));
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * k));
  return alpha < 1 ? `rgba(${c[0]},${c[1]},${c[2]},${alpha})` : hex(c);
}

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb colour. */
export function shade(color: string, amount: number): string {
  return amount >= 0 ? mix(color, '#ffffff', amount) : mix(color, '#000000', -amount);
}

/** A #rrggbb colour as rgba() with the given opacity. */
export function withAlpha(color: string, alpha: number): string {
  const [r, g, b] = parse(color);
  return `rgba(${r},${g},${b},${Math.min(1, Math.max(0, alpha))})`;
}
