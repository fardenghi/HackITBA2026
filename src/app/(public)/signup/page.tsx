import Link from 'next/link';

export default function SignupPage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Phase 1</p>
        <h2 className="text-4xl font-semibold text-white md:text-5xl">
          Stable signup route ready for immediate-login auth wiring.
        </h2>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          This placeholder gives the remaining Phase 1 plans a permanent URL for the role-select auth
          flow, desktop/mobile verification, and dashboard redirects.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-emerald-950/20">
        <h3 className="text-2xl font-semibold text-white">Next up</h3>
        <ul className="mt-6 space-y-3 text-slate-300">
          <li>• Email/password signup form</li>
          <li>• Cedente and inversor role selection</li>
          <li>• Immediate redirect to the correct dashboard</li>
        </ul>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link className="rounded-full bg-emerald-400 px-5 py-3 font-medium text-slate-950" href="/login">
            Visit login
          </Link>
          <Link
            className="rounded-full border border-white/15 px-5 py-3 font-medium text-white"
            href="/cedente/dashboard"
          >
            Cedente shell
          </Link>
        </div>
      </div>
    </section>
  );
}
