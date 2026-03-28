export function TokenizationMotion() {
  return (
    <div className="token-stage aspect-[16/10] p-6">
      <div className="cheque-outline" />
      <div className="token-scan" />
      <div className="token-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div aria-hidden="true" className="mini-cheque" key={index} />
        ))}
      </div>
      <p className="token-label">tokenizando cheque</p>
      <p className="token-counter">precio maximo por token: ars 100.000</p>
    </div>
  );
}
