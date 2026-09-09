// 用户提供的视频拟合模型（非游戏内部公式）：先直行，再按固定角速度展开。
// 长度单位为格，1 格 = 300 单位；总路程 2700，飞行时间 1.08 秒。
export const BEA_SUPER = {
  speed: 2500 / 300, range: 9, radius: 0.25, damage: 260,
  straightSeconds: 0.2755, slowMs: 3000, slowMultiplier: 0.6,
  angularSpeeds: [2.818, 1.566, 0.598, 0, -0.598, -1.566, -2.818],
} as const;

export function chargeBeaSuper(charge: number, projectile: "beaNormal" | "beaEnhanced" | "beaSuper" | "high"): number {
  // 满充期间忽略命中，不保存溢出；释放后调用方将充能归零。
  if (charge >= 1) return 1;
  const gain = projectile === "beaSuper" ? 0.175 / 7 : projectile === "high" ? 0 : 0.26;
  return Math.min(1, charge + gain);
}

export function beaSuperPosition(seconds: number, omega: number) {
  const t = Math.max(0, Math.min(seconds, BEA_SUPER.range / BEA_SUPER.speed));
  const u = Math.max(0, t - BEA_SUPER.straightSeconds);
  if (u === 0 || omega === 0) return { x: BEA_SUPER.speed * t, y: 0, heading: 0 };
  return {
    x: BEA_SUPER.speed * BEA_SUPER.straightSeconds + BEA_SUPER.speed / omega * Math.sin(omega * u),
    y: BEA_SUPER.speed / omega * (1 - Math.cos(omega * u)),
    heading: omega * u,
  };
}

export type BeaSuperAim = { elapsed: number; stable: number; angle: number };
export const BEA_SUPER_AIM_SECONDS = 0.45;

// 输入采用格和格/秒。以中央弹的恒速截击解预判，不保证玩家之后变向仍会命中。
export function updateBeaSuperAim(state: BeaSuperAim, dt: number, ready: boolean,
  x: number, y: number, vx: number, vy: number) {
  const inRange = Math.hypot(x, y) <= BEA_SUPER.range;
  if (!ready || !inRange) {
    state.elapsed = 0;
    state.stable = 0;
    return { aiming: false, fire: false };
  }
  const a = vx * vx + vy * vy - BEA_SUPER.speed ** 2;
  const b = 2 * (x * vx + y * vy);
  const c = x * x + y * y;
  const discriminant = b * b - 4 * a * c;
  let flight = c === 0 ? 0 : Infinity;
  if (c > 0 && Math.abs(a) < 1e-9) {
    if (b < 0) flight = -c / b;
  } else if (c > 0 && discriminant >= 0) {
    const roots = [(-b + Math.sqrt(discriminant)) / (2 * a),
      (-b - Math.sqrt(discriminant)) / (2 * a)].filter(t => t >= 0);
    flight = Math.min(...roots);
  }
  const reachable = flight <= BEA_SUPER.range / BEA_SUPER.speed;
  const desired = reachable ? Math.atan2(y + vy * flight, x + vx * flight) : Math.atan2(y, x);
  const delta = Math.atan2(Math.sin(desired - state.angle), Math.cos(desired - state.angle));
  state.angle += Math.max(-6 * dt, Math.min(6 * dt, delta));
  state.elapsed += dt;
  const error = Math.atan2(Math.sin(desired - state.angle), Math.cos(desired - state.angle));
  state.stable = reachable && Math.abs(error) < 0.035 ? state.stable + dt : 0;
  return { aiming: true, fire: state.elapsed >= BEA_SUPER_AIM_SECONDS && state.stable >= 0.12 };
}
