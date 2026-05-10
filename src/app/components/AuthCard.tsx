import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

type AuthCardProps = {
  mode: "login" | "signup";
};

export function AuthCard({ mode }: AuthCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignup = mode === "signup";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isSignup) {
        await signUp({
          display_name: displayName,
          email,
          password
        });
      } else {
        await signIn({
          email,
          password
        });
      }

      const fallback = "/dashboard";
      const state = location.state as { from?: string } | null;
      navigate(state?.from ?? fallback, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {isSignup ? "Create your account" : "Sign in"}
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-900">
        {isSignup ? "Build a calm baseline" : "Welcome back"}
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        {isSignup
          ? "Your account stores longitudinal sessions securely so you can track changes over time."
          : "Sign in to continue your session history and dashboard trends."}
      </p>

      <div className="mt-6 grid gap-4">
        {isSignup && (
          <label className="grid gap-2 text-sm text-slate-700">
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
              placeholder="Ananya Rao"
              autoComplete="name"
            />
          </label>
        )}

        <label className="grid gap-2 text-sm text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
            placeholder="hello@neurowatch.ai"
            autoComplete="email"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
            placeholder="At least 8 characters"
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </label>
      </div>

      {error && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm text-white disabled:opacity-60"
        >
          {submitting ? "Working..." : isSignup ? "Create account" : "Sign in"}
        </button>
        <Link
          to={isSignup ? "/login" : "/signup"}
          className="rounded-full border border-slate-300 px-5 py-2 text-sm text-slate-700"
        >
          {isSignup ? "Already have an account?" : "Need an account?"}
        </Link>
      </div>
    </form>
  );
}
