// Mina, power 11. World distances use 300 units per tile.
export const MINA = {
  health: 7200,
  moveSpeed: 800,
  ammoCapacity: 3,
  reloadSeconds: 1.4,
  comboWindowSeconds: 1.35,
  dashDistance: 549,
  dashSpeed: 2500,
  projectileSpeed: 3000,
  attackDamage: [1600, 2000, 3600] as const,
  attackRange: [2400, 1800, 1400] as const,
  attackWidth: [300, 400] as const,
  thirdAttackProjectileCount: 3,
  thirdAttackProjectileRadius: 150,
  thirdAttackSpreadDegrees: 65,
  thirdAttackWindupSeconds: 0.5,
  attackSuperCharge: [0.144, 0.18, 0.324] as const,
  attackHyperCharge: [0.043, 0.054, 0.0972] as const,
  superDamage: 2000,
  superRange: 2100,
  superWidth: 800,
  superSpeed: 2200,
  hyperSuperSpeed: 3000,
  hyperSuperMaxBounces: 3,
  hyperSuperBounceDistanceBonus: 1000,
  superPullDistance: 360,
  hyperSuperPullDistance: 1500,
  // Pushback type 4 keeps the target airborne while covering the configured pull
  // strength. Both variants take 1 second at their full pull distance.
  superPullSpeed: 360,
  hyperSuperPullSpeed: 1500,
  superCharge: 0.25,
  superHyperCharge: 0.075,
  airborneMaxSeconds: 1,
  hyperHurricaneCount: 3,
  hyperSpreadDegrees: 56.7,
  hyperDurationSeconds: 5,
  hyperDamageMultiplier: 1.05,
  hyperSpeedMultiplier: 1.2,
  hyperDamageReduction: 0.05,
  windmillRadius: 600,
  windmillDurationSeconds: 1,
  gadgetCooldownSeconds: 22,
  capoWhatInstantSuperCharge: 1,
  zumZumZumHealingRatio: 0.5,
  blownAwayRootSeconds: 1.5,
} as const;

export type MinaAttackStage = 0 | 1 | 2;
export type MinaGadget = "windmill" | "capoWhat";
export type MinaStarPower = "zumZumZum" | "blownAway";

export const MINA_LOADOUT: { gadget: MinaGadget; starPower: MinaStarPower } = {
  gadget: "windmill",
  starPower: "zumZumZum",
};

export function minaNextAttackStage(stage: MinaAttackStage): MinaAttackStage {
  return ((stage + 1) % 3) as MinaAttackStage;
}

export function minaHyperSuperAngles(heading: number, hypercharged = true): number[] {
  if (!hypercharged) return [heading];
  const halfSpread = MINA.hyperSpreadDegrees * Math.PI / 360;
  return [-halfSpread, 0, halfSpread].map(offset => heading + offset);
}

export type MinaThirdAttackPart = { angle: number; length: number };

export function minaThirdAttackAngles(heading: number): number[] {
  const halfSpread = MINA.thirdAttackSpreadDegrees * Math.PI / 360;
  return [-halfSpread, 0, halfSpread].map(offset => heading + offset);
}

function rayEntryDistanceToExpandedBox(
  origin: { x: number; y: number },
  direction: { x: number; y: number },
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  padding: number,
): number | null {
  const closestX = Math.max(minX, Math.min(maxX, origin.x));
  const closestY = Math.max(minY, Math.min(maxY, origin.y));
  if (Math.hypot(origin.x - closestX, origin.y - closestY) <= padding) return 0;

  const hits: number[] = [];
  const addHit = (distance: number, cross: number, crossMin: number, crossMax: number) => {
    if (distance >= 0 && distance <= MINA.attackRange[2] && cross >= crossMin && cross <= crossMax) {
      hits.push(distance);
    }
  };
  if (Math.abs(direction.x) > 1e-9) {
    for (const x of [minX - padding, maxX + padding]) {
      const distance = (x - origin.x) / direction.x;
      addHit(distance, origin.y + direction.y * distance, minY, maxY);
    }
  }
  if (Math.abs(direction.y) > 1e-9) {
    for (const y of [minY - padding, maxY + padding]) {
      const distance = (y - origin.y) / direction.y;
      addHit(distance, origin.x + direction.x * distance, minX, maxX);
    }
  }

  for (const [cornerX, cornerY] of [[minX, minY], [minX, maxY], [maxX, minY], [maxX, maxY]] as const) {
    const offsetX = origin.x - cornerX;
    const offsetY = origin.y - cornerY;
    const projection = offsetX * direction.x + offsetY * direction.y;
    const discriminant = projection * projection - (offsetX * offsetX + offsetY * offsetY - padding * padding);
    if (discriminant < 0) continue;
    const distance = -projection - Math.sqrt(discriminant);
    if (distance >= 0 && distance <= MINA.attackRange[2]) hits.push(distance);
  }
  return hits.length > 0 ? Math.min(...hits) : null;
}

export function minaThirdAttackParts(
  origin: { x: number; y: number },
  heading: number,
  walls: ReadonlySet<string>,
  tileSize: number,
): MinaThirdAttackPart[] {
  return minaThirdAttackAngles(heading).map((angle) => {
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    let length: number = MINA.attackRange[2];
    for (const wall of walls) {
      const [columnText, rowText] = wall.split(",");
      const column = Number(columnText);
      const row = Number(rowText);
      if (!Number.isFinite(column) || !Number.isFinite(row)) continue;
      const padding = MINA.thirdAttackProjectileRadius;
      const hitDistance = rayEntryDistanceToExpandedBox(
        origin,
        direction,
        column * tileSize,
        row * tileSize,
        (column + 1) * tileSize,
        (row + 1) * tileSize,
        padding,
      );
      if (hitDistance !== null) length = Math.min(length, hitDistance);
    }
    return { angle, length };
  });
}

export function minaThirdAttackHitsTarget(
  origin: { x: number; y: number },
  parts: readonly MinaThirdAttackPart[],
  target: { x: number; y: number },
  targetRadius: number,
): boolean {
  const collisionRadius = MINA.thirdAttackProjectileRadius + targetRadius;
  return parts.some((part) => {
    const endX = origin.x + Math.cos(part.angle) * part.length;
    const endY = origin.y + Math.sin(part.angle) * part.length;
    const segmentX = endX - origin.x;
    const segmentY = endY - origin.y;
    const segmentLength2 = segmentX * segmentX + segmentY * segmentY;
    const projection = segmentLength2 > 0
      ? Math.max(0, Math.min(1,
        ((target.x - origin.x) * segmentX + (target.y - origin.y) * segmentY) / segmentLength2))
      : 0;
    const closestX = origin.x + segmentX * projection;
    const closestY = origin.y + segmentY * projection;
    return Math.hypot(target.x - closestX, target.y - closestY) <= collisionRadius;
  });
}
