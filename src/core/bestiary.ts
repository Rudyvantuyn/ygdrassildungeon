/**
 * The bestiary: what the party has learnt about the monsters of the Rootdeep.
 * A monster is listed once seen; defeating it reveals its strength and what it leaves behind;
 * its weaknesses show one element at a time, as the party tries them on it.
 */
import type { CombatEvent } from './combat';
import { ENEMIES, type EnemyDef } from './data/enemies';
import { FLOORS } from './data/floors';
import type { Element } from './types';

export interface BeastEntry {
  seen: number;
  defeated: number;
  /** Elements the party has hit it with. */
  tried: Element[];
}

export type Bestiary = Record<string, BeastEntry>;

export const ELEMENTS: Element[] = ['phys', 'fire', 'frost', 'storm'];

function entry(book: Bestiary, id: string): BeastEntry {
  return (book[id] ??= { seen: 0, defeated: 0, tried: [] });
}

/** A fight began against these enemies. */
export function noteSeen(book: Bestiary, enemyIds: string[]): void {
  for (const id of enemyIds) if (ENEMIES[id]) entry(book, id).seen += 1;
}

/** Learns from what happened in a fight: elements tried, foes felled. `enemyIds` by position in the fight. */
export function noteEvents(book: Bestiary, enemyIds: string[], events: CombatEvent[]): void {
  for (const ev of events) {
    if (ev.type !== 'damage' || ev.side !== 'enemy') continue;
    const id = enemyIds[ev.target];
    if (!id || !ENEMIES[id]) continue;
    const e = entry(book, id);
    if (!e.tried.includes(ev.element)) e.tried.push(ev.element);
    if (ev.hp === 0) e.defeated += 1;
  }
}

/** How an element works on a monster, as far as the party knows. */
export function elementKnown(def: EnemyDef, e: BeastEntry | undefined, element: Element): 'weak' | 'resists' | 'normal' | 'unknown' {
  if (!e?.tried.includes(element)) return 'unknown';
  return def.weak.includes(element) ? 'weak' : def.resist.includes(element) ? 'resists' : 'normal';
}

/** Every monster of the Rootdeep, in the order they are met, with the floors (1-based) where it lives. */
export function bestiaryOrder(): { def: EnemyDef; floors: number[]; kind: 'monster' | 'prowler' | 'boss' }[] {
  const out = new Map<string, { def: EnemyDef; floors: number[]; kind: 'monster' | 'prowler' | 'boss' }>();
  const add = (id: string, floor: number, kind: 'monster' | 'prowler' | 'boss') => {
    const def = ENEMIES[id];
    if (!def) return;
    const row = out.get(id) ?? { def, floors: [], kind };
    if (!row.floors.includes(floor)) row.floors.push(floor);
    out.set(id, row);
  };
  FLOORS.forEach((f, i) => {
    for (const enc of f.encounters) for (const id of enc.enemies) add(id, i + 1, 'monster');
    for (const p of f.prowlers) for (const id of p.enemies) add(id, i + 1, 'prowler');
    for (const id of f.boss ?? []) add(id, i + 1, 'boss');
  });
  return [...out.values()];
}
