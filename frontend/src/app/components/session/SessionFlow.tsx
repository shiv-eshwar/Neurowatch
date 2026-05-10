import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSession } from "../../lib/api";
import type { SessionMetrics } from "../../lib/types";
import { InterTestRest } from "./InterTestRest";
import { MemoryTest } from "./MemoryTest";
import { PreSessionCalm } from "./PreSessionCalm";
import { ReactionTest } from "./ReactionTest";
import { TypingTest } from "./TypingTest";
import { VoiceTest } from "./VoiceTest";

type CollectorStep = "pre" | "typing" | "rest-1" | "reaction" | "rest-2" | "memory" | "rest-3" | "voice";

export function SessionFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<CollectorStep>("pre");
  const [typing, setTyping] = useState<SessionMetrics["typing"]>(null);
  const [reaction, setReaction] = useState<SessionMetrics["reaction"]>(null);
  const [memory, setMemory] = useState<SessionMetrics["memory"]>(null);
  const [voice, setVoice] = useState<SessionMetrics["voice"]>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(
    () => ({
      typing,
      reaction,
      memory,
      voice
    }),
    [typing, reaction, memory, voice]
  );

  async function submit(audioBlob: Blob | null) {
    try {
      setSubmitting(true);
      setError(null);
      const payload = await createSession({
        metrics,
        sessionId: crypto.randomUUID(),
        audioBlob
      });
      navigate(`/session/${payload.id}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to submit session.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {step === "pre" && <PreSessionCalm onContinue={() => setStep("typing")} />}
      {step === "typing" && (
        <TypingTest
          onComplete={(result) => {
            setTyping(result);
            setStep("rest-1");
          }}
        />
      )}
      {step === "rest-1" && <InterTestRest onContinue={() => setStep("reaction")} />}
      {step === "reaction" && (
        <ReactionTest
          onComplete={(result) => {
            setReaction(result);
            setStep("rest-2");
          }}
        />
      )}
      {step === "rest-2" && <InterTestRest onContinue={() => setStep("memory")} />}
      {step === "memory" && (
        <MemoryTest
          onComplete={(result) => {
            setMemory(result);
            setStep("rest-3");
          }}
        />
      )}
      {step === "rest-3" && <InterTestRest onContinue={() => setStep("voice")} />}
      {step === "voice" && (
        <VoiceTest
          onComplete={async ({ audioBlob }) => {
            await submit(audioBlob);
          }}
        />
      )}

      {submitting && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Submitting</p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-900">Generating your structured analysis</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            NeuroWatch is validating your session and building a calm, readable report.
          </p>
        </section>
      )}

      {error && (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          {error}
        </section>
      )}
    </div>
  );
}
