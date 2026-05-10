import { AuthCard } from "../components/AuthCard";

export function SignupPage() {
  return (
    <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
      <AuthCard mode="signup" />
      <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-sky-100 p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-600">Create account</p>
        <h2 className="mt-4 text-4xl font-semibold text-slate-900">Start your behavioral baseline gently</h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          NeuroWatch keeps each session connected so progress trends stay meaningful and easy to review.
        </p>
      </section>
    </div>
  );
}
