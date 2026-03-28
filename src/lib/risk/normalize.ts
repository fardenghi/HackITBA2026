export type NormalizedBcraSnapshot = {
  cuit: string;
  empresa: string;
  situacion: number;
  montoTotal: number;
  diasAtraso: number;
  historicalSituations: Array<{ period: string; situacion: number }>;
  rejectedChecks: {
    count: number;
    amount: number;
  };
  evidence: string[];
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function toRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function normalizeDeudoresPayload(payload: unknown) {
  const root = toRecord(payload);
  const firstRow = toRecord(toArray(root.results ?? root.data ?? root.deudas)[0]);
  const source = Object.keys(firstRow).length > 0 ? firstRow : root;

  return {
    empresa: String(source.empresa ?? source.denominacion ?? 'Sin datos BCRA'),
    situacion: toNumber(source.situacion, 0),
    montoTotal: toNumber(source.monto_total ?? source.montoTotal ?? source.deuda_total, 0),
    diasAtraso: toNumber(source.dias_atraso ?? source.diasAtraso ?? source.atraso, 0),
  };
}

export function normalizeHistoricasPayload(payload: unknown) {
  const root = toRecord(payload);
  const entries = toArray(root.periodos ?? root.results ?? root.data)
    .map((item) => toRecord(item))
    .map((item) => ({
      period: String(item.mes ?? item.periodo ?? item.period ?? ''),
      situacion: toNumber(item.situacion, 0),
    }))
    .filter((item) => item.period);

  return entries;
}

export function normalizeChequesPayload(payload: unknown) {
  const root = toRecord(payload);
  const firstRow = toRecord(toArray(root.results ?? root.data ?? root.cheques)[0]);
  const source = Object.keys(firstRow).length > 0 ? firstRow : root;

  return {
    count: toNumber(source.rechazados ?? source.cantidad ?? source.count, 0),
    amount: toNumber(source.monto ?? source.monto_total ?? source.amount, 0),
  };
}

export function buildBcraEvidence(snapshot: Omit<NormalizedBcraSnapshot, 'evidence'>) {
  const evidence = [
    snapshot.situacion > 0
      ? `Situación BCRA actual: ${snapshot.situacion}.`
      : 'Sin deuda informada en BCRA.',
    snapshot.historicalSituations.length > 0
      ? `Historial reciente: ${snapshot.historicalSituations
          .slice(0, 3)
          .map((item) => `${item.period}→${item.situacion}`)
          .join(', ')}.`
      : 'Sin histórico reciente disponible.',
    snapshot.rejectedChecks.count > 0
      ? `Cheques rechazados: ${snapshot.rejectedChecks.count} por ARS ${snapshot.rejectedChecks.amount.toFixed(2)}.`
      : 'Sin cheques rechazados reportados.',
  ];

  return evidence;
}

export function normalizeBcraSnapshot(input: {
  cuit: string;
  deudores: unknown;
  historicas: unknown;
  cheques: unknown;
}): NormalizedBcraSnapshot {
  const base = {
    cuit: input.cuit,
    ...normalizeDeudoresPayload(input.deudores),
    historicalSituations: normalizeHistoricasPayload(input.historicas),
    rejectedChecks: normalizeChequesPayload(input.cheques),
  };

  return {
    ...base,
    evidence: buildBcraEvidence(base),
  };
}
