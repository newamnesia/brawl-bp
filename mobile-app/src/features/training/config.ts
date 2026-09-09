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
export type SpeedTier = "mid" | "high";
export type AimReactionTier = "diamond" | "legendary" | "master";
export type AimingRule = "infinite" | "challenge";

export const SPEED_TIERS: Record<SpeedTier, { label: string; value: number }> = {
  mid: { label: "贝亚", value: 14 },
  high: { label: "佩佩", value: 17.5 },
};

export const AIM_REACTION_TIERS: Record<AimReactionTier, {
  label: string;
  dodgesProjectiles: boolean;
  seconds: Record<SpeedTier, number>;
  joystickRadiusRatio: number;
  joystickDragSpeed: number;
  joystickDragExtraSeconds: number;
}> = {
  diamond: { label: "钻石", dodgesProjectiles: false, seconds: { high: 0, mid: 0 }, joystickRadiusRatio: 1, joystickDragSpeed: 0, joystickDragExtraSeconds: 0.08 },
  legendary: { label: "传奇", dodgesProjectiles: true, seconds: { high: 0.27, mid: 0.34 }, joystickRadiusRatio: 0.70, joystickDragSpeed: 370, joystickDragExtraSeconds: 0.08 },
  master: { label: "Pro", dodgesProjectiles: true, seconds: { high: 0.18, mid: 0.25 }, joystickRadiusRatio: 0.45, joystickDragSpeed: 480, joystickDragExtraSeconds: 0.08 },
};
