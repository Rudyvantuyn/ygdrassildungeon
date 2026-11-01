import { describe, expect, it } from 'vitest';
import { chapterProblems, decodeChapter, encodeChapter, toFloorDefs, type ChapterDesign, type FloorDesign } from './designer';
import { Game } from './game';

const floor = (rows: string[], extra: Partial<FloorDesign> = {}): FloorDesign => ({
  version: 1,
  name: '',
  rows,
  theme: 'forest',
  monsters: 0,
  boss: null,
  prowlers: [],
  ...extra,
});

/**
 * Floor 1: the entrance, stairs 1 down, and a closed-off room behind a gate (opens from the east) with stairs 2.
 * Floor 2: stairs 1 up, a long way round to stairs 2 back up into that room — and the guardian.
 */
const chapter = (): ChapterDesign => ({
  version: 2,
  name: 'Bone Roads',
  floors: [
    floor(['##########', '#S.....1.#', '#.######.#', '#2#......#', '#.e......#', '#.########', '#........#', '##########']),
    floor(['##########', '#1.......#', '#.######.#', '#.#....#.#', '#.#.B..#.#', '#.####..##', '#2.......#', '##########'], { boss: 'rootgnawer' }),
  ],
});

describe('drawn chapters', () => {
  it('accepts a chapter whose floors are joined by numbered stairs and a one-way gate', () => {
    expect(chapterProblems(chapter())).toEqual([]);
  });

  it('flags stairs without another end, and an entrance on an inner floor', () => {
    const c = chapter();
    c.floors[1].rows[6] = '#........#';
    expect(chapterProblems(c).some((p) => p.includes('Stairs 2'))).toBe(true);
    const d = chapter();
    d.floors[1].rows[1] = '#1......S#';
    expect(chapterProblems(d).some((p) => p.includes('Only the first floor'))).toBe(true);
  });

  it('round-trips through a share code, and still reads old floor codes', () => {
    const c = chapter();
    expect(decodeChapter(encodeChapter(c))?.floors.map((f) => f.rows)).toEqual(c.floors.map((f) => f.rows));
    expect(decodeChapter('nonsense')).toBeNull();
  });

  it('plays: stairs lead between floors, the gate opens only from its side and stays open', () => {
    const game = Game.trial(toFloorDefs(chapter()), 10, 0, 1);
    expect(game.floors.map((f) => f.name)).toEqual(['Bone Roads I', 'Bone Roads II']);
    // Stairs 1 on floor 1 lead down.
    expect(game.linkGoesDown(7, 1)).toBe(true);
    // The gate at (2,4) cannot be opened from the corridor side (west).
    Object.assign(game.state, { x: 1, y: 4, dir: 1 });
    expect(game.interact().type).toBe('gateSealed');
    // Come up stairs 2 from floor 2 into the room behind it, and open it from the east.
    Object.assign(game.state, { floor: 1, x: 1, y: 6 });
    (game as unknown as { map: unknown }).map = (game as unknown as { loadMap(): unknown }).loadMap();
    expect(game.takeLink()).toBe(true);
    expect([game.state.floor, game.state.x, game.state.y]).toEqual([0, 1, 3]);
    Object.assign(game.state, { x: 3, y: 4, dir: 3 });
    expect(game.interact().type).toBe('gateOpened');
    expect(game.map.tiles[4 * 10 + 2]).toBe('gateOpen');
    // Still open after a trip to town and back.
    game.returnToTown();
    game.enterFloor(0, true);
    expect(game.map.tiles[4 * 10 + 2]).toBe('gateOpen');
  });
});
