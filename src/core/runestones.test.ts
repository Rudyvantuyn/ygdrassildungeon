import { describe, expect, it } from 'vitest';
import { FLOORS } from './data/floors';
import { parseFloor } from './dungeon';
import { canHoldStone, carveProblem, runeDir, runeText, runeWhere, visibleMarks, type Runestone } from './runestones';

const stone = (over: Partial<Runestone>): Runestone => ({
  id: 1, author: 'Kay', x: 1, y: 1, what: 'prowler', dir: 'n', advice: null, style: 'plain', heeds: 0, falses: 0, mine: false, voted: null, ...over,
});

describe('runestones', () => {
  it('directions are kept on the compass and read from the reader\'s facing', () => {
    // Carved facing east: "ahead" means east.
    expect(runeDir('ahead', 1)).toBe('e');
    expect(runeDir('left', 1)).toBe('n');
    expect(runeDir('here', 2)).toBe('here');
    // A reader facing north sees an east stone to the right; facing west, behind.
    expect(runeWhere('e', 0)).toBe('right');
    expect(runeWhere('e', 3)).toBe('behind');
    for (const facing of [0, 1, 2, 3] as const) for (const where of ['ahead', 'behind', 'left', 'right', 'here'] as const) {
      expect(runeWhere(runeDir(where, facing), facing)).toBe(where);
    }
    expect(runeText(stone({ dir: 'n', advice: 'goback' }), 0)).toBe('Prowler ahead. Go back.');
    expect(runeText(stone({ what: 'chest', dir: 's' }), 0)).toBe('Chest behind.');
  });

  it('stones only stand on squares one can walk', () => {
    const map = parseFloor(FLOORS[0]);
    expect(canHoldStone(0, map.start.x, map.start.y)).toBe(true);
    expect(canHoldStone(0, 0, 0)).toBe(false); // the outer wall
    expect(canHoldStone(0, -1, 3)).toBe(false);
    expect(canHoldStone(FLOORS.length, 1, 1)).toBe(false);
    expect(canHoldStone(0, 1.5, 1)).toBe(false);
  });

  it('a carving must use the fixed words', () => {
    const ok = { floor: 0, x: 1, y: 1, what: 'prowler', dir: 'n', advice: 'goback', descent: 'd1a-2b3c4d' };
    expect(carveProblem(ok)).toBeNull();
    expect(carveProblem({ ...ok, what: 'hello' })).toMatch(/rune/);
    expect(carveProblem({ ...ok, dir: 'up' })).toMatch(/direction/);
    expect(carveProblem({ ...ok, advice: 'buy gold' })).toMatch(/advice/);
    expect(carveProblem({ ...ok, advice: null })).toBeNull();
    expect(carveProblem({ ...ok, x: 0, y: 0 })).toMatch(/cannot stand/);
    expect(carveProblem({ ...ok, descent: 'x' })).toMatch(/descent/);
  });

  it('stones on squares that became walls are not shown', () => {
    const marks = visibleMarks(0, { stones: [stone({ x: 1, y: 1 }), stone({ id: 2, x: 0, y: 0 })], shades: [{ id: 1, x: 0, y: 0, enemy: 'bogling' }] });
    expect(marks.stones.map((s) => s.id)).toEqual([1]);
    expect(marks.shades).toHaveLength(0);
  });
});
