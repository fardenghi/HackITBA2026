export default function CedenteDashboardPage() {
  return (
    <section className="mx-auto min-h-[calc(100vh-81px)] max-w-6xl px-6 py-16">
      <div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Cedente dashboard</p>
        <h2 className="mt-4 text-3xl font-semibold text-white">Role shell ready</h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
          This route exists so signup and RBAC work can land users on the correct protected area in
          later plans.
        </p>
      </div>
    </section>
  );
}
