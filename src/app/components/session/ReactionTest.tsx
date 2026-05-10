import { useEffect, useRef, useState } from "react";
import { deriveReactionMetrics } from "../../lib/metrics";
import type { ReactionMetrics } from "../../lib/types";
import { SessionShell } from "./SessionShell";

type ReactionTestProps = {
  onComplete: (metrics: ReactionMetrics) => void;
};

type TrialResult = {
  reactionTimeMs: number;
  hit: boolean;
  anticipated: boolean;
};

const TOTAL_TRIALS = 12;

export function ReactionTest({ onComplete }: ReactionTestProps) {
  const [started, setStarted] = useState(false);
  const [active, setActive] = useState(false);
  const [trialIndex, setTrialIndex] = useState(0);
  const [results, setResults] = useState<TrialResult[]>([]);
  const stimulusAt = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!started || trialIndex >= TOTAL_TRIALS) {
      return;
    }

    scheduleStimulus();
    return clearTimer;
  }, [started, trialIndex]);

  function clearTimer() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  }

  function scheduleStimulus() {
    clearTimer();
    setActive(false);
    stimulusAt.current = null;
    timeoutRef.current = window.setTimeout(() => {
      stimulusAt.current = performance.now();
      setActive(true);
      timeoutRef.current = window.setTimeout(() => {
        setResults((previous) => [...previous, { reactionTimeMs: 0, hit: false, anticipated: false }]);
        setTrialIndex((value) => value + 1);
      }, 1200);
    }, 1000 + Math.random() * 2000);
  }

  function finish(nextResults = results) {
    onComplete(deriveReactionMetrics(nextResults));
  }

  function handleTap() {
    if (!started) {
      setStarted(true);
      return;
    }

    clearTimer();

    if (!active || !stimulusAt.current) {
      const nextResults = [...results, { reactionTimeMs: 0, hit: true, anticipated: true }];
      setResults(nextResults);
      const nextIndex = trialIndex + 1;
      setTrialIndex(nextIndex);
      if (nextIndex >= TOTAL_TRIALS) {
        finish(nextResults);
      }
      return;
    }

    const reactionTimeMs = performance.now() - stimulusAt.current;
    const nextResults = [...results, { reactionTimeMs, hit: true, anticipated: false }];
    setResults(nextResults);
    const nextIndex = trialIndex + 1;
    setTrialIndex(nextIndex);

    if (nextIndex >= TOTAL_TRIALS) {
      finish(nextResults);
    }
  }

  return (
    <SessionShell
      stepLabel="Step 2 of 4"
      title="Reaction speed and attention consistency"
      description="Tap only when the orb brightens. Randomized delays let us measure response speed, misses, variance, and anticipation."
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Trials completed</p>
          <p className="mt-3 text-5xl font-semibold text-amber-900">
            {Math.min(trialIndex, TOTAL_TRIALS)} / {TOTAL_TRIALS}
          </p>
          <p className="mt-4 text-sm leading-7 text-amber-900/75">
            Pressing too early counts as an anticipation error. Missing the glow counts as a miss.
          </p>
        </article>
        <button
          type="button"
          onClick={handleTap}
          className="rounded-3xl border border-slate-200 bg-white p-10 text-center"
        >
          <span
            className="mb-8 inline-block h-28 w-28 rounded-full transition-all duration-300"
            style={{
              background: active
                ? "radial-gradient(circle, #fff 0%, #7dd3fc 45%, transparent 75%)"
                : "rgba(15, 23, 42, 0.08)",
              boxShadow: active ? "0 0 90px rgba(125, 211, 252, 0.6)" : "none"
            }}
          />
          <p className="text-3xl font-semibold text-slate-900">
            {!started ? "Tap to begin" : active ? "Tap now" : "Wait for the glow"}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            {started ? "Respond only to the bright state." : "A random delay starts each trial."}
          </p>
        </button>
      </div>
    </SessionShell>
  );
}
