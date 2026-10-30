/**
 * Painted sprites (public/art/...). They load in the background; until a sprite
 * is ready, callers fall back to the procedural drawing.
 */
const cache = new Map<string, HTMLImageElement | null>();

/** The image for `path` (relative to the site), or null while it is still loading or missing. */
export function sprite(path: string): HTMLImageElement | null {
  const known = cache.get(path);
  if (known !== undefined) return known && known.complete && known.naturalWidth > 0 ? known : null;
  if (typeof Image === 'undefined') return null;
  const img = new Image();
  img.decoding = 'async';
  img.onerror = () => cache.set(path, null);
  img.src = `art/${path}`;
  cache.set(path, img);
  return null;
}

/** Starts loading sprites ahead of time (e.g. the enemies of the floor being entered). */
export function preload(paths: string[]): void {
  for (const path of paths) sprite(path);
}
