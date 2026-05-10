import type { ReactNode } from "react";

type SessionShellProps = {
  stepLabel: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function SessionShell({ stepLabel, title, description, children }: SessionShellProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{stepLabel}</p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
      <p className="mt-2 text-xs text-slate-500">You can pause anytime. Your comfort comes first.</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
