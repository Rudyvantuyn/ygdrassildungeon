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

export function chapterOf(floor: number): ChapterDef {
  return CHAPTERS[Math.min(CHAPTERS.length - 1, Math.floor(floor / FLOORS_PER_CHAPTER))];
}
