export type SpeedTier = "mid" | "high";
export type AimReactionTier = "diamond" | "legendary" | "master";
export type AimingRule = "infinite" | "challenge";

export const SPEED_TIERS: Record<SpeedTier, { label: string; value: number }> = {
  mid: { label: "贝亚", value: 14 },
  high: { label: "佩佩", value: 17.5 },
};

export const AIM_REACTION_TIERS: Record<AimReactionTier, { label: string; seconds: number }> = {
  diamond: { label: "钻石", seconds: 0.4 },
  legendary: { label: "传奇", seconds: 0.28 },
  master: { label: "Pro", seconds: 0.19 },
};
