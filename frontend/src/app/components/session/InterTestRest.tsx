import { useEffect, useState } from "react";

type InterTestRestProps = {
  onContinue: () => void;
  defaultSeconds?: number;
};

export function InterTestRest({ onContinue, defaultSeconds = 20 }: InterTestRestProps) {
  const [seconds, setSeconds] = useState(defaultSeconds);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          onContinue();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [onContinue]);

  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Short rest</p>
      <h3 className="mt-2 text-2xl font-semibold text-emerald-900">Take a gentle pause</h3>
      <p className="mt-3 text-sm text-emerald-800">
        Next section starts in {seconds}s. You can continue sooner when you feel comfortable.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="mt-5 rounded-full border border-emerald-300 bg-white px-5 py-2 text-sm text-emerald-900 transition hover:bg-emerald-100"
      >
        Continue now
      </button>
    </section>
  );
}
