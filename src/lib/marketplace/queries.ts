import { getCurrentAuthState } from '@/lib/auth/session';
import { calculatePerFractionExpectedReturn } from '@/lib/marketplace/calculations';
import type { InvoiceFundingSnapshot, MarketplaceInvoiceCard } from '@/lib/marketplace/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type MarketplaceInvoiceRow = {
  id: string;
  status: string;
  invoice_number: string;
  pagador_name: string;
  amount: number | string | null;
  net_amount: number | string | null;
  risk_tier: string | null;
  discount_rate: number | string | null;
  total_fractions: number | null;
  funded_fractions: number | null;
  due_date: string;
};

type FractionRow = {
  id: string;
  net_amount: number | string;
};

type QueryDependencies = {
  getAuthState: typeof getCurrentAuthState;
  listFundingInvoices: () => Promise<MarketplaceInvoiceRow[]>;
  getFundingInvoiceById: (invoiceId: string) => Promise<MarketplaceInvoiceRow | null>;
  listAvailableFractionsByInvoiceId: (invoiceId: string) => Promise<FractionRow[]>;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return 0;
}

function roundToCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isFundingReadyStatus(status: string) {
  return status === 'funding' || status === 'funded';
}

function toMarketplaceInvoiceCard(row: MarketplaceInvoiceRow): MarketplaceInvoiceCard | null {
  if (!isFundingReadyStatus(row.status) || !row.risk_tier) {
    return null;
  }

  const totalFractions = row.total_fractions ?? 0;
  const fundedFractions = row.funded_fractions ?? 0;

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    pagadorName: row.pagador_name,
    amount: toNumber(row.amount),
    netAmount: toNumber(row.net_amount),
    riskTier: row.risk_tier as MarketplaceInvoiceCard['riskTier'],
    discountRate: toNumber(row.discount_rate),
    totalFractions,
    fundedFractions,
    availableFractions: Math.max(totalFractions - fundedFractions, 0),
    dueDate: row.due_date,
  };
}

function createDefaultDependencies(): QueryDependencies {
  return {
    getAuthState: getCurrentAuthState,
    listFundingInvoices: async () => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from('invoices')
        .select(
          'id, status, invoice_number, pagador_name, amount, net_amount, risk_tier, discount_rate, total_fractions, funded_fractions, due_date',
        )
        .in('status', ['funding', 'funded'])
        .order('due_date', { ascending: true });

      return (data as MarketplaceInvoiceRow[] | null) ?? [];
    },
    getFundingInvoiceById: async (invoiceId) => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from('invoices')
        .select(
          'id, status, invoice_number, pagador_name, amount, net_amount, risk_tier, discount_rate, total_fractions, funded_fractions, due_date',
        )
        .eq('id', invoiceId)
        .in('status', ['funding', 'funded'])
        .maybeSingle();

      return (data as MarketplaceInvoiceRow | null) ?? null;
    },
    listAvailableFractionsByInvoiceId: async (invoiceId) => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from('fractions')
        .select('id, net_amount')
        .eq('invoice_id', invoiceId)
        .eq('status', 'available')
        .order('fraction_index', { ascending: true });

      return (data as FractionRow[] | null) ?? [];
    },
  };
}

function resolveDependencies(overrides?: Partial<QueryDependencies>): QueryDependencies {
  return { ...createDefaultDependencies(), ...overrides } satisfies QueryDependencies;
}

export async function getMarketplaceInvoices(overrides?: Partial<QueryDependencies>) {
  const dependencies = resolveDependencies(overrides);
  const { user, profile } = await dependencies.getAuthState();

  if (!user || profile?.role !== 'inversor') {
    return [];
  }

  const invoices = await dependencies.listFundingInvoices();

  return invoices
    .map(toMarketplaceInvoiceCard)
    .filter((invoice): invoice is MarketplaceInvoiceCard => invoice !== null);
}

export async function getInvoiceFundingSnapshot(invoiceId: string, overrides?: Partial<QueryDependencies>) {
  const dependencies = resolveDependencies(overrides);
  const { user, profile } = await dependencies.getAuthState();

  if (!user || profile?.role !== 'inversor') {
    return null;
  }

  const invoice = await dependencies.getFundingInvoiceById(invoiceId);

  if (!invoice) {
    return null;
  }

  const card = toMarketplaceInvoiceCard(invoice);

  if (!card) {
    return null;
  }

  const availableFractions = await dependencies.listAvailableFractionsByInvoiceId(invoiceId);
  const perFractionNetAmount =
    availableFractions.length > 0
      ? toNumber(availableFractions[0]?.net_amount)
      : card.totalFractions > 0
        ? roundToCents(card.netAmount / card.totalFractions)
        : 0;

  return {
    ...card,
    availableFractions: availableFractions.length,
    availableFractionIds: availableFractions.map((fraction) => fraction.id),
    perFractionNetAmount,
    perFractionExpectedReturn: calculatePerFractionExpectedReturn({
      fractionNetAmount: perFractionNetAmount,
      invoiceNetAmount: card.netAmount,
      invoiceAmount: card.amount,
    }),
  } satisfies InvoiceFundingSnapshot;
}
