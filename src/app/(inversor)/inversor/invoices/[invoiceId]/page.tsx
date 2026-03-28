import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PurchaseFractionsForm } from '@/components/marketplace/purchase-fractions-form';
import { RiskBadge } from '@/components/invoices/risk-badge';
import { getInvoiceFundingSnapshot } from '@/lib/marketplace/queries';

export default async function InvestorInvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const snapshot = await getInvoiceFundingSnapshot(invoiceId);

  if (!snapshot) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-6 py-16">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-8">
        <Link className="text-sm font-semibold text-sky-200" href="/inversor/dashboard">
          ← Volver al marketplace
        </Link>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Detalle de inversión</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">{snapshot.invoiceNumber}</h1>
            <p className="mt-2 text-lg text-slate-300">{snapshot.pagadorName}</p>
          </div>
          <RiskBadge tier={snapshot.riskTier} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric label="Monto total" value={`ARS ${snapshot.amount.toLocaleString('es-AR')}`} />
          <Metric label="Monto neto" value={`ARS ${snapshot.netAmount.toLocaleString('es-AR')}`} />
          <Metric label="Tasa descuento" value={`${(snapshot.discountRate * 100).toFixed(1)}%`} />
          <Metric label="Vencimiento" value={snapshot.dueDate} />
        </div>
      </div>

      <PurchaseFractionsForm initialSnapshot={snapshot} />
    </section>
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
