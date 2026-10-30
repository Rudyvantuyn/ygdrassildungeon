/**
 * Procedural music: every theme is a short loop generated from a seed, a mode
 * and a few style knobs. Pure functions only (no Web Audio), so it can be tested.
 */
import { Rng } from '../core/rng';

export type Voice = 'lead' | 'bass' | 'pad' | 'kick' | 'snare' | 'hat';
export type LeadWave = 'sine' | 'triangle' | 'square' | 'sawtooth';

export interface Theme {
  id: string;
  bpm: number;
  /** MIDI note of the key's root. */
  root: number;
  /** Scale as semitone steps from the root (7 notes). */
  mode: number[];
  /** Chord roots as scale degrees (0-based), one per bar. */
  progression: number[];
  lead: LeadWave;
  /** 0..1: how many beats get a melody note. */
  density: number;
  bass: 'drone' | 'pulse' | 'walk';
  drums: 'none' | 'soft' | 'battle';
  pad: boolean;
  seed: number;
}

export interface NoteEvent {
  /** Start, in beats from the loop start. */
  beat: number;
  /** Length in beats. */
  length: number;
  voice: Voice;
  midi: number;
  velocity: number;
}

export const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
} as const;

const m = (mode: readonly number[]) => [...mode];

export const THEMES: Record<string, Theme> = {
  title: { id: 'title', bpm: 66, root: 50, mode: m(MODES.dorian), progression: [0, 6, 3, 4], lead: 'sine', density: 0.35, bass: 'drone', drums: 'none', pad: true, seed: 11 },
  town: { id: 'town', bpm: 92, root: 53, mode: m(MODES.ionian), progression: [0, 3, 4, 0, 5, 3, 4, 4], lead: 'triangle', density: 0.55, bass: 'walk', drums: 'soft', pad: true, seed: 23 },
  floor0: { id: 'floor0', bpm: 76, root: 45, mode: m(MODES.aeolian), progression: [0, 5, 3, 4], lead: 'triangle', density: 0.4, bass: 'drone', drums: 'none', pad: true, seed: 31 },
  floor1: { id: 'floor1', bpm: 82, root: 52, mode: m(MODES.dorian), progression: [0, 3, 0, 6], lead: 'sine', density: 0.45, bass: 'pulse', drums: 'none', pad: true, seed: 37 },
  floor2: { id: 'floor2', bpm: 70, root: 48, mode: m(MODES.phrygian), progression: [0, 1, 0, 6], lead: 'sine', density: 0.3, bass: 'drone', drums: 'none', pad: true, seed: 41 },
  floor3: { id: 'floor3', bpm: 64, root: 47, mode: m(MODES.lydian), progression: [0, 1, 5, 4], lead: 'sine', density: 0.25, bass: 'drone', drums: 'none', pad: true, seed: 43 },
  floor4: { id: 'floor4', bpm: 86, root: 50, mode: m(MODES.harmonicMinor), progression: [0, 5, 1, 4], lead: 'sawtooth', density: 0.4, bass: 'pulse', drums: 'soft', pad: true, seed: 47 },
  // Chapter II: the Drowned Roots. Slow, rolling, lots of space, like water moving in the dark.
  floor5: { id: 'floor5', bpm: 72, root: 50, mode: m(MODES.mixolydian), progression: [0, 6, 3, 0], lead: 'sine', density: 0.35, bass: 'drone', drums: 'none', pad: true, seed: 67 },
  floor6: { id: 'floor6', bpm: 78, root: 47, mode: m(MODES.dorian), progression: [0, 4, 3, 6], lead: 'triangle', density: 0.4, bass: 'pulse', drums: 'none', pad: true, seed: 71 },
  floor7: { id: 'floor7', bpm: 68, root: 52, mode: m(MODES.lydian), progression: [0, 1, 0, 4], lead: 'sine', density: 0.3, bass: 'drone', drums: 'none', pad: true, seed: 73 },
  floor8: { id: 'floor8', bpm: 74, root: 45, mode: m(MODES.aeolian), progression: [0, 6, 5, 6], lead: 'triangle', density: 0.35, bass: 'drone', drums: 'soft', pad: true, seed: 79 },
  floor9: { id: 'floor9', bpm: 60, root: 43, mode: m(MODES.phrygian), progression: [0, 1, 6, 0], lead: 'sine', density: 0.25, bass: 'drone', drums: 'none', pad: true, seed: 83 },
  battle: { id: 'battle', bpm: 140, root: 52, mode: m(MODES.aeolian), progression: [0, 5, 6, 4], lead: 'square', density: 0.7, bass: 'pulse', drums: 'battle', pad: false, seed: 53 },
  prowler: { id: 'prowler', bpm: 152, root: 54, mode: m(MODES.phrygian), progression: [0, 1, 0, 6, 0, 1, 5, 4], lead: 'sawtooth', density: 0.75, bass: 'pulse', drums: 'battle', pad: true, seed: 59 },
  boss: { id: 'boss', bpm: 132, root: 48, mode: m(MODES.harmonicMinor), progression: [0, 5, 3, 4, 0, 5, 1, 4], lead: 'sawtooth', density: 0.65, bass: 'pulse', drums: 'battle', pad: true, seed: 61 },
};

