/**
 * Web Audio playback: synthesised music (from compose.ts) and sound effects.
 * Nothing is loaded from files. The audio context starts on the first key press
 * or click, as browsers require.
 */
import { THEMES, composeLoop, loopBeats, midiToHz, type NoteEvent, type Theme } from './compose';

export type Sfx =
  | 'step' | 'turn' | 'bump' | 'menuMove' | 'menuSelect' | 'menuBack'
  | 'chest' | 'stairs' | 'spring' | 'encounter' | 'prowlerAlert' | 'bossIntro'
  | 'hitPhys' | 'hitFire' | 'hitFrost' | 'hitStorm' | 'crit' | 'hurt' | 'miss'
  | 'heal' | 'revive' | 'ailment' | 'cure' | 'enemyDown' | 'allyDown' | 'victory' | 'defeat' | 'levelUp' | 'coin';

export interface AudioSettings {
  music: number;
  sfx: number;
}

const SETTINGS_KEY = 'ygdrassil-audio';
const LOOKAHEAD = 0.3;

interface Track {
  theme: Theme;
  events: NoteEvent[];
  gain: GainNode;
  start: number;
  /** Next event to schedule, and how many times the loop has played. */
  index: number;
  loop: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private reverb!: ConvolverNode;
  private noise!: AudioBuffer;
  private track: Track | null = null;
  private wanted: string | null = null;
  private timer = 0;
  settings: AudioSettings = { music: 0.5, sfx: 0.7 };

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
      if (saved && typeof saved.music === 'number' && typeof saved.sfx === 'number') this.settings = saved;
    } catch {
      // No storage: keep the defaults.
    }
    const unlock = () => this.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  setVolume(kind: keyof AudioSettings, value: number): void {
    this.settings[kind] = Math.min(1, Math.max(0, value));
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // Not saved; fine for this session.
    }
    if (this.ctx) this.applyVolumes();
  }

  /** Switch the background music (crossfades). null = silence. */
  music(id: string | null): void {
    this.wanted = id;
    if (!this.ctx) return;
    if (this.track?.theme.id === id) return;
    const now = this.ctx.currentTime;
    if (this.track) {
      const old = this.track.gain;
      old.gain.cancelScheduledValues(now);
      old.gain.setValueAtTime(old.gain.value, now);
      old.gain.linearRampToValueAtTime(0, now + 0.8);
      window.setTimeout(() => old.disconnect(), 1200);
      this.track = null;
    }
    const theme = id ? THEMES[id] : undefined;
    if (!theme) return;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + 1.2);
    gain.connect(this.musicBus);
    this.track = { theme, events: composeLoop(theme), gain, start: now + 0.15, index: 0, loop: 0 };
  }

  play(name: Sfx): void {
    const ctx = this.ctx;
    if (!ctx || this.settings.sfx <= 0) return;
    const t = ctx.currentTime + 0.005;
    const out = this.sfxBus;
    switch (name) {
      case 'step':
        this.noiseHit(t, 0.07, 'lowpass', 420, 0.35, out);
        break;
      case 'turn':
        this.noiseSweep(t, 0.12, 900, 2600, 0.12, out);
        break;
      case 'bump':
        this.tone(t, 'sine', 90, 50, 0.16, 0.5, out);
        this.noiseHit(t, 0.05, 'lowpass', 300, 0.3, out);
        break;
      case 'menuMove':
        this.tone(t, 'triangle', 880, 880, 0.035, 0.12, out);
        break;
      case 'menuSelect':
        this.tone(t, 'triangle', 660, 660, 0.05, 0.18, out);
        this.tone(t + 0.05, 'triangle', 990, 990, 0.07, 0.16, out);
        break;
      case 'menuBack':
        this.tone(t, 'triangle', 520, 380, 0.08, 0.14, out);
        break;
      case 'chest':
        [72, 76, 79, 84].forEach((n, i) => this.tone(t + i * 0.07, 'triangle', midiToHz(n), midiToHz(n), 0.18, 0.2, out, true));
        break;
      case 'coin':
        this.tone(t, 'square', 1320, 1320, 0.05, 0.08, out);
        this.tone(t + 0.06, 'square', 1760, 1760, 0.12, 0.08, out);
        break;
      case 'stairs':
        [0, 1, 2, 3].forEach((i) => this.noiseHit(t + i * 0.13, 0.06, 'lowpass', 600 - i * 90, 0.3, out));
        break;
      case 'spring':
        for (let i = 0; i < 6; i++) this.tone(t + i * 0.06, 'sine', 600 + Math.random() * 900, 400 + Math.random() * 300, 0.12, 0.12, out, true);
        break;
      case 'encounter':
        this.tone(t, 'sawtooth', midiToHz(52), midiToHz(51), 0.35, 0.22, out);
        this.tone(t, 'sawtooth', midiToHz(58), midiToHz(57), 0.35, 0.18, out);
        this.noiseSweep(t, 0.3, 300, 3000, 0.15, out);
        break;
      case 'prowlerAlert':
        this.tone(t, 'sawtooth', 55, 70, 1.0, 0.25, out, true);
        this.tone(t, 'sine', 110, 104, 1.0, 0.2, out, true);
        break;
      case 'bossIntro':
        this.tone(t, 'sawtooth', 41, 36, 1.6, 0.35, out, true);
        this.noiseHit(t, 1.2, 'lowpass', 200, 0.4, out);
        break;
      case 'hitPhys':
        this.noiseHit(t, 0.1, 'bandpass', 1400, 0.5, out);
        this.tone(t, 'sine', 180, 70, 0.1, 0.4, out);
        break;
      case 'hitFire':
        this.noiseSweep(t, 0.35, 2500, 300, 0.4, out, true);
        this.tone(t, 'sawtooth', 160, 90, 0.3, 0.12, out);
        break;
      case 'hitFrost':
        [96, 91, 100, 88].forEach((n, i) => this.tone(t + i * 0.035, 'sine', midiToHz(n), midiToHz(n), 0.25, 0.12, out, true));
        this.noiseHit(t, 0.15, 'highpass', 6000, 0.15, out);
        break;
      case 'hitStorm':
        for (let i = 0; i < 5; i++) this.tone(t + i * 0.03, 'square', 200 + Math.random() * 1600, 80, 0.05, 0.12, out);
        this.noiseHit(t, 0.25, 'bandpass', 3000, 0.35, out);
        break;
      case 'crit':
        this.noiseHit(t, 0.14, 'bandpass', 900, 0.7, out);
        this.tone(t, 'square', 330, 110, 0.18, 0.25, out);
        break;
      case 'hurt':
        this.tone(t, 'square', 240, 120, 0.14, 0.22, out);
        this.noiseHit(t, 0.08, 'lowpass', 900, 0.3, out);
        break;
      case 'miss':
        this.noiseSweep(t, 0.18, 3000, 800, 0.12, out);
        break;
      case 'heal':
        [72, 76, 79].forEach((n, i) => this.tone(t + i * 0.08, 'sine', midiToHz(n), midiToHz(n + 12), 0.35, 0.16, out, true));
        break;
      case 'ailment':
        this.tone(t, 'sawtooth', 300, 180, 0.3, 0.12, out, true);
        this.tone(t + 0.04, 'square', 420, 250, 0.25, 0.08, out);
        break;
      case 'cure':
        [76, 83].forEach((n, i) => this.tone(t + i * 0.07, 'sine', midiToHz(n), midiToHz(n), 0.3, 0.15, out, true));
        break;
      case 'revive':
        [67, 72, 76, 79, 84].forEach((n, i) => this.tone(t + i * 0.09, 'triangle', midiToHz(n), midiToHz(n), 0.5, 0.16, out, true));
        break;
      case 'enemyDown':
        this.tone(t, 'sawtooth', 300, 40, 0.45, 0.2, out);
        this.noiseSweep(t, 0.4, 1500, 100, 0.2, out);
        break;
      case 'allyDown':
        [64, 60, 55].forEach((n, i) => this.tone(t + i * 0.14, 'triangle', midiToHz(n), midiToHz(n - 1), 0.3, 0.2, out, true));
        break;
      case 'victory':
        [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36], [84, 0.6]].forEach(([n, d]) =>
          this.tone(t + d, 'square', midiToHz(n), midiToHz(n), n === 84 ? 0.7 : 0.14, 0.13, out, true),
        );
        break;
      case 'defeat':
        [[64, 0], [63, 0.35], [59, 0.7], [52, 1.05]].forEach(([n, d]) => this.tone(t + d, 'triangle', midiToHz(n), midiToHz(n), 0.6, 0.2, out, true));
        break;
      case 'levelUp':
        [[72, 0], [76, 0.08], [79, 0.16], [84, 0.24], [88, 0.32]].forEach(([n, d]) => this.tone(t + d, 'triangle', midiToHz(n), midiToHz(n), 0.25, 0.15, out, true));
        break;
    }
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  private unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.reverb.connect(wet);
    wet.connect(this.master);
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.reverb);
    this.sfxBus.connect(this.master);
    this.noise = this.whiteNoise();
    this.applyVolumes();
    this.timer = window.setInterval(() => this.schedule(), 60);
    const id = this.wanted;
    this.wanted = null;
    this.music(id);
  }

  private applyVolumes(): void {
    const curve = (v: number) => v * v; // perceived loudness
    this.musicBus.gain.value = curve(this.settings.music) * 0.9;
    this.sfxBus.gain.value = curve(this.settings.sfx) * 1.1;
  }

  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
    return buffer;
  }

  private whiteNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // ── Music scheduling ───────────────────────────────────────────────────────

  private schedule(): void {
    const ctx = this.ctx;
    const track = this.track;
    if (!ctx || !track || track.events.length === 0) return;
    const spb = 60 / track.theme.bpm;
    const loopLength = loopBeats(track.theme) * spb;
    const horizon = ctx.currentTime + LOOKAHEAD;
    for (;;) {
      const e = track.events[track.index];
      const when = track.start + track.loop * loopLength + e.beat * spb;
      if (when > horizon) break;
      // Skip notes we are already too late for (e.g. after the tab was in the background).
      if (when >= ctx.currentTime - 0.05) this.note(e, when, spb, track);
      track.index += 1;
      if (track.index >= track.events.length) {
        track.index = 0;
        track.loop += 1;
      }
    }
  }

  private note(e: NoteEvent, when: number, spb: number, track: Track): void {
    const ctx = this.ctx!;
    const out = track.gain;
    const length = e.length * spb;
    switch (e.voice) {
      case 'lead': {
        const osc = ctx.createOscillator();
        osc.type = track.theme.lead;
        osc.frequency.value = midiToHz(e.midi);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = track.theme.lead === 'sine' || track.theme.lead === 'triangle' ? 6000 : 1800;
        const g = this.envelope(when, length, 0.01, 0.2 * e.velocity, 0.15);
        osc.connect(filter).connect(g).connect(out);
        osc.start(when);
        osc.stop(when + length + 0.3);
        break;
      }
      case 'bass': {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = midiToHz(e.midi);
        const g = this.envelope(when, length, 0.01, 0.32 * e.velocity, 0.08);
        osc.connect(g).connect(out);
        osc.start(when);
        osc.stop(when + length + 0.2);
        break;
      }
      case 'pad': {
        const g = this.envelope(when, length, length * 0.3, 0.05 * e.velocity, length * 0.3);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1100;
        filter.connect(g).connect(out);
        for (const detune of [-8, 7]) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = midiToHz(e.midi);
          osc.detune.value = detune;
          osc.connect(filter);
          osc.start(when);
          osc.stop(when + length * 1.3 + 0.1);
        }
        break;
      }
      case 'kick':
        this.tone(when, 'sine', 130, 42, 0.18, 0.55 * e.velocity, out);
        break;
      case 'snare':
        this.noiseHit(when, 0.12, 'bandpass', 1900, 0.3 * e.velocity, out);
        break;
      case 'hat':
        this.noiseHit(when, 0.035, 'highpass', 7500, 0.18 * e.velocity, out);
        break;
    }
  }

  // ── Synth building blocks ──────────────────────────────────────────────────

  private envelope(when: number, length: number, attack: number, peak: number, release: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + attack);
    g.gain.setValueAtTime(peak, when + Math.max(attack, length));
    g.gain.linearRampToValueAtTime(0, when + Math.max(attack, length) + release);
    return g;
  }

  private tone(when: number, type: OscillatorType, from: number, to: number, length: number, volume: number, out: AudioNode, wet = false): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), when + length);
    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + length);
    osc.connect(g).connect(out);
    if (wet) g.connect(this.reverb);
    osc.start(when);
    osc.stop(when + length + 0.05);
  }

  private noiseHit(when: number, length: number, type: BiquadFilterType, freq: number, volume: number, out: AudioNode): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + length);
    src.connect(filter).connect(g).connect(out);
    src.start(when, Math.random() * 0.5);
    src.stop(when + length + 0.05);
  }

  private noiseSweep(when: number, length: number, from: number, to: number, volume: number, out: AudioNode, wet = false): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(from, when);
    filter.frequency.exponentialRampToValueAtTime(to, when + length);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(volume, when + length * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, when + length);
    src.connect(filter).connect(g).connect(out);
    if (wet) g.connect(this.reverb);
    src.start(when, Math.random() * 0.5);
    src.stop(when + length + 0.05);
  }

  dispose(): void {
    window.clearInterval(this.timer);
    void this.ctx?.close();
  }
}

export const audio = new AudioEngine();
