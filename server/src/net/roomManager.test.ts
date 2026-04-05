import assert from "node:assert/strict";
import test from "node:test";
import { RoomManager } from "./roomManager.js";

void test("host can start run after players ready", () => {
  const manager = new RoomManager();
  const room = manager.createRoom("p1", "Host", "Guardian");
  manager.joinRoom("p2", room.roomId, "Guest", "Ranger");
  manager.setReady("p1", room.roomId, true);
  manager.setReady("p2", room.roomId, true);
  const run = manager.startRun("p1", room.roomId);
  assert.equal(run.roomId, room.roomId);
  assert.equal(run.combat.allies.length, 2);
});
