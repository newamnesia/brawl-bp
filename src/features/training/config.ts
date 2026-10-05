import { TRIAL_BRAWLERS, type TrialBrawlerId } from "./characterTrial";

export type SpeedTier = "mid" | "high" | "max";
export type AimReactionTier = "diamond" | "legendary" | "master";
export type AimingRule = "infinite" | "challenge";

// 战斗世界坐标以基础长度单位计量；格数仅用于地图布局和说明。
export const TILE_SIZE = 300;
// 来源：用户于 2026-09-09 提供的移速截图；单位/秒，除以 300 为格/秒。
export const MOVEMENT_SPEED_TIERS = {
  bolt: { previous: 540, value: 545 },
  eightBit: { previous: 580, value: 600 },
  bonnie: { previous: 620, value: 630 },
  surge: { previous: 680, value: 705 },
  normal: { previous: 720, value: 750 },
  fast: { previous: 770, value: 800 },
  veryFast: { previous: 820, value: 855 },
} as const;
export const CHARACTER_MOVE_SPEED = MOVEMENT_SPEED_TIERS.fast.value;
export const tiles = (count: number) => count * TILE_SIZE;
// Max 的四颗子弹依次出膛；0.10 秒间隔使末弹在攻击开始后约 0.30 秒发射。
export const MAX_PROJECTILE_INTERVAL_SECONDS = 0.10;

type SpeedTierConfig = {
  label: string;
  value: number; // 子弹速度，单位/秒
  reloadSeconds: number;
  attackIntervalSeconds: number;
  bulletWidth: number; // 完整碰撞直径，不是半径
  range: number; // 射程，单位
  magazineCapacity: number;
  moveSpeed: number;
};

const SPEED_TIER_BRAWLERS: Record<SpeedTier, TrialBrawlerId> = {
  mid: "bea",
  high: "piper",
  max: "max",
};

function speedTierConfig(id: TrialBrawlerId): SpeedTierConfig {
  const brawler = TRIAL_BRAWLERS[id];
  return {
    label: id === "max" ? "Max" : brawler.name,
    value: brawler.projectileSpeed,
    reloadSeconds: brawler.reloadSeconds,
    attackIntervalSeconds: brawler.attackIntervalSeconds,
    bulletWidth: brawler.projectileWidth,
    range: brawler.range,
    magazineCapacity: brawler.ammoCapacity,
    moveSpeed: brawler.moveSpeed,
  };
}

/** 训练入口的三档选择只映射角色，不再复制角色战斗数值。 */
export const SPEED_TIERS: Record<SpeedTier, SpeedTierConfig> = {
  mid: speedTierConfig(SPEED_TIER_BRAWLERS.mid),
  high: speedTierConfig(SPEED_TIER_BRAWLERS.high),
  max: speedTierConfig(SPEED_TIER_BRAWLERS.max),
};

export const AIM_REACTION_TIERS: Record<AimReactionTier, {
  label: string;
  dodgesProjectiles: boolean;
  seconds: Record<SpeedTier, number>;
  joystickRadiusRatio: number;
  joystickDragSpeed: number;
  joystickDragExtraSeconds: number;
}> = {
  diamond: { label: "钻石", dodgesProjectiles: false, seconds: { high: 0, mid: 0, max: 0 }, joystickRadiusRatio: 1, joystickDragSpeed: 0, joystickDragExtraSeconds: 0.08 },
  legendary: { label: "传奇", dodgesProjectiles: true, seconds: { high: 0.27, mid: 0.27, max: 0.27 }, joystickRadiusRatio: 0.70, joystickDragSpeed: 370, joystickDragExtraSeconds: 0.08 },
  master: { label: "Pro", dodgesProjectiles: true, seconds: { high: 0.18, mid: 0.18, max: 0.18 }, joystickRadiusRatio: 0.45, joystickDragSpeed: 480, joystickDragExtraSeconds: 0.08 },
};
