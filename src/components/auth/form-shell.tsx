type FormShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function FormShell({ eyebrow, title, description, children, footer }: FormShellProps) {
  return (
    <div className="marketing-panel rounded-[2rem] p-8 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">{eyebrow}</p>
      <h2 className="mt-4 text-4xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-base leading-7 text-slate-300">{description}</p>
      <div className="mt-8">{children}</div>
      {footer ? <div className="mt-6 text-sm text-slate-400">{footer}</div> : null}
    </div>
  );
}
