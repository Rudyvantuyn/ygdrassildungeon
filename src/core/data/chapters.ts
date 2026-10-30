/**
 * The Rootdeep is told in chapters of five floors. Each chapter has its own
 * look and monsters, and ends with a boss on its last floor.
 */
export interface ChapterDef {
  /** Roman numeral, shown with the name ("Chapter II"). */
  numeral: string;
  name: string;
  /** Index of the chapter's first floor. */
  first: number;
}

export const FLOORS_PER_CHAPTER = 5;

export const CHAPTERS: ChapterDef[] = [
  { numeral: 'I', name: 'The Greenwood Roots', first: 0 },
  { numeral: 'II', name: 'The Drowned Roots', first: 5 },
];

/**
 * Where a descent may begin: only at the first floor of a chapter the party has reached. Reaching a chapter means
 * beating the boss that guards the stairs at the end of the one before, so every chapter has to be won in one go.
 */
export function startFloors(deepest: number): number[] {
  return CHAPTERS.map((c) => c.first).filter((first) => first <= deepest);
}

/** The chapter start at or below `floor` that a descent may begin from. */
export function startFloorFor(floor: number, deepest: number): number {
  const starts = startFloors(deepest).filter((f) => f <= floor);
  return starts.length ? starts[starts.length - 1] : 0;
}

export function chapterOf(floor: number): ChapterDef {
  return CHAPTERS[Math.min(CHAPTERS.length - 1, Math.floor(floor / FLOORS_PER_CHAPTER))];
}
