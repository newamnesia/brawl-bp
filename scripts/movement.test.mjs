import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceMovement, normalizedSpeed, resetsMovementOnTurn } from '../src/features/training/movement.ts';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
test('normalized linear startup and cap', () => {
  for (const [t, v] of [[0, 0], [0.05, 0.25], [0.1, 0.5], [0.2, 1], [1, 1]]) near(normalizedSpeed(t), v);
  near(normalizedSpeed(0.1) * 770, 385);
  near(normalizedSpeed(0.1) * 900, 450);
});
test('deadzone stops immediately and restarts from zero', () => {
  const stopped = advanceMovement(0.2, 0.016, false);
  assert.deepEqual(stopped, { elapsed: 0, speed: 0, distance: 0 });
  near(advanceMovement(stopped.elapsed, 0.05, true).speed, 0.25);
});
test('startup distance is frame-rate independent, including crossing 0.2s', () => {
  for (const fps of [20, 30, 60, 144]) {
    let elapsed = 0, distance = 0;
    for (let i = 0; i < fps; i++) {
      const step = advanceMovement(elapsed, 1 / fps, true);
      elapsed = step.elapsed;
      distance += step.distance;
    }
    near(distance * 770, 693); // 77 units accelerating + 616 at full speed
  }
});
test('AI single-command turns use shortest angle and strict >120 degrees', () => {
  const rad = (degrees) => degrees * Math.PI / 180;
  for (const angle of [0, 90, 119.9, 120, -120]) assert.equal(resetsMovementOnTurn(0, rad(angle)), false);
  for (const angle of [120.1, -120.1, 180]) assert.equal(resetsMovementOnTurn(0, rad(angle)), true);
  assert.equal(resetsMovementOnTurn(rad(179), rad(-179)), false);
  let elapsed = 0.2;
  if (resetsMovementOnTurn(0, rad(150))) elapsed = 0;
  near(advanceMovement(elapsed, 0.05, true).speed, 0.25);
});
