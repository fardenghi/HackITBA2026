import { describe, expect, it } from 'vitest';
import { calculateDiscountRate } from '@/lib/risk/pricing';

describe('risk pricing', () => {
  it('applies bounded tier and maturity pricing adjustments', () => {
    expect(calculateDiscountRate({ tier: 'A', daysToMaturity: 30, adverseSignals: 0 })).toBe(0.12);
    expect(calculateDiscountRate({ tier: 'B', daysToMaturity: 75, adverseSignals: 1 })).toBe(0.205);
    expect(calculateDiscountRate({ tier: 'D', daysToMaturity: 180, adverseSignals: 3 })).toBe(0.441);
  });
});
