import { SessionFlow } from "../components/session/SessionFlow";

export function SessionPage() {
  return (
    <div className="space-y-5">
      <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_1fr]">
        <article>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Guided session</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">
            Move through four calm behavioral tasks in one flow
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Each stage captures one signal family. Missing inputs are kept explicit, never guessed.
          </p>
        </article>
        <article className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-700">Session structure</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li className="rounded-xl bg-white p-3">1. Typing rhythm</li>
            <li className="rounded-xl bg-white p-3">2. Reaction timing</li>
            <li className="rounded-xl bg-white p-3">3. Memory recall</li>
            <li className="rounded-xl bg-white p-3">4. Voice pacing</li>
          </ul>
        </article>
      </section>

      <SessionFlow />
    </div>
  );
}
