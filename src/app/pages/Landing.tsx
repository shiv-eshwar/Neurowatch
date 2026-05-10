import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Patient-first design</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
            A calm space for behavioral health check-ins
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            NeuroWatch translates typing rhythm, reaction timing, memory patterns, and voice cadence into a
            longitudinal dashboard built for comfort and clarity.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/signup" className="rounded-full bg-slate-900 px-5 py-2 text-sm text-white">
              Create account
            </Link>
            <Link to="/login" className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm text-slate-700">
              Login
            </Link>
            <Link to="/dashboard" className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm text-slate-700">
              View dashboard
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-100 via-cyan-100 to-emerald-100 p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-600">Session structure</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li className="rounded-xl bg-white/70 p-3">1. Typing cadence</li>
            <li className="rounded-xl bg-white/70 p-3">2. Reaction timing</li>
            <li className="rounded-xl bg-white/70 p-3">3. Memory recall</li>
            <li className="rounded-xl bg-white/70 p-3">4. Voice pacing</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
