type PreSessionCalmProps = {
  onContinue: () => void;
};

export function PreSessionCalm({ onContinue }: PreSessionCalmProps) {
  return (
    <section className="grid gap-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-sky-50 p-6 md:grid-cols-[1fr_1fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Before we begin</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-900">Settle in with one breathing cycle</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Inhale for 4 seconds, hold for 7 seconds, and exhale slowly for 8 seconds. This helps
          make your session calmer and more consistent.
        </p>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          NeuroWatch is an awareness tool. It is not a diagnosis.
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          I feel ready
        </button>
      </div>

      <div className="flex items-center justify-center">
        <div className="relative grid h-56 w-56 place-items-center rounded-full bg-sky-100/70">
          <div className="breathing-ring absolute h-40 w-40 rounded-full bg-sky-300/40" />
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">4-7-8</p>
            <p className="mt-2 text-lg font-semibold text-slate-700">Slow and steady</p>
          </div>
        </div>
      </div>
    </section>
  );
}
