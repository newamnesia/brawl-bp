import assert from "node:assert/strict";
import { test } from "node:test";
import { PIERCE_SHELL, PIERCE_SUPER } from "../src/features/training/pierceCombat.ts";

test("tidal wave and character trial share Pierce shell timing and pickup geometry", () => {
  assert.deepEqual(PIERCE_SHELL, {
    lifetimeSeconds: 8,
    pickupRadius: 300,
    minDistance: 350,
    maxDistance: 700,
    visualRadius: 78,
  });
});

test("tidal wave and character trial share Pierce super phases and homing values", () => {
  assert.equal(PIERCE_SUPER.warningSeconds, 0.8);
  assert.equal(PIERCE_SUPER.lockSeconds, 0.35);
  assert.equal(PIERCE_SUPER.radius, 900);
  assert.equal(PIERCE_SUPER.range, 2500);
  assert.equal(PIERCE_SUPER.damage, 2800);
  assert.equal(PIERCE_SUPER.projectileSpeed, 4500);
  assert.equal(PIERCE_SUPER.steerSeconds, 2);
});
