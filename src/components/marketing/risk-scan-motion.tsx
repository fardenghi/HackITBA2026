const metrics = [
  ['duración', '90 días'],
  ['colateral', '68%'],
  ['historial', 'estable'],
  ['liquidez', 'media'],
] as const;

export function RiskScanMotion() {
  return (
    <div className="risk-stage aspect-[16/10] p-6">
      <div className="risk-frame" />
      <div className="risk-corner tl" />
      <div className="risk-corner tr" />
      <div className="risk-corner bl" />
      <div className="risk-corner br" />
      <div className="risk-scan" />
      <div className="risk-metrics">
        {metrics.map(([label, value]) => (
          <div className="risk-metric" key={label}>
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
      <div className="risk-score-box">BBB</div>
      <p className="risk-label">análisis de riesgo con ia + bcra</p>
    </div>
  );
}
