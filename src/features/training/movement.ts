export const STARTUP_SECONDS = 0.2;

/** 与具体移速无关：v(t) = min(5t, 1)。 */
export function normalizedSpeed(seconds: number): number {
  return Math.min(1, Math.max(0, seconds) / STARTUP_SECONDS);
}

/** 精确积分本帧速度，避免起步距离随帧率变化。 */
export function advanceMovement(elapsed: number, dt: number, moving: boolean) {
  if (!moving) return { elapsed: 0, speed: 0, distance: 0 };
  const start = Math.max(0, elapsed);
  const end = start + Math.max(0, dt);
  const integral = (t: number) => t <= STARTUP_SECONDS
    ? t * t / (2 * STARTUP_SECONDS)
    : t - STARTUP_SECONDS / 2;
  return {
    elapsed: Math.min(STARTUP_SECONDS, end),
    speed: normalizedSpeed(end),
    distance: integral(end) - integral(start),
  };
}

/** 比较单次方向指令的最小夹角；恰好 120° 不重置。 */
export function resetsMovementOnTurn(previous: number, next: number): boolean {
  const delta = Math.abs(Math.atan2(Math.sin(next - previous), Math.cos(next - previous)));
  return delta > 2 * Math.PI / 3 + 1e-12;
}

export type WallCell = `${number},${number}`;

type SquareMovement = {
  x: number; y: number; dx: number; dy: number;
  halfSize: number; mapWidth: number; mapHeight: number; tileSize: number;
  walls: ReadonlySet<WallCell>;
};

/**
 * 用正方形移动碰撞体逐轴移动。受阻轴归零，另一轴仍可移动，从而自然贴墙滑行。
 * 墙格使用 `列,行` 键；边界始终被视为墙。
 */
export function resolveSquareMovement(args: SquareMovement) {
  const { halfSize, mapWidth, mapHeight, tileSize, walls } = args;
  const epsilon = 1e-7;
  let x = args.x;
  let y = args.y;
  let blockedX = false;
  let blockedY = false;

  const occupiedRows = () => {
    const first = Math.floor((y - halfSize + epsilon) / tileSize);
    const last = Math.floor((y + halfSize - epsilon) / tileSize);
    return [first, last] as const;
  };
  const occupiedColumns = () => {
    const first = Math.floor((x - halfSize + epsilon) / tileSize);
    const last = Math.floor((x + halfSize - epsilon) / tileSize);
    return [first, last] as const;
  };

  const desiredX = Math.max(halfSize, Math.min(mapWidth - halfSize, x + args.dx));
  blockedX = desiredX !== x + args.dx;
  let wallBlockedX = false;
  const [firstRow, lastRow] = occupiedRows();
  if (desiredX > x) {
    const firstColumn = Math.floor((x + halfSize) / tileSize);
    const lastColumn = Math.floor((desiredX + halfSize - epsilon) / tileSize);
    for (let column = firstColumn; column <= lastColumn; column++) for (let row = firstRow; row <= lastRow; row++) {
      if (walls.has(`${column},${row}`)) {
        x = Math.min(desiredX, column * tileSize - halfSize);
        blockedX = true;
        wallBlockedX = true;
        break;
      }
    }
    if (!wallBlockedX) x = desiredX;
  } else if (desiredX < x) {
    const firstColumn = Math.floor((desiredX - halfSize + epsilon) / tileSize);
    const lastColumn = Math.floor((x - halfSize - epsilon) / tileSize);
    for (let column = lastColumn; column >= firstColumn; column--) for (let row = firstRow; row <= lastRow; row++) {
      if (walls.has(`${column},${row}`)) {
        x = Math.max(desiredX, (column + 1) * tileSize + halfSize);
        blockedX = true;
        wallBlockedX = true;
        break;
      }
    }
    if (!wallBlockedX) x = desiredX;
  }

  const desiredY = Math.max(halfSize, Math.min(mapHeight - halfSize, y + args.dy));
  blockedY = desiredY !== y + args.dy;
  let wallBlockedY = false;
  const [firstColumn, lastColumn] = occupiedColumns();
  if (desiredY > y) {
    const firstRowY = Math.floor((y + halfSize) / tileSize);
    const lastRowY = Math.floor((desiredY + halfSize - epsilon) / tileSize);
    for (let row = firstRowY; row <= lastRowY; row++) for (let column = firstColumn; column <= lastColumn; column++) {
      if (walls.has(`${column},${row}`)) {
        y = Math.min(desiredY, row * tileSize - halfSize);
        blockedY = true;
        wallBlockedY = true;
        break;
      }
    }
    if (!wallBlockedY) y = desiredY;
  } else if (desiredY < y) {
    const firstRowY = Math.floor((desiredY - halfSize + epsilon) / tileSize);
    const lastRowY = Math.floor((y - halfSize - epsilon) / tileSize);
    for (let row = lastRowY; row >= firstRowY; row--) for (let column = firstColumn; column <= lastColumn; column++) {
      if (walls.has(`${column},${row}`)) {
        y = Math.max(desiredY, (row + 1) * tileSize + halfSize);
        blockedY = true;
        wallBlockedY = true;
        break;
      }
    }
    if (!wallBlockedY) y = desiredY;
  }
  return { x, y, dx: x - args.x, dy: y - args.y, blockedX, blockedY };
}
