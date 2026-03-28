import Link from 'next/link';
import { logoutAction } from '@/lib/auth/actions';
import { getCurrentAuthState } from '@/lib/auth/session';
import { MetricCard } from '@/components/dashboard/metric-card';
import { TransactionHistoryTable } from '@/components/dashboard/transaction-history-table';
import { DashboardHero } from '@/components/layout/dashboard-hero';
import { getCedenteDashboard } from '@/lib/settlement/queries';

export default async function CedenteDashboardPage() {
  const { profile } = await getCurrentAuthState();
  const dashboard = await getCedenteDashboard();

  return (
    <section className="mx-auto min-h-[calc(100vh-81px)] max-w-6xl space-y-8 px-6 py-16">
      <DashboardHero
        companyName={profile?.company_name}
        description="Seguimiento operativo del pipeline completo: capital levantado, costo efectivo, invoices activas y últimos movimientos del ledger." 
        displayName={profile?.display_name}
        role="cedente"
        title="Control de colocación y settlement"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Link className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-slate-300 transition hover:border-emerald-300/30 hover:bg-slate-900/60" href="/cedente/invoices/new">Emitir un cheque nuevo y recalcular riesgo en minutos.</Link>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-slate-300">Cheques activos por estado: {Object.keys(dashboard.statusCounts).length || 0} buckets visibles.</div>
          <form action={logoutAction}>
            <button className="w-full rounded-2xl bg-white px-5 py-5 font-semibold text-slate-950" type="submit">
              Cerrar sesión
            </button>
          </form>
        </div>
      </DashboardHero>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard hint={`${dashboard.statusCounts.funding ?? 0} en funding · ${dashboard.statusCounts.funded ?? 0} funded`} label="Cheques activos" value={`${dashboard.invoices.length}`} />
        <MetricCard hint="Suma de net_amount para funded, settling y settled" label="Capital levantado" value={formatCurrency(dashboard.totalCapitalRaised)} />
        <MetricCard hint="Spread total sobre monto nominal de cheques fondeados o liquidados" label="Costo efectivo" value={`${(dashboard.effectiveFinancingCost * 100).toFixed(2)}%`} />
        <MetricCard hint="Spread acumulado" label="Spread total" value={formatCurrency(dashboard.spreadTotal)} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Cheques del cedente</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Pipeline visible de originación a settlement</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {dashboard.invoices.map((invoice) => (
            <article key={invoice.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{invoice.status}</p>
                  <p className="mt-1 text-xl font-semibold text-white">{invoice.invoiceNumber}</p>
                </div>
                <p className="text-right text-sm text-slate-300">{invoice.dueDate}</p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <MetricCard label="Monto" value={formatCurrency(invoice.amount)} />
                <MetricCard label="Monto neto" value={formatCurrency(invoice.netAmount)} />
              </div>
              <div className="mt-4 flex justify-end">
                <Link className="text-sm font-semibold text-emerald-200" href={`/cedente/invoices/${invoice.id}`}>
                  Ver cheque completo →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Ledger reciente</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Compras y desembolsos visibles para la PyME</h2>
        </div>
        <TransactionHistoryTable emptyMessage="Todavía no hay movimientos recientes para mostrar." items={dashboard.recentTransactions} />
      </section>
    </section>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(amount);
}
