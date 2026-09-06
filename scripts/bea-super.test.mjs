import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BEA_SUPER, beaSuperPosition, chargeBeaSuper } from '../src/features/training/beaSuper.ts';
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test('normal and enhanced hits both charge 26% and cap at full', () => {
  near(chargeBeaSuper(0, 'beaNormal'), .26);
  near(chargeBeaSuper(0, 'beaEnhanced'), .26);
  near(chargeBeaSuper(.26, 'beaEnhanced'), .52);
  near(chargeBeaSuper(.975, 'beaNormal'), 1);
  near(chargeBeaSuper(0, 'high'), 0);
  near(chargeBeaSuper(1, 'beaEnhanced'), 1);
  let charge = 0;
  for (let i = 0; i < 4; i++) charge = chargeBeaSuper(charge, 'beaNormal');
  near(charge, 1);
  for (let i = 0; i < 10; i++) charge = chargeBeaSuper(charge, 'beaEnhanced');
  near(charge, 1);
  charge = 0; // 释放大招，溢出伤害不带入下一轮。
  near(chargeBeaSuper(charge, 'beaNormal'), .26);
});

test('super hits recharge 2.5% each, 17.5% for all seven, without overflow', () => {
  near(chargeBeaSuper(0, 'beaSuper'), .025);
  let charge = 0;
  for (let i = 0; i < 7; i++) charge = chargeBeaSuper(charge, 'beaSuper');
  near(charge, .175);
  near(chargeBeaSuper(charge, 'beaEnhanced'), .435);
  near(chargeBeaSuper(.99, 'beaSuper'), 1);
  near(chargeBeaSuper(1, 'beaSuper'), 1);
});

test('fan endpoints match the supplied 2700-unit model', () => {
  const expected = [[1369,1456], [2208,1108], [2623,475], [2700,0],
    [2623,-475], [2208,-1108], [1369,-1456]];
  BEA_SUPER.angularSpeeds.forEach((omega, index) => {
    const end = beaSuperPosition(1.08, omega);
    assert.ok(Math.abs(end.x * 300 - expected[index][0]) < 2);
    assert.ok(Math.abs(end.y * 300 - expected[index][1]) < 2);
  });
});
test('seven projectiles share straight phase then form symmetric curved fan', () => {
  assert.equal(BEA_SUPER.angularSpeeds.length, 7);
  for (const omega of BEA_SUPER.angularSpeeds) {
    const start = beaSuperPosition(.2755, omega);
    near(start.x * 300, 688.75);
    near(start.y, 0);
    const left = beaSuperPosition(.8, omega);
    const right = beaSuperPosition(.8, -omega);
    near(left.x, right.x);
    near(left.y, -right.y);
  }
  assert.ok(beaSuperPosition(.84, 2.818).heading > Math.PI / 2);
});
test('constant speed and nine-tile lifetime, independent of frame rate', () => {
  for (const omega of BEA_SUPER.angularSpeeds) {
    for (const t of [.1, .4, .8]) {
      const a = beaSuperPosition(t, omega), b = beaSuperPosition(t + 1e-6, omega);
      assert.ok(Math.abs(Math.hypot(b.x-a.x, b.y-a.y)/1e-6 - BEA_SUPER.speed) < 1e-5);
    }
    const end = beaSuperPosition(BEA_SUPER.range / BEA_SUPER.speed, omega);
    for (const fps of [30, 60, 144]) {
      let t = 0;
      for (let i = 0; i < fps * 2; i++) t += 1 / fps;
      assert.deepEqual(beaSuperPosition(t, omega), end);
    }
  }
  near(beaSuperPosition(100, 0).x, 9);
  near(BEA_SUPER.radius * 2, .5);
  near(BEA_SUPER.slowMultiplier, .6);
  assert.equal(BEA_SUPER.slowMs, 3000);
  assert.equal(BEA_SUPER.damage, 260);
});
test('mobile uses identical skill parameters and trajectory implementation', async () => {
  const mobile = await import('../mobile-app/src/features/training/beaSuper.ts');
  assert.deepEqual(mobile.BEA_SUPER, BEA_SUPER);
  for (const projectile of ['beaNormal', 'beaEnhanced', 'beaSuper', 'high']) {
    for (const charge of [0, .5, .99, 1]) {
      near(mobile.chargeBeaSuper(charge, projectile), chargeBeaSuper(charge, projectile));
    }
  }
  for (const omega of BEA_SUPER.angularSpeeds) {
    assert.deepEqual(mobile.beaSuperPosition(.9, omega), beaSuperPosition(.9, omega));
  }
});
