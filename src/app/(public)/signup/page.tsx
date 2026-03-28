import Link from 'next/link';
import { SignupForm } from '@/components/auth/signup-form';
import { RiskScanMotion } from '@/components/marketing/risk-scan-motion';

export default function SignupPage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
      <div className="space-y-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Onboarding cheque-first</p>
        <h2 className="text-5xl font-semibold text-white md:text-6xl">
          Elegi tu rol y entra a una demo donde el cheque ya vive con riesgo, tasa y tokenizacion.
        </h2>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          El alta sigue siendo instantanea, pero ahora la experiencia explica mejor que obtiene cada perfil: el cedente publica cheques con scoring IA y el inversor ve tasa, rendimiento y detalle alcanzable desde el primer click.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5 text-slate-200">
            Cedente: sube cheques, recibe score y tokenizacion automatica.
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5 text-slate-200">
            Inversor: ve tasa anual, retorno abierto y ficha del cheque antes de comprar.
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-300">
          <Link className="rounded-full border border-white/10 px-4 py-2 transition hover:bg-white/5" href="/">
            Ver landing
          </Link>
          <Link className="rounded-full border border-white/10 px-4 py-2 transition hover:bg-white/5" href="/login">
            Ya tengo cuenta
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <div className="marketing-panel rounded-[2rem] p-4">
          <RiskScanMotion />
        </div>
        <SignupForm />
      </div>
    </section>
  );
}
