import { Link, NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth-context";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6">
      <header className="mb-6 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              NW
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-slate-500">NeuroWatch</p>
              <p className="text-sm text-slate-700">Behavioral awareness in a calm experience</p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-full px-4 py-2 ${isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`
              }
            >
              Home
            </NavLink>
            {user ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 ${isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/session"
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 ${isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`
                  }
                >
                  Start Session
                </NavLink>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    navigate("/login");
                  }}
                  className="rounded-full border border-slate-300 px-4 py-2 text-slate-700"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 ${isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`
                  }
                >
                  Login
                </NavLink>
                <NavLink
                  to="/signup"
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 ${isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`
                  }
                >
                  Create account
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
