import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { TokenizationMotion } from '@/components/marketing/tokenization-motion';

export default function LoginPage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
      <div className="space-y-5">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Acceso a la plataforma</p>
        <h2 className="text-5xl font-semibold text-white md:text-6xl">
          Volve al flujo correcto y segui donde dejaste cada cheque.
        </h2>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          El cedente retoma originacion, tokenizacion y settlement. El inversor vuelve a su marketplace con tasas visibles, retornos actuales y detalle navegable por cheque.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5 text-slate-200">
            Compras con precio por token, rendimiento esperado y porcentaje ya fondeado.
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5 text-slate-200">
            Seguimiento del cheque desde scoring IA hasta settlement.
          </div>
        </div>
        <Link className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5" href="/">
          Volver al inicio
        </Link>
      </div>

      <div className="space-y-6">
        <div className="marketing-panel rounded-[2rem] p-4">
          <TokenizationMotion />
        </div>
        <LoginForm />
      </div>
    </section>
  );
}
