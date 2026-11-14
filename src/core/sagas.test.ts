import { describe, expect, it } from 'vitest';
import { Combat } from './combat';
import { EQUIPMENT_LIST } from './data/equipment';
import { FLOORS } from './data/floors';
import { makeInventory } from './data/items';
import { Game } from './game';
import { createMember, fullRestore, xpForLevel } from './party';
import { Rng } from './rng';
import { BYNAMES, addToSaga, bynamesOf, fullName } from './sagas';
import { autoSpend } from './skilltree';
import { chooseCommands } from './tactics';
import type { ClassId } from './types';

function party(level: number, tier: number) {
  return (['bastion', 'strider', 'mender', 'runecaller'] as ClassId[]).map((c, i) => {
    const m = createMember(`M${i}`, c);
    m.level = level;
    m.xp = xpForLevel(level);
    autoSpend(m);
    for (const slot of ['weapon', 'armor'] as const) {
      m[slot] = EQUIPMENT_LIST.filter((e) => e.slot === slot && !e.requires && e.tier <= tier && e.classes.includes(c)).sort((a, b) => b.price - a.price)[0]?.id;
    }
    fullRestore([m]);
    return m;
  });
}

describe('sagas', () => {
  it('a won fight is told in every saga', () => {
    const game = Game.newGame(5);
    game.state.party = party(12, 4);
    game.state.location = 'dungeon';
    let won = 0;
    for (let s = 1; s <= 20; s++) {
      fullRestore(game.state.party);
      const c = new Combat(game.state.party, FLOORS[3].encounters[0].enemies, makeInventory({ sapTonic: 3 }), new Rng(s));
      for (let r = 0; r < 150 && !c.outcome; r++) c.resolveRound(chooseCommands(c));
      const kills = c.deeds.reduce((a, d) => a + d.kills, 0);
      expect(kills).toBeLessThanOrEqual(c.enemies.length);
      game.finishCombat(c);
      if (c.outcome === 'victory') won++;
    }
    expect(won).toBeGreaterThan(15);
    const t = game.state.party.map((m) => m.saga!);
    expect(t.every((x) => x.battles >= won)).toBe(true);
    expect(t.reduce((a, x) => a + x.kills, 0)).toBeGreaterThanOrEqual(won);
    expect(t.reduce((a, x) => a + x.taken, 0)).toBeGreaterThan(0);
  });

  it('bynames come once their deed is done, and the first is borne at once', () => {
    const m = createMember('Bram', 'bastion');
    expect(fullName(m)).toBe('Bram');
    expect(addToSaga(m, { kills: 49 })).toHaveLength(0);
    const fresh = addToSaga(m, { kills: 1 });
    expect(fresh.map((b) => b.id)).toEqual(['wolfFeeder']);
    expect(fullName(m)).toBe('Bram Wolf-Feeder');
    addToSaga(m, { taken: 10000 });
    expect(m.byname).toBe('wolfFeeder');
    expect(bynamesOf(m).map((b) => b.id)).toEqual(['wolfFeeder', 'theAnvil']);
    expect(fullName({ name: 'Bram', byname: 'theAnvil' })).toBe('Bram the Anvil');
  });

  it('every guardian has a bane, for the one who struck the last blow', () => {
    const m = createMember('Sela', 'strider');
    const boss = FLOORS[4].boss![0];
    addToSaga(m, { guardians: [boss] });
    expect(m.byname).toBe(`bane-${boss}`);
    expect(fullName(m)).toMatch(/^Sela, Bane of the /);
    expect(BYNAMES.filter((b) => b.id.startsWith('bane-')).length).toBeGreaterThanOrEqual(3);
  });

  it('the Unbroken is lost with the first fall, but earned bynames are kept', () => {
    const m = createMember('Wren', 'mender');
    addToSaga(m, { battles: 200 });
    expect(m.bynames).toContain('theUnbroken');
    addToSaga(m, { falls: 1 });
    expect(bynamesOf(m).map((b) => b.id)).toContain('theUnbroken');
  });
});
