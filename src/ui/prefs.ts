/** Settings that belong to this device rather than to a save: how fast fights and text play. */
export type BattleSpeed = 1 | 2 | 3;
export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface Prefs {
  battleSpeed: BattleSpeed;
  textSpeed: TextSpeed;
}

const KEY = 'ygdrassil-prefs';
const DEFAULTS: Prefs = { battleSpeed: 1, textSpeed: 'normal' };

export const BATTLE_SPEED_NAMES: Record<BattleSpeed, string> = { 1: 'Normal', 2: 'Fast', 3: 'Fastest' };
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
