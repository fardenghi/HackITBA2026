function toCents(value: number) {
  return Math.round(value * 100);
}

export const MAX_TOKEN_PRICE_PESOS = 100_000;

export function calculateAutomaticFractionCount(total: number, maxTokenPrice = MAX_TOKEN_PRICE_PESOS) {
  if (total <= 0) {
    throw new Error('El monto total debe ser mayor a 0.');
  }

  if (!Number.isFinite(maxTokenPrice) || maxTokenPrice <= 0) {
    throw new Error('El precio maximo por token debe ser mayor a 0.');
  }

  return Math.max(1, Math.ceil(total / maxTokenPrice));
}

export function splitInvoiceIntoFractions(total: number, count: number) {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('La cantidad de fracciones debe ser un entero positivo.');
  }

  const totalCents = toCents(total);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  const fractions = Array.from({ length: count }, (_, index) => (index === count - 1 ? base + remainder : base));

  return fractions.map((value) => Number((value / 100).toFixed(2)));
}
