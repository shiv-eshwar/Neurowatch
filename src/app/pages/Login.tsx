import { AuthCard } from "../components/AuthCard";

export function LoginPage() {
  return (
    <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-100 to-cyan-100 p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-600">Login</p>
        <h2 className="mt-4 text-4xl font-semibold text-slate-900">A supportive clinical companion</h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          Enter your account to review trend lines and continue consistent, low-stress sessions.
        </p>
      </section>
      <AuthCard mode="login" />
    </div>
  );
}
