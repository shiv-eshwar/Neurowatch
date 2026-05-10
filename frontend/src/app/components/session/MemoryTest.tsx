import { useMemo, useState } from "react";
import { memoryWordBank, sequencePattern } from "../../data/session-content";
import { deriveMemoryMetrics } from "../../lib/metrics";
import type { MemoryMetrics } from "../../lib/types";
import { SessionShell } from "./SessionShell";

type MemoryTestProps = {
  onComplete: (metrics: MemoryMetrics) => void;
};

type RecognitionQuestion = {
  id: string;
  prompt: string;
  answer: string;
  options: string[];
};

export function MemoryTest({ onComplete }: MemoryTestProps) {
  const [stage, setStage] = useState<
    "study" | "recall" | "patterns" | "sequence-study" | "sequence-recall"
  >("study");
  const [recallText, setRecallText] = useState("");
  const [recallStartedAt, setRecallStartedAt] = useState<number | null>(null);
  const [recognitionAnswers, setRecognitionAnswers] = useState<Record<string, string>>({});
  const [sequenceAnswer, setSequenceAnswer] = useState("");
  const expectedWords = useMemo(() => memoryWordBank.slice(0, 4), []);
  const recognitionQuestions = useMemo<RecognitionQuestion[]>(
    () => [
      {
        id: "r1",
        prompt: "Which word was shown in the memory list?",
        answer: expectedWords[1],
        options: [expectedWords[1], "harbor", "velvet", "meadow"]
      },
      {
        id: "r2",
        prompt: "Which word was NOT shown in the memory list?",
        answer: "thunder",
        options: [expectedWords[0], expectedWords[2], expectedWords[3], "thunder"]
      },
      {
        id: "r3",
        prompt: "Which word appeared first?",
        answer: expectedWords[0],
        options: [expectedWords[0], expectedWords[1], expectedWords[2], expectedWords[3]]
      },
      {
        id: "r4",
        prompt: "Which word appeared third?",
        answer: expectedWords[2],
        options: [expectedWords[0], expectedWords[1], expectedWords[2], expectedWords[3]]
      }
    ],
    [expectedWords]
  );

  function finish() {
    const recalledWords = recallText
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean);
    const patternCorrect = recognitionQuestions.filter(
      (question) => recognitionAnswers[question.id] === question.answer
    ).length;
    const sequenceCorrect = sequenceAnswer
      .split("")
      .filter((digit, index) => digit === sequencePattern[index]).length;

    onComplete(
      deriveMemoryMetrics({
        expectedWords,
        recalledWords,
        recallLatencyMs: recallStartedAt ? performance.now() - recallStartedAt : 1500,
        patternCorrect,
        patternTotal: recognitionQuestions.length,
        sequenceCorrect,
        sequenceTotal: sequencePattern.length
      })
    );
  }

  return (
    <SessionShell
      stepLabel="Step 3 of 4"
      title="Recall, recognition, and sequence memory"
      description="This combines immediate recall, pattern recognition, and short sequence memory for a balanced cognitive snapshot."
    >
      {stage === "study" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-indigo-700">Memorize these words</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {expectedWords.map((word) => (
                <span key={word} className="rounded-full border border-indigo-200 bg-white px-4 py-2 text-lg font-medium">
                  {word}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm leading-7 text-slate-600">
              Take a moment to read these words, then continue into recall. Pattern and sequence
              questions follow immediately.
            </p>
            <button
              type="button"
              onClick={() => {
                setRecallStartedAt(performance.now());
                setStage("recall");
              }}
              className="mt-8 rounded-full bg-slate-900 px-5 py-2 text-sm text-white transition hover:bg-slate-800"
            >
              I am ready
            </button>
          </div>
        </div>
      )}

      {stage === "recall" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recall</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Type the words you remember, separated by commas. If unsure, leave it blank.
          </p>
          <textarea
            className="mt-5 min-h-40 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 outline-none"
            value={recallText}
            onChange={(event) => setRecallText(event.target.value)}
            placeholder="river, amber, ..."
          />
          <button
            type="button"
            onClick={() => setStage("patterns")}
            className="mt-5 rounded-full bg-slate-900 px-5 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            Continue to recognition checks
          </button>
        </div>
      )}

      {stage === "patterns" && (
        <div className="grid gap-4">
          {recognitionQuestions.map((question) => (
            <article key={question.id} className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xl font-medium text-slate-900">{question.prompt}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {question.options.map((option) => {
                  const selected = recognitionAnswers[question.id] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setRecognitionAnswers((previous) => ({
                          ...previous,
                          [question.id]: option
                        }))
                      }
                      className="rounded-full border px-4 py-2 text-sm transition"
                      style={{
                        borderColor: selected ? "#7dd3fc" : "rgba(15, 23, 42, 0.14)",
                        backgroundColor: selected ? "rgba(125, 211, 252, 0.18)" : "transparent"
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
          <button
            type="button"
            onClick={() => setStage("sequence-study")}
            className="w-fit rounded-full bg-slate-900 px-5 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            Continue to sequence recall
          </button>
        </div>
      )}

      {stage === "sequence-study" && (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Memorize the sequence</p>
            <p className="mt-4 font-mono text-5xl tracking-[0.4em] text-slate-900">{sequencePattern.join(" ")}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm leading-7 text-slate-600">
              Read this sequence once or twice, then hide it before answering from memory.
            </p>
            <button
              type="button"
              onClick={() => setStage("sequence-recall")}
              className="mt-5 rounded-full bg-slate-900 px-5 py-2 text-sm text-white transition hover:bg-slate-800"
            >
              Hide sequence and answer
            </button>
          </article>
        </div>
      )}

      {stage === "sequence-recall" && (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recall the sequence</p>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Enter the digits you remember in the same order.
            </p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recall from memory</p>
            <input
              className="mt-4 w-full rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-lg tracking-[0.3em] outline-none"
              value={sequenceAnswer}
              onChange={(event) => setSequenceAnswer(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="------"
            />
            <button
              type="button"
              onClick={finish}
              className="mt-5 rounded-full bg-slate-900 px-5 py-2 text-sm text-white transition hover:bg-slate-800"
            >
              Continue to voice sample
            </button>
          </article>
        </div>
      )}
    </SessionShell>
  );
}
