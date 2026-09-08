import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canMovementShoot, movementShotDelay, movementTimingScale } from '../src/features/training/firing.ts';
import { readFileSync } from 'node:fs';

test('mobile and web share firing policy', () => {
  assert.equal(readFileSync('src/features/training/firing.ts', 'utf8'), readFileSync('mobile-app/src/features/training/firing.ts', 'utf8'));
});

for (const survival of [false, true]) {
  for (const isBea of [false, true]) {
    test(`${survival ? 'survival' : 'practice'} ${isBea ? 'Bea' : 'Piper'} sustained ammo and bursts`, () => {
      let seed = 12345;
      const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
      const capacity = isBea ? 1 : 3, reload = isBea ? 0.9 : 2.3;
      let ammo = capacity, remaining = reload, timer = 0, followup = false, previousScale = 1;
      let low = 0, full = 0, bursts = 0, shots = 0, lastShot = -100;
      const dt = 1 / 120, duration = 1200;
      for (let t = 0; t < duration; t += dt) {
        const scale = movementTimingScale(survival, t % 180);
        remaining *= scale / previousScale;
        timer *= scale / previousScale;
        previousScale = scale;
        const difficulty = 1 / scale;
        const currentReload = reload / difficulty;
        if (ammo < capacity) {
          remaining -= dt;
          if (remaining <= 0) { ammo++; remaining += currentReload; }
        } else remaining = currentReload;
        timer -= dt;
        if (timer <= 0 && canMovementShoot(isBea, ammo, followup)) {
          if (followup) bursts++;
          if (!isBea && !followup) assert.equal(ammo, 3);
          if (isBea) assert.ok(t - lastShot >= 0.9 * Math.pow(0.95, 17) - dt);
          lastShot = t;
          ammo--;
          shots++;
          const next = movementShotDelay(isBea, ammo, remaining, currentReload, difficulty, followup, random);
          timer = next.seconds; followup = next.followup;
        }
        if (ammo < 2) low += dt;
        if (ammo === capacity) full += dt;
      }
      assert.ok(shots > 400);
      if (isBea) assert.equal(bursts, 0);
      else {
        assert.ok(bursts > 50);
        assert.ok(low / duration < 0.25, `low ammo ${low / duration}`);
        assert.ok(full / duration < 0.08, `full ammo ${full / duration}`);
        console.log({ survival, reservePercent: (100 * (1 - low / duration)).toFixed(1), fullPercent: (100 * full / duration).toFixed(1), bursts });
      }
    });
  }
}

test('challenge compounds every 10 seconds without a floor; practice stays fixed', () => {
  for (const [seconds, stage] of [[0, 0], [9.999, 0], [10, 1], [19.999, 1], [20, 2], [60, 6], [600, 60], [3600, 360]]) {
    assert.equal(movementTimingScale(true, seconds), 0.95 ** stage);
    assert.equal(movementTimingScale(false, seconds), 1);
  }
  assert.ok(movementTimingScale(true, 600) < 0.4);
  assert.equal(movementTimingScale(true, 0), 1);
});
