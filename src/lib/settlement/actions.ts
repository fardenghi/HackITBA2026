'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SettlementActionFieldErrors, SettlementActionInput, SettlementActionResult } from '@/lib/settlement/types';

const settlementSchema = z.object({
  invoiceId: z.string().uuid('Seleccioná un cheque válido.'),
});

type SettlementActor = {
  userId: string;
  role: 'cedente' | 'inversor';
};

type SettlementServices = {
  getActor: () => Promise<SettlementActor | null>;
  callSettleInvoice: (payload: { invoiceId: string }) => Promise<{
    invoiceId: string;
    invoiceStatus: 'settled';
    settledFractions: number;
    principalTotal: number;
    interestTotal: number;
    cedenteDisbursementTotal: number;
  }>;
};

function toFieldErrors(error: z.ZodError<SettlementActionInput>): SettlementActionFieldErrors {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? 'Campo inválido']),
  ) as SettlementActionFieldErrors;
}

async function buildServerServices(): Promise<SettlementServices> {
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
    async callSettleInvoice({ invoiceId }) {
      const { data, error } = await supabase.rpc('settle_invoice', {
        p_invoice_id: invoiceId,
      });

      if (error || !data) {
        throw new Error(error?.message ?? 'No pudimos liquidar el cheque.');
      }

      const row = Array.isArray(data) ? data[0] : data;

      return {
        invoiceId: row.invoice_id,
        invoiceStatus: row.invoice_status,
        settledFractions: Number(row.settled_fractions ?? 0),
        principalTotal: Number(row.principal_total ?? 0),
        interestTotal: Number(row.interest_total ?? 0),
        cedenteDisbursementTotal: Number(row.cedente_disbursement_total ?? 0),
      };
    },
  };
}

export async function settleInvoice(
  payload: SettlementActionInput,
  services: SettlementServices,
): Promise<SettlementActionResult> {
  const parsed = settlementSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos de la liquidación e intentá de nuevo.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const actor = await services.getActor();

  if (!actor || actor.role !== 'cedente') {
    return {
      status: 'error',
      message: 'Solo un cedente autenticado puede liquidar cheques.',
    };
  }

  try {
    const settlement = await services.callSettleInvoice(parsed.data);

    return {
      status: 'success',
      message: 'Liquidación simulada registrada con éxito.',
      settlement,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'No pudimos liquidar el cheque.',
    };
  }
}

export async function settleInvoiceAction(payload: SettlementActionInput): Promise<SettlementActionResult> {
  const result = await settleInvoice(payload, await buildServerServices());

  if (result.status === 'success') {
    revalidatePath('/cedente/dashboard');
    revalidatePath('/inversor/dashboard');
    revalidatePath(`/cedente/invoices/${result.settlement.invoiceId}`);
    revalidatePath(`/inversor/invoices/${result.settlement.invoiceId}`);
  }

  return result;
}
