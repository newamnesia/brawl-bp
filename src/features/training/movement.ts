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
