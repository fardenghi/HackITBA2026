export type RiskTier = 'A' | 'B' | 'C' | 'D';

const baseRates: Record<RiskTier, number> = {
  A: 0.12,
  B: 0.18,
  C: 0.26,
  D: 0.36,
};

export function calculateDiscountRate(input: {
  tier: RiskTier;
  daysToMaturity: number;
  adverseSignals: number;
}) {
  const boundedDays = Math.max(0, Math.min(input.daysToMaturity, 180) - 30);
  const maturityAdjustment = boundedDays * 0.0004;
  const adverseAdjustment = Math.max(0, input.adverseSignals) * 0.007;

  return Number(Math.min(0.45, baseRates[input.tier] + maturityAdjustment + adverseAdjustment).toFixed(3));
}
