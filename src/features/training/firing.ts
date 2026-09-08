// Seconds at base difficulty. Both movement rules use the same ammo-aware cadence.
export const FIRE_INTERVAL_MIN = 2.35;
export const FIRE_INTERVAL_MAX = 2.50;
export const BEA_FIRE_INTERVAL_MIN = 0.95;
export const BEA_FIRE_INTERVAL_MAX = 1.10;
export const BURST_PROBABILITY = 0.30;
export const BURST_INTERVAL_SECONDS = 0.40;

// A normal Piper shot leaves two rounds; only the burst follow-up may spend the reserve.
export function canMovementShoot(isBea: boolean, ammo: number, followup: boolean): boolean {
  return ammo >= (isBea || followup ? 1 : 3);
}

export function movementShotDelay(
  isBea: boolean, ammoAfter: number, reloadRemaining: number,
  reloadSeconds: number, difficulty: number, followup: boolean, random = Math.random,
): { seconds: number; followup: boolean } {
  if (!isBea && !followup && ammoAfter >= 2 && random() < BURST_PROBABILITY) {
    return { seconds: BURST_INTERVAL_SECONDS / difficulty, followup: true };
  }
  const min = isBea ? BEA_FIRE_INTERVAL_MIN : FIRE_INTERVAL_MIN;
  const max = isBea ? BEA_FIRE_INTERVAL_MAX : FIRE_INTERVAL_MAX;
  const ordinary = (min + random() * (max - min)) / difficulty;
  // After a burst recover the reserve AND the next shot, so ordinary fire leaves >=2.
  const recover = Math.max(0, reloadRemaining) + Math.max(0, 3 - ammoAfter - 1) * reloadSeconds;
  const jitter = (0.05 + random() * 0.15) / difficulty;
  return { seconds: !isBea && followup ? recover + jitter : ordinary, followup: false };
}

// Compound reduction, with no gameplay floor. Practice always uses base timings.
export function movementTimingScale(survival: boolean, seconds: number): number {
  return survival ? Math.pow(0.95, Math.floor(Math.max(0, seconds) / 10)) : 1;
}
