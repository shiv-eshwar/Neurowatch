from app.schemas.metrics import MemoryMetrics, ReactionMetrics, SessionMetrics, TypingMetrics, VoiceMetrics
from app.services.baseline import build_baseline_from_metrics


def _session(wpm: int, reaction: int, recall: int, speech: int) -> SessionMetrics:
    return SessionMetrics(
        typing=TypingMetrics(
            wpm=wpm,
            keystroke_interval_variance_ms=35,
            error_rate_percent=3,
            backspace_frequency_per_100chars=4,
            key_hold_duration_mean_ms=92,
        ),
        reaction=ReactionMetrics(
            mean_reaction_time_ms=reaction,
            reaction_time_variance_ms=40,
            miss_rate_percent=1,
            anticipation_errors=0,
        ),
        memory=MemoryMetrics(
            recall_accuracy_percent=recall,
            recall_latency_ms=1200,
            pattern_recognition_score=86,
            sequence_memory_score=82,
            false_positive_rate_percent=3,
        ),
        voice=VoiceMetrics(
            speech_rate_wpm=speech,
            pause_frequency_per_minute=7,
            mean_pause_duration_ms=410,
            pitch_variation_coefficient=0.27,
            articulation_score=85,
        ),
    )


def test_baseline_is_averaged_after_seven_sessions():
    available, baseline, _ = build_baseline_from_metrics(
        [
            _session(50, 260, 84, 144),
            _session(51, 255, 82, 146),
            _session(52, 250, 83, 145),
            _session(53, 245, 81, 144),
            _session(54, 240, 80, 142),
            _session(55, 235, 79, 141),
            _session(56, 230, 78, 140),
        ]
    )
    assert available is True
    assert baseline is not None
    assert round(baseline.typing.wpm) == 53
    assert round(baseline.reaction.mean_reaction_time_ms) == 245


def test_baseline_requires_seven_sessions():
    available, baseline, until_stable = build_baseline_from_metrics(
        [_session(50, 260, 84, 144), _session(51, 255, 82, 146)]
    )
    assert available is False
    assert baseline is None
    assert until_stable == 5
