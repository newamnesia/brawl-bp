// Gene, power 11. Distances use 300 world units per tile.
// https://brawlstars.fandom.com/wiki/Gene (damage table, widths and charge)
// https://brawltime.ninja/tier-list/brawler/gene (ranges, spread and speeds)
export const GENE = {
  directDamage: 2000,
  splitDamage: 326,
  directRange: 1700,
  totalRange: 3400,
  splitCount: 6,
  spreadDegrees: 80,
  splitWidth: 200,
  directSuperCharge: 0.25,
  splitSuperCharge: 0.0415,
  hyperDirectCharge: 0.0875,
  hyperSplitCharge: 0.0145,
  hyperSpeedMultiplier: 1.2,
  hyperDamageMultiplier: 1.05,
  hyperDamageReduction: 0.05,
  hyperDurationSeconds: 5,
  hyperHandSpreadDegrees: 50,
  // “伸手说话”神话装备默认生效：基础 7.67 格 + 1 格。
  baseSuperRange: 2300,
  superRange: 2600,
  superSpeed: 3200,
  pullSpeed: 2000,
  hyperPullSpeed: 3200,
  superWidth: 400,
} as const;

export function geneSuperAngles(heading: number, hypercharged: boolean): number[] {
  if (!hypercharged) return [heading];
  const sideAngle = GENE.hyperHandSpreadDegrees * Math.PI / 360;
  return [heading, heading - sideAngle, heading + sideAngle];
}

export function geneSplitAngles(heading: number): number[] {
  const halfSpread = GENE.spreadDegrees * Math.PI / 360;
  return Array.from({ length: GENE.splitCount }, (_, index) =>
    heading - halfSpread + index * (halfSpread * 2 / (GENE.splitCount - 1)));
}

export function advanceGenePull(
  target: { x: number; y: number },
  player: { x: number; y: number },
  seconds: number,
  stopDistance: number,
  pullSpeed: number = GENE.pullSpeed,
): { x: number; y: number; finished: boolean } {
  const dx = player.x - target.x;
  const dy = player.y - target.y;
  const distance = Math.hypot(dx, dy);
  const remaining = Math.max(0, distance - stopDistance);
  if (remaining <= 0.001) return { ...target, finished: true };

  const travel = Math.min(pullSpeed * seconds, remaining);
  return {
    x: target.x + dx / distance * travel,
    y: target.y + dy / distance * travel,
    // End the grab in this frame. Comparing the next frame's rounded positions can
    // leave the target attached to Gene after the hand has already arrived.
    finished: travel >= remaining - 0.001,
  };
}
