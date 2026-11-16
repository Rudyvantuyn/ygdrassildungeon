/**
 * Cosmetics on this device: what the account owns (kept with the account, cached here for offline play), and the
 * frame and theme the player picked, put on the page as body classes (styles.css: body.frame-*, body.theme-*).
 * Purely looks: nothing here touches the rules.
 */
import { COSMETIC_BY_ID } from '../core/data/cosmetics';
import { online } from '../net/online';
import { prefs, setPref } from './prefs';

const KEY = 'ygdrassil-owned';

/** What this device last heard the account owns. */
export function ownedCosmetics(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** Asks the account what it owns (when signed in), keeps it, and applies the looks again. */
export async function refreshOwned(): Promise<Set<string>> {
  if (!online.mayBeSignedIn) return ownedCosmetics();
  try {
    await online.init();
    if (!online.signedIn) return ownedCosmetics();
    const items = await online.entitlements();
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // Private mode: owned items are asked for again next time.
    }
    applyLooks();
    return new Set(items);
  } catch {
    return ownedCosmetics();
  }
}

/** Puts the chosen frame and theme on the page, if they are owned. */
export function applyLooks(): void {
  const owned = ownedCosmetics();
  const body = document.body;
  for (const c of [...body.classList]) if (c.startsWith('frame-') || c.startsWith('theme-')) body.classList.remove(c);
  if (prefs.frame && owned.has(prefs.frame) && COSMETIC_BY_ID[prefs.frame]?.kind === 'frame') body.classList.add(`frame-${prefs.frame}`);
  if (prefs.uiTheme && owned.has(prefs.uiTheme) && COSMETIC_BY_ID[prefs.uiTheme]?.kind === 'theme') body.classList.add(`theme-${prefs.uiTheme}`);
}

export function chooseLook(kind: 'frame' | 'theme', id: string): void {
  setPref(kind === 'frame' ? 'frame' : 'uiTheme', id);
  applyLooks();
}
