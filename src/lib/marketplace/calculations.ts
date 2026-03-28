import type { MarketplacePurchaseSummary } from '@/lib/marketplace/types';

type FundingProgressInput = {
  fundedFractions: number;
  totalFractions: number;
};

type PerFractionReturnInput = {
  fractionNetAmount: number;
  invoiceNetAmount: number;
  invoiceAmount: number;
};

type CheckoutSummaryInput = {
  fractionCount: number;
  perFractionNetAmount: number;
  perFractionExpectedReturn: number;
};

function roundToCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getFundingProgressPercentage({ fundedFractions, totalFractions }: FundingProgressInput) {
  if (totalFractions <= 0) {
    return 0;
  }

  return Math.round((fundedFractions / totalFractions) * 100);
}

export function calculatePerFractionExpectedReturn({
  fractionNetAmount,
  invoiceNetAmount,
  invoiceAmount,
}: PerFractionReturnInput) {
  if (invoiceNetAmount <= 0) {
    return 0;
  }

  return roundToCents((fractionNetAmount / invoiceNetAmount) * invoiceAmount);
}

export function calculatePerFractionInterest(input: PerFractionReturnInput) {
  const expectedReturn = calculatePerFractionExpectedReturn(input);
  return roundToCents(expectedReturn - input.fractionNetAmount);
}

export function calculateCheckoutSummary({
  fractionCount,
  perFractionNetAmount,
  perFractionExpectedReturn,
}: CheckoutSummaryInput): MarketplacePurchaseSummary {
  const checkoutTotal = roundToCents(perFractionNetAmount * fractionCount);
  const expectedReturnTotal = roundToCents(perFractionExpectedReturn * fractionCount);

  return {
    fractionCount,
    checkoutTotal,
    expectedReturnTotal,
    expectedInterestTotal: roundToCents(expectedReturnTotal - checkoutTotal),
  };
}
