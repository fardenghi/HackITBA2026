import { getCurrentAuthState } from '@/lib/auth/session';
import { DashboardHero } from '@/components/layout/dashboard-hero';
import { MarketplaceGrid } from '@/components/marketplace/marketplace-grid';
import { getMarketplaceInvoices } from '@/lib/marketplace/queries';

export default async function InversorDashboardPage() {
  const { profile } = await getCurrentAuthState();
  const invoices = await getMarketplaceInvoices();

  return (
    <section className="mx-auto min-h-[calc(100vh-81px)] max-w-6xl space-y-8 px-6 py-16">
      <DashboardHero
        companyName={profile?.company_name}
        description="Explorá facturas tokenizadas, compará riesgo y retorno esperado, y seguí el avance del funding en vivo desde tu dashboard de inversión."
        displayName={profile?.display_name}
        role="inversor"
        title="Marketplace de facturas en funding"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-slate-300">Comprá fracciones de facturas verificadas con pricing esperado antes de invertir.</div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-slate-300">Seguimiento live del porcentaje fondeado con fallback automático si el canal se degrada.</div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-slate-300">Cada compra usa el RPC `fund_invoice()` para evitar sobreventa concurrente.</div>
        </div>
      </DashboardHero>

      <MarketplaceGrid initialInvoices={invoices} />
    </section>
  );
}
