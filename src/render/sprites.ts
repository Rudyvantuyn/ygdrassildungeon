/**
 * Painted sprites (public/art/...). They load in the background; until a sprite
 * is ready, callers fall back to the procedural drawing.
 */
const cache = new Map<string, HTMLImageElement | null>();
/** Sprites that have loaded and are decoded, so drawing them never paints an empty picture. */
const ready = new Set<string>();
const waiting = new Map<string, (() => void)[]>();

/** The image for `path` (relative to the site), or null while it is still loading or missing. */
export function sprite(path: string): HTMLImageElement | null {
  const known = cache.get(path);
  // Decoded, and still whole: an image can still turn out broken (a failed load), and drawing one throws.
  if (known !== undefined) return known && ready.has(path) && known.complete && known.naturalWidth > 0 ? known : null;
  if (typeof Image === 'undefined') return null;
  const img = new Image();
  img.onerror = () => {
    cache.set(path, null);
    waiting.delete(path);
  };
  img.onload = () => {
    // Only hand the image out once it is fully decoded. Firefox could draw an image that had loaded but was not
    // decoded yet as nothing at all; the textures cut from it stayed empty (see-through walls, a smeared view).
    const done = () => {
      if (!img.naturalWidth) return;
      ready.add(path);
      for (const cb of waiting.get(path) ?? []) cb();
      waiting.delete(path);
    };
    if (typeof img.decode === 'function') img.decode().then(done, done);
    else done();
  };
  img.src = `art/${path}`;
  cache.set(path, img);
  return null;
}

/** True when the picture at `path` could not be loaded at all (not while it is still loading). */
export function spriteMissing(path: string): boolean {
  return cache.get(path) === null;
}

/** Starts loading sprites ahead of time (e.g. the enemies of the floor being entered). */
export function preload(paths: string[]): void {
  for (const path of paths) sprite(path);
}

/** Calls `cb` once the sprite has loaded (right away if it already has; never if it is missing). */
export function onSpriteLoad(path: string, cb: () => void): void {
  if (sprite(path)) return cb();
  if (cache.get(path) === null) return;
  waiting.set(path, [...(waiting.get(path) ?? []), cb]);
}
