/**
 * The party's own map of each floor, drawn by the player.
 *
 * Modes:
 *   manual   — nothing is drawn automatically
 *   assisted — cells the party walks on are filled in as floor; walls, marks and notes are up to the player
 *   auto     — the whole map is drawn automatically from what the party has seen
 */
export type ChartMode = 'manual' | 'assisted' | 'auto';

export const CHART_MODES: ChartMode[] = ['assisted', 'manual', 'auto'];

export type Terrain = 'none' | 'floor' | 'wall';

export type MarkId = 'down' | 'up' | 'chest' | 'spring' | 'danger' | 'note' | 'gather';

export const MARKS: Record<MarkId, { glyph: string; color: string; label: string }> = {
  down: { glyph: '▼', color: '#d08a1a', label: 'Stairs down' },
  up: { glyph: '▲', color: '#2a9a5a', label: 'Stairs up' },
  chest: { glyph: '■', color: '#c27a12', label: 'Chest' },
  spring: { glyph: '●', color: '#1d8ec2', label: 'Spring' },
  danger: { glyph: '✖', color: '#d0302a', label: 'Danger' },
  note: { glyph: '✎', color: '#6a4a9a', label: 'Note' },
  gather: { glyph: '✿', color: '#5a9a3a', label: 'Gathering' },
};

export interface Chart {
  /** One character per cell: '0' none, '1' floor, '2' wall. */
  terrain: string;
  /** Cell index → mark. */
  marks: Record<number, MarkId>;
  /** Cell index → note text. */
  notes: Record<number, string>;
}

const TERRAIN_CHARS: Record<Terrain, string> = { none: '0', floor: '1', wall: '2' };
const CHAR_TERRAIN: Record<string, Terrain> = { '0': 'none', '1': 'floor', '2': 'wall' };

export const NOTE_MAX_LENGTH = 80;

export function emptyChart(cells: number): Chart {
  return { terrain: '0'.repeat(cells), marks: {}, notes: {} };
}

export function terrainAt(chart: Chart, index: number): Terrain {
  return CHAR_TERRAIN[chart.terrain[index]] ?? 'none';
}

export function setTerrain(chart: Chart, index: number, terrain: Terrain): void {
  if (index < 0 || index >= chart.terrain.length) return;
  chart.terrain = chart.terrain.slice(0, index) + TERRAIN_CHARS[terrain] + chart.terrain.slice(index + 1);
}

/** Sets or clears (mark = null) the mark on a cell. Clearing a note mark also deletes its text. */
export function setMark(chart: Chart, index: number, mark: MarkId | null): void {
  if (mark) chart.marks[index] = mark;
  else {
    delete chart.marks[index];
    delete chart.notes[index];
  }
}

export function setNote(chart: Chart, index: number, text: string): void {
  const clean = text.trim().slice(0, NOTE_MAX_LENGTH);
  if (clean) {
    chart.notes[index] = clean;
    chart.marks[index] = 'note';
  } else {
    delete chart.notes[index];
    if (chart.marks[index] === 'note') delete chart.marks[index];
  }
}

/** Erase everything the player drew on a cell. */
export function eraseCell(chart: Chart, index: number): void {
  setTerrain(chart, index, 'none');
  setMark(chart, index, null);
}
