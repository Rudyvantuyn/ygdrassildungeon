/**
 * The Hall of Echoes and memory shards (decided with the owner and Thijs, November 2026; see CLAUDE.md).
 *
 * - Once chapter V's guardian has fallen, the Hall of Echoes opens in Lindholm. Any guardian beaten before can be
 *   fought again there as an echo, at a level the player picks (10, 20, … up to the party's level, at most 150).
 *   One echo costs ECHO_COST Dream Embers, which monsters leave from chapter VI on.
 * - Guardians from chapter V on, and every echo, may leave a memory shard; a higher echo level gives a better chance.
 *   A shard already found never drops again. The memories themselves live in src/core/data/memories.ts.
 */
import { Combat } from './combat';
import { EQUIPMENT_LIST } from './data/equipment';
import { ENEMIES, GUARDIAN_IDS, type EnemyDef } from './data/enemies';
import { FLOORS } from './data/floors';
import { FLOORS_PER_CHAPTER } from './data/chapters';
import { MEMORIES } from './data/memories';
import type { Game } from './game';
import { createMember, MAX_LEVEL, memberStats, xpForLevel } from './party';
import type { Rng } from './rng';
import { autoSpend } from './skilltree';
import type { ClassId, Stats } from './types';

export const ECHO_COST = 10;
export const ECHO_STEP = 10;
/** Floor index of chapter V's last floor: its guardian opens the Hall of Echoes. */
export const ECHO_HALL_FLOOR = 5 * FLOORS_PER_CHAPTER - 1;
/** From this floor index (chapter V) guardians may leave a memory shard. */
export const SHARD_FLOOR = 4 * FLOORS_PER_CHAPTER;
/** From this floor index (chapter VI) monsters may leave a Dream Ember. */
export const EMBER_FLOOR = 5 * FLOORS_PER_CHAPTER;
/** Chance per won fight (not a guardian) of a Dream Ember, from chapter VI on. */
export const EMBER_CHANCE = 0.12;

/**
 * The level each guardian is a fair fight at, as the balance tests measure it (a trained party of five). An echo at
 * another level is scaled from here.
 */
export const GUARDIAN_LEVEL: Record<string, number> = {
  blightedElder: 7,
  rootgnawer: 13,
  drownedJarl: 20,
  hafgufa: 32,
  ribwarden: 40,
  hrungnir: 44,
  fogWatcher: 50,
  dreamwarden: 54,
  rimewell: 59,
  gapwarden: 65,
  svafnir: 71,
  nidhogg: 78,
};

/**
 * How much tougher an echo is than plain scaling makes it: echoes are fought by parties in better gear than when the
 * guardian was first met, so each is tuned to about a two-in-three win for a party of the echo's level (balance test).
 */
export const ECHO_TOUGHNESS: Record<string, number> = {
  blightedElder: 2.5,
  rootgnawer: 2.1,
  drownedJarl: 2.1,
  hafgufa: 2.0,
  ribwarden: 1.15,
  hrungnir: 1.15,
  fogWatcher: 1.05,
  dreamwarden: 1.0,
  rimewell: 1.0,
  gapwarden: 0.92,
  svafnir: 1.0,
  nidhogg: 1.0,
};

/** Chance of a memory shard: from a guardian in the Rootdeep, and from an echo at `level` (dream round `round`). */
export function shardChance(level: number, round = 0): number {
  return 0.04 + 0.01 * Math.max(0, Math.floor(level / ECHO_STEP) - 1) + 0.01 * round;
}

/** The Hall of Echoes opens once chapter V's guardian has fallen. */
export function hallOfEchoesOpen(game: Game): boolean {
  return game.state.progress[ECHO_HALL_FLOOR]?.bossDefeated === true;
}

/** Guardians this save has beaten, in the order of the Rootdeep. */
export function echoGuardians(game: Game): string[] {
  const out: string[] = [];
  FLOORS.forEach((f, i) => {
    const id = f.boss?.[0];
    if (id && game.state.progress[i]?.bossDefeated && !out.includes(id)) out.push(id);
  });
  return out;
}

/** The levels an echo can be called at: every ECHO_STEP up to the party's best level. */
export function echoLevels(game: Game): number[] {
  const best = Math.max(0, ...game.state.party.map((m) => m.level));
  const top = Math.min(MAX_LEVEL, Math.floor(best / ECHO_STEP) * ECHO_STEP);
  const out: number[] = [];
  for (let l = ECHO_STEP; l <= top; l += ECHO_STEP) out.push(l);
  return out;
}

// ── Scaling ──────────────────────────────────────────────────────────────────

const REFERENCE: ClassId[] = ['bastion', 'strider', 'mender', 'runecaller', 'berserker'];

/** The shop gear a party at `level` usually wears (tier ≈ how deep a party of that level has come). */
export function gearTierFor(level: number): number {
  const best = Math.max(...EQUIPMENT_LIST.filter((e) => !e.requires && !e.wyrd).map((e) => e.tier));
  return Math.max(0, Math.min(best, Math.round(level * 0.36)));
}

