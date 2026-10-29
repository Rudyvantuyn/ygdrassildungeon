import type { Dir, Loot } from '../types';

export interface Palette {
  wall: string;
  wallEdge: string;
  moss: string;
  floor: string;
  ceiling: string;
  fog: string;
}

/**
 * A Prowler: a strong monster that is visible on the map and moves one step
 * for every step the party takes.
 */
export interface ProwlerDef {
  enemies: string[];
  /** Patrol route (map cells); the prowler walks to each in turn and loops. The first cell is where it starts. */
  route: [number, number][];
  /** Hunters chase the party when it comes within this many steps (0 = never chases). */
  hunt: number;
}

export interface FloorDef {
  name: string;
  /**
   * Map legend:
   *   #  wall          .  floor       S  start (stairs up / exit to town)
   *   >  stairs down   T  chest       ~  healing spring
   *   B  boss
   */
  rows: string[];
  startDir: Dir;
  /** Average steps between random encounters. */
  encounterSteps: number;
  encounters: { enemies: string[]; weight: number }[];
  /** Chest contents, in the order the chests appear (row by row). */
  chests: Loot[];
  boss?: string[];
  prowlers: ProwlerDef[];
  palette: Palette;
}

export const FLOORS: FloorDef[] = [
  {
    name: 'Mossy Hollow I',
    rows: [
      '################',
      '#S....#.......T#',
      '#.###.#.#####..#',
      '#.#...#.#...#..#',
      '#.#.###.#.#.#.##',
      '#.#.....#.#....#',
      '#.#####.#.####.#',
      '#.....#...#....#',
      '#####.#####.####',
      '#~..#.......#..#',
      '#.#.#######.#..#',
      '#.#............#',
      '#.#####.#####.>#',
      '#T......#......#',
      '################',
    ],
    startDir: 1,
    encounterSteps: 16,
    encounters: [
      { enemies: ['bogling', 'bogling'], weight: 3 },
      { enemies: ['duskwing'], weight: 2 },
      { enemies: ['duskwing', 'bogling'], weight: 3 },
      { enemies: ['briarGnawer'], weight: 2 },
      { enemies: ['briarGnawer', 'duskwing', 'bogling'], weight: 1 },
    ],
    chests: [{ item: 'sapTonic', qty: 2 }, { gold: 60 }],
    // Paces the long corridor in front of the stairs: time your crossing.
    prowlers: [{ enemies: ['grimtusk'], route: [[3, 11], [11, 11]], hunt: 0 }],
    palette: {
      wall: '#4f5d3f',
      wallEdge: '#2b3322',
      moss: '#7fa04a',
      floor: '#3d3a2c',
      ceiling: '#1d2a1f',
      fog: '#0e1510',
    },
  },
  {
    name: 'Rootway II',
    rows: [
      '##################',
      '#S.......#.......#',
      '#.#####..#.#####.#',
      '#.#...#..#.#...#.#',
      '#.#.#.#....#.#.#.#',
      '#...#.######.#...#',
      '#####.#....#.###.#',
      '#~....#.##.#...#.#',
      '#.#####.##.###.#.#',
      '#.#.....##.....#.#',
      '#.#.#########.##.#',
      '#...#T......#....#',
      '###.#.#####.####.#',
      '#T..#.#...#......#',
      '#...#...#...####>#',
      '##################',
    ],
    startDir: 1,
    encounterSteps: 15,
    encounters: [
      { enemies: ['hollowHound'], weight: 3 },
      { enemies: ['puffcap', 'puffcap'], weight: 2 },
      { enemies: ['shellbark', 'puffcap'], weight: 2 },
      { enemies: ['hollowHound', 'duskwing', 'duskwing'], weight: 2 },
      { enemies: ['shellbark'], weight: 1 },
    ],
    chests: [{ item: 'spiritDew', qty: 2 }, { item: 'sapTonic', qty: 3 }],
    prowlers: [
      { enemies: ['fenwraith'], route: [[16, 2], [16, 10]], hunt: 0 },
      { enemies: ['hollowHound', 'grimtusk'], route: [[7, 4], [10, 4]], hunt: 4 },
    ],
    palette: {
      wall: '#5a4a38',
      wallEdge: '#2e251b',
      moss: '#9a8a4a',
      floor: '#38302a',
      ceiling: '#221b16',
      fog: '#120d0a',
    },
  },
  {
    name: 'Heartwood III',
    rows: [
      '##################',
      '#S..#......#.....#',
      '#.#.#.####.#.###.#',
      '#.#...#..#...#...#',
      '#.#####..#####.###',
      '#.....#..#.....#T#',
      '#####.#..#.###.#.#',
      '#~..#.#.##.#.....#',
      '#.#.#.#....#.#####',
      '#.#...####.#.#...#',
      '#.######...#.#.#.#',
      '#......#.###...#.#',
      '######.#.#######.#',
      '#T.....#....##...#',
      '#.######.##.##.###',
      '#........#.....B.#',
      '##################',
    ],
    startDir: 1,
    encounterSteps: 14,
    encounters: [
      { enemies: ['gloamMoth'], weight: 2 },
      { enemies: ['rootColossus'], weight: 2 },
      { enemies: ['gloamMoth', 'hollowHound'], weight: 2 },
      { enemies: ['rootColossus', 'puffcap'], weight: 1 },
      { enemies: ['gloamMoth', 'gloamMoth'], weight: 1 },
    ],
    chests: [{ item: 'sapTonic', qty: 3 }, { gold: 200 }],
    prowlers: [
      { enemies: ['rootDraugr'], route: [[10, 15], [14, 15]], hunt: 5 },
      { enemies: ['fenwraith', 'gloamMoth'], route: [[8, 13], [11, 13]], hunt: 3 },
    ],
    boss: ['blightedElder'],
    palette: {
      wall: '#3e4a52',
      wallEdge: '#1c2328',
      moss: '#5fa08a',
      floor: '#2c3236',
      ceiling: '#141b20',
      fog: '#080c0f',
    },
  },
];
