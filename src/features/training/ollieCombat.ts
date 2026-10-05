import { TRIAL_BRAWLERS } from "./characterTrial";

export type OllieGadget = "regulate" | "allEyezOnMe";
export type OllieStarPower = "kickPush" | "renegade";
export type OllieCrowdControl = "stun" | "pull" | "knockback" | "slow" | "silence";
export type OllieAttackHitLedger = Map<number, Set<string>>;

export const OLLIE = {
  health: TRIAL_BRAWLERS.ollie.health,
  moveSpeed: TRIAL_BRAWLERS.ollie.moveSpeed,
  ammoCapacity: TRIAL_BRAWLERS.ollie.ammoCapacity,
  reloadSeconds: TRIAL_BRAWLERS.ollie.reloadSeconds,
  reloadDelaySeconds: TRIAL_BRAWLERS.ollie.reloadDelaySeconds,
  attackIntervalSeconds: TRIAL_BRAWLERS.ollie.attackIntervalSeconds,
  attackDamage: 2000,
  attackRange: TRIAL_BRAWLERS.ollie.range,
  attackProjectileSpeed: TRIAL_BRAWLERS.ollie.projectileSpeed,
  attackWidth: TRIAL_BRAWLERS.ollie.projectileWidth,
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

/**
 * 奥利一次普攻的两道声波共享命中记录。同一施法可以分别命中多个单位，
 * 但无论同一单位与几道声波重叠，都只结算一次伤害和充能。
 */
export function registerOllieAttackHit(
  ledger: OllieAttackHitLedger,
  castId: number,
  targetId: string,
): boolean {
  const hitTargets = ledger.get(castId);
  if (hitTargets?.has(targetId)) return false;
  if (hitTargets) hitTargets.add(targetId);
  else ledger.set(castId, new Set([targetId]));
  return true;
}

export function ollieSuperIsInterruptedBy(effect: OllieCrowdControl): boolean {
  return (OLLIE.superInterruptibleBy as readonly OllieCrowdControl[]).includes(effect);
}
