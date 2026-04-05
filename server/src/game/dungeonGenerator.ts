import enemies from "./content/enemies.json" with { type: "json" };
import type { CombatEntity, Stats } from "@ygd/shared";
import { createBossEntity } from "./bosses.js";

interface EnemyTemplate {
  id: string;
  name: string;
  level: number;
  skillId: string;
  stats: Stats;
}

export interface DungeonEncounter {
  floor: number;
  isBoss: boolean;
  mutator?: string;
  enemies: CombatEntity[];
}

const enemyTemplates = enemies as EnemyTemplate[];

export function generateDungeonEncounters(
  seed = Date.now(),
  difficultyTier: "normal" | "veteran" | "mythic" | "abyss" = "normal"
): DungeonEncounter[] {
  const mutator = pickDailyMutator(seed);
  const multiplier = difficultyMultiplier[difficultyTier];
  const floors = [1, 2, 3, 4, 5];
  return floors.map((floor, index) => {
    if (floor === 3) {
      return {
        floor,
        isBoss: true,
        mutator,
        enemies: applyTierScaling([createBossEntity("abyssHydra")], multiplier)
      };
    }
    if (floor === 5) {
      return {
        floor,
        isBoss: true,
        mutator,
        enemies: applyTierScaling([createBossEntity("obsidianLich")], multiplier)
      };
    }
    const encounterSeed = seed + index * 97;
    return {
      floor,
      isBoss: false,
      mutator,
      enemies: applyTierScaling(buildEnemyPack(encounterSeed, 2 + (floor % 2)), multiplier)
    };
  });
}

function buildEnemyPack(seed: number, size: number): CombatEntity[] {
  const list: CombatEntity[] = [];
  for (let i = 0; i < size; i += 1) {
    const template = enemyTemplates[(seed + i * 17) % enemyTemplates.length];
    if (!template) {
      continue;
    }
    list.push({
      entityId: `enemy-${template.id}-${seed}-${i}`,
      name: template.name,
      isPlayer: false,
      level: template.level,
      stats: template.stats,
      currentHp: template.stats.maxHp,
      cooldowns: {},
      statuses: {}
    });
  }
  return list;
}

const difficultyMultiplier: Record<"normal" | "veteran" | "mythic" | "abyss", number> = {
  normal: 1,
  veteran: 1.2,
  mythic: 1.45,
  abyss: 1.75
};

function applyTierScaling(enemies: CombatEntity[], multiplier: number): CombatEntity[] {
  return enemies.map((enemy) => ({
    ...enemy,
    level: Math.max(1, Math.floor(enemy.level * multiplier)),
    stats: {
      ...enemy.stats,
      maxHp: Math.floor(enemy.stats.maxHp * multiplier),
      attack: Math.floor(enemy.stats.attack * multiplier),
      defense: Math.floor(enemy.stats.defense * multiplier),
      speed: Math.max(1, Math.floor(enemy.stats.speed * (1 + (multiplier - 1) * 0.4)))
    },
    currentHp: Math.floor(enemy.stats.maxHp * multiplier)
  }));
}

function pickDailyMutator(seed: number): string {
  const table = ["burningFloors", "cursedHealing", "elitePacks", "fogOfWar"];
  return table[Math.abs(seed) % table.length] ?? "burningFloors";
}
