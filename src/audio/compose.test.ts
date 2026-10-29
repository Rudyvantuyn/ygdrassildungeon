import { describe, expect, it } from 'vitest';
import { FLOORS } from '../core/data/floors';
import { BEATS_PER_BAR, THEMES, composeLoop, loopBeats, midiToHz, scaleNote, themeFor } from './compose';

describe('procedural music', () => {
  for (const theme of Object.values(THEMES)) {
    it(`${theme.id}: a sensible, repeatable loop`, () => {
      const loop = composeLoop(theme);
      expect(composeLoop(theme)).toEqual(loop); // same seed, same music
      expect(loop.length).toBeGreaterThan(theme.progression.length * 2);
      expect(loop.some((n) => n.voice === 'lead')).toBe(true);
      expect(loop.some((n) => n.voice === 'bass')).toBe(true);
      for (const n of loop) {
        expect(n.beat).toBeGreaterThanOrEqual(0);
        expect(n.beat).toBeLessThan(loopBeats(theme));
        expect(n.length).toBeGreaterThan(0);
        expect(n.velocity).toBeGreaterThan(0);
        expect(n.velocity).toBeLessThanOrEqual(1);
        if (n.voice !== 'kick' && n.voice !== 'snare' && n.voice !== 'hat') {
          expect(n.midi).toBeGreaterThanOrEqual(24);
          expect(n.midi).toBeLessThanOrEqual(96);
          // Every pitched note belongs to the theme's scale.
          const pc = (((n.midi - theme.root) % 12) + 12) % 12;
          expect(theme.mode, `${theme.id} note ${n.midi}`).toContain(pc);
        }
      }
      expect(theme.mode.length).toBe(7);
      expect(loopBeats(theme) % BEATS_PER_BAR).toBe(0);
    });
  }

  it('battle themes have drums, quiet themes do not', () => {
    expect(composeLoop(THEMES.battle).some((n) => n.voice === 'kick')).toBe(true);
    expect(composeLoop(THEMES.floor2).some((n) => n.voice === 'kick')).toBe(false);
  });

  it('scale and pitch helpers', () => {
    const t = THEMES.town;
    expect(scaleNote(t, 0)).toBe(t.root);
    expect(scaleNote(t, 7)).toBe(t.root + 12);
    expect(scaleNote(t, -1)).toBe(t.root - 12 + t.mode[6]);
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(midiToHz(81)).toBeCloseTo(880);
  });

  it('every floor and situation has music', () => {
    FLOORS.forEach((_, floor) => expect(THEMES[themeFor({ location: 'dungeon', floor })]).toBeDefined());
    expect(themeFor({ location: 'town' })).toBe('town');
    expect(themeFor({ location: 'dungeon', floor: 1, combat: 'boss' })).toBe('boss');
    expect(themeFor({ location: 'dungeon', floor: 4, combat: 'prowler' })).toBe('prowler');
  });
});
