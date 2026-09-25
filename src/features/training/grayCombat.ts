import type { WallCell } from "./movement";

// Gray, power 11. World distances use 300 units per tile.
// Raw values are from the 2026-09-01 game-data mirror.
export const GRAY = {
  damage: 2560,
  range: 2700,
  projectileSpeed: 3804,
  projectileWidth: 100,
  aimGuideWidth: 100,
  superChargePerHit: 0.32,
  superRange: 2000,
  superCastSeconds: 0.3,
  portalTriggerRadius: 300,
  portalActivationSeconds: 1,
  portalEntryDelaySeconds: 1,
  portalActiveSeconds: 1,
  portalPostUseCooldownSeconds: 4,
  gadgetCooldownSeconds: 23,
  caneWidth: 400,
  caneOutboundSpeed: 3200,
  canePullSpeed: 2000,
  canePullDistance: 600,
} as const;

export type GrayPull = {
  active: boolean;
  phase: "hard" | "residual";
  attackOriginX: number;
  attackOriginY: number;
  sourceMovedAfterHit: boolean;
  destinationX: number;
  destinationY: number;
  remainingDistance: number;
  breakWalls: boolean;
};

export type GrayPortalPair = {
  entranceX: number;
  entranceY: number;
  exitX: number;
  exitY: number;
  phase: "cooldown" | "dormant" | "charging" | "arming" | "primed" | "active";
  phaseRemainingSeconds: number;
  chargingSide: "entrance" | "exit" | null;
  playerWasInside: boolean;
  usedPlayerIds: Set<string>;
};

export function advanceGrayPull(
  pull: GrayPull,
  target: { x: number; y: number },
  seconds: number,
): { x: number; y: number; finished: boolean } {
  const dx = pull.destinationX - target.x;
  const dy = pull.destinationY - target.y;
  const distance = Math.hypot(dx, dy);
  const travel = Math.min(distance, pull.remainingDistance, GRAY.canePullSpeed * seconds);
  if (distance <= 0.001 || travel <= 0.001) return { ...target, finished: true };
  pull.remainingDistance -= travel;
  return {
    x: target.x + dx / distance * travel,
    y: target.y + dy / distance * travel,
    finished: travel >= distance - 0.001 || pull.remainingDistance <= 0.001,
  };
}

export function destroyWallsAlongGrayPull(
  walls: Set<WallCell>,
  start: { x: number; y: number },
  end: { x: number; y: number },
  tileSize: number,
  targetRadius: number,
) {
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
    if (Math.hypot(centerX - nearestX, centerY - nearestY) <= tileSize * Math.SQRT1_2 + targetRadius) {
      walls.delete(cell);
    }
  }
}
