import { TRIAL_BRAWLERS } from "./characterTrial";
import type { WallCell } from "./movement";

export type BrockStarPower = "moreRockets" | "rocketNoFour";

export const BROCK = {
  attackDamage: TRIAL_BRAWLERS.brock.baseAttackDamage,
  attackExplosionRadius: 450,
  attackFireRadius: 300,
  attackFireDamage: 688,
  attackFireDurationSeconds: 2.9,
  attackFireFirstTickSeconds: 0.9,
  attackSuperCharge: 0.2,
  fireSuperCharge: 0.06,
  superDamage: 2080,
  superRange: 2500,
  superAreaRadius: 800,
  superExplosionRadius: 450,
  // 实机为五点循环：中心、左上、右上、右下、左下。
  // 四个外圈点位于半径 800 的圆上，因此不会误伤瞄准中心的普通体型目标。
  superLandingPattern: [
    [0, 0],
    [-566, -566],
    [566, -566],
    [566, 566],
    [-566, 566],
  ] as const,
  superRocketCount: 9,
  moreRocketsCount: 13,
  superLaunchIntervalSeconds: 0.2,
  moreRocketsLaunchIntervalSeconds: 0.15,
  superLandingDelaySeconds: 0.45,
  superChargePerHit: 0.208,
} as const;

export function brockSuperRocketCount(starPower: BrockStarPower): number {
  return starPower === "moreRockets" ? BROCK.moreRocketsCount : BROCK.superRocketCount;
}

export function brockSuperLaunchInterval(starPower: BrockStarPower): number {
  return starPower === "moreRockets"
    ? BROCK.moreRocketsLaunchIntervalSeconds
    : BROCK.superLaunchIntervalSeconds;
}

export function brockSuperDuration(starPower: BrockStarPower): number {
  return BROCK.superLandingDelaySeconds
    + (brockSuperRocketCount(starPower) - 1) * brockSuperLaunchInterval(starPower);
}

export function brockSuperRocketOffset(index: number): { x: number; y: number } {
  const patternIndex = Math.max(0, index) % BROCK.superLandingPattern.length;
  const point = BROCK.superLandingPattern[patternIndex];
  return { x: point[0], y: point[1] };
}

function circleTouchesTile(x: number, y: number, radius: number, column: number, row: number, tileSize: number) {
  const nearestX = Math.max(column * tileSize, Math.min(x, (column + 1) * tileSize));
  const nearestY = Math.max(row * tileSize, Math.min(y, (row + 1) * tileSize));
  return (x - nearestX) ** 2 + (y - nearestY) ** 2 <= radius ** 2;
}

/** 每枚大招火箭独立按自身 450 半径破坏普通墙和草丛，钢墙始终保留。 */
export function destroyWallsInBrockSuperExplosion(
  walls: Set<WallCell>,
  bushes: Set<WallCell>,
  steelWalls: ReadonlySet<WallCell>,
  x: number,
  y: number,
  tileSize: number,
): void {
  for (const cell of [...walls]) {
    if (steelWalls.has(cell)) continue;
    const [column, row] = cell.split(",").map(Number);
    if (circleTouchesTile(x, y, BROCK.superExplosionRadius, column, row, tileSize)) walls.delete(cell);
  }
  for (const cell of [...bushes]) {
    const [column, row] = cell.split(",").map(Number);
    if (circleTouchesTile(x, y, BROCK.superExplosionRadius, column, row, tileSize)) bushes.delete(cell);
  }
}
