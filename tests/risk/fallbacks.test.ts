import { describe, expect, it } from 'vitest';
import { scoreRiskDeterministically } from '@/lib/risk/deterministic';

describe('risk fallback paths', () => {
  it('returns a deterministic result when stale cache is the only available BCRA source', () => {
    const result = scoreRiskDeterministically({
      source: 'stale-cache',
      asOfDate: '2026-03-28',
      dueDate: '2026-05-12',
      snapshot: {
        cuit: '30712345678',
        empresa: 'Techint SA',
        situacion: 1,
        montoTotal: 125000000,
        diasAtraso: 0,
        historicalSituations: [{ period: '2026-02', situacion: 1 }],
        rejectedChecks: { count: 0, amount: 0 },
        evidence: ['Situación BCRA actual: 1.'],
      },
      randomFn: () => 0.95,
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.tier).toBe('A');
    expect(result.discountRate).toBe(0.115);
  });

  it('never crashes when BCRA data is missing and falls back to a bounded randomized baseline', () => {
    const result = scoreRiskDeterministically({
      source: 'fallback',
      asOfDate: '2026-03-28',
      dueDate: '2026-04-15',
      snapshot: {
        cuit: '30000000000',
        empresa: 'Sin datos BCRA',
        situacion: 0,
        montoTotal: 0,
        diasAtraso: 0,
        historicalSituations: [],
        rejectedChecks: { count: 0, amount: 0 },
        evidence: [],
      },
      randomFn: () => 0.1,
    });

    expect(result).toMatchObject({
      tier: 'B',
      fallbackUsed: true,
    });
    expect(result.discountRate).toBe(0.12);
    expect(result.signals).toContain('Escenario proxy conservador por ausencia de datos BCRA en vivo');
  });

  it('can still land in a stricter fallback bucket when randomization shifts upward', () => {
    const result = scoreRiskDeterministically({
      source: 'fallback',
      asOfDate: '2026-03-28',
      dueDate: '2026-04-15',
      snapshot: {
        cuit: '30000000000',
        empresa: 'Sin datos BCRA',
        situacion: 0,
        montoTotal: 0,
        diasAtraso: 0,
        historicalSituations: [],
        rejectedChecks: { count: 0, amount: 0 },
        evidence: [],
      },
      randomFn: () => 0.95,
    });

    expect(result.tier).toBe('D');
    expect(result.discountRate).toBe(0.132);
  });
});
