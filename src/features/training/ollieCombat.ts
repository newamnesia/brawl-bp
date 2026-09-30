export type OllieGadget = "regulate" | "allEyezOnMe";
export type OllieStarPower = "kickPush" | "renegade";
export type OllieCrowdControl = "stun" | "pull" | "knockback" | "slow" | "silence";

export const OLLIE = {
  health: 10800,
  moveSpeed: 800,
  ammoCapacity: 3,
  reloadSeconds: 1.8,
  reloadDelaySeconds: 0.6,
  attackIntervalSeconds: 0.6,
  attackDamage: 2000,
  attackRange: 1900,
  attackProjectileSpeed: 3000,
  attackWidth: 200,
  attackProjectileCount: 2,
  attackSpreadDegrees: 13.5,
  attackSuperChargePerHit: 0.16875,
  tankTraitDamageForFullSuper: 10800 * 2.4,
  tankTraitSuperChargePerDamage: 1 / (10800 * 2.4),
  superDashDistance: 1700,
  superDashSpeed: 2300,
  superBlastDelaySeconds: 1.5,
  superBlastRadius: 1000,
  superDamage: 1600,
  superHypnosisSeconds: 2.5,
  hypnosisMoveSpeed: 750,
  superAmmoReductionRatio: 0.5,
  superAmmoCost: 1.5,
  superInterruptibleBy: ["stun", "pull", "knockback"] as const,
  superRechargePerTarget: 0.2,
  hyperSuperRechargePerTarget: 0.21,
  regulateCooldownSeconds: 20,
  regulateDashDistance: 1100,
  regulateDashSpeed: 3500,
  regulateHypnosisRadius: 500,
  regulateHypnosisSeconds: 1,
  allEyezCooldownSeconds: 15,
  allEyezHypnosisSeconds: 1,
  kickPushNearWallDistance: 300,
  kickPushSpeedMultiplier: 1.2,
  renegadeShield: 3000,
  renegadeShieldSeconds: 4,
  hyperChargeMultiplier: 0.25,
  hyperDurationSeconds: 5,
  hyperDamageMultiplier: 1.05,
  hyperSpeedMultiplier: 1.2,
  hyperDamageReduction: 0.05,
  hyperSuperDashDistance: 2000,
  hyperSuperDashSpeed: 4000,
  hyperSuperBlastRadius: 1500,
  hyperSuperDamage: 1680,
} as const;

export const OLLIE_DEFAULT_LOADOUT: {
  gadget: OllieGadget;
  starPower: OllieStarPower;
} = {
  gadget: "regulate",
  starPower: "renegade",
};

export function ollieAttackAngles(baseAngle: number): number[] {
  const halfSpread = OLLIE.attackSpreadDegrees * Math.PI / 360;
  return [baseAngle - halfSpread, baseAngle + halfSpread];
}

export function ollieSuperIsInterruptedBy(effect: OllieCrowdControl): boolean {
  return (OLLIE.superInterruptibleBy as readonly OllieCrowdControl[]).includes(effect);
}
