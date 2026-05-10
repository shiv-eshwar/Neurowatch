import type { MemoryMetrics, ReactionMetrics, TypingMetrics, VoiceMetrics } from "./types";

type KeyEvent = {
  key: string;
  downAt: number;
  upAt: number;
};

type ReactionTrial = {
  reactionTimeMs: number;
  hit: boolean;
  anticipated: boolean;
};

type MemoryInput = {
  expectedWords: string[];
  recalledWords: string[];
  recallLatencyMs: number;
  patternCorrect: number;
  patternTotal: number;
  sequenceCorrect: number;
  sequenceTotal: number;
};

function round(value: number) {
  return Math.round(value);
}

function variance(values: number[]) {
  if (!values.length) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}

export function deriveTypingMetrics(input: {
  expectedText: string;
  typedText: string;
  durationSeconds: number;
  keyEvents: KeyEvent[];
}): TypingMetrics {
  const typedWords = input.typedText.trim() ? input.typedText.trim().split(/\s+/).length : 0;
  const intervalValues = input.keyEvents
    .slice(1)
    .map((event, index) => event.downAt - input.keyEvents[index].downAt)
    .filter((value) => value >= 0);
  const holdValues = input.keyEvents
    .map((event) => event.upAt - event.downAt)
    .filter((value) => value >= 0);
  const backspaces = input.keyEvents.filter((event) => event.key === "Backspace").length;
  const mismatches = input.typedText
    .split("")
    .reduce((count, char, index) => count + (char === input.expectedText[index] ? 0 : 1), 0);
  const denominator = Math.max(1, input.typedText.length, input.expectedText.length);

  return {
    wpm: round((typedWords / Math.max(1, input.durationSeconds)) * 60),
    keystroke_interval_variance_ms: round(variance(intervalValues)),
    error_rate_percent: round((mismatches / denominator) * 100),
    backspace_frequency_per_100chars: round((backspaces / Math.max(1, input.typedText.length)) * 100),
    key_hold_duration_mean_ms: round(
      holdValues.reduce((sum, value) => sum + value, 0) / Math.max(1, holdValues.length)
    )
  };
}

export function deriveReactionMetrics(trials: ReactionTrial[]): ReactionMetrics {
  const hits = trials.filter((trial) => trial.hit && !trial.anticipated && trial.reactionTimeMs > 0);
  const values = hits.map((trial) => trial.reactionTimeMs);
  const misses = trials.filter((trial) => !trial.hit).length;

  return {
    mean_reaction_time_ms: round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)),
    reaction_time_variance_ms: round(variance(values)),
    miss_rate_percent: round((misses / Math.max(1, trials.length)) * 100),
    anticipation_errors: trials.filter((trial) => trial.anticipated).length
  };
}

export function deriveMemoryMetrics(input: MemoryInput): MemoryMetrics {
  const expected = new Set(input.expectedWords.map((word) => word.toLowerCase()));
  const recalled = input.recalledWords.map((word) => word.toLowerCase());
  const correct = recalled.filter((word) => expected.has(word)).length;
  const falsePositives = recalled.filter((word) => !expected.has(word)).length;

  return {
    recall_accuracy_percent: round((correct / Math.max(1, input.expectedWords.length)) * 100),
    recall_latency_ms: round(input.recallLatencyMs),
    pattern_recognition_score: round((input.patternCorrect / Math.max(1, input.patternTotal)) * 100),
    sequence_memory_score: round((input.sequenceCorrect / Math.max(1, input.sequenceTotal)) * 100),
    false_positive_rate_percent: round((falsePositives / Math.max(1, input.expectedWords.length)) * 100)
  };
}

export function mergeVoiceMetrics(base: VoiceMetrics | null, patch: Partial<VoiceMetrics>): VoiceMetrics | null {
  if (!base && !Object.keys(patch).length) {
    return null;
  }

  return {
    speech_rate_wpm: patch.speech_rate_wpm ?? base?.speech_rate_wpm ?? 0,
    pause_frequency_per_minute:
      patch.pause_frequency_per_minute ?? base?.pause_frequency_per_minute ?? 0,
    mean_pause_duration_ms: patch.mean_pause_duration_ms ?? base?.mean_pause_duration_ms ?? 0,
    pitch_variation_coefficient:
      patch.pitch_variation_coefficient ?? base?.pitch_variation_coefficient ?? 0,
    articulation_score: patch.articulation_score ?? base?.articulation_score ?? 0
  };
}
