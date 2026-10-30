import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { blankDesign, decodeDesign, encodeDesign, paint, problems, resize, toFloorDef, type FloorDesign } from './designer';
import { parseFloor } from './dungeon';

/** A small finished floor: a corridor ring with stairs and a boss. */
function sample(): FloorDesign {
  const d = blankDesign(10, 8);
  for (let x = 2; x <= 7; x++) for (let y = 2; y <= 5; y++) paint(d, x, y, '#');
  paint(d, 8, 6, '>');
  paint(d, 8, 1, 'T');
  d.name = 'Test Hollow';
  return d;
}

describe('drafting table', () => {
  it('a blank floor needs a goal', () => {
    expect(problems(blankDesign())).toContain('Give the floor a goal: stairs down, a boss, or both.');
  });

  it('a finished floor has no problems and plays', () => {
    const d = sample();
    expect(problems(d)).toEqual([]);
    const def = toFloorDef(d);
    expect(def.chests).toHaveLength(1);
    const map = parseFloor(def);
    expect(map.tiles.filter((t) => t === 'stairs')).toHaveLength(1);
    const game = Game.trial(def, 5, 1, 42);
    expect(game.state.location).toBe('dungeon');
    expect(game.floorDef.name).toBe('Test Hollow');
    expect(game.state.party.every((m) => m.level === 5)).toBe(true);
  });

  it('keeps the border, a single start and single stairs', () => {
    const d = sample();
    expect(paint(d, 0, 3, '.')).toBe(false);
    paint(d, 1, 6, '>');
    expect(d.rows.join('').split('>').length - 1).toBe(1);
    expect(paint(d, 1, 1, '#')).toBe(false); // the start stays
    paint(d, 1, 4, 'S');
    expect(d.rows.join('').split('S').length - 1).toBe(1);
  });

  it('finds stranded cells, a missing boss and blocked chests', () => {
    const d = sample();
    paint(d, 1, 2, 'T');
    paint(d, 2, 1, 'T'); // seals the start in
    expect(problems(d).some((p) => p.includes('cannot be reached'))).toBe(true);
    const e = sample();
    paint(e, 1, 6, 'B');
    expect(problems(e)).toContain('Choose which boss waits on the boss sigil.');
    e.boss = 'blightedElder';
    expect(problems(e)).toEqual([]);
  });

  it('demands a way around every prowler', () => {
    const d = sample();
    // Guarding both ways to the stairs...
    d.prowlers = [
      { enemy: 'grimtusk', route: [[8, 4], [8, 5]], hunt: 0 },
      { enemy: 'fenwraith', route: [[6, 6], [7, 6]], hunt: 0 },
    ];
    expect(problems(d).some((p) => p.includes('avoids every prowler'))).toBe(true);
    // ...is not allowed; guarding one of them is.
    d.prowlers = [{ enemy: 'grimtusk', route: [[8, 4], [8, 5]], hunt: 0 }];
    expect(problems(d)).toEqual([]);
  });

  it('share codes round-trip', () => {
    const d = sample();
    d.prowlers = [{ enemy: 'grimtusk', route: [[3, 1], [6, 1]], hunt: 2 }];
    const back = decodeDesign(encodeDesign(d));
    expect(back).toEqual(d);
    expect(decodeDesign('nonsense')).toBeNull();
    expect(decodeDesign('YGF1.!!!')).toBeNull();
  });

  it('resizing keeps the drawing and walls the new edge', () => {
    const d = sample();
    resize(d, 14, 10);
    expect(d.rows).toHaveLength(10);
    expect(d.rows[0]).toBe('#'.repeat(14));
    expect(d.rows[1][1]).toBe('S');
    resize(d, 4, 4);
    expect(d.rows).toHaveLength(8);
  });
});
