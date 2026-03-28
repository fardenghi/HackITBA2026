import { describe, expect, it, vi } from 'vitest';
import {
  buildContractProbeReport,
  getBcraSnapshot,
  normalizeBcraSnapshot,
  type BcraCacheRow,
} from '@/lib/risk/bcra';

describe('BCRA client boundary', () => {
  it('returns a normalized cache hit without calling the live endpoint', async () => {
    const cacheRow: BcraCacheRow = {
      cuit: '30712345678',
      deudores_data: { empresa: 'Techint SA', situacion: 1, monto_total: 125000000, dias_atraso: 0 },
      historicas_data: { periodos: [{ mes: '2026-02', situacion: 1 }] },
      cheques_data: { rechazados: 0, monto: 0 },
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };

    const fetchImpl = vi.fn();
    const result = await getBcraSnapshot('30712345678', {
      readCache: vi.fn().mockResolvedValue(cacheRow),
      writeCache: vi.fn(),
      fetchImpl,
      timeoutMs: 50,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.source).toBe('cache');
    expect(result.snapshot).toMatchObject({
      cuit: '30712345678',
      empresa: 'Techint SA',
      situacion: 1,
      rejectedChecks: { count: 0, amount: 0 },
    });
  });

  it('normalizes empty or low-signal payloads into safe defaults', () => {
    const snapshot = normalizeBcraSnapshot({
      cuit: '30798765432',
      deudores: {},
      historicas: { results: [] },
      cheques: null,
    });

    expect(snapshot).toEqual({
      cuit: '30798765432',
      empresa: 'Sin datos BCRA',
      situacion: 0,
      montoTotal: 0,
      diasAtraso: 0,
      historicalSituations: [],
      rejectedChecks: {
        count: 0,
        amount: 0,
      },
      evidence: ['Sin deuda informada en BCRA.', 'Sin histórico reciente disponible.', 'Sin cheques rechazados reportados.'],
    });
  });

  it('records contract probe results for the expected centraldedeudores resources', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes('/deudores')) {
        return new Response(JSON.stringify({ results: [{ situacion: 1 }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response('missing', { status: 404, headers: { 'content-type': 'text/plain' } });
    });

    const report = await buildContractProbeReport('30712345678', { fetchImpl, timeoutMs: 50 });

    expect(report.baseUrl).toMatch(/centraldedeudores/i);
    expect(report.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resource: 'deudores', reachable: true, status: 200 }),
        expect.objectContaining({ resource: 'historicas', reachable: false, status: 404 }),
        expect.objectContaining({ resource: 'cheques', reachable: false, status: 404 }),
      ]),
    );
  });
});
