import { describe, expect, it } from 'vitest';
import { getFundingProgressPercentage } from '@/lib/marketplace/calculations';

describe('marketplace funding progress', () => {
  it('returns 0 for invalid totals and rounds progress for UI display', () => {
    expect(getFundingProgressPercentage({ fundedFractions: 2, totalFractions: 0 })).toBe(0);
    expect(getFundingProgressPercentage({ fundedFractions: 0, totalFractions: -4 })).toBe(0);
    expect(getFundingProgressPercentage({ fundedFractions: 1, totalFractions: 3 })).toBe(33);
    expect(getFundingProgressPercentage({ fundedFractions: 5, totalFractions: 8 })).toBe(63);
  });
});