export const BEATS_PER_BAR = 4;

export function loopBeats(theme: Theme): number {
  return theme.progression.length * BEATS_PER_BAR;
}

/** Scale note `degree` (may be negative or above 6) relative to the root, as a MIDI number. */
export function scaleNote(theme: Theme, degree: number): number {
  const octave = Math.floor(degree / 7);
  const step = ((degree % 7) + 7) % 7;
  return theme.root + octave * 12 + theme.mode[step];
}

/** One loop of the theme as note events, sorted by start beat. */
export function composeLoop(theme: Theme): NoteEvent[] {
  const rng = new Rng(theme.seed);
  const events: NoteEvent[] = [];
  const bars = theme.progression.length;

  // A two-bar melodic motif (scale degrees, relative to the chord root), reused with variation.
  const motif: { beat: number; length: number; degree: number }[] = [];
  let degree = 2;
  for (let beat = 0; beat < BEATS_PER_BAR * 2; beat += 0.5) {
    const strong = beat % 1 === 0;
    if (rng.next() > theme.density * (strong ? 1 : 0.6)) continue;
    degree = Math.max(-2, Math.min(9, degree + rng.pick([-2, -1, -1, 0, 1, 1, 2])));
    // Land on chord tones on the downbeats.
    if (beat % 2 === 0) degree = rng.pick([0, 2, 4, 7]);
    motif.push({ beat, length: strong ? rng.pick([0.5, 1, 1, 1.5]) : 0.5, degree });
  }

  for (let bar = 0; bar < bars; bar++) {
    const chord = theme.progression[bar];
    const start = bar * BEATS_PER_BAR;

    // Pad: the triad, held for the bar.
    if (theme.pad) {
      for (const d of [0, 2, 4]) events.push({ beat: start, length: BEATS_PER_BAR, voice: 'pad', midi: scaleNote(theme, chord + d), velocity: 0.5 });
    }

    // Bass
    const bassRoot = scaleNote(theme, chord) - 12;
    if (theme.bass === 'drone') {
      events.push({ beat: start, length: BEATS_PER_BAR, voice: 'bass', midi: bassRoot, velocity: 0.7 });
    } else if (theme.bass === 'pulse') {
      for (let b = 0; b < BEATS_PER_BAR; b += 0.5) events.push({ beat: start + b, length: 0.45, voice: 'bass', midi: bassRoot, velocity: b % 1 === 0 ? 0.8 : 0.55 });
    } else {
      const walk = [0, 2, 4, 2];
      walk.forEach((d, b) => events.push({ beat: start + b, length: 0.9, voice: 'bass', midi: scaleNote(theme, chord + d) - 12, velocity: 0.7 }));
    }

    // Melody: the motif over each pair of bars, transposed to the chord, varied on the second half.
    const half = bar % 2;
    for (const n of motif) {
      if (Math.floor(n.beat / BEATS_PER_BAR) !== half) continue;
      const variation = bar >= bars / 2 && rng.chance(0.35) ? rng.pick([-1, 1, 2]) : 0;
      events.push({
        beat: start + (n.beat % BEATS_PER_BAR),
        length: n.length,
        voice: 'lead',
        midi: scaleNote(theme, chord + n.degree + variation) + 12,
        velocity: 0.6 + rng.range(0, 0.25),
      });
    }

    // Drums
    if (theme.drums === 'battle') {
      for (let b = 0; b < BEATS_PER_BAR; b++) {
        events.push({ beat: start + b, length: 0.25, voice: b % 2 === 0 ? 'kick' : 'snare', midi: 0, velocity: 0.8 });
        events.push({ beat: start + b + 0.5, length: 0.1, voice: 'hat', midi: 0, velocity: 0.4 });
      }
      if (bar % 2 === 1) events.push({ beat: start + 3.5, length: 0.25, voice: 'kick', midi: 0, velocity: 0.6 });
    } else if (theme.drums === 'soft') {
      for (let b = 0; b < BEATS_PER_BAR; b++) events.push({ beat: start + b + 0.5, length: 0.1, voice: 'hat', midi: 0, velocity: 0.25 });
      events.push({ beat: start, length: 0.25, voice: 'kick', midi: 0, velocity: 0.35 });
    }
  }

  return events.sort((a, b) => a.beat - b.beat);
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Which music plays in each situation. */
export function themeFor(situation: { location: 'title' | 'town' | 'dungeon'; floor?: number; combat?: 'normal' | 'prowler' | 'boss' }): string {
  if (situation.combat === 'boss') return 'boss';
  if (situation.combat === 'prowler') return 'prowler';
  if (situation.combat === 'normal') return 'battle';
  if (situation.location === 'title') return 'title';
  if (situation.location === 'town') return 'town';
  const id = `floor${situation.floor ?? 0}`;
  return THEMES[id] ? id : 'floor0';
}
