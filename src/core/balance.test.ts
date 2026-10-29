import { describe, expect, it } from 'vitest';
import { autoplay } from './autoplay';

// Deterministic seeds, so these are stable. If a balance change breaks them,
// re-check the numbers on purpose rather than loosening the bounds blindly.
describe('balance (computer player)', () => {
  const seeds = Array.from({ length: 20 }, (_, i) => 1000 + i);

  it('a careful party that grinds a little can clear the game', () => {
    const results = seeds.map((s) => autoplay(s, { grindBattles: 5 }));
    expect(results.filter((r) => r.cleared).length).toBeGreaterThanOrEqual(16);
  });

  it('shopping in town between floors helps', () => {
    const plain = seeds.filter((s) => autoplay(s, { grindBattles: 5 }).cleared).length;
    const town = seeds.filter((s) => autoplay(s, { grindBattles: 5, town: true }).cleared).length;
    expect(town).toBeGreaterThanOrEqual(plain);
    expect(town).toBeGreaterThanOrEqual(18);
  });

  it('the boss is a real threat without grinding', () => {
    const results = seeds.map((s) => autoplay(s));
    const cleared = results.filter((r) => r.cleared).length;
    expect(cleared).toBeLessThan(20);
    expect(cleared).toBeGreaterThanOrEqual(10);
    // The party should arrive at the boss somewhere around level 5–7.
    const avgLevel = results.reduce((sum, r) => sum + r.levels[0], 0) / results.length;
    expect(avgLevel).toBeGreaterThan(4.5);
    expect(avgLevel).toBeLessThan(7.5);
  });
});
