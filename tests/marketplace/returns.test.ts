import { describe, expect, it } from 'vitest';
import {
  calculateCheckoutSummary,
  calculatePerFractionExpectedReturn,
  calculatePerFractionInterest,
} from '@/lib/marketplace/calculations';

describe('marketplace return calculations', () => {
  it('uses the pro-rata invoice formula with cent-level output', () => {
    expect(
      calculatePerFractionExpectedReturn({
        fractionNetAmount: 11666.67,
        invoiceNetAmount: 70000,
        invoiceAmount: 80000,
      }),
    ).toBe(13333.34);
  });

  it('derives per-fraction interest from expected return minus purchase price', () => {
    expect(
      calculatePerFractionInterest({
        fractionNetAmount: 11666.67,
        invoiceNetAmount: 70000,
        invoiceAmount: 80000,
      }),
    ).toBe(1666.67);
  });

  it('scales checkout totals when the investor selects multiple fractions', () => {
    expect(
      calculateCheckoutSummary({
        fractionCount: 3,
        perFractionNetAmount: 11666.67,
        perFractionExpectedReturn: 13333.34,
      }),
    ).toEqual({
      fractionCount: 3,
      checkoutTotal: 35000.01,
      expectedReturnTotal: 40000.02,
      expectedInterestTotal: 5000.01,
    });
  });
});
