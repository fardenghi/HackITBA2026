type TokenizationSummaryProps = {
  tokenHash: string;
  netAmount: number;
  totalFractions: number;
};

export function TokenizationSummary({ tokenHash, netAmount, totalFractions }: TokenizationSummaryProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Tokenización</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Card label="Token hash" value={tokenHash.slice(0, 18)} />
        <Card label="Monto neto" value={`ARS ${netAmount.toLocaleString('es-AR')}`} />
        <Card label="Fracciones" value={String(totalFractions)} />
      </div>
      <p className="mt-4 text-sm text-slate-300">La factura ya quedó fraccionada y abierta en estado funding para el marketplace.</p>
    </section>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 break-all text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
