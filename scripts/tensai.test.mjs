import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceTensaiHold, TENSAI_HOLD_SECONDS } from "../src/features/training/tensai.ts";

test("Tensai target requires two uninterrupted eligible seconds", () => {
  let elapsed = 0;
  elapsed = advanceTensaiHold(elapsed, 1.25, true);
  assert.equal(elapsed, 1.25);
  elapsed = advanceTensaiHold(elapsed, 0.1, false);
  assert.equal(elapsed, 0);
  elapsed = advanceTensaiHold(elapsed, 1.9, true);
  assert.equal(elapsed, 1.9);
  elapsed = advanceTensaiHold(elapsed, 0.2, true);
  assert.equal(elapsed, TENSAI_HOLD_SECONDS);
});
