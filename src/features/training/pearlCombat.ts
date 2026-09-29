export type PearlGadget = "overcooked" | "madeWithLove";
export type PearlStarPower = "heatRetention" | "heatShield";

export const PEARL = {
  health: 8600,
  moveSpeed: 750,
  ammoCapacity: 3,
  reloadSeconds: 1.5,
  reloadDelaySeconds: 0.7,
  attackIntervalSeconds: 0.7,
  attackBullets: 6,
  attackMinDamage: 560,
  attackMaxDamage: 980,
  attackRange: 2700,
  attackProjectileSpeed: 4000,
  attackWidth: 200,
  attackSpreadDegrees: 20,
  attackBulletIntervalSeconds: 0.1,
  attackSuperChargePerHit: 0.065,
  attackHyperChargePerHit: 0.026,
  heatChargeSeconds: 9,
  heatUseSecondsPerCookie: 0.38,
  heatMaxDamageBonus: 0.75,
  superMinDamage: 3100,
  superMaxDamage: 5422,
  superRadius: 1000,
  superWindupSeconds: 0.3,
  superPushbackStrengthRaw: 50,
  superKnockbackDistance: 500,
  superChargeOnHit: 0.3875,
  superHyperChargeOnHit: 0.155,
  heatRetentionRatio: 0.5,
  heatShieldThreshold: 0.8,
  heatShieldDamageReduction: 0.2,
  overcookedCooldownSeconds: 15,
  overcookedMinDamage: 1040,
  overcookedMaxDamage: 1820,
  overcookedTicks: 4,
  overcookedTickSeconds: 1,
  overcookedSuperChargePerTick: 0.00975,
  overcookedHyperChargePerTick: 0.00375,
  madeWithLoveCooldownSeconds: 11,
  madeWithLoveHealing: 2800,
  madeWithLoveTicks: 4,
  madeWithLoveTickSeconds: 1,
  hyperChargeMultiplier: 0.4,
  hyperDurationSeconds: 5,
  hyperSpeedMultiplier: 1.2,
  hyperDamageMultiplier: 1.05,
  hyperDamageReduction: 0.05,
  hyperFireDurationSeconds: 4.5,
  hyperFireDamage: 800,
  hyperFireTicks: 5,
  hyperFireTickSeconds: 1,
  hyperFireSuperChargePerTick: 0.1,
  hyperFireHyperChargePerTick: 0.04,
} as const;

export const PEARL_DEFAULT_LOADOUT: {
  gadget: PearlGadget;
  starPower: PearlStarPower;
} = {
  gadget: "overcooked",
  starPower: "heatShield",
};

export function pearlAttackAngles(baseAngle: number): number[] {
  const halfSpread = PEARL.attackSpreadDegrees / 2;
  return Array.from({ length: PEARL.attackBullets }, (_, index) => {
    const degrees = -halfSpread + index * (PEARL.attackSpreadDegrees / (PEARL.attackBullets - 1));
    return baseAngle + degrees * Math.PI / 180;
  });
}

export function pearlDamageAtHeat(minDamage: number, heat: number): number {
  return minDamage * (1 + PEARL.heatMaxDamageBonus * Math.max(0, Math.min(1, heat)));
}

export function pearlSuperDamageAtHeat(heat: number): number {
  const normalizedHeat = Math.max(0, Math.min(1, heat));
  return PEARL.superMinDamage + (PEARL.superMaxDamage - PEARL.superMinDamage) * normalizedHeat;
}

export function pearlHeatAfterCookie(heat: number): number {
  return Math.max(0, heat - PEARL.heatUseSecondsPerCookie / PEARL.heatChargeSeconds);
}

export function pearlHeatAfterSuper(heat: number, starPower: PearlStarPower): number {
  return starPower === "heatRetention" ? heat * PEARL.heatRetentionRatio : 0;
}

export function pearlVolleyDamages(startHeat: number): number[] {
  let heat = Math.max(0, Math.min(1, startHeat));
  return Array.from({ length: PEARL.attackBullets }, (_, index) => {
    const damage = pearlDamageAtHeat(PEARL.attackMinDamage, heat);
    heat = pearlHeatAfterCookie(heat);
    if (index < PEARL.attackBullets - 1) {
      heat = Math.min(1, heat + PEARL.attackBulletIntervalSeconds / PEARL.heatChargeSeconds);
    }
    return damage;
  });
}
