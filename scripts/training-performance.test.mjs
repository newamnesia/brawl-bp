import assert from "node:assert/strict";
import { test } from "node:test";
import { battleCanvasDpr } from "../src/features/training/performance.ts";

test("touch battle canvases cap DPR to protect constrained browsers", () => {
  assert.equal(battleCanvasDpr(4, true), 2);
  assert.equal(battleCanvasDpr(1.5, true), 1.5);
  assert.equal(battleCanvasDpr(3, false), 3);
  assert.equal(battleCanvasDpr(Number.NaN, true), 1);
});
