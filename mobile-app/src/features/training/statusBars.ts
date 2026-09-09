export type UnitRelation = "self" | "ally" | "enemy";

export const HEALTH_COLORS: Record<UnitRelation, string> = {
  self: "#4fd43b",
  ally: "#3b9dff",
  enemy: "#ef4050",
};

type AmmoStatus = { current: number; capacity: number; reloadProgress: number };
type StatusBarsOptions = {
  centerX: number; centerY: number; radiusY: number; width: number;
  health: number; maxHealth: number; relation: UnitRelation; ammo?: AmmoStatus;
};

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/** 参考游戏角色头顶布局：人物 → 弹药条 → 带数字血条。 */
export function drawUnitStatusBars(ctx: CanvasRenderingContext2D, options: StatusBarsOptions) {
  const width = Math.max(28, options.width);
  const left = options.centerX - width / 2;
  const ammoHeight = 8;
  const healthHeight = 13;
  const modelTop = options.centerY - options.radiusY;
  const ammoTop = modelTop - ammoHeight - 5;
  const healthTop = options.ammo ? ammoTop - healthHeight - 4 : modelTop - healthHeight - 5;
  const healthRatio = Math.max(0, Math.min(1, options.health / Math.max(1, options.maxHealth)));

  ctx.save();
  roundedRect(ctx, left - 2, healthTop - 2, width + 4, healthHeight + 4, 5);
  ctx.fillStyle = "rgba(20, 14, 18, 0.94)";
  ctx.fill();
  roundedRect(ctx, left, healthTop, width, healthHeight, 3);
  ctx.fillStyle = "rgba(45, 35, 40, 0.92)";
  ctx.fill();
  if (healthRatio > 0) {
    roundedRect(ctx, left, healthTop, width * healthRatio, healthHeight, 3);
    ctx.fillStyle = HEALTH_COLORS[options.relation];
    ctx.fill();
  }

  const healthText = String(Math.ceil(options.health));
  ctx.font = "900 10px 'Nunito', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(12, 8, 10, 0.96)";
  ctx.lineWidth = 3;
  ctx.strokeText(healthText, options.centerX, healthTop + healthHeight / 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(healthText, options.centerX, healthTop + healthHeight / 2);

  if (options.ammo) {
    const capacity = Math.max(1, options.ammo.capacity);
    const segmentWidth = width / capacity;
    roundedRect(ctx, left - 2, ammoTop - 2, width + 4, ammoHeight + 4, 4);
    ctx.fillStyle = "rgba(42, 25, 17, 0.95)";
    ctx.fill();
    roundedRect(ctx, left, ammoTop, width, ammoHeight, 2);
    ctx.fillStyle = "rgba(91, 55, 31, 0.72)";
    ctx.fill();
    for (let index = 0; index < capacity; index++) {
      const fill = index < options.ammo.current
        ? 1
        : index === options.ammo.current ? Math.max(0, Math.min(1, options.ammo.reloadProgress)) : 0;
      if (fill > 0) {
        ctx.fillStyle = "#c58a4b";
        ctx.fillRect(left + index * segmentWidth, ammoTop, segmentWidth * fill, ammoHeight);
      }
      if (index > 0) {
        const x = left + index * segmentWidth;
        ctx.strokeStyle = "rgba(49, 27, 17, 0.95)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, ammoTop);
        ctx.lineTo(x, ammoTop + ammoHeight);
        ctx.stroke();
      }
    }
    roundedRect(ctx, left, ammoTop, width, ammoHeight, 2);
    ctx.strokeStyle = "rgba(43, 24, 16, 0.98)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

