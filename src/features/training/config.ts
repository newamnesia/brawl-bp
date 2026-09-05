export type SpeedTier = "mid" | "high";
export type AimReactionTier = "diamond" | "legendary" | "master";
export type AimingRule = "infinite" | "challenge";

// 战斗世界坐标以基础长度单位计量；格数仅用于地图布局和说明。
export const TILE_SIZE = 300;
export const CHARACTER_MOVE_SPEED = 770; // 单位/秒
export const tiles = (count: number) => count * TILE_SIZE;

export const SPEED_TIERS: Record<SpeedTier, {
  label: string;
  value: number; // 子弹速度，单位/秒
  reloadSeconds: number;
  bulletWidth: number; // 完整碰撞直径，不是半径
}> = {
  mid: { label: "贝亚", value: 3255, reloadSeconds: 0.9, bulletWidth: 300 },
  high: { label: "佩佩", value: 4000, reloadSeconds: 2.3, bulletWidth: 200 },
};

export const AIM_REACTION_TIERS: Record<AimReactionTier, { label: string; seconds: Record<SpeedTier, number> }> = {
  diamond: { label: "钻石", seconds: { high: 0.19, mid: 0.23 } },
  legendary: { label: "传奇", seconds: { high: 0.15, mid: 0.19 } },
  master: { label: "Pro", seconds: { high: 0.11, mid: 0.15 } },
};
