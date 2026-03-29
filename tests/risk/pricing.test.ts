import { describe, expect, it } from 'vitest';
import { calculateDiscountRate, calculateInvestorRate } from '@/lib/risk/pricing';

describe('risk pricing', () => {
  it('applies bounded tier and maturity pricing adjustments', () => {
    expect(calculateDiscountRate({ tier: 'A', daysToMaturity: 30, adverseSignals: 0 })).toBe(0.115);
    expect(calculateDiscountRate({ tier: 'B', daysToMaturity: 75, adverseSignals: 1 })).toBe(0.121);
    expect(calculateDiscountRate({ tier: 'D', daysToMaturity: 180, adverseSignals: 3 })).toBe(0.135);
  });

  it('keeps investor-facing rates in the requested band', () => {
    expect(calculateInvestorRate(0.115)).toBe(0.1);
    expect(calculateInvestorRate(0.127)).toBe(0.112);
    expect(calculateInvestorRate(0.135)).toBe(0.12);
  });
});
