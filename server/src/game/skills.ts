import type { CharacterClass, PlayerSkillTreeState, SkillNode } from "@ygd/shared";
import { getOrCreateProfile } from "./progression.js";

const skillNodes: SkillNode[] = [
  { id: "guardian_bulwark", className: "Guardian", name: "Bulwark", description: "More guard value.", cost: 1, requires: [] },
  { id: "guardian_shockwall", className: "Guardian", name: "Shockwall", description: "Retaliate while guarding.", cost: 2, requires: ["guardian_bulwark"] },
  { id: "ranger_hawkeye", className: "Ranger", name: "Hawkeye", description: "Boost accuracy and crit.", cost: 1, requires: [] },
  { id: "ranger_volleyplus", className: "Ranger", name: "Volley+", description: "Multi-hit volley.", cost: 2, requires: ["ranger_hawkeye"] },
  { id: "mystic_focus", className: "Mystic", name: "Arcane Focus", description: "Increase spell power.", cost: 1, requires: [] },
  { id: "mystic_overload", className: "Mystic", name: "Overload", description: "Heavy burst with cooldown.", cost: 2, requires: ["mystic_focus"] },
  { id: "rogue_backstab", className: "Rogue", name: "Backstab", description: "High crit opener.", cost: 1, requires: [] },
  { id: "rogue_shadowstep", className: "Rogue", name: "Shadowstep", description: "Avoid next attack.", cost: 2, requires: ["rogue_backstab"] }
];

const playerTrees = new Map<string, Record<CharacterClass, PlayerSkillTreeState>>();

const defaultLoadouts: Record<CharacterClass, string[]> = {
  Guardian: ["strike", "guard_shout"],
  Ranger: ["arrow_shot", "volley"],
  Mystic: ["arcane_bolt", "focus_aura"],
  Rogue: ["stab", "bleeding_cut"]
};

export function getSkillNodes(className: CharacterClass): SkillNode[] {
  return skillNodes.filter((node) => node.className === className);
}

export function getPlayerSkillTree(playerId: string, fallbackName: string, className: CharacterClass): PlayerSkillTreeState {
  getOrCreateProfile(playerId, fallbackName);
  return ensureTree(playerId)[className];
}

export function unlockNode(
  playerId: string,
  fallbackName: string,
  className: CharacterClass,
  nodeId: string
): PlayerSkillTreeState {
  const profile = getOrCreateProfile(playerId, fallbackName);
  const tree = ensureTree(playerId)[className];
  const node = skillNodes.find((entry) => entry.id === nodeId && entry.className === className);
  if (!node) {
    throw new Error("Skill node not found.");
  }
  if (tree.unlockedNodeIds.includes(node.id)) {
    return tree;
  }
  if (!node.requires.every((requiredId) => tree.unlockedNodeIds.includes(requiredId))) {
    throw new Error("Prerequisite nodes missing.");
  }
  const points = profile.skillPoints ?? 0;
  if (points < node.cost) {
    throw new Error("Not enough skill points.");
  }
  profile.skillPoints = points - node.cost;
  tree.unlockedNodeIds.push(node.id);
  return tree;
}

export function setLoadout(playerId: string, className: CharacterClass, skillIds: string[]): PlayerSkillTreeState {
  const tree = ensureTree(playerId)[className];
  tree.equippedSkillIds = skillIds.slice(0, 4);
  return tree;
}

function ensureTree(playerId: string): Record<CharacterClass, PlayerSkillTreeState> {
  const existing = playerTrees.get(playerId);
  if (existing) {
    return existing;
  }
  const created: Record<CharacterClass, PlayerSkillTreeState> = {
    Guardian: { unlockedNodeIds: [], equippedSkillIds: defaultLoadouts.Guardian },
    Ranger: { unlockedNodeIds: [], equippedSkillIds: defaultLoadouts.Ranger },
    Mystic: { unlockedNodeIds: [], equippedSkillIds: defaultLoadouts.Mystic },
    Rogue: { unlockedNodeIds: [], equippedSkillIds: defaultLoadouts.Rogue }
  };
  playerTrees.set(playerId, created);
  return created;
}
