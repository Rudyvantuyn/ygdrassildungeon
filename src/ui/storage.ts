const KEY = 'ygdrassil-save-v1';

export function readSave(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeSave(data: string): boolean {
  try {
    localStorage.setItem(KEY, data);
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}
