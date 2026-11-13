/**
 * Chapter III, the Marrowdeep (Ymir's bones): monsters, chests, look, guardians and prowlers, ready for the
 * floors the owner draws at the Drafting Table. The rows below are stand-ins; the drawn chapter replaces them
 * (decodeChapter + toFloorDefs). Until then these floors are only offered at the Drafting Table, not played.
 */
import { FLOORS, type FloorDef, type Palette } from './floors';

const MARROW: Palette = {
  textures: 'marrow',
  wall: '#b8b0a0',
  wallEdge: '#3a3630',
  moss: '#c8e0f0',
  floor: '#5a564c',
  ceiling: '#2a2620',
  fog: '#0c0d10',
};

/** A small stand-in layout: entrance, stairs down, a chest, a gathering spot (and the guardian on boss floors). */
function standIn(boss: boolean, gather: string): string[] {
  return [
    '############',
    '#S.....#...#',
    '#.####.#.#.#',
    '#.#T...#.#.#',
    '#.####.###.#',
    `#......${gather}...#`,
    '####.#####.#',
    `#....#.${boss ? 'B' : '.'}...#`,
    '#.####.###>#',
    '############',
  ];
}

export const PREPARED_FLOORS: FloorDef[] = [
  {
    name: 'Marrow Gate XI',
    rows: standIn(false, 'P'),
    startDir: 1,
    encounterSteps: 13,
    encounters: [
      { enemies: ['marrowgnaw', 'marrowgnaw'], weight: 3 },
      { enemies: ['bonewing'], weight: 2 },
      { enemies: ['marrowgnaw', 'bonewing'], weight: 3 },
      { enemies: ['chalkCrawler'], weight: 2 },
      { enemies: ['chalkCrawler', 'marrowgnaw'], weight: 1 },
    ],
    chests: [{ item: 'tideDraught', qty: 3 }, { gold: 5000 }],
    prowlers: [],
    palette: MARROW,
  },
  {
    name: "The Giant's Stair XII",
    rows: standIn(false, 'O'),
    startDir: 1,
    encounterSteps: 13,
    encounters: [
      { enemies: ['stonehorn'], weight: 3 },
      { enemies: ['cairnWight', 'marrowgnaw'], weight: 2 },
      { enemies: ['bonewing', 'bonewing'], weight: 2 },
      { enemies: ['chalkCrawler', 'cairnWight'], weight: 2 },
      { enemies: ['stonehorn', 'bonewing'], weight: 1 },
      { enemies: ['marrowgnaw', 'marrowgnaw', 'marrowgnaw', 'marrowgnaw'], weight: 1 },
    ],
    chests: [{ item: 'spiritDew', qty: 4 }, { item: 'clearwater', qty: 3 }],
    prowlers: [],
    palette: MARROW,
  },
  {
    name: 'Ribvault XIII',
    rows: standIn(true, 'W'),
    startDir: 1,
    encounterSteps: 12,
    encounters: [
      { enemies: ['shardling'], weight: 2 },
      { enemies: ['stonehorn', 'cairnWight'], weight: 2 },
      { enemies: ['shardling', 'bonewing'], weight: 2 },
      { enemies: ['chalkCrawler', 'chalkCrawler'], weight: 2 },
      { enemies: ['cairnWight', 'cairnWight'], weight: 1 },
      { enemies: ['marrowgnaw', 'stonehorn', 'stonehorn', 'marrowgnaw'], weight: 1 },
    ],
    chests: [{ item: 'tideDraught', qty: 4 }, { item: 'oathToken', qty: 1 }],
    prowlers: [],
    boss: ['ribwarden'],
    palette: MARROW,
  },
  {
    name: 'Echo Hollows XIV',
    rows: standIn(false, 'F'),
    startDir: 1,
    encounterSteps: 12,
    encounters: [
      { enemies: ['rimeTroll'], weight: 3 },
      { enemies: ['shardling', 'cairnWight'], weight: 2 },
      { enemies: ['rimeTroll', 'bonewing'], weight: 2 },
      { enemies: ['stonehorn', 'stonehorn'], weight: 2 },
      { enemies: ['shardling', 'shardling'], weight: 1 },
      { enemies: ['stonehorn', 'marrowgnaw', 'marrowgnaw', 'stonehorn'], weight: 1 },
    ],
    chests: [{ item: 'kindlingMoss', qty: 3 }, { gold: 7000 }],
    prowlers: [{ enemies: ['bergrisi'], route: [[1, 5], [6, 5]], hunt: 0 }],
    palette: MARROW,
  },
  {
    name: "Hrungnir's Rest XV",
    rows: standIn(true, 'P'),
    startDir: 1,
    encounterSteps: 12,
    encounters: [
      { enemies: ['rimeTroll', 'shardling'], weight: 2 },
      { enemies: ['rimeTroll'], weight: 2 },
      { enemies: ['cairnWight', 'shardling'], weight: 2 },
      { enemies: ['stonehorn', 'rimeTroll'], weight: 1 },
      { enemies: ['bonewing', 'bonewing', 'cairnWight'], weight: 2 },
      { enemies: ['stonehorn', 'stonehorn', 'marrowgnaw', 'marrowgnaw'], weight: 1 },
    ],
    chests: [{ item: 'tideDraught', qty: 6 }, { gold: 9000 }],
    prowlers: [
      { enemies: ['ossuaryHound'], route: [[1, 7], [4, 7]], hunt: 2 },
      { enemies: ['bergrisi'], route: [[1, 1], [6, 1]], hunt: 0 },
    ],
    boss: ['hrungnir'],
    palette: MARROW,
  },
];

/** Everything the Drafting Table can borrow from: the playable Rootdeep plus the chapters being prepared. */
export const DESIGN_FLOORS: readonly FloorDef[] = [...FLOORS, ...PREPARED_FLOORS];
