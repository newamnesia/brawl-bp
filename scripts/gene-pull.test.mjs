import assert from "node:assert/strict";
import { test } from "node:test";
import { GENE, advanceGenePull, destroyWallsAlongGenePull, geneSuperAngles } from "../src/features/training/geneCombat.ts";

test("Gene Hypercharge uses current close and split hit charge values", () => {
  assert.equal(GENE.hyperDirectCharge, 0.0875);
  assert.equal(GENE.hyperSplitCharge, 0.0145);
  assert.equal(GENE.hyperDirectCharge / GENE.directSuperCharge, 0.35);
});

test("all three Hypercharge hands use the same unmodified base range", () => {
  assert.equal(geneSuperAngles(0, true).length, 3);
  assert.equal(GENE.superRange - GENE.baseSuperRange, 300);
});

test("normal Gene pull destroys only walls touched by the return path", () => {
  const walls = new Set(["1,0", "2,0", "2,3"]);
  const destroyed = destroyWallsAlongGenePull(walls, { x: 1000, y: 150 }, { x: 150, y: 150 }, 300, 150);
  assert.equal(destroyed, 2);
  assert.deepEqual([...walls], ["2,3"]);
});

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
