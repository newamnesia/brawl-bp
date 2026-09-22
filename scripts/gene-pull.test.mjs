import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceGenePull } from "../src/features/training/geneCombat.ts";

test("Gene releases a target in the same frame it reaches his side", () => {
  // This diagonal pull used to finish at 300.0000000000001 units, leaving
  // the old distance <= 300 check false and the target attached indefinitely.
  const target = { x: -1662.1108496968518, y: 3538.1851698128985 };
  const player = { x: 0, y: 0 };
  const result = advanceGenePull(target, player, 2, 300);
  assert.equal(result.finished, true);
  assert.ok(Math.abs(Math.hypot(result.x, result.y) - 300) < 1e-9);
});

test("Gene keeps pulling only while the target is still traveling", () => {
  const player = { x: 0, y: 0 };
  const first = advanceGenePull({ x: 2300, y: 0 }, player, 0.25, 300);
  assert.equal(first.finished, false);
  assert.equal(first.x, 1800);
  const last = advanceGenePull(first, player, 1, 300);
  assert.equal(last.finished, true);
  assert.equal(last.x, 300);
});
