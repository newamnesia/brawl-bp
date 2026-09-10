// 受击圆（r=150）位于底圈的透明核心中；外圈仅是阵营可视化，不扩大碰撞体。
export const GROUND_RING = {
  collisionRadiusRatio: 0.66,
  outerRadiusRatio: 1 / 0.66,
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
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(outerRx, outerRy);
  const rgb = teamColor[team];
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  fill.addColorStop(0, `rgba(${rgb},0)`);
  fill.addColorStop(GROUND_RING.collisionRadiusRatio * 0.92, `rgba(${rgb},0)`);
  fill.addColorStop(GROUND_RING.collisionRadiusRatio, `rgba(${rgb},0.04)`);
  fill.addColorStop(0.80, `rgba(${rgb},0.22)`);
  fill.addColorStop(0.95, `rgba(${rgb},0.76)`);
  fill.addColorStop(1, `rgba(${rgb},0.96)`);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();

  // 所有角色默认显示妙具四鼓丘标识，可由具体角色状态显式关闭。
  if (gadgetReady) {
    ctx.strokeStyle = `rgba(${rgb},0.92)`;
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const angle = i / 72 * Math.PI * 2;
      const radius = GROUND_RING.collisionRadiusRatio * (0.82 + 0.08 * Math.cos(angle * 4));
      if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.stroke();
  }

  // 所有阵营共用金色星辉标识，阵营仍由外圈颜色区分。
  if (starPower) {
    ctx.strokeStyle = "rgba(255,229,142,0.9)";
    ctx.lineWidth = 0.045;
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 8;
      const radius = GROUND_RING.collisionRadiusRatio * (i % 2 === 0 ? 0.66 : 0.32);
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
