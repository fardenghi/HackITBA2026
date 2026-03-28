import { describe, expect, it } from 'vitest';
import { scoreRiskDeterministically } from '@/lib/risk/deterministic';

describe('deterministic risk engine', () => {
  it('maps situacion to tier and adds adverse-signal adjustments', () => {
    const result = scoreRiskDeterministically({
      source: 'live',
      asOfDate: '2026-03-28',
      dueDate: '2026-06-11',
      snapshot: {
        cuit: '30798765432',
        empresa: 'YPF SA',
        situacion: 2,
        montoTotal: 98000000,
        diasAtraso: 7,
        historicalSituations: [
          { period: '2025-12', situacion: 2 },
          { period: '2026-01', situacion: 2 },
          { period: '2026-02', situacion: 2 },
        ],
        rejectedChecks: { count: 1, amount: 185000 },
        evidence: [],
      },
    });

    expect(result).toMatchObject({
      tier: 'B',
      discountRate: 0.205,
      fallbackUsed: false,
    });
    expect(result.signals).toEqual(
      expect.arrayContaining(['Situación BCRA 2', 'Atraso reportado: 7 días', 'Cheques rechazados vigentes']),
    );
  });
});
