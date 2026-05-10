import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-3 text-sm text-slate-600">The page you requested does not exist.</p>
      <Link to="/" className="mt-5 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm text-white">
        Go home
      </Link>
    </div>
  );
}
