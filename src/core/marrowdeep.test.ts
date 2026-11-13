import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ENEMIES } from './data/enemies';
import { EQUIPMENT_LIST } from './data/equipment';
import { GATHER_TABLES } from './data/gathering';
import { MATERIALS } from './data/materials';
import { DESIGN_FLOORS, PREPARED_FLOORS } from './data/marrowdeep';
import { FLOORS } from './data/floors';
import { BOSS_CHOICES, PROWLER_CHOICES, THEMES } from './designer';

const tiles = JSON.parse(readFileSync('scripts/monster-tiles.json', 'utf8')) as Record<string, string>;

describe('chapter III, prepared for the drafting table', () => {
  it('has five floors with monsters, guardians and prowlers that all exist and have art', () => {
    expect(PREPARED_FLOORS).toHaveLength(5);
    const ids = new Set(PREPARED_FLOORS.flatMap((f) => [...f.encounters.flatMap((e) => e.enemies), ...(f.boss ?? []), ...f.prowlers.flatMap((p) => p.enemies)]));
    for (const id of ids) {
      expect(ENEMIES[id], id).toBeDefined();
      expect(tiles[id], `${id} has a sprite`).toBeDefined();
      const mat = ENEMIES[id].material?.id;
      if (mat) expect(MATERIALS[mat], mat).toBeDefined();
    }
  });

  it('is part of the Rootdeep now, and follows every rule of a drawn chapter', async () => {
    const { rootdeepChapter, chapterProblems } = await import('./designer');
    expect(FLOORS).toHaveLength(15);
    expect(DESIGN_FLOORS).toHaveLength(15);
    expect(THEMES.some((t) => t.id === 'marrow')).toBe(true);
    expect(BOSS_CHOICES).toEqual(expect.arrayContaining(['ribwarden', 'hrungnir']));
    expect(PROWLER_CHOICES).toEqual(expect.arrayContaining(['bergrisi', 'ossuaryHound']));
    expect(chapterProblems(rootdeepChapter(10, 'The Marrowdeep'))).toEqual([]);
  });

  it('has gathering finds and gear for every material it asks for', () => {
    for (const ids of Object.values(GATHER_TABLES[2])) for (const id of ids) expect(MATERIALS[id], id).toBeDefined();
    for (const e of EQUIPMENT_LIST) if (e.requires) expect(MATERIALS[e.requires.material], e.id).toBeDefined();
  });
});

describe('drafting table examples', () => {
  it('shows chapters I and II as they are, and starts chapter III fully set up and drawable', async () => {
    const { rootdeepChapter, marrowdeepTemplate, chapterProblems, decodeChapter, encodeChapter } = await import('./designer');
    const one = rootdeepChapter(0, 'The Greenwood Roots');
    expect(one.floors).toHaveLength(5);
    expect(one.floors[2].boss).toBe('blightedElder');
    expect(rootdeepChapter(5, 'The Drowned Roots').floors[4].prowlers.length).toBeGreaterThan(0);
    const three = marrowdeepTemplate();
    expect(three.floors.map((f) => f.monsters)).toEqual([10, 11, 12, 13, 14]);
    expect(three.floors.every((f) => f.theme === 'marrow')).toBe(true);
    expect([three.floors[2].boss, three.floors[4].boss]).toEqual(['ribwarden', 'hrungnir']);
    // It survives a share code round trip, and only asks for what still has to be drawn.
    expect(decodeChapter(encodeChapter(three))?.floors[4].boss).toBe('hrungnir');
    expect(chapterProblems(three).some((p) => /theme|monsters/i.test(p))).toBe(false);
  });
});

describe('chapter III first draft', () => {
  it('loads and is ready to play', async () => {
    const { MARROWDEEP_DRAFT } = await import('./data/marrowdeep-draft');
    const { decodeChapter, chapterProblems } = await import('./designer');
    const c = decodeChapter(MARROWDEEP_DRAFT);
    expect(c?.floors).toHaveLength(5);
    expect(chapterProblems(c!)).toEqual([]);
  });
});

describe('chapter III draft rules', () => {
  it('keeps every numbered stair in a nook, never in a passage', async () => {
    const { MARROWDEEP_DRAFT } = await import('./data/marrowdeep-draft');
    const { decodeChapter } = await import('./designer');
    const c = decodeChapter(MARROWDEEP_DRAFT)!;
    for (const [f, d] of c.floors.entries()) {
      d.rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (!/[1-9]/.test(ch)) return;
        const openSides = [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dy]) => !'#T'.includes(d.rows[y + dy][x + dx]) && !'nesw'.includes(d.rows[y + dy][x + dx])).length;
        expect(openSides, `stairs ${ch} on floor ${f + 1}`).toBe(1);
      }));
    }
  });
});
