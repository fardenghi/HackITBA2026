import { describe, expect, it, vi } from 'vitest';
import { finalizeInvoiceTokenization } from '@/lib/invoices/actions';

describe('invoice tokenization orchestration', () => {
  it('stores tokenization artifacts and transitions validated invoices into funding', async () => {
    const tokenizeInvoice = vi.fn().mockResolvedValue({
      tokenHash: 'abc123',
      netAmount: 1275000,
      totalFractions: 13,
      fractions: new Array(12).fill(98076.92).concat(98076.96),
      status: 'funding',
    });

    const result = await finalizeInvoiceTokenization(
      {
        id: 'invoice-1',
        amount: 1500000,
        dueDate: '2026-06-28',
        issueDate: '2026-03-28',
        pagadorCuit: '30712345678',
        description: 'Cheque tokenizable',
        riskTier: 'A',
        discountRate: 0.15,
      },
      {
        actorId: 'cedente-1',
        tokenizeInvoice,
      },
    );

    expect(tokenizeInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: 'invoice-1',
        actorId: 'cedente-1',
        totalFractions: 13,
        netAmount: 1275000,
        fractionAmounts: new Array(12).fill(98076.92).concat(98076.96),
      }),
    );
    expect(result).toMatchObject({
      status: 'funding',
      tokenHash: 'abc123',
    });
  });
});
