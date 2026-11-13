import { describe, expect, it } from 'vitest';
import { bestiaryOrder, elementKnown, noteEvents, noteSeen, type Bestiary } from './bestiary';
import { Combat } from './combat';
import { ENEMIES } from './data/enemies';
import { makeInventory } from './data/items';
import { createStartingParty } from './party';
import { Rng } from './rng';

describe('bestiary', () => {
  it('lists every monster of the Rootdeep once, in the order they are met', () => {
    const order = bestiaryOrder();
    expect(new Set(order.map((r) => r.def.id)).size).toBe(order.length);
    expect(order[0].def.id).toBe('bogling');
    expect(order.find((r) => r.def.id === 'hafgufa')?.kind).toBe('boss');
    expect(order.find((r) => r.def.id === 'grimtusk')?.kind).toBe('prowler');
  });

  it('learns weaknesses only by trying them, and counts defeated foes', () => {
    const book: Bestiary = {};
    const ids = ['bogling', 'bogling'];
    noteSeen(book, ids);
    expect(book.bogling.seen).toBe(2);
    const combat = new Combat(createStartingParty(), ids, makeInventory(), new Rng(2));
    for (let r = 0; r < 30 && !combat.outcome; r++) {
      noteEvents(book, ids, combat.resolveRound(combat.party.map(() => ({ kind: 'attack' as const, target: 0 }))));
    }
    expect(combat.outcome).toBe('victory');
    expect(book.bogling.defeated).toBe(2);
    expect(elementKnown(ENEMIES.bogling, book.bogling, 'phys')).not.toBe('unknown');
    const untried = ['fire', 'frost', 'storm'].find((el) => !book.bogling.tried.includes(el as 'fire'));
    if (untried) expect(elementKnown(ENEMIES.bogling, book.bogling, untried as 'fire')).toBe('unknown');
  });
});
