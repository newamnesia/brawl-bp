export type DistributionSummary = {
  bins: number[];
  count: number;
  sum: number;
};

export function summarizeDistribution(
  samples: number[],
  xMin: number,
  xMax: number,
  binCount: number,
): DistributionSummary {
  const bins = Array<number>(binCount).fill(0);
  let count = 0;
  let sum = 0;
  const binWidth = (xMax - xMin) / binCount;
  for (const sample of samples) {
    if (!Number.isFinite(sample) || sample < xMin || sample > xMax) continue;
    const index = Math.max(0, Math.min(binCount - 1, Math.floor((sample - xMin) / binWidth)));
    bins[index] += 1;
    count += 1;
    sum += sample;
  }
  return { bins, count, sum };
}

export function summarizeAngleDistribution(samples: number[], maxDegrees: number) {
  const maxTenths = Math.max(1, Math.floor(maxDegrees * 10));
  const bins = Array<number>(maxTenths * 2 + 1).fill(0);
  let count = 0;
  let sum = 0;
  for (const sample of samples) {
    const tenths = Math.round(sample * 10);
    if (!Number.isFinite(sample) || Math.abs(tenths) > maxTenths) continue;
    bins[tenths + maxTenths] += 1;
    count += 1;
    sum += tenths / 10;
  }
  return { bins, count, sum, max: maxTenths / 10 };
}
