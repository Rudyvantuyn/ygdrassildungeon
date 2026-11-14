/**
 * Ygdrassil moved from ygdrassil-dungeon.vercel.app to www.ygdrassilgame.com. Saves live in the browser per address,
 * so a visit to the old address carries the saved game and settings along (in the part of the link after #, which is
 * never sent to any server) and the game on the new address takes them in.
 */
export const HOME = 'https://www.ygdrassilgame.com';
const OLD_HOST = 'ygdrassil-dungeon.vercel.app';
const KEYS = ['ygdrassil-save-v1', 'ygdrassil-prefs'];

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function pack(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function unpack(data: string): Promise<string> {
  const bin = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

/** On the old address: go to the new one, taking the save along. Returns true when leaving. */
export async function leaveOldAddress(): Promise<boolean> {
  if (location.hostname !== OLD_HOST) return false;
  const carried: Record<string, string> = {};
  for (const k of KEYS) {
    const v = read(k);
    if (v) carried[k] = v;
  }
  const page = location.pathname.replace(/^\/(index(\.html)?)?$/, '/play');
  let url = `${HOME}${page}${location.search}`;
  if (carried['ygdrassil-save-v1']) {
    try {
      url = `${HOME}/play#carry=${await pack(JSON.stringify(carried))}`;
    } catch {
      // No compression in this browser: the player can still use the cloud save.
    }
  }
  location.replace(url);
  return true;
}

/** In the game on the new address: take in a save carried over from the old address. */
export async function takeCarriedSave(): Promise<void> {
  const m = location.hash.match(/^#carry=([A-Za-z0-9_-]+)$/);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const carried = JSON.parse(await unpack(m[1])) as Record<string, string>;
    const save = carried['ygdrassil-save-v1'];
    if (!save) return;
    const existing = read('ygdrassil-save-v1');
    if (existing && existing !== save && !confirm('Ygdrassil has moved here. Bring along your saved game from the old address? This replaces the save on this device.')) return;
    for (const k of KEYS) if (carried[k]) localStorage.setItem(k, carried[k]);
  } catch {
    // A broken link: nothing to take in.
  }
}
