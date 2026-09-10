// 基准半径为角色受击半径 r=150；d 沿用原内外圈间距。
const RING_GAP_RATIO = 1 / 0.66 - 1;
export const GROUND_RING = {
  innerRadiusRatio: 1,
  outerRadiusRatio: 1 + RING_GAP_RATIO,
  starRadiusRatio: 2 / 3,
  gadgetBumpRadiusRatio: RING_GAP_RATIO * 2 / 3,
  superRingRadiusRatio: 1.9,
} as const;

export type GroundRingTeam = "player" | "ally" | "enemy";
export type GroundRingOptions = { gadgetReady?: boolean; starPower?: boolean };

export const DEFAULT_EQUIPMENT_MARKERS = {
  gadgetReady: true,
  starPower: true,
} as const;

const teamColor: Record<GroundRingTeam, string> = {
  player: "91,255,38",
  ally: "75,175,255",
  enemy: "255,65,77",
};

export function drawGroundRing(ctx: CanvasRenderingContext2D, x: number, y: number,
  rx: number, ry: number, team: GroundRingTeam, options: GroundRingOptions = {}) {
  const gadgetReady = options.gadgetReady ?? DEFAULT_EQUIPMENT_MARKERS.gadgetReady;
  const starPower = options.starPower ?? DEFAULT_EQUIPMENT_MARKERS.starPower;
  const outerRx = rx * GROUND_RING.outerRadiusRatio;
  const outerRy = ry * GROUND_RING.outerRadiusRatio;
  const innerRadius = GROUND_RING.innerRadiusRatio / GROUND_RING.outerRadiusRatio;
  const starRadius = GROUND_RING.starRadiusRatio / GROUND_RING.outerRadiusRatio;
  const bumpRadius = GROUND_RING.gadgetBumpRadiusRatio / GROUND_RING.outerRadiusRatio;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(outerRx, outerRy);
  const rgb = teamColor[team];
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  fill.addColorStop(0, `rgba(${rgb},0)`);
  fill.addColorStop(innerRadius * 0.92, `rgba(${rgb},0)`);
  fill.addColorStop(innerRadius, `rgba(${rgb},0.04)`);
  fill.addColorStop(0.80, `rgba(${rgb},0.22)`);
  fill.addColorStop(0.95, `rgba(${rgb},0.76)`);
  fill.addColorStop(1, `rgba(${rgb},0.96)`);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();

  // 四个独立半圆附着在内圈外侧；每个半径为内外圈间距 d 的 2/3。
  if (gadgetReady) {
    const bumpCenterRadius = Math.sqrt(innerRadius ** 2 - bumpRadius ** 2);
    ctx.fillStyle = `rgba(${rgb},0.30)`;
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * bumpCenterRadius,
        Math.sin(angle) * bumpCenterRadius,
        bumpRadius,
        angle - Math.PI / 2,
        angle + Math.PI / 2,
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  // 扩大后的内圈保持完整圆形，并绘制在鼓包填色之上。
  ctx.strokeStyle = `rgba(${rgb},0.88)`;
  ctx.lineWidth = 0.055;
  ctx.beginPath();
  ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 所有阵营共用金色星辉标识，阵营仍由外圈颜色区分。
  if (starPower) {
    ctx.strokeStyle = "rgba(255,229,142,0.9)";
    ctx.lineWidth = 0.045;
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 8;
      const radius = starRadius * (i % 2 === 0 ? 1 : 0.48);
      if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.stroke();
  }
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
    ctx.arc(0, 0, GROUND_RING.superRingRadiusRatio, start, start + Math.PI * 66 / 180);
    ctx.stroke();
  }
  ctx.restore();
}

export const MOVEMENT_INDICATOR = {
  maxOffsetRatio: GROUND_RING.superRingRadiusRatio,
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
