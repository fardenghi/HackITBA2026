import Link from 'next/link';

export default function LoginPage() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-6xl items-center px-6 py-16">
      <div className="max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-emerald-950/20">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Acceso</p>
        <h2 className="mt-4 text-4xl font-semibold text-white">Login placeholder</h2>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          Stable login route created for Phase 1. The real auth flow is wired in the next plans.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link className="rounded-full bg-emerald-400 px-5 py-3 font-medium text-slate-950" href="/signup">
            Go to signup
          </Link>
          <Link className="rounded-full border border-white/15 px-5 py-3 font-medium text-white" href="/api/health">
            Check health route
          </Link>
        </div>
      </div>
    </section>
  );
}
