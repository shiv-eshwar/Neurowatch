import { useEffect, useRef, useState } from "react";
import { typingPrompt } from "../../data/session-content";
import { deriveTypingMetrics } from "../../lib/metrics";
import type { TypingMetrics } from "../../lib/types";
import { SessionShell } from "./SessionShell";

type TypingTestProps = {
  onComplete: (metrics: TypingMetrics) => void;
};

type KeyEvent = {
  key: string;
  downAt: number;
  upAt: number;
};

const TOTAL_SECONDS = 60;

export function TypingTest({ onComplete }: TypingTestProps) {
  const [typedText, setTypedText] = useState("");
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const keyDowns = useRef<Map<string, number>>(new Map());
  const keyEvents = useRef<KeyEvent[]>([]);

  useEffect(() => {
    if (!startedAt || completed) {
      return;
    }

    const interval = window.setInterval(() => {
      const elapsed = Math.floor((performance.now() - startedAt) / 1000);
      const nextRemaining = Math.max(0, TOTAL_SECONDS - elapsed);
      setRemaining(nextRemaining);

      if (nextRemaining === 0) {
        window.clearInterval(interval);
        finish();
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [completed, startedAt]);

  function finish() {
    if (completed) {
      return;
    }
    const durationSeconds = startedAt
      ? Math.max(1, Math.round((performance.now() - startedAt) / 1000))
      : TOTAL_SECONDS;
    setCompleted(true);
    onComplete(
      deriveTypingMetrics({
        expectedText: typingPrompt,
        typedText,
        durationSeconds,
        keyEvents: keyEvents.current
      })
    );
  }

  return (
    <SessionShell
      stepLabel="Step 1 of 4"
      title="Typing rhythm and consistency"
      description="Copy the passage below at a comfortable pace. We capture speed, timing variance, error pressure, backspace frequency, and key-hold duration."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Prompt</p>
          <p className="mt-4 text-lg leading-8 text-slate-900">{typingPrompt}</p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Time remaining</p>
            <span className="font-mono text-lg text-slate-900">{remaining}s</span>
          </div>
          <textarea
            className="min-h-56 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition focus:border-slate-400"
            placeholder="Begin typing the passage here..."
            value={typedText}
            disabled={completed}
            onFocus={() => {
              if (!startedAt) {
                setStartedAt(performance.now());
              }
            }}
            onChange={(event) => setTypedText(event.target.value)}
            onKeyDown={(event) => {
              if (!startedAt) {
                setStartedAt(performance.now());
              }
              keyDowns.current.set(event.key, performance.now());
            }}
            onKeyUp={(event) => {
              const downAt = keyDowns.current.get(event.key);
              if (downAt !== undefined) {
                keyEvents.current.push({
                  key: event.key,
                  downAt,
                  upAt: performance.now()
                });
                keyDowns.current.delete(event.key);
              }
            }}
          />
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>{typedText.length} characters captured</span>
            <button
              type="button"
              onClick={finish}
              disabled={completed || !typedText.trim()}
              className="rounded-full bg-slate-900 px-5 py-2 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue
            </button>
          </div>
        </article>
      </div>
    </SessionShell>
  );
}
