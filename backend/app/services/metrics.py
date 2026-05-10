from dataclasses import dataclass

from app.schemas.metrics import MemoryMetrics, ReactionMetrics, TypingMetrics, VoiceMetrics


@dataclass
class KeyEvent:
    key: str
    downAt: float
    upAt: float


@dataclass
class ReactionTrial:
    reactionTimeMs: float
    hit: bool
    anticipated: bool


@dataclass
class MemoryInput:
    expectedWords: list[str]
    recalledWords: list[str]
    recallLatencyMs: float
    patternCorrect: int
    patternTotal: int
    sequenceCorrect: int
    sequenceTotal: int


def _round(value: float) -> int:
    return round(value)


def _variance(values: list[float]) -> float:
    if not values:
        return 0
    mean = sum(values) / len(values)
    return sum((v - mean) ** 2 for v in values) / len(values)


def derive_typing_metrics(
    *,
    expected_text: str,
    typed_text: str,
    duration_seconds: float,
    key_events: list[KeyEvent],
) -> TypingMetrics:
    typed_words = len(typed_text.strip().split()) if typed_text.strip() else 0
    interval_values = [
        event.downAt - key_events[idx].downAt
        for idx, event in enumerate(key_events[1:])
        if event.downAt - key_events[idx].downAt >= 0
    ]
    hold_values = [event.upAt - event.downAt for event in key_events if event.upAt - event.downAt >= 0]
    backspaces = len([event for event in key_events if event.key == "Backspace"])
    mismatches = sum(1 for idx, char in enumerate(typed_text) if idx >= len(expected_text) or char != expected_text[idx])
    denominator = max(1, len(typed_text), len(expected_text))

    return TypingMetrics(
        wpm=_round((typed_words / max(1, duration_seconds)) * 60),
        keystroke_interval_variance_ms=_round(_variance(interval_values)),
        error_rate_percent=_round((mismatches / denominator) * 100),
        backspace_frequency_per_100chars=_round((backspaces / max(1, len(typed_text))) * 100),
        key_hold_duration_mean_ms=_round(sum(hold_values) / max(1, len(hold_values))),
    )


def derive_reaction_metrics(trials: list[ReactionTrial]) -> ReactionMetrics:
    hits = [t for t in trials if t.hit and not t.anticipated and t.reactionTimeMs > 0]
    values = [trial.reactionTimeMs for trial in hits]
    misses = len([trial for trial in trials if not trial.hit])
    return ReactionMetrics(
        mean_reaction_time_ms=_round(sum(values) / max(1, len(values))),
        reaction_time_variance_ms=_round(_variance(values)),
        miss_rate_percent=_round((misses / max(1, len(trials))) * 100),
        anticipation_errors=len([trial for trial in trials if trial.anticipated]),
    )


def derive_memory_metrics(input_data: MemoryInput) -> MemoryMetrics:
    expected = {word.lower() for word in input_data.expectedWords}
    recalled = [word.lower() for word in input_data.recalledWords]
    correct = len([word for word in recalled if word in expected])
    false_positives = len([word for word in recalled if word not in expected])

    return MemoryMetrics(
        recall_accuracy_percent=_round((correct / max(1, len(input_data.expectedWords))) * 100),
        recall_latency_ms=_round(input_data.recallLatencyMs),
        pattern_recognition_score=_round((input_data.patternCorrect / max(1, input_data.patternTotal)) * 100),
        sequence_memory_score=_round((input_data.sequenceCorrect / max(1, input_data.sequenceTotal)) * 100),
        false_positive_rate_percent=_round((false_positives / max(1, len(input_data.expectedWords))) * 100),
    )


def merge_voice_metrics(base: VoiceMetrics | None, patch: dict) -> VoiceMetrics | None:
    if not base and not patch:
        return None

    return VoiceMetrics(
        speech_rate_wpm=patch.get("speech_rate_wpm", base.speech_rate_wpm if base else 0),
        pause_frequency_per_minute=patch.get(
            "pause_frequency_per_minute", base.pause_frequency_per_minute if base else 0
        ),
        mean_pause_duration_ms=patch.get("mean_pause_duration_ms", base.mean_pause_duration_ms if base else 0),
        pitch_variation_coefficient=patch.get(
            "pitch_variation_coefficient", base.pitch_variation_coefficient if base else 0
        ),
        articulation_score=patch.get("articulation_score", base.articulation_score if base else 0),
    )
