import { TRIAL_BRAWLERS } from "./characterTrial";

// Piper, power 11. Snappy Sniping applies only when her main attack hits an enemy.
// Current value cross-checked 2026-09-28:
// https://liquipedia.net/brawlstars/Piper
// https://brawlzone.net/brawlers/piper
export const PIPER = {
  minAttackDamage: 720,
  maxAttackDamage: TRIAL_BRAWLERS.piper.baseAttackDamage,
  snappySnipingAmmoGain: 0.4,
} as const;

export function piperDamageAtDistance(traveled: number, maximumRange: number): number {
  const ratio = maximumRange <= 0 ? 1 : Math.max(0, Math.min(1, traveled / maximumRange));
  return PIPER.minAttackDamage
    + (PIPER.maxAttackDamage - PIPER.minAttackDamage) * ratio;
}

export const PIPER_LOADOUT = {
  starPower: "snappySniping",
} as const;

export function applyPiperSnappySniping(
  ammo: number,
  capacity: number,
  reloadRemaining: number,
  reloadSeconds: number,
): { ammo: number; reloadRemaining: number } {
  if (ammo >= capacity || reloadSeconds <= 0) {
    return { ammo: Math.min(capacity, ammo), reloadRemaining: reloadSeconds };
  }
  const reloadProgress = Math.max(0, Math.min(1, 1 - reloadRemaining / reloadSeconds));
  const effectiveAmmo = Math.min(capacity, ammo + reloadProgress + PIPER.snappySnipingAmmoGain);
  const wholeAmmo = Math.min(capacity, Math.floor(effectiveAmmo + 1e-9));
  const partialAmmo = effectiveAmmo - wholeAmmo;
  return {
    ammo: wholeAmmo,
    reloadRemaining: wholeAmmo >= capacity ? reloadSeconds : reloadSeconds * (1 - partialAmmo),
  };
}
