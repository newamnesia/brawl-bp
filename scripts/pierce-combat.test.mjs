import assert from "node:assert/strict";
import { test } from "node:test";
import { PIERCE_SHELL } from "../src/features/training/pierceCombat.ts";

test("tidal wave and character trial share Pierce shell timing and pickup geometry", () => {
  assert.deepEqual(PIERCE_SHELL, {
    lifetimeSeconds: 8,
    pickupRadius: 300,
    minDistance: 350,
    maxDistance: 700,
    visualRadius: 78,
  });
});
