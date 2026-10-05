import assert from "node:assert/strict";
import test from "node:test";
import { BROCK, brockSuperRocketOffset } from "../src/features/training/brockCombat.ts";

test("Brock super owns five landing points in the combat attributes", () => {
  assert.deepEqual(BROCK.superLandingPattern, [
    [0, 0],
    [-566, -566],
    [566, -566],
    [566, 566],
    [-566, 566],
  ]);
});

test("Brock super rotates through all five landing points", () => {
  assert.deepEqual(
    Array.from({ length: BROCK.superRocketCount }, (_, index) => brockSuperRocketOffset(index)),
    [
      { x: 0, y: 0 },
      { x: -566, y: -566 },
      { x: 566, y: -566 },
      { x: 566, y: 566 },
      { x: -566, y: 566 },
      { x: 0, y: 0 },
      { x: -566, y: -566 },
      { x: 566, y: -566 },
      { x: 566, y: 566 },
    ],
  );
});

test("outer Brock super landings cannot hit a normal target aimed at the center", () => {
  const normalTargetRadius = 150;
  const hitDistance = BROCK.superExplosionRadius + normalTargetRadius;
  for (const [x, y] of BROCK.superLandingPattern.slice(1)) {
    assert.ok(Math.hypot(x, y) > hitDistance);
  }
});
