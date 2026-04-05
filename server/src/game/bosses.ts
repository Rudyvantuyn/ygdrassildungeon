import type { CombatEntity, Stats } from "@ygd/shared";

export interface BossTemplate {
  id: "abyssHydra" | "obsidianLich";
  name: string;
  level: number;
  stats: Stats;
  skillId: string;
  mechanic: "phaseSwap" | "summonAdds";
}

export const BOSS_TEMPLATES: BossTemplate[] = [
  {
    id: "abyssHydra",
    name: "Abyss Hydra",
    level: 6,
    skillId: "boss_slash",
    mechanic: "phaseSwap",
    stats: {
      maxHp: 120,
      attack: 18,
      defense: 8,
      speed: 7,
      critChance: 0.08,
      accuracy: 0.92
    }
  },
  {
    id: "obsidianLich",
    name: "Obsidian Lich",
    level: 7,
    skillId: "boss_slash",
    mechanic: "summonAdds",
    stats: {
      maxHp: 110,
      attack: 20,
      defense: 7,
      speed: 8,
      critChance: 0.1,
      accuracy: 0.94
    }
  }
];

export function createBossEntity(templateId: BossTemplate["id"]): CombatEntity {
  const template = BOSS_TEMPLATES.find((candidate) => candidate.id === templateId);
  if (!template) {
    throw new Error(`Unknown boss template: ${templateId}`);
  }
  return {
    entityId: `boss-${template.id}`,
    name: template.name,
    isPlayer: false,
    level: template.level,
    stats: template.stats,
    currentHp: template.stats.maxHp,
    cooldowns: {},
    statuses: {}
  };
}
