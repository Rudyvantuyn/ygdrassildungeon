/**
 * Monsters shown as a painting (public-domain art run through the game's palette, art/paintings/<id>.webp)
 * instead of a sprite. A fight whose enemies have paintings fills the view with the painting of the enemy in
 * focus; each enemy gets a card with its name and health below. See art/painting-sources.json for the sources.
 */
import type { EnemyDef } from '../core/data/enemies';
import { sprite } from './sprites';

export const PAINTED = new Set<string>([]);

export function hasPainting(def: EnemyDef): boolean {
  return PAINTED.has(def.id);
}

export function monsterPainting(def: EnemyDef): HTMLImageElement | null {
  return hasPainting(def) ? sprite(`paintings/${def.id}.webp`) : null;
}
