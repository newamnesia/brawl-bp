export type SpeedTier = "mid" | "high";
export type AimReactionTier = "diamond" | "legendary" | "master";
export type AimingRule = "infinite" | "challenge";

export const SPEED_TIERS: Record<SpeedTier, { label: string; value: number }> = {
  mid: { label: "贝亚", value: 14 },
  high: { label: "佩佩", value: 17.5 },
};

export const AIM_REACTION_TIERS: Record<AimReactionTier, { label: string; seconds: Record<SpeedTier, number> }> = {
  diamond: { label: "钻石", seconds: { high: 0.24, mid: 0.28 } },
  legendary: { label: "传奇", seconds: { high: 0.20, mid: 0.24 } },
  master: { label: "Pro", seconds: { high: 0.16, mid: 0.20 } },
};
