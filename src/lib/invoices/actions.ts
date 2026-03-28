'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildRiskNarrative } from '@/lib/risk/llm';
import { getBcraSnapshot } from '@/lib/risk/bcra';
import { scoreRiskDeterministically } from '@/lib/risk/deterministic';
import { calculateAutomaticFractionCount, splitInvoiceIntoFractions } from '@/lib/tokenization/fractions';
import { buildInvoiceTokenHash } from '@/lib/tokenization/hash';
import {
  invoiceOriginationSchema,
  serializeInvoiceOriginationInput,
  type InvoiceOriginationFormInput,
  type InvoiceOriginationInput,
} from '@/lib/invoices/schemas';

export type InvoiceActionResult = {
  status: 'success' | 'error';
  message?: string;
  redirectTo?: string;
  invoiceId?: string;
  fieldErrors?: Partial<Record<keyof InvoiceOriginationFormInput, string>>;
};

type InvoiceRecord = {
  id: string;
  status: string;
};

type InvoiceActionServices = {
  getActor: () => Promise<{ userId: string; role: 'cedente' | 'inversor' } | null>;
  createInvoice: (payload: ReturnType<typeof serializeInvoiceOriginationInput> & { cedente_id: string }) => Promise<InvoiceRecord>;
  transitionInvoice: (invoiceId: string, status: 'validating' | 'validated', actorId: string) => Promise<void>;
  getBcraSnapshot: typeof getBcraSnapshot;
  scoreRisk: typeof scoreRiskDeterministically;
  buildRiskNarrative: typeof buildRiskNarrative;
  persistRiskResult: (payload: {
    invoiceId: string;
    riskTier: string;
    discountRate: number;
    explanation: string;
    bcraData: unknown;
  }) => Promise<void>;
  tokenizeInvoice: (payload: {
    invoiceId: string;
    actorId: string;
    totalFractions: number;
    tokenHash: string;
    netAmount: number;
    fractionAmounts: number[];
  }) => Promise<{
    tokenHash: string;
    netAmount: number;
    totalFractions: number;
    status: string;
    fractions: number[];
  }>;
};

function toFieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? 'Campo inválido']),
  );
}

async function buildServerServices(): Promise<InvoiceActionServices> {
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
    async createInvoice(payload) {
      const { data, error } = await supabase.from('invoices').insert(payload).select('id, status').single<InvoiceRecord>();
      if (error || !data) throw new Error(error?.message ?? 'No pudimos crear el cheque.');
      return data;
    },
    async transitionInvoice(invoiceId, status, actorId) {
      const { error } = await supabase.rpc('transition_invoice', {
        p_invoice_id: invoiceId,
        p_new_status: status,
        p_actor_id: actorId,
      });
      if (error) throw new Error(error.message);
    },
    getBcraSnapshot,
    scoreRisk: scoreRiskDeterministically,
    buildRiskNarrative,
    async persistRiskResult(payload) {
      const { error } = await supabase
        .from('invoices')
        .update({
          bcra_data: payload.bcraData,
          risk_tier: payload.riskTier,
          discount_rate: payload.discountRate,
          risk_explanation: payload.explanation,
        })
        .eq('id', payload.invoiceId);

      if (error) throw new Error(error.message);
    },
    async tokenizeInvoice(payload) {
      const { data, error } = await supabase.rpc('tokenize_invoice', {
        p_invoice_id: payload.invoiceId,
        p_fraction_count: payload.totalFractions,
        p_actor_id: payload.actorId,
        p_token_hash: payload.tokenHash,
        p_net_amount: payload.netAmount,
        p_fraction_amounts: payload.fractionAmounts,
      });

      if (error || !data) {
        throw new Error(error?.message ?? 'No pudimos tokenizar el cheque.');
      }

      const row = Array.isArray(data) ? data[0] : data;

      return {
        tokenHash: row.token_hash,
        netAmount: Number(row.net_amount),
        totalFractions: row.total_fractions,
        status: row.status,
        fractions: payload.fractionAmounts,
      };
    },
  };
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

export async function finalizeInvoiceTokenization(
  invoice: {
    id: string;
    amount: number;
    issueDate: string;
    dueDate: string;
    pagadorCuit: string;
    description: string;
    riskTier: string;
    discountRate: number;
  },
  services: {
    actorId: string;
    tokenizeInvoice: InvoiceActionServices['tokenizeInvoice'];
  },
) {
  const netAmount = roundCurrency(invoice.amount * (1 - invoice.discountRate));
  const fractionCount = calculateAutomaticFractionCount(netAmount);
  const fractionAmounts = splitInvoiceIntoFractions(netAmount, fractionCount);
  const tokenHash = buildInvoiceTokenHash({
    invoiceId: invoice.id,
    pagadorCuit: invoice.pagadorCuit,
    amount: invoice.amount,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    description: invoice.description,
    riskTier: invoice.riskTier,
    discountRate: invoice.discountRate,
    fractionCount,
  });

  return services.tokenizeInvoice({
    invoiceId: invoice.id,
    actorId: services.actorId,
    totalFractions: fractionCount,
    tokenHash,
    netAmount,
    fractionAmounts,
  });
}

export async function submitInvoiceForOrigination(
  payload: InvoiceOriginationFormInput,
  services: InvoiceActionServices,
): Promise<InvoiceActionResult> {
  const parsed = invoiceOriginationSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos del cheque e intentá de nuevo.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const actor = await services.getActor();

  if (!actor || actor.role !== 'cedente') {
    return {
      status: 'error',
      message: 'Solo un cedente autenticado puede originar cheques.',
    };
  }

  const serialized = serializeInvoiceOriginationInput(parsed.data);
  const invoice = await services.createInvoice({
    ...serialized,
    cedente_id: actor.userId,
  });

  await services.transitionInvoice(invoice.id, 'validating', actor.userId);

  const bcraResult = await services.getBcraSnapshot(parsed.data.pagadorCuit);
  const deterministic = services.scoreRisk({
    snapshot: bcraResult.snapshot,
    source: bcraResult.source,
    asOfDate: parsed.data.issueDate,
    dueDate: parsed.data.dueDate,
  });
  const narrative = await services.buildRiskNarrative({
    payerName: parsed.data.pagadorName,
    tier: deterministic.tier,
    discountRate: deterministic.discountRate,
    evidence: bcraResult.snapshot.evidence,
  });

  await services.persistRiskResult({
    invoiceId: invoice.id,
    riskTier: deterministic.tier,
    discountRate: deterministic.discountRate,
    explanation: narrative.explanation,
    bcraData: {
      source: bcraResult.source,
      snapshot: bcraResult.snapshot,
      raw: bcraResult.raw,
      deterministic,
      narrative,
    },
  });

  await services.transitionInvoice(invoice.id, 'validated', actor.userId);
  await finalizeInvoiceTokenization(
    {
      id: invoice.id,
      amount: parsed.data.faceValue,
      issueDate: parsed.data.issueDate,
        dueDate: parsed.data.dueDate,
        pagadorCuit: parsed.data.pagadorCuit,
        description: parsed.data.description,
        riskTier: deterministic.tier,
        discountRate: deterministic.discountRate,
      },
    {
      actorId: actor.userId,
      tokenizeInvoice: services.tokenizeInvoice,
    },
  );

  return {
    status: 'success',
    redirectTo: `/cedente/invoices/${invoice.id}`,
    invoiceId: invoice.id,
  };
}

export async function submitInvoiceAction(payload: InvoiceOriginationFormInput): Promise<InvoiceActionResult> {
  return submitInvoiceForOrigination(payload, await buildServerServices());
}
