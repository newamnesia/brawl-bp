// 视频参考：底圈 r=150；断环外半径约为底圈的 1.4 倍。比例与转速为视觉近似。
export function drawGroundRing(ctx: CanvasRenderingContext2D, x: number, y: number,
  rx: number, ry: number, team: "player" | "enemy") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const rgb = team === "player" ? "91,255,38" : "255,65,77";
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  fill.addColorStop(0, `rgba(${rgb},0)`);
  fill.addColorStop(0.5, `rgba(${rgb},0)`);
  fill.addColorStop(0.78, `rgba(${rgb},0.22)`);
  fill.addColorStop(0.94, `rgba(${rgb},0.9)`);
  fill.addColorStop(1, `rgba(${rgb},0.98)`);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawSuperRing(ctx: CanvasRenderingContext2D, x: number, y: number,
  rx: number, ry: number, phase: number, aiming: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  ctx.strokeStyle = aiming ? "#ffe934" : "#69e7ff";
  ctx.lineWidth = 0.18;
  ctx.lineCap = "round";
  // Canvas 的正角度在屏幕上顺时针旋转；四段各 66°，间隔 24°。
  for (let i = 0; i < 4; i++) {
    const start = phase + i * Math.PI / 2;
    ctx.beginPath();
    ctx.arc(0, 0, 1.32, start, start + Math.PI * 66 / 180);
    ctx.stroke();
  }
  ctx.restore();
}

export const MOVEMENT_INDICATOR = {
  maxOffsetRatio: 1.32,
  coreRadiusRatio: 0.13,
  glowRadiusRatio: 0.30,
} as const;

export function movementIndicatorPosition(centerX: number, centerY: number,
  radiusX: number, radiusY: number, directionX: number, directionY: number, magnitude: number) {
  const length = Math.hypot(directionX, directionY);
  const amount = Math.max(0, Math.min(1, magnitude));
  if (length === 0 || amount === 0) return { x: centerX, y: centerY };
  return {
    x: centerX + directionX / length * radiusX * MOVEMENT_INDICATOR.maxOffsetRatio * amount,
    y: centerY + directionY / length * radiusY * MOVEMENT_INDICATOR.maxOffsetRatio * amount,
  };
}

// 视频参考：外层为半透明白色柔光，中心为不透明白色圆点。
export function drawMovementIndicator(ctx: CanvasRenderingContext2D,
  centerX: number, centerY: number, radiusX: number, radiusY: number,
  directionX: number, directionY: number, magnitude: number) {
  const position = movementIndicatorPosition(
    centerX, centerY, radiusX, radiusY, directionX, directionY, magnitude,
  );
  const baseRadius = Math.min(radiusX, radiusY);
  const glowRadius = baseRadius * MOVEMENT_INDICATOR.glowRadiusRatio;
  const coreRadius = baseRadius * MOVEMENT_INDICATOR.coreRadiusRatio;
  const glow = ctx.createRadialGradient(position.x, position.y, coreRadius * 0.55,
    position.x, position.y, glowRadius);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.42, "rgba(255,255,255,0.92)");
  glow.addColorStop(0.68, "rgba(255,255,255,0.42)");
  glow.addColorStop(1, "rgba(255,255,255,0)");

  ctx.save();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(position.x, position.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(position.x, position.y, coreRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
