import type { Dir, Loot } from '../types';

export interface Palette {
  wall: string;
  wallEdge: string;
  moss: string;
  floor: string;
  ceiling: string;
  fog: string;
  /** Painted textures for walls, floor and ceiling (art/dungeon/<textures>-wall.webp etc.). */
  textures?: string;
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

/** Prowlers only appear from this floor index on (floor 5). */
export const FIRST_PROWLER_FLOOR = 4;

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
    prowlers: [],
    palette: {
      textures: 'forest',
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
    prowlers: [],
    palette: {
      textures: 'forest',
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
      '#........#.....B>#',
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
    prowlers: [],
    boss: ['blightedElder'],
    palette: {
      textures: 'forest',
      wall: '#3e4a52',
      wallEdge: '#1c2328',
      moss: '#5fa08a',
      floor: '#2c3236',
      ceiling: '#141b20',
      fog: '#080c0f',
    },
  },
  {
    name: 'Rimewood IV',
    rows: [
      '##################',
      '#S...#.....#....T#',
      '#.##.#.###.#.##..#',
      '#.#..#...#...#...#',
      '#.#.####.#####.###',
      '#.#....#.....#...#',
      '#.####.#####.###.#',
      '#......#~..#.....#',
      '###.####.#.#.#####',
      '#T#.#....#.#.....#',
      '#.#.#.####.#####.#',
      '#...#......#.....#',
      '#.###.####.#.###.#',
      '#........#.#...#.#',
      '#####.#.##...#.#>#',
      '##################',
    ],
    startDir: 1,
    encounterSteps: 14,
    encounters: [
      { enemies: ['hrimwolf'], weight: 3 },
      { enemies: ['frostcap', 'frostcap'], weight: 2 },
      { enemies: ['rimeshell', 'frostcap'], weight: 2 },
      { enemies: ['hrimwolf', 'snowveil'], weight: 2 },
      { enemies: ['snowveil', 'snowveil'], weight: 1 },
    ],
    chests: [{ item: 'spiritDew', qty: 3 }, { gold: 450 }],
    prowlers: [],
    palette: {
      textures: 'frostwood',
      wall: '#4a5a6e',
      wallEdge: '#1e2733',
      moss: '#a8d0e8',
      floor: '#2e3642',
      ceiling: '#151b24',
      fog: '#0a0e14',
    },
  },
  {
    name: 'Wyrmroot V',
    rows: [
      '####################',
      '#S.......#.........#',
      '#.#####.##.#######.#',
      '#.#...#....#.....#.#',
      '#.#.#.######.###.#.#',
      '#...#........#...#.#',
      '###.#.######.#.###.#',
      '#~..#.#....#.#.....#',
      '#.###.#.##.#.#####.#',
      '#.....#.#T.#.....#.#',
      '#.#####.####.###.#.#',
      '#.#.....#......#...#',
      '#.#.###.#.####.###.#',
      '#...#T#......#.....#',
      '###.#.#####.##.#####',
      '#...#.......#...B..#',
      '#.#####.###.#.###.>#',
      '####################',
    ],
    startDir: 1,
    encounterSteps: 13,
    encounters: [
      { enemies: ['cinderwing', 'cinderwing'], weight: 2 },
      { enemies: ['emberling', 'cinderwing'], weight: 2 },
      { enemies: ['rootfiend'], weight: 3 },
      { enemies: ['ashenColossus'], weight: 1 },
      { enemies: ['rootfiend', 'emberling'], weight: 1 },
    ],
    chests: [{ item: 'sapTonic', qty: 4 }, { gold: 900 }],
    // The first prowlers. The west side of the floor always offers a way around them.
    prowlers: [
      { enemies: ['grimtusk'], route: [[5, 5], [12, 5]], hunt: 0 },
      { enemies: ['rootDraugr'], route: [[18, 2], [18, 12]], hunt: 0 },
      { enemies: ['fenwraith'], route: [[12, 3], [16, 3]], hunt: 3 },
    ],
    boss: ['rootgnawer'],
    palette: {
      textures: 'emberroot',
      wall: '#4e3a34',
      wallEdge: '#22160f',
      moss: '#c06a3a',
      floor: '#2e2420',
      ceiling: '#170f0c',
      fog: '#0c0705',
    },
  },
  // ── Chapter II: the Drowned Roots ───────────────────────────────────────────
  {
    name: 'Saltmarsh VI',
    rows: [
      '##################',
      '#S.....#.......~.#',
      '#.###.##.#####.#.#',
      '#.#.......#....#.#',
      '#.#.#####.#.####.#',
      '#...#...#.#.....T#',
      '###.#.#.#.#####.##',
      '#...#.#...#...#..#',
      '#.###.#####.#.##.#',
      '#.....#.....#....#',
      '#.#####.#######.##',
      '#.#T....#.....#..#',
      '#.#####.#.###.##.#',
      '#.......#...#....#',
      '#######.###.####>#',
      '##################',
    ],
    startDir: 1,
    encounterSteps: 13,
    encounters: [
      { enemies: ['brineling', 'brineling'], weight: 3 },
      { enemies: ['skerrywing', 'brineling'], weight: 2 },
      { enemies: ['reefclaw'], weight: 2 },
      { enemies: ['skerrywing', 'skerrywing'], weight: 2 },
      { enemies: ['reefclaw', 'skerrywing'], weight: 1 },
    ],
    chests: [{ item: 'tideDraught', qty: 3 }, { gold: 1400 }],
    prowlers: [],
    palette: {
      textures: 'tidewater',
      wall: '#3e5a5e',
      wallEdge: '#1a2a2e',
      moss: '#6ac0b0',
      floor: '#2a3a3a',
      ceiling: '#122024',
      fog: '#061214',
    },
  },
  {
    name: 'Kelpwood VII',
    rows: [
      '####################',
      '#S.................#',
      '#.####.#.#.#######.#',
      '#.#..#.#.#......#.##',
      '#.#.##.#.#.####.#..#',
      '#...#.....#..T#.##.#',
      '###.#.#####.###....#',
      '#...#.....#...#.####',
      '#.#######.###.#....#',
      '#.......#...#.####.#',
      '#.#####.###.#......#',
      '#.#~..#...#.######.#',
      '#.#.#.###.#......#.#',
      '#...#...#.######.#.#',
      '#.#####.#........#.#',
      '#T......#.######..>#',
      '####################',
    ],
    startDir: 1,
    encounterSteps: 13,
    encounters: [
      { enemies: ['kelpStrangler'], weight: 2 },
      { enemies: ['brinecap', 'brinecap'], weight: 2 },
      { enemies: ['seahound'], weight: 3 },
      { enemies: ['seahound', 'brinecap'], weight: 2 },
      { enemies: ['kelpStrangler', 'skerrywing'], weight: 1 },
    ],
    chests: [{ item: 'spiritDew', qty: 4 }, { gold: 1800 }],
    // The Skerryjaw patrols the south passage; the east shaft goes around it.
    prowlers: [{ enemies: ['skerryjaw'], route: [[9, 14], [16, 14]], hunt: 0 }],
    palette: {
      textures: 'tidewater',
      wall: '#34544a',
      wallEdge: '#16261f',
      moss: '#8ac06a',
      floor: '#26342e',
      ceiling: '#0f1c18',
      fog: '#05100c',
    },
  },
  {
    name: 'Coral Vault VIII',
    rows: [
      '##################',
      '#S.#.......#.....#',
      '#..#.#####.#.###.#',
      '#.##.#...#...#...#',
      '#....#.#.#####.###',
      '####.#.#.....#...#',
      '#T.#.#.#####.###.#',
      '#......#~..#.....#',
      '#.######.#.#####.#',
      '#........#.#...#.#',
      '#.########.#.#.#.#',
      '#......#...#.#...#',
      '######.#.###.###.#',
      '#......#...#...#.#',
      '#.#########T#.####',
      '#...........#..B>#',
      '##################',
    ],
    startDir: 2,
    encounterSteps: 13,
    encounters: [
      { enemies: ['pearlmoth', 'pearlmoth'], weight: 2 },
      { enemies: ['coralback'], weight: 2 },
      { enemies: ['tidecaller', 'seahound'], weight: 2 },
      { enemies: ['tidecaller', 'pearlmoth'], weight: 2 },
      { enemies: ['coralback', 'tidecaller'], weight: 1 },
    ],
    chests: [{ item: 'kindlingMoss', qty: 2 }, { gold: 2400 }],
    prowlers: [],
    boss: ['drownedJarl'],
    palette: {
      textures: 'coral',
      wall: '#5e4a56',
      wallEdge: '#2a1e26',
      moss: '#f08a8a',
      floor: '#2e2830',
      ceiling: '#161218',
      fog: '#0a0610',
    },
  },
  {
    name: "Ran's Reach IX",
    rows: [
      '####################',
      '#S...#.......#.....#',
      '#.#.##.#####.#.###.#',
      '#.#....#...#...#...#',
      '#.####.#.#.#####.###',
      '#....#...#.......#T#',
      '####.#####.#####.#.#',
      '#~...#.....#...#...#',
      '#.####.###.#.#.###.#',
      '#......#...#.#.....#',
      '###.####.###.#####.#',
      '#...#....#...#.....#',
      '#.###.##.#.###.###.#',
      '#.#...#..#...#.#...#',
      '#.#.###.####.#.#.###',
      '#.#...#....#.......#',
      '#T###...##...###.#>#',
      '####################',
    ],
    startDir: 1,
    encounterSteps: 12,
    encounters: [
      { enemies: ['nykur'], weight: 3 },
      { enemies: ['saltwight', 'gloomEel'], weight: 2 },
      { enemies: ['gloomEel', 'gloomEel'], weight: 2 },
      { enemies: ['saltwight'], weight: 2 },
      { enemies: ['nykur', 'pearlmoth'], weight: 1 },
    ],
    chests: [{ item: 'tideDraught', qty: 5 }, { gold: 3200 }],
    // Two prowlers: the south-west hall and the east hall. The middle passages lead around both.
    prowlers: [
      { enemies: ['skerryjaw'], route: [[7, 15], [10, 15]], hunt: 0 },
      { enemies: ['brineDraugr'], route: [[14, 11], [18, 11]], hunt: 0 },
    ],
    palette: {
      textures: 'tidewater',
      wall: '#2e4256',
      wallEdge: '#121c28',
      moss: '#5aa0d0',
      floor: '#1e2a36',
      ceiling: '#0c141c',
      fog: '#040a10',
    },
  },
  {
    name: "Aegir's Hall X",
    rows: [
      '####################',
      '#S....#......#....T#',
      '#.###.#.####.#.##..#',
      '#.#...#.#..#...#..##',
      '#.#.###.#.####.#.#.#',
      '#.#.....#....#...#.#',
      '#.#####.####.#####.#',
      '#~....#....#.......#',
      '#####.####.#.#####.#',
      '#...#....#.#.#...#.#',
      '#.#.####.#.#.#.#.#.#',
      '#.#......#...#.#...#',
      '#.########.###.#####',
      '#.....#....#.......#',
      '###.#.#.####.#####.#',
      '#T..#.#............#',
      '#...#...####.#..B..#',
      '####################',
    ],
    startDir: 1,
    encounterSteps: 12,
    encounters: [
      { enemies: ['deepmaw'], weight: 3 },
      { enemies: ['wavemaid', 'wavemaid'], weight: 2 },
      { enemies: ['fathomstone'], weight: 2 },
      { enemies: ['deepmaw', 'wavemaid'], weight: 2 },
      { enemies: ['fathomstone', 'gloomEel'], weight: 1 },
    ],
    chests: [{ item: 'kindlingMoss', qty: 3 }, { gold: 4500 }],
    // A Tidecoil hunts the east pocket; the Brine Draugr guards the hall before the boss.
    // The south-west passage leads around both.
    prowlers: [
      { enemies: ['tidecoil'], route: [[14, 9], [16, 9]], hunt: 2 },
      { enemies: ['brineDraugr'], route: [[12, 13], [18, 13]], hunt: 0 },
    ],
    boss: ['hafgufa'],
    palette: {
      textures: 'abyss',
      wall: '#2a3448',
      wallEdge: '#10141e',
      moss: '#8a9af0',
      floor: '#1a1e2a',
      ceiling: '#0a0c14',
      fog: '#030408',
    },
  },
];
