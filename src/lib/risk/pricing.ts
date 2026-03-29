export type RiskTier = 'A' | 'B' | 'C' | 'D';

export const DISCOUNT_RATE_MIN = 0.115;
export const DISCOUNT_RATE_MAX = 0.135;
export const INVESTOR_RATE_MIN = 0.1;
export const INVESTOR_RATE_MAX = 0.12;

const baseRates: Record<RiskTier, number> = {
  A: 0.115,
  B: 0.12,
  C: 0.126,
  D: 0.132,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calculateDiscountRate(input: {
  tier: RiskTier;
  daysToMaturity: number;
  adverseSignals: number;
}) {
  const boundedDays = Math.max(0, Math.min(input.daysToMaturity, 180) - 30);
  const maturityAdjustment = boundedDays * 0.00002;
  const adverseAdjustment = Math.max(0, input.adverseSignals) * 0.0005;
  const rawRate = baseRates[input.tier] + maturityAdjustment + adverseAdjustment;

  return Number(clamp(rawRate, DISCOUNT_RATE_MIN, DISCOUNT_RATE_MAX).toFixed(3));
}

export function calculateInvestorRate(discountRate: number) {
  const investorRate = discountRate - 0.015;
  return Number(clamp(investorRate, INVESTOR_RATE_MIN, INVESTOR_RATE_MAX).toFixed(3));
}
