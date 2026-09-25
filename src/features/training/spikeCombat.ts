export const SPIKE = {
  attackDamage: 1080,
  attackRange: 2300,
  attackProjectileSpeed: 2174,
  attackWidth: 300,
  explosionRadius: 300,
  shardCount: 6,
  shardDamage: 1080,
  shardSpeed: 3261,
  shardWidth: 100,
  shardBaseRange: 1300,
  curveballBuffieExtraRange: 150,
  curveballTurnRadians: 75 * Math.PI / 180,
  attackSuperCharge: 0.12975,
  superRange: 2300,
  superProjectileSpeed: 1739,
  superRadius: 800,
  superDurationSeconds: 4.5,
  superTickSeconds: 1,
  superDamage: 800,
  superSlowMultiplier: 0.6,
  superRechargePerTick: 0.125,
  gadgetRange: 2200,
  gadgetProjectileSpeed: 2500,
  gadgetCooldownSeconds: 20,
  plantHealth: 3500,
  plantRadius: 120,
  plantHealRadius: 1000,
  plantHeal: 1800,
  plantBuffieBlastRadius: 800,
  plantBuffieDamage: 1200,
  plantBuffieKnockback: 450,
  hyperChargeMultiplier: 0.3,
  hyperDurationSeconds: 7,
  hyperDamageMultiplier: 1.05,
  hyperSpeedMultiplier: 1.2,
  hyperDamageReduction: 0.05,
  hyperSuperRadiusMultiplier: 1.2,
  hyperSecondExplosionDelaySeconds: 0.6,
} as const;

export const SPIKE_LOADOUT = {
  gadget: "lifePlant",
  starPower: "curveball",
  buffies: { gadget: true, starPower: true, hypercharge: true },
} as const;

export function spikeShardAngles(): number[] {
  return Array.from({ length: SPIKE.shardCount }, (_, index) => index * Math.PI * 2 / SPIKE.shardCount);
}

// 视频中小刺刚生成时基本沿固定六向直行，随后转弯逐渐明显。
// 使用二次进度让起始角速度为 0，并在全程末端仍达到原定总偏转角。
export function spikeShardPolarAngle(baseAngle: number, totalTurnRadians: number, progress: number): number {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return baseAngle + totalTurnRadians * clampedProgress * clampedProgress;
}

export function spikeShardTangentAngle(baseAngle: number, totalTurnRadians: number, progress: number): number {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const squaredProgress = clampedProgress * clampedProgress;
  return baseAngle
    + totalTurnRadians * squaredProgress
    + Math.atan(2 * totalTurnRadians * squaredProgress);
}
