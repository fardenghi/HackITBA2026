import Link from 'next/link';
import { FundingProgressBar } from '@/components/marketplace/funding-progress-bar';
import { RealtimeStatus } from '@/components/marketplace/realtime-status';
import { RiskBadge } from '@/components/invoices/risk-badge';
import type { MarketplaceRealtimeMode } from '@/hooks/use-marketplace-realtime';
import type { MarketplaceInvoiceCard as MarketplaceInvoiceCardType } from '@/lib/marketplace/types';

type MarketplaceCardProps = {
  invoice: MarketplaceInvoiceCardType;
  mode: MarketplaceRealtimeMode;
};

export function MarketplaceCard({ invoice, mode }: MarketplaceCardProps) {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Factura en funding</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">{invoice.invoiceNumber}</h3>
          <p className="mt-2 text-slate-300">{invoice.pagadorName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RiskBadge tier={invoice.riskTier} />
          <RealtimeStatus mode={mode} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Metric label="Tasa descuento" value={`${(invoice.discountRate * 100).toFixed(1)}%`} />
        <Metric label="Monto neto" value={`ARS ${invoice.netAmount.toLocaleString('es-AR')}`} />
        <Metric label="Vencimiento" value={invoice.dueDate} />
      </div>

      <div className="mt-6">
        <FundingProgressBar fundedFractions={invoice.fundedFractions} totalFractions={invoice.totalFractions} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 text-sm text-slate-300">
        <span>{invoice.availableFractions} disponibles</span>
        <Link
          className="rounded-full bg-white px-4 py-2 font-semibold text-slate-950 transition hover:bg-slate-200"
          href={`/inversor/invoices/${invoice.id}`}
        >
          Ver detalle
        </Link>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
