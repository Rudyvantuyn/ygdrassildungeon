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

  it('is offered at the drafting table but not yet played', () => {
    expect(FLOORS).toHaveLength(10);
    expect(DESIGN_FLOORS).toHaveLength(15);
    expect(THEMES.some((t) => t.id === 'marrow')).toBe(true);
    expect(BOSS_CHOICES).toEqual(expect.arrayContaining(['ribwarden', 'hrungnir']));
    expect(PROWLER_CHOICES).toEqual(expect.arrayContaining(['bergrisi', 'ossuaryHound']));
  });

  it('has gathering finds and gear for every material it asks for', () => {
    for (const ids of Object.values(GATHER_TABLES[2])) for (const id of ids) expect(MATERIALS[id], id).toBeDefined();
    for (const e of EQUIPMENT_LIST) if (e.requires) expect(MATERIALS[e.requires.material], e.id).toBeDefined();
  });
});
