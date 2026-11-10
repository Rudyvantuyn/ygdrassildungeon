/** Settings that belong to this device rather than to a save: how fast fights and text play, key layout. */
export type BattleSpeed = 1 | 2 | 3;
export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface Prefs {
  battleSpeed: BattleSpeed;
  textSpeed: TextSpeed;
  /** A and D side-step and Q and E turn (instead of the other way round). */
  strafeKeys: boolean;
}

const KEY = 'ygdrassil-prefs';
const DEFAULTS: Prefs = { battleSpeed: 1, textSpeed: 'normal', strafeKeys: false };

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

/** With strafeKeys on, A/D and Q/E swap roles (A/D side-step, Q/E turn). Arrow keys always turn. */
export function movementKey(k: string): string {
  if (!prefs.strafeKeys) return k;
  return ({ a: 'q', d: 'e', q: 'a', e: 'd' } as Record<string, string>)[k] ?? k;
}
