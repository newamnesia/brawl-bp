import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MOVEMENT_INDICATOR,
  movementIndicatorPosition,
} from '../src/features/training/groundRing.ts';

const near = (actual, expected) => assert.ok(
  Math.abs(actual - expected) < 1e-9,
  `${actual} != ${expected}`,
);

test('movement indicator maps joystick magnitude to the super-ring radius', () => {
  const center = movementIndicatorPosition(100, 80, 30, 20, 0, 0, 0);
  assert.deepEqual(center, { x: 100, y: 80 });

  const half = movementIndicatorPosition(100, 80, 30, 20, 1, 0, 0.5);
  near(half.x, 100 + 30 * MOVEMENT_INDICATOR.maxOffsetRatio * 0.5);
  near(half.y, 80);

  const full = movementIndicatorPosition(100, 80, 30, 20, 0, -1, 1);
  near(full.x, 100);
  near(full.y, 80 - 20 * MOVEMENT_INDICATOR.maxOffsetRatio);
});

test('movement indicator normalizes direction and clamps magnitude', () => {
  const diagonal = movementIndicatorPosition(0, 0, 30, 20, 3, 4, 2);
  near(diagonal.x, 30 * MOVEMENT_INDICATOR.maxOffsetRatio * 3 / 5);
  near(diagonal.y, 20 * MOVEMENT_INDICATOR.maxOffsetRatio * 4 / 5);
});

test('mobile and web share movement-indicator geometry', async () => {
  const mobile = await import('../mobile-app/src/features/training/groundRing.ts');
  assert.deepEqual(mobile.MOVEMENT_INDICATOR, MOVEMENT_INDICATOR);
  assert.deepEqual(
    mobile.movementIndicatorPosition(5, 9, 14, 8, -2, 3, 0.37),
    movementIndicatorPosition(5, 9, 14, 8, -2, 3, 0.37),
  );
});
