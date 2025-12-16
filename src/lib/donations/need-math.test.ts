import { describe, expect, it } from 'vitest';
import { computeDonationNeedMetrics } from './need-math';

describe('computeDonationNeedMetrics', () => {
  it('computes shortfall and need percentage', () => {
    const metrics = computeDonationNeedMetrics({ targetBuffer: 40, currentStock: 10, distributedLast30Days: 30 });
    expect(metrics.shortBy).toBe(30);
    expect(metrics.needPct).toBeCloseTo(0.75, 5);
  });

  it('returns null need values when target buffer is missing or non-positive', () => {
    expect(computeDonationNeedMetrics({ targetBuffer: null, currentStock: 5, distributedLast30Days: 5 }).shortBy).toBeNull();
    expect(computeDonationNeedMetrics({ targetBuffer: 0, currentStock: 5, distributedLast30Days: 5 }).needPct).toBeNull();
  });

  it('derives burn rate and days of stock when distribution exists', () => {
    const metrics = computeDonationNeedMetrics({ targetBuffer: 10, currentStock: 12, distributedLast30Days: 60 });
    expect(metrics.burnRatePerDay).toBeCloseTo(2, 5);
    expect(metrics.daysOfStock).toBeCloseTo(6, 5);
  });
});

