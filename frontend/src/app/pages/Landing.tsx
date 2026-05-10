import { Link } from "react-router-dom";
import { HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth-context";

export function LandingPage() {
  const { user, loading } = useAuth();
  const firstName = user?.display_name?.trim() ? user.display_name.trim().split(/\s+/)[0] : null;

  return (
    <div className="space-y-7">
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
          {user ? (
            <div className="mt-6">
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                Welcome back{firstName ? `, ${firstName}` : ""}. Your next calm check-in can start whenever you are ready.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/session" className="rounded-full bg-slate-900 px-5 py-2 text-sm text-white">
                  Continue with a session
                </Link>
                <Link
                  to="/dashboard"
                  className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm text-slate-700"
                >
                  Open your dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              {!loading ? (
                <>
                  <Link to="/signup" className="rounded-full bg-slate-900 px-5 py-2 text-sm text-white">
                    Create account
                  </Link>
                  <Link
                    to="/login"
                    className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm text-slate-700"
                  >
                    Login
                  </Link>
                </>
              ) : null}
              <Link
                to={user ? "/dashboard" : "/login"}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm text-slate-700"
              >
                View dashboard
              </Link>
            </div>
          )}
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

      <section className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-indigo-700">Why NeuroWatch</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Designed for trust, consistency, and calm follow-up</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            &quot;Small daily signals, observed with care, can reveal meaningful patterns over time.&quot;
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            NeuroWatch helps patients and clinicians work from the same structured view of behavioral trends, with
            supportive language and transparent reporting.
          </p>
        </article>

        <div className="grid gap-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <HeartPulse className="h-4 w-4 text-rose-500" />
              Gentle patient experience
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Slow pacing, supportive copy, and reduced visual stress during every test.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Professional reporting
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Structured clinical summaries and downloadable PDF reports for doctor consultations.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Sparkles className="h-4 w-4 text-sky-600" />
              Built for longitudinal care
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sessions are tracked over time so progress is visible, measurable, and easy to discuss.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
