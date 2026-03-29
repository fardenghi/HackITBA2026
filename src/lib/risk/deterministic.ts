import type { NormalizedBcraSnapshot } from '@/lib/risk/normalize';
import { calculateDiscountRate, type RiskTier } from '@/lib/risk/pricing';

type RiskSource = 'cache' | 'live' | 'stale-cache' | 'fallback';

const fallbackTierPool: RiskTier[] = ['B', 'B', 'C', 'C', 'C', 'D'];

const fallbackSignalVariants = [
  'Escenario proxy conservador por ausencia de datos BCRA en vivo',
  'Escenario proxy balanceado por ausencia de datos BCRA en vivo',
  'Escenario proxy defensivo por ausencia de datos BCRA en vivo',
] as const;

export type DeterministicRiskResult = {
  tier: RiskTier;
  discountRate: number;
  signals: string[];
  fallbackUsed: boolean;
  daysToMaturity: number;
};

function normalizeRandomValue(randomValue: number) {
  return Math.min(0.999999, Math.max(0, randomValue));
}

function pickFallbackTier(randomValue: number): RiskTier {
  const normalized = normalizeRandomValue(randomValue);
  const index = Math.floor(normalized * fallbackTierPool.length);
  return fallbackTierPool[index] ?? 'C';
}

function pickFallbackSignal(randomValue: number) {
  const normalized = normalizeRandomValue(randomValue);
  const index = Math.floor(normalized * fallbackSignalVariants.length);
  return fallbackSignalVariants[index] ?? fallbackSignalVariants[1];
}

function resolveTier(snapshot: NormalizedBcraSnapshot, source: RiskSource, fallbackTier: RiskTier): RiskTier {
  if (source === 'fallback' || snapshot.situacion === 0) {
    return fallbackTier;
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

function buildSignals(snapshot: NormalizedBcraSnapshot, source: RiskSource, fallbackSignal: string) {
  const signals: string[] = [];

  if (source === 'fallback') {
    signals.push(fallbackSignal);
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
  randomFn?: () => number;
}): DeterministicRiskResult {
  const fallbackRandomValue = input.randomFn?.() ?? Math.random();
  const fallbackTier = pickFallbackTier(fallbackRandomValue);
  const fallbackSignal = pickFallbackSignal(fallbackRandomValue);
  const tier = resolveTier(input.snapshot, input.source, fallbackTier);
  const signals = buildSignals(input.snapshot, input.source, fallbackSignal);
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
