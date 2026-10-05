import type { WallCell } from "./movement";

// Seconds at base difficulty. Both movement rules use the same ammo-aware cadence.
export const FIRE_INTERVAL_MIN = 2.35;
export const FIRE_INTERVAL_MAX = 2.50;
export const BEA_FIRE_INTERVAL_MIN = 0.95;
export const BEA_FIRE_INTERVAL_MAX = 1.10;
export const BURST_PROBABILITY = 0.30;
export const BURST_INTERVAL_SECONDS = 0.40;

// 佩佩普通射击保留两发；贝亚与 Max 有弹药即可开火。
export function canMovementShoot(rapidFire: boolean, ammo: number, followup: boolean): boolean {
  return ammo >= (rapidFire || followup ? 1 : 3);
}

export function movementShotDelay(
  rapidFire: boolean, ammoAfter: number, reloadRemaining: number,
  reloadSeconds: number, difficulty: number, followup: boolean, random = Math.random,
): { seconds: number; followup: boolean } {
  if (!rapidFire && !followup && ammoAfter >= 2 && random() < BURST_PROBABILITY) {
    return { seconds: BURST_INTERVAL_SECONDS / difficulty, followup: true };
  }
  const min = rapidFire ? BEA_FIRE_INTERVAL_MIN : FIRE_INTERVAL_MIN;
  const max = rapidFire ? BEA_FIRE_INTERVAL_MAX : FIRE_INTERVAL_MAX;
  const ordinary = (min + random() * (max - min)) / difficulty;
  // After a burst recover the reserve AND the next shot, so ordinary fire leaves >=2.
  const recover = Math.max(0, reloadRemaining) + Math.max(0, 3 - ammoAfter - 1) * reloadSeconds;
  const jitter = (0.05 + random() * 0.15) / difficulty;
  return { seconds: !rapidFire && followup ? recover + jitter : ordinary, followup: false };
}

// Compound reduction, with no gameplay floor. Practice always uses base timings.
export function movementTimingScale(survival: boolean, seconds: number): number {
  return survival ? Math.pow(0.95, Math.floor(Math.max(0, seconds) / 10)) : 1;
}

export type AutoAimTarget = {
  x: number;
  y: number;
  alive?: boolean;
  visible?: boolean;
};

function segmentIntersectsRectangle(
  start: { x: number; y: number },
  end: { x: number; y: number },
  left: number,
  top: number,
  right: number,
  bottom: number,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let entry = 0;
  let exit = 1;
  for (const [origin, delta, minimum, maximum] of [
    [start.x, dx, left, right],
    [start.y, dy, top, bottom],
  ] as const) {
    if (Math.abs(delta) < 0.000001) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (entry > exit) return false;
  }
  return exit > 0.0001 && entry < 0.9999;
}

/** 训练场景共用的墙体视线判定。 */
export function autoAimLineBlocked(
  start: { x: number; y: number },
  end: { x: number; y: number },
  walls: ReadonlySet<WallCell>,
  tileSize: number,
) {
  for (const cell of walls) {
    const [column, row] = cell.split(",").map(Number);
    if (segmentIntersectsRectangle(
      start,
      end,
      column * tileSize,
      row * tileSize,
      (column + 1) * tileSize,
      (row + 1) * tileSize,
    )) return true;
  }
  return false;
}

/** 统一自瞄：只在射程内、可见且没有被墙体阻挡的目标中选择最近单位。 */
export function nearestAutoAimTarget<T extends AutoAimTarget>(options: {
  origin: { x: number; y: number };
  targets: readonly T[];
  maxDistance: number;
  walls?: ReadonlySet<WallCell>;
  tileSize?: number;
}): T | null {
  const { origin, targets, maxDistance, walls, tileSize } = options;
  let nearest: T | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    if (target.alive === false || target.visible === false) continue;
    const distance = Math.hypot(target.x - origin.x, target.y - origin.y);
    if (distance > maxDistance || distance >= nearestDistance) continue;
    if (walls && tileSize && autoAimLineBlocked(origin, target, walls, tileSize)) continue;
    nearest = target;
    nearestDistance = distance;
  }
  return nearest;
}
