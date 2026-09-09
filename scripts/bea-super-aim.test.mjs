import assert from 'node:assert/strict';
import { test } from 'node:test';
import { updateBeaSuperAim } from '../src/features/training/beaSuper.ts';

test('full charge waits for aim, range exit cancels without firing', () => {
  const state = { elapsed: 0, stable: 0, angle: 0 };
  assert.deepEqual(updateBeaSuperAim(state, .05, true, 10, 0, 0, 0), { aiming: false, fire: false });
  for (let i = 0; i < 8; i++) assert.equal(updateBeaSuperAim(state, .05, true, 6, 0, 0, 0).fire, false);
  assert.equal(updateBeaSuperAim(state, .06, true, 6, 0, 0, 0).fire, true);
  assert.equal(updateBeaSuperAim(state, .05, true, 10, 0, 0, 0).aiming, false);
  assert.equal(state.elapsed, 0);
  assert.equal(updateBeaSuperAim(state, .05, false, 6, 0, 0, 0).fire, false);
});

test('aim leads a moving target and rejects an intercept beyond range', () => {
  const state = { elapsed: 0, stable: 0, angle: 0 };
  let result;
  for (let i = 0; i < 20; i++) result = updateBeaSuperAim(state, .05, true, 6, 0, 0, 2);
  assert.equal(result.fire, true);
  assert.ok(state.angle > .2);
  for (let i = 0; i < 20; i++) result = updateBeaSuperAim(state, .05, true, 8.9, 0, 2, 0);
  assert.equal(result.fire, false);
});

test('mobile and web use the same aiming state transitions', async () => {
  const mobile = await import('../mobile-app/src/features/training/beaSuper.ts');
  const a = { elapsed: 0, stable: 0, angle: 1 }, b = { ...a };
  for (let i = 0; i < 30; i++) {
    assert.deepEqual(updateBeaSuperAim(a, 1/30, true, 5, 2, 1, 0),
      mobile.updateBeaSuperAim(b, 1/30, true, 5, 2, 1, 0));
    assert.deepEqual(a, b);
  }
});
