import { useRef, useState } from "react";
import { readingPassage } from "../../data/session-content";
import { SessionShell } from "./SessionShell";

type VoiceTestProps = {
  onComplete: (result: { audioBlob: Blob | null }) => void;
};

export function VoiceTest({ onComplete }: VoiceTestProps) {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("Allow microphone access, then read the passage aloud at a natural pace.");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const audioBlob = chunksRef.current.length ? new Blob(chunksRef.current, { type: "audio/webm" }) : null;
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setStatus(audioBlob ? "Voice sample captured. Continue to generate analysis." : "No audio was captured.");
        onComplete({ audioBlob });
      });

      recorder.start(500);
      setRecording(true);
      setStatus("Recording in progress. Read the full passage and stop when ready.");
    } catch {
      setStatus("Microphone access was not granted. You can continue without voice data.");
      onComplete({ audioBlob: null });
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  return (
    <SessionShell
      stepLabel="Step 4 of 4"
      title="Voice pace, pauses, and articulation"
      description="Read the passage in your natural voice. You can skip this step and continue with other domains."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Reading passage</p>
          <p className="mt-4 text-lg leading-8 text-slate-900">{readingPassage}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recorder</p>
          <p className="mt-4 text-sm leading-7 text-slate-600">{status}</p>
          <div className="mt-8 flex gap-3">
            {!recording ? (
              <button
                type="button"
                onClick={startRecording}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm text-white transition hover:bg-slate-800"
              >
                Start recording
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm text-white transition hover:bg-slate-800"
              >
                Stop and continue
              </button>
            )}
            <button
              type="button"
              onClick={() => onComplete({ audioBlob: null })}
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              Skip voice for now
            </button>
          </div>
        </article>
      </div>
    </SessionShell>
  );
}
