'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const purchaseFractionsSchema = z.object({
  invoiceId: z.string().uuid('Seleccioná una factura válida.'),
  fractionCount: z.coerce.number().int('Ingresá una cantidad entera.').positive('Comprá al menos una fracción.'),
});

type PurchaseFractionsInput = z.input<typeof purchaseFractionsSchema>;

type PurchaseFieldErrors = Partial<Record<'invoiceId' | 'fractionCount', string>>;

type PurchaseActor = {
  userId: string;
  role: 'cedente' | 'inversor';
};

type PurchaseFractionsServices = {
  getActor: () => Promise<PurchaseActor | null>;
  callFundInvoice: (payload: { invoiceId: string; fractionCount: number }) => Promise<{
    purchasedCount: number;
    checkoutTotal: number;
    fundedFractions: number;
    fundingPercentage: number;
    invoiceStatus: 'funding' | 'funded';
  }>;
};

export type PurchaseFractionsResult =
  | {
      status: 'success';
      message: string;
      purchase: {
        invoiceId: string;
        purchasedCount: number;
        checkoutTotal: number;
        fundedFractions: number;
        fundingPercentage: number;
        invoiceStatus: 'funding' | 'funded';
      };
    }
  | {
      status: 'error';
      message: string;
      fieldErrors?: PurchaseFieldErrors;
    };

function toFieldErrors(error: z.ZodError<PurchaseFractionsInput>): PurchaseFieldErrors {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? 'Campo inválido']),
  ) as PurchaseFieldErrors;
}

async function buildServerServices(): Promise<PurchaseFractionsServices> {
  const supabase = await createSupabaseServerClient();

  return {
    async getActor() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single<{ role: 'cedente' | 'inversor' }>();

      return profile ? { userId: user.id, role: profile.role } : null;
    },
    async callFundInvoice({ invoiceId, fractionCount }) {
      const { data, error } = await supabase.rpc('fund_invoice', {
        p_invoice_id: invoiceId,
        p_fraction_count: fractionCount,
      });

      if (error || !data) {
        throw new Error(error?.message ?? 'No pudimos registrar la compra.');
      }

      const row = Array.isArray(data) ? data[0] : data;

      return {
        purchasedCount: Number(row.purchased_count ?? 0),
        checkoutTotal: Number(row.checkout_total ?? 0),
        fundedFractions: Number(row.funded_fractions ?? 0),
        fundingPercentage: Number(row.funding_percentage ?? 0),
        invoiceStatus: row.invoice_status,
      };
    },
  };
}

export async function purchaseFractions(
  payload: PurchaseFractionsInput,
  services: PurchaseFractionsServices,
): Promise<PurchaseFractionsResult> {
  const parsed = purchaseFractionsSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos de la compra e intentá de nuevo.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const actor = await services.getActor();

  if (!actor || actor.role !== 'inversor') {
    return {
      status: 'error',
      message: 'Solo un inversor autenticado puede comprar fracciones.',
    };
  }

  try {
    const purchase = await services.callFundInvoice(parsed.data);

    return {
      status: 'success',
      message:
        purchase.invoiceStatus === 'funded'
          ? 'Compraste las últimas fracciones y la factura quedó totalmente fondeada.'
          : 'Compra registrada con éxito.',
      purchase: {
        invoiceId: parsed.data.invoiceId,
        purchasedCount: purchase.purchasedCount,
        checkoutTotal: purchase.checkoutTotal,
        fundedFractions: purchase.fundedFractions,
        fundingPercentage: purchase.fundingPercentage,
        invoiceStatus: purchase.invoiceStatus,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'No pudimos registrar la compra.',
    };
  }
}

export async function purchaseFractionsAction(payload: PurchaseFractionsInput): Promise<PurchaseFractionsResult> {
  const result = await purchaseFractions(payload, await buildServerServices());

  if (result.status === 'success') {
    revalidatePath('/inversor/dashboard');
    revalidatePath(`/inversor/invoices/${result.purchase.invoiceId}`);
  }

  return result;
}
