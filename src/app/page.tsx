import Link from 'next/link';
import { getCurrentAuthState, getDashboardPathForRole } from '@/lib/auth/session';
import { RiskScanMotion } from '@/components/marketing/risk-scan-motion';
import { TokenizationMotion } from '@/components/marketing/tokenization-motion';

const journey = [
  {
    step: '01',
    title: 'Cedente carga el cheque',
    description: 'Sube pagador, monto y vencimiento. Karaí dispara BCRA + narrativa IA sin pedir pasos manuales extra.',
    href: '/cedente/invoices/new',
  },
  {
    step: '02',
    title: 'Karaí calcula riesgo y tasa',
    description: 'El scoring combina señales determinísticas, explicación asistida por OpenAI y una tasa visible para compra.',
    href: '/login',
  },
  {
    step: '03',
    title: 'Se tokeniza automaticamente',
    description: 'La emisión se divide en la mayor cantidad de fracciones posible para no superar ARS 100.000 por token.',
    href: '/signup',
  },
  {
    step: '04',
    title: 'El inversor compra con contexto',
    description: 'Dashboard, ficha del cheque, tasa, rendimiento actual, retorno esperado y navegación completa en desktop y mobile.',
    href: '/inversor/dashboard',
  },
] as const;

const highlights = [
  'Tasa anual visible antes de comprar',
  'Cheque cards con detalle alcanzable',
  'Stats para inversor: retorno actual, abierto y concentracion',
  'Narrativa de riesgo con IA sobre datos BCRA',
] as const;

export default async function HomePage() {
  const { profile } = await getCurrentAuthState();
  const dashboardHref = profile ? getDashboardPathForRole(profile.role) : '/signup';

  return (
    <div className="marketing-grid">
      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
        <div className="space-y-8">
          <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200">
            Riesgo crediticio con IA + BCRA
          </div>
          <div className="space-y-5">
            <h2 className="max-w-4xl text-5xl font-semibold leading-tight text-white md:text-6xl">
              Cheques tokenizados, tasa clara y flujos realmente navegables.
            </h2>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Karaí conecta analisis de riesgo asistido por OpenAI, tokenizacion automatica y una UX cheque-first para que el cedente publique rapido y el inversor compre con contexto real.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="rounded-full bg-emerald-300 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-200" href={dashboardHref}>
              {profile ? 'Ir a mi panel' : 'Probar el flujo'}
            </Link>
            <Link className="rounded-full border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/5" href="/signup">
              Crear cuenta demo
            </Link>
            <Link className="rounded-full border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/5" href="/login">
              Ingresar
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {highlights.map((item) => (
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 px-5 py-4 text-sm text-slate-200" key={item}>
                {item}
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Ticket maximo por token" value="ARS 100k" />
            <StatCard label="Lectura de riesgo" value="BCRA + IA" />
            <StatCard label="Rutas clave" value="100% alcanzables" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="marketing-panel rounded-[2rem] p-4">
            <TokenizationMotion />
          </div>
          <div className="marketing-panel rounded-[2rem] p-4">
            <RiskScanMotion />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {journey.map((item) => (
            <Link className="marketing-panel rounded-[1.75rem] p-6 transition hover:-translate-y-1 hover:border-emerald-300/30" href={item.href} key={item.step}>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Paso {item.step}</p>
              <h3 className="mt-4 text-2xl font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
