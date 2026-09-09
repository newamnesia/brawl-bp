import assert from "node:assert/strict";
import { test } from "node:test";
import { clampJoystick, joystickDiameter } from "../src/features/training/controlLayout.ts";

test("joystick size follows viewport short edge within limits", () => {
  assert.equal(joystickDiameter({ x: .5, y: .5, size: .2 }, 1000, 500), 100);
  assert.equal(joystickDiameter({ x: .5, y: .5, size: .05 }, 1000, 500), 96);
  assert.equal(joystickDiameter({ x: .5, y: .5, size: .5 }, 1000, 500), 220);
});

test("joystick remains fully inside viewport after resize", () => {
  const value = clampJoystick({ x: -5, y: 8, size: .3 }, 800, 400);
  const padding = joystickDiameter(value, 800, 400) / 2 + 12;
  assert.equal(value.x, padding / 800);
  assert.equal(value.y, 1 - padding / 400);
});

test("invalid stored numeric fields fall back into safe range", () => {
  const value = clampJoystick({ x: Number.NaN, y: Infinity, size: Number.NaN }, 800, 400);
  assert.deepEqual(value, { x: .5, y: .75, size: .18 });
});
