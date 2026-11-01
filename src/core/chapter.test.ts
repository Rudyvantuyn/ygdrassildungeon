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
 * Floor 1: the entrance, stairs 1 down, and a room closed off by a gate (opens from the east) with stairs 2 in it.
 * Floor 2: stairs 1 up on the same square, a long way round to stairs 2 (same square as on floor 1), and the guardian.
 */
const chapter = (): ChapterDesign => ({
  version: 2,
  name: 'Bone Roads',
  floors: [
    floor(['##########', '#S.....1.#', '#.######.#', '#.#2e....#', '#.####...#', '#........#', '#........#', '##########']),
    floor(['##########', '#......1.#', '#.######.#', '#.#2..#..#', '#.#.B.#..#', '#.#####..#', '#........#', '##########'], { boss: 'rootgnawer' }),
  ],
});

describe('drawn chapters', () => {
  it('accepts a chapter whose floors are joined by numbered stairs and a one-way gate', () => {
    expect(chapterProblems(chapter())).toEqual([]);
  });

  it('flags stairs without another end, stairs on different squares, and an entrance on an inner floor', () => {
    const c = chapter();
    c.floors[1].rows[3] = '#.#...#..#';
    expect(chapterProblems(c).some((p) => p.includes('Stairs 2'))).toBe(true);
    const moved = chapter();
    moved.floors[1].rows[1] = '#1.......#';
    expect(chapterProblems(moved)).toContain('Stairs 1 must sit on the same square on both floors.');
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
    // The gate at (4,3) opens from the east; from inside the room (3,3), its west side, it stays shut.
    Object.assign(game.state, { x: 3, y: 3, dir: 1 });
    expect(game.interact().type).toBe('gateSealed');
    // Stairs 1 take the party down onto the same square of floor 2.
    Object.assign(game.state, { x: 7, y: 1 });
    expect(game.takeLink()).toBe(true);
    expect([game.state.floor, game.state.x, game.state.y]).toEqual([1, 7, 1]);
    // Back up and open the gate from its own side.
    expect(game.takeLink()).toBe(true);
    Object.assign(game.state, { x: 5, y: 3, dir: 3 });
    expect(game.interact().type).toBe('gateOpened');
    expect(game.map.tiles[3 * 10 + 4]).toBe('gateOpen');
    // Still open after a trip to town and back.
    game.returnToTown();
    game.enterFloor(0, true);
    expect(game.map.tiles[3 * 10 + 4]).toBe('gateOpen');
  });
});
