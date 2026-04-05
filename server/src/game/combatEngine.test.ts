import assert from "node:assert/strict";
import test from "node:test";
import { createCombatState, resolvePlayerAction } from "./combatEngine.js";
import type { CombatEntity } from "@ygd/shared";

const ally: CombatEntity = {
  entityId: "player-p1",
  name: "Tester",
  isPlayer: true,
  className: "Guardian",
  level: 1,
  stats: { maxHp: 40, attack: 10, defense: 6, speed: 5, critChance: 0, accuracy: 1 },
  currentHp: 40,
  cooldowns: {},
  statuses: {}
};

const enemy: CombatEntity = {
  entityId: "enemy-1",
  name: "Slime",
  isPlayer: false,
  level: 1,
  stats: { maxHp: 12, attack: 4, defense: 1, speed: 3, critChance: 0, accuracy: 1 },
  currentHp: 12,
  cooldowns: {},
  statuses: {}
};

void test("resolvePlayerAction damages target and progresses turn", () => {
  const initial = createCombatState("run_1", [ally], [enemy]);
  const next = resolvePlayerAction(initial, {
    actorId: "player-p1",
    skillId: "strike",
    targetIds: ["enemy-1"]
  });
  const nextEnemy = next.enemies.find((entity) => entity.entityId === "enemy-1");
  assert.ok(nextEnemy);
  assert.ok(nextEnemy.currentHp < enemy.currentHp);
  assert.ok(next.turn > initial.turn || next.encounterComplete);
});