const refCache = new Map<number, Stats>();
/** The average stats of a trained party of five at `level`. */
function reference(level: number): Stats {
  const hit = refCache.get(level);
  if (hit) return hit;
  const tier = gearTierFor(level);
  const members = REFERENCE.map((c) => {
    const m = createMember('Ref', c);
    m.level = level;
    m.xp = xpForLevel(level);
    m.skills = {};
    autoSpend(m);
    for (const slot of ['weapon', 'armor'] as const) {
      m[slot] = EQUIPMENT_LIST.filter((e) => e.slot === slot && !e.requires && !e.wyrd && e.tier <= tier && e.classes.includes(c)).sort((a, b) => b.price - a.price)[0]?.id;
    }
    return memberStats(m);
  });
  const avg = (k: keyof Stats) => members.reduce((n, s) => n + s[k], 0) / members.length;
  const out: Stats = { hp: avg('hp'), sp: avg('sp'), atk: avg('atk'), def: avg('def'), mag: avg('mag'), res: avg('res'), spd: avg('spd') };
  refCache.set(level, out);
  return out;
}

/** "Echo of the Blighted Elder". */
export function echoName(id: string): string {
  const name = ENEMIES[id].name;
  return `Echo of ${name.replace(/^The /, 'the ')}`;
}

/**
 * A guardian as its echo at `level`: as hard for a party of that level as the guardian was at its own. Its hide keeps
 * pace with the party's blows, and its blows with the party's health and armour.
 */
export function echoDef(id: string, level: number): EnemyDef {
  const def = ENEMIES[id];
  const native = GUARDIAN_LEVEL[id] ?? 30;
  const n = reference(native);
  const r = reference(level);
  const offense = Math.max(r.atk, r.mag) / Math.max(n.atk, n.mag);
  // Damage dealt to the party: base = power * 1.6 - armour * 0.8, kept in the same proportion to the party's health.
  const keep = (power: number, armourN: number, armourL: number) => {
    const k = (power * 1.6 - armourN * 0.8) / n.hp;
    return k > 0 ? Math.round((k * r.hp + armourL * 0.8) / 1.6) : Math.round(power * (r.hp / n.hp));
  };
  // Below its own level a guardian's tricks weigh more than its numbers: its echo is softened, so it stays fair.
  const tough = (ECHO_TOUGHNESS[id] ?? 1) * (level < native ? 0.5 + (0.5 * level) / native : 1);
  return {
    ...def,
    name: echoName(id),
    hp: Math.round(def.hp * offense * tough),
    atk: Math.round(keep(def.atk, n.def, r.def) * Math.sqrt(tough)),
    mag: Math.round(keep(def.mag, n.res, r.res) * Math.sqrt(tough)),
    def: Math.round(def.def * (r.atk / n.atk)),
    res: Math.round(def.res * (r.mag / n.mag)),
    spd: Math.round(def.spd * (r.spd / n.spd)),
    xp: Math.round((def.xp * level) / native / 2),
    gold: Math.round((def.gold * level) / native / 2),
    material: undefined,
    drop: undefined,
  };
}

// ── Echo fights and shards ───────────────────────────────────────────────────

/** Why an echo cannot be called right now, or null. */
export function echoBlocker(game: Game, id: string, level: number): string | null {
  if (!echoGuardians(game).includes(id)) return 'Only a guardian you have beaten leaves an echo.';
  if (!echoLevels(game).includes(level)) return 'Your party is not strong enough to call an echo that strong.';
  if ((game.state.inventory.dreamEmber ?? 0) < ECHO_COST) return `An echo needs ${ECHO_COST} Dream Embers.`;
  return null;
}

/** Spends the embers and starts the echo fight. */
export function startEchoFight(game: Game, id: string, level: number): Combat | string {
  const blocked = echoBlocker(game, id, level);
  if (blocked) return blocked;
  game.state.inventory.dreamEmber -= ECHO_COST;
  return new Combat(game.state.party, [id], game.state.inventory, game.rng, { boss: true, echo: true, echoLevel: level, oathToken: false, enemyDefs: { [id]: echoDef(id, level) } });
}

/**
 * The memory shards that can be found next: every shard not found yet, except a memory's last shard, which only comes
 * once all its others are found (it tells whose memory it is about).
 */
export function missingShards(game: Game): { memory: string; shard: number }[] {
  const found = game.state.memories ?? {};
  return MEMORIES.flatMap((m) => {
    const have = found[m.id] ?? [];
    const last = m.shards.length - 1;
    return m.shards
      .map((_, i) => ({ memory: m.id, shard: i }))
      .filter((s) => !have.includes(s.shard) && (s.shard !== last || have.length === last));
  });
}

/** Rolls for a memory shard with `chance`; the shard found (and kept), or null. */
export function rollShard(game: Game, chance: number, rng: Rng): { memory: string; shard: number } | null {
  const missing = missingShards(game);
  if (!missing.length || !rng.chance(chance)) return null;
  const pick = missing[rng.int(0, missing.length - 1)];
  const found = (game.state.memories ??= {});
  (found[pick.memory] ??= []).push(pick.shard);
  return pick;
}

export { GUARDIAN_IDS };
