import type { NormalizedBcraSnapshot } from '@/lib/risk/normalize';
import { calculateDiscountRate, type RiskTier } from '@/lib/risk/pricing';

type RiskSource = 'cache' | 'live' | 'stale-cache' | 'fallback';

export type DeterministicRiskResult = {
  tier: RiskTier;
  discountRate: number;
  signals: string[];
  fallbackUsed: boolean;
  daysToMaturity: number;
};

function resolveTier(snapshot: NormalizedBcraSnapshot, source: RiskSource): RiskTier {
  if (source === 'fallback' || snapshot.situacion === 0) {
    return 'C';
  }

  if (snapshot.situacion <= 1) return 'A';
  if (snapshot.situacion === 2) return 'B';
  if (snapshot.situacion === 3) return 'C';
  return 'D';
}

function daysBetween(asOfDate: string, dueDate: string) {
  const start = new Date(`${asOfDate}T00:00:00Z`).getTime();
  const end = new Date(`${dueDate}T00:00:00Z`).getTime();
  return Math.max(0, Math.ceil((end - start) / 86_400_000));
}

function buildSignals(snapshot: NormalizedBcraSnapshot, source: RiskSource) {
  const signals: string[] = [];

  if (source === 'fallback') {
    signals.push('Fallback determinístico por ausencia de datos BCRA en vivo');
  }

  if (snapshot.situacion > 0) {
    signals.push(`Situación BCRA ${snapshot.situacion}`);
  }

  if (snapshot.diasAtraso > 0) {
    signals.push(`Atraso reportado: ${snapshot.diasAtraso} días`);
  }

  if (snapshot.rejectedChecks.count > 0) {
    signals.push('Cheques rechazados vigentes');
  }

  if (
    snapshot.historicalSituations.length >= 2 &&
    snapshot.historicalSituations.at(-1)!.situacion > snapshot.historicalSituations[0].situacion
  ) {
    signals.push('Tendencia histórica deteriorándose');
  }

  if (signals.length === 0) {
    signals.push('Perfil sin señales adversas relevantes');
  }

  return signals;
}

function countMaterialAdverseSignals(snapshot: NormalizedBcraSnapshot) {
  let count = 0;

  if (snapshot.rejectedChecks.count > 0) {
    count += 1;
  }

  if (snapshot.diasAtraso > 30) {
    count += 1;
  }

  if (
    snapshot.historicalSituations.length >= 2 &&
    snapshot.historicalSituations.at(-1)!.situacion > snapshot.historicalSituations[0].situacion
  ) {
    count += 1;
  }

  return count;
}

export function scoreRiskDeterministically(input: {
  snapshot: NormalizedBcraSnapshot;
  source: RiskSource;
  asOfDate: string;
  dueDate: string;
}): DeterministicRiskResult {
  const tier = resolveTier(input.snapshot, input.source);
  const signals = buildSignals(input.snapshot, input.source);
  const daysToMaturity = daysBetween(input.asOfDate, input.dueDate);
  const adverseSignals = countMaterialAdverseSignals(input.snapshot);

  return {
    tier,
    discountRate: calculateDiscountRate({ tier, daysToMaturity, adverseSignals }),
    signals,
    fallbackUsed: input.source === 'stale-cache' || input.source === 'fallback',
    daysToMaturity,
  };
}
