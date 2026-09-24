// Colt, power 11. World distances use 300 units per tile.
// Current mechanics checked against the September 2026 game-data references.
export const COLT = {
  health: 6200,
  baseMoveSpeed: 720,
  attackDamage: 720,
  attackBullets: 6,
  attackRange: 2700,
  attackProjectileSpeed: 4000,
  attackWidth: 200,
  attackBulletIntervalSeconds: 0.1,
  hyperAttackBulletIntervalSeconds: 0.07,
  attackSuperCharge: 0.0835,
  attackHyperCharge: 0.029,
  superDamage: 640,
  superBullets: 12,
  superRange: 3300,
  superProjectileSpeed: 4891,
  superWidth: 303,
  hyperSuperWidth: 423,
  superBulletIntervalSeconds: 0.075,
  superSuperCharge: 0.0696,
  superHyperCharge: 0.02436,
  slickBootsMultiplier: 1.13,
  slickBootsBuffieMultiplier: 1.2,
  slickBootsBuffieSeconds: 0.5,
  magnumSpecialMultiplier: 1.11,
  magnumBuffieMaxDamageMultiplier: 1.05,
  speedloaderDamage: 640,
  speedloaderBullets: 2,
  speedloaderCooldownSeconds: 15,
  speedloaderSlowSeconds: 1,
  speedloaderBuffieAmmoSteal: 0.5,
  silverBulletDamage: 1200,
  silverBulletBuffieDamage: 2000,
  silverBulletBuffieWidth: 240,
  silverBulletCooldownSeconds: 16,
  hyperDamageMultiplier: 1.05,
  hyperSpeedMultiplier: 1.2,
  hyperDamageReduction: 0.05,
  hyperBaseDurationSeconds: 5,
  hyperBuffieBonusSeconds: 2,
} as const;

export const COLT_LOADOUT = {
  gadget: "speedloader",
  starPower: "slickBoots",
  buffies: {
    gadget: true,
    starPower: true,
    hypercharge: true,
  },
} as const;

/** One Gadget/Star Buffie follows the equipped ability; the Hyper Buffie is always available. */
export const COLT_BUFFIES = {
  speedloader: { ammoStolenPerHit: COLT.speedloaderBuffieAmmoSteal },
  silverBullet: { damage: COLT.silverBulletBuffieDamage, width: COLT.silverBulletBuffieWidth },
  slickBoots: { speedMultiplier: COLT.slickBootsBuffieMultiplier, durationSeconds: COLT.slickBootsBuffieSeconds },
  magnumSpecial: { maxRangeDamageMultiplier: COLT.magnumBuffieMaxDamageMultiplier },
  dualWielding: {
    bonusDurationSeconds: COLT.hyperBuffieBonusSeconds,
    attackBulletIntervalSeconds: COLT.hyperAttackBulletIntervalSeconds,
  },
} as const;

export type ColtGadget = "speedloader" | "silverBullet";
export type ColtStarPower = "slickBoots" | "magnumSpecial";

export function coltAttackDelay(index: number, hypercharged: boolean): number {
  return index * (hypercharged ? COLT.hyperAttackBulletIntervalSeconds : COLT.attackBulletIntervalSeconds);
}

export function coltMoveSpeed(slickBootsBuffieSeconds: number, hypercharged: boolean): number {
  const bonus = (COLT.slickBootsMultiplier - 1)
    + (slickBootsBuffieSeconds > 0 ? COLT.slickBootsBuffieMultiplier - 1 : 0)
    + (hypercharged ? COLT.hyperSpeedMultiplier - 1 : 0);
  return COLT.baseMoveSpeed * (1 + bonus);
}

/** Alternate Magnum Special Buffie: damage grows linearly to +5% at maximum range. */
export function coltMagnumDamageMultiplier(traveled: number): number {
  const ratio = Math.max(0, Math.min(1, traveled / (COLT.attackRange * COLT.magnumSpecialMultiplier)));
  return 1 + (COLT.magnumBuffieMaxDamageMultiplier - 1) * ratio;
}

export function destroyWallsAlongColtBullet(
  walls: Set<`${number},${number}`>,
  start: { x: number; y: number },
  end: { x: number; y: number },
  tileSize: number,
  radius: number,
): number {
  let destroyed = 0;
  for (const cell of walls) {
    const [column, row] = cell.split(",").map(Number);
    const centerX = (column + 0.5) * tileSize;
    const centerY = (row + 0.5) * tileSize;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length2 = dx * dx + dy * dy;
    const projection = length2 > 0
      ? Math.max(0, Math.min(1, ((centerX - start.x) * dx + (centerY - start.y) * dy) / length2))
      : 0;
    const nearestX = start.x + dx * projection;
    const nearestY = start.y + dy * projection;
    if (Math.hypot(centerX - nearestX, centerY - nearestY) > tileSize * Math.SQRT1_2 + radius) continue;
    walls.delete(cell);
    destroyed += 1;
  }
  return destroyed;
}
