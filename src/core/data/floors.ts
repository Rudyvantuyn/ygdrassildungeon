import type { Dir, Loot } from '../types';

export interface Palette {
  wall: string;
  wallEdge: string;
  moss: string;
  floor: string;
  ceiling: string;
  fog: string;
}

export interface FloorDef {
  name: string;
  /**
   * Map legend:
   *   #  wall          .  floor       S  start
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
  palette: Palette;
}

export const FLOORS: FloorDef[] = [
  {
    name: 'Mossy Hollow B1F',
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
      { enemies: ['mossSlime', 'mossSlime'], weight: 3 },
      { enemies: ['forestBat'], weight: 2 },
      { enemies: ['forestBat', 'mossSlime'], weight: 3 },
      { enemies: ['thornRat'], weight: 2 },
      { enemies: ['thornRat', 'forestBat', 'mossSlime'], weight: 1 },
    ],
    chests: [{ item: 'medica', qty: 2 }, { gold: 60 }],
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
    name: 'Rootway B2F',
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
      { enemies: ['woodfang'], weight: 3 },
      { enemies: ['sporeCap', 'sporeCap'], weight: 2 },
      { enemies: ['barkBeetle', 'sporeCap'], weight: 2 },
      { enemies: ['woodfang', 'forestBat', 'forestBat'], weight: 2 },
      { enemies: ['barkBeetle'], weight: 1 },
    ],
    chests: [{ item: 'amrita', qty: 2 }, { item: 'medica', qty: 3 }],
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
    name: 'Heartwood B3F',
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
      { enemies: ['duskMoth'], weight: 2 },
      { enemies: ['rootGolem'], weight: 2 },
      { enemies: ['duskMoth', 'woodfang'], weight: 2 },
      { enemies: ['rootGolem', 'sporeCap'], weight: 1 },
      { enemies: ['duskMoth', 'duskMoth'], weight: 1 },
    ],
    chests: [{ item: 'medica', qty: 3 }, { gold: 200 }],
    boss: ['witheredWarden'],
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
