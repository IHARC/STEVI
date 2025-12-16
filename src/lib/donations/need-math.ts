export type DonationNeedInputs = {
  targetBuffer: number | null | undefined;
  currentStock: number | null | undefined;
  distributedLast30Days: number | null | undefined;
};

export type DonationNeedMetrics = {
  targetBuffer: number | null;
  currentStock: number | null;
  distributedLast30Days: number | null;
  shortBy: number | null;
  needPct: number | null;
  burnRatePerDay: number | null;
  daysOfStock: number | null;
};

function toFiniteNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

export function computeDonationNeedMetrics(input: DonationNeedInputs): DonationNeedMetrics {
  const targetBufferRaw = toFiniteNumber(input.targetBuffer);
  const currentStockRaw = toFiniteNumber(input.currentStock);
  const distributedLast30DaysRaw = toFiniteNumber(input.distributedLast30Days);

  const targetBuffer =
    targetBufferRaw === null || targetBufferRaw < 0 ? null : Math.floor(targetBufferRaw);
  const currentStock =
    currentStockRaw === null || currentStockRaw < 0 ? null : Math.floor(currentStockRaw);
  const distributedLast30Days =
    distributedLast30DaysRaw === null || distributedLast30DaysRaw < 0 ? null : Math.floor(distributedLast30DaysRaw);

  const shortBy =
    targetBuffer !== null && targetBuffer > 0 && currentStock !== null ? Math.max(0, targetBuffer - currentStock) : null;
  const needPct = shortBy !== null && targetBuffer !== null && targetBuffer > 0 ? shortBy / targetBuffer : null;

  const burnRatePerDay =
    distributedLast30Days !== null && distributedLast30Days > 0 ? distributedLast30Days / 30 : null;
  const daysOfStock =
    burnRatePerDay !== null && burnRatePerDay > 0 && currentStock !== null ? currentStock / burnRatePerDay : null;

  return {
    targetBuffer,
    currentStock,
    distributedLast30Days,
    shortBy,
    needPct,
    burnRatePerDay,
    daysOfStock,
  };
}

