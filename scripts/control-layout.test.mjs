import assert from "node:assert/strict";
import { test } from "node:test";
import { clampJoystick, hyperButtonDiameter, joystickDiameter } from "../src/features/training/controlLayout.ts";

test("Hypercharge uses a compact button size rather than joystick diameter", () => {
  const layout = clampJoystick({ x: .65, y: .43, size: .13 }, 1200, 768, "hyper");
  assert.equal(hyperButtonDiameter(layout, 1200, 768), 80);
  assert.equal(joystickDiameter(layout, 1200, 768), 99.84);
});

test("joystick size follows viewport short edge within limits", () => {
  assert.equal(joystickDiameter({ x: .5, y: .5, size: .2 }, 1000, 500), 100);
  assert.equal(joystickDiameter({ x: .5, y: .5, size: .05 }, 1000, 500), 57.6);
  assert.equal(joystickDiameter({ x: .5, y: .5, size: .5 }, 1000, 500), 220);
  assert.equal(clampJoystick({ x: .5, y: .5, size: 0 }, 1000, 500).size, .078);
  assert.equal(clampJoystick({ x: .5, y: .5, size: 0 }, 1000, 500, "gadget").size, .042);
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
