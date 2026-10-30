import { ENEMIES } from './data/enemies';
import { FLOORS } from './data/floors';
import { ITEMS } from './data/items';
import { MATERIALS } from './data/materials';
import { QUESTS, type QuestDef } from './data/quests';
import type { Game } from './game';
import type { ItemId } from './types';

export interface QuestState {
  status: 'active' | 'done';
  /** Kill count of the target when the quest was accepted (hunt quests count from there). */
  start: number;
}

export type QuestStage = 'new' | 'active' | 'ready' | 'done';

export function questStage(game: Game, def: QuestDef): QuestStage {
  const st = game.state.quests[def.id];
  if (!st) return 'new';
  if (st.status === 'done') return 'done';
  const { current } = questProgress(game, def);
  return current >= def.qty ? 'ready' : 'active';
}

/** Quests on the board right now: unlocked by depth, not yet turned in. */
export function boardQuests(game: Game): QuestDef[] {
  return QUESTS.filter((q) => game.state.deepest >= q.minFloor && questStage(game, q) !== 'done');
}

export function questProgress(game: Game, def: QuestDef): { current: number; target: number } {
  const s = game.state;
  const st = s.quests[def.id];
  switch (def.kind) {
    case 'hunt': {
      const kills = s.kills[def.target as string] ?? 0;
      return { current: Math.min(def.qty, kills - (st?.start ?? kills)), target: def.qty };
    }
    case 'gather':
      return { current: Math.min(def.qty, s.materials[def.target as string] ?? 0), target: def.qty };
    case 'reach':
      return { current: s.deepest >= (def.target as number) ? 1 : 0, target: 1 };
    case 'boss': {
      const floor = FLOORS.findIndex((f) => f.boss?.includes(def.target as string));
      return { current: s.progress[floor]?.bossDefeated || (s.kills[def.target as string] ?? 0) > 0 ? 1 : 0, target: 1 };
    }
  }
}

export function acceptQuest(game: Game, id: string): boolean {
  const def = QUESTS.find((q) => q.id === id);
  if (!def || game.state.quests[id] || game.state.deepest < def.minFloor) return false;
  const start = def.kind === 'hunt' ? (game.state.kills[def.target as string] ?? 0) : 0;
  game.state.quests[id] = { status: 'active', start };
  return true;
}

/** Hands in a finished quest: gather quests give up their materials. Returns false if it isn't finished. */
export function turnInQuest(game: Game, id: string): boolean {
  const def = QUESTS.find((q) => q.id === id);
  if (!def || questStage(game, def) !== 'ready') return false;
  const s = game.state;
  if (def.kind === 'gather') {
    const mat = def.target as string;
    s.materials[mat] -= def.qty;
    if (s.materials[mat] <= 0) delete s.materials[mat];
  }
  s.gold += def.reward.gold;
  for (const [item, n] of Object.entries(def.reward.items ?? {}) as [ItemId, number][]) s.inventory[item] = (s.inventory[item] ?? 0) + n;
  s.quests[id].status = 'done';
  return true;
}

/** "Defeat 5 Bogling", "Bring 3 Briar Quill", ... */
export function questGoal(def: QuestDef): string {
  switch (def.kind) {
    case 'hunt':
      return `Defeat ${def.qty} ${ENEMIES[def.target as string].name}`;
    case 'gather':
      return `Bring ${def.qty} ${MATERIALS[def.target as string].name}`;
    case 'reach':
      return `Reach ${FLOORS[def.target as number].name}`;
    case 'boss':
      return `Defeat ${ENEMIES[def.target as string].name}`;
  }
}

export function rewardText(def: QuestDef): string {
  const items = Object.entries(def.reward.items ?? {}).map(([id, n]) => `${n}× ${ITEMS[id as ItemId].name}`);
  return [`${def.reward.gold} G`, ...items].join(', ');
}
