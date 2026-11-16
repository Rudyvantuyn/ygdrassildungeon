/** Settings that belong to this device rather than to a save: how fast fights and text play, key layout. */
export type BattleSpeed = 0 | 1 | 2 | 3;
export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface Prefs {
  battleSpeed: BattleSpeed;
  textSpeed: TextSpeed;
  /** A and D side-step and Q and E turn (instead of the other way round). */
  strafeKeys: boolean;
  /** Softer dungeon walls, floor and ceiling (less contrast and grain), for players who find them busy. */
  calmTextures: boolean;
  /** How the view moves on a step or turn: a short glide (smooth) or a quick fade. */
  moveMotion: 'smooth' | 'fade';
  /** Every light in the dungeon holds still (no flicker or pulse), for players who find it disorienting. */
  steadyLights: boolean;
  /** A plain, very readable font instead of the pixel font (whose numbers some players find hard to read). */
  clearFont: boolean;
  /** Cosmetics (src/core/data/cosmetics.ts): the portrait frame and window theme picked, '' for none. */
  frame: string;
  uiTheme: string;
  /** Zoom step of the small map (0 shows the whole floor), see MAP_ZOOMS. */
  mapZoom: number;
  /** Zoom step of the full map. */
  bigMapZoom: number;
}

const KEY = 'ygdrassil-prefs';
const DEFAULTS: Prefs = { battleSpeed: 1, textSpeed: 'normal', strafeKeys: false, calmTextures: false, moveMotion: 'smooth', steadyLights: false, clearFont: false, frame: '', uiTheme: '', mapZoom: 0, bigMapZoom: 0 };

export const BATTLE_SPEED_NAMES: Record<BattleSpeed, string> = { 0: 'Slow', 1: 'Normal', 2: 'Fast', 3: 'Fastest' };
export const TEXT_SPEED_NAMES: Record<TextSpeed, string> = { slow: 'Slow', normal: 'Normal', fast: 'Fast', instant: 'Instant' };
/** Letters revealed per tick of the story typewriter (Infinity shows the whole line at once). */
export const TEXT_SPEED_STEP: Record<TextSpeed, number> = { slow: 1, normal: 2, fast: 4, instant: Infinity };

function load(): Prefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export const prefs: Prefs = load();

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  prefs[key] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Private mode: the setting lasts for this session only.
  }
}

/** With strafeKeys on, A/D and Q/E swap roles (A/D side-step, Q/E turn). Arrow keys always turn. */
export function movementKey(k: string): string {
  if (!prefs.strafeKeys) return k;
  return ({ a: 'q', d: 'e', q: 'a', e: 'd' } as Record<string, string>)[k] ?? k;
}

/** The font for text drawn on a canvas (the fight view), following the font setting. */
export function canvasFont(weight: number, size: number): string {
  return prefs.clearFont ? `${weight} ${size}px "Atkinson Hyperlegible", sans-serif` : `${weight} ${size}px "Ygg Digits", "Pixelify Sans", monospace`;
}

/** Puts the font setting on the page (the stylesheet swaps the fonts for body.clear-font). */
export function applyFont(): void {
  document.body.classList.toggle('clear-font', prefs.clearFont);
}
