type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">HackITBA 2026</p>
            <h1 className="text-xl font-semibold text-white">Karaí</h1>
          </div>
          <p className="text-sm text-slate-300">Foundation &amp; Auth scaffold</p>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
