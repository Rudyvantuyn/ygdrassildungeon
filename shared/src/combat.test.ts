import assert from "node:assert/strict";
import test from "node:test";
import { calculateDamage, getTurnOrder } from "./combat.js";
import type { CombatEntity } from "./types.js";

const baseEntity: CombatEntity = {
  entityId: "e1",
  name: "unit",
  isPlayer: true,
  className: "Guardian",
  level: 1,
  stats: {
    maxHp: 20,
    attack: 8,
    defense: 3,
    speed: 5,
    critChance: 0,
    accuracy: 1
  },
  currentHp: 20,
  cooldowns: {},
  statuses: {}
};

void test("getTurnOrder sorts by speed descending", () => {
  const slow = { ...baseEntity, entityId: "slow", stats: { ...baseEntity.stats, speed: 1 } };
  const fast = { ...baseEntity, entityId: "fast", stats: { ...baseEntity.stats, speed: 9 } };
  const order = getTurnOrder([slow, fast]);
  assert.equal(order[0]?.entityId, "fast");
  assert.equal(order[1]?.entityId, "slow");
});

void test("calculateDamage returns at least one", () => {
  const attacker = { ...baseEntity, stats: { ...baseEntity.stats, attack: 1 } };
  const defender = { ...baseEntity, stats: { ...baseEntity.stats, defense: 999 } };
  const damage = calculateDamage({ power: 1, attacker, defender, random: () => 1 });
  assert.equal(damage, 1);
});
