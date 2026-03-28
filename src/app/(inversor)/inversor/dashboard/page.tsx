export default function InversorDashboardPage() {
  return (
    <section className="mx-auto min-h-[calc(100vh-81px)] max-w-6xl px-6 py-16">
      <div className="rounded-3xl border border-sky-300/20 bg-sky-400/10 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Inversor dashboard</p>
        <h2 className="mt-4 text-3xl font-semibold text-white">Role shell ready</h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
          This route exists so login, signup, and RBAC guards can target the investor experience in
          later plans.
        </p>
      </div>
    </section>
  );
}
