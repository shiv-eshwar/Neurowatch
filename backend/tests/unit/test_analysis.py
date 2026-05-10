from app.schemas.metrics import MemoryMetrics, ReactionMetrics, SessionMetrics, TypingMetrics, VoiceMetrics
from app.services.analysis import AnalyzeSessionInput, create_local_analysis


def test_local_analysis_generates_valid_shape():
    payload = AnalyzeSessionInput(
        session_id="session-123",
        user_id="user-123",
        session_number=4,
        baseline_available=True,
        baseline_metrics=SessionMetrics(
            typing=TypingMetrics(
                wpm=65,
                keystroke_interval_variance_ms=100,
                error_rate_percent=2,
                backspace_frequency_per_100chars=4,
                key_hold_duration_mean_ms=80,
            ),
            reaction=ReactionMetrics(
                mean_reaction_time_ms=250,
                reaction_time_variance_ms=40,
                miss_rate_percent=2,
                anticipation_errors=0,
            ),
            memory=MemoryMetrics(
                recall_accuracy_percent=90,
                recall_latency_ms=1300,
                pattern_recognition_score=85,
                sequence_memory_score=83,
                false_positive_rate_percent=4,
            ),
            voice=VoiceMetrics(
                speech_rate_wpm=145,
                pause_frequency_per_minute=8,
                mean_pause_duration_ms=600,
                pitch_variation_coefficient=0.32,
                articulation_score=87,
            ),
        ),
        current_metrics=SessionMetrics(
            typing=TypingMetrics(
                wpm=50,
                keystroke_interval_variance_ms=150,
                error_rate_percent=4,
                backspace_frequency_per_100chars=8,
                key_hold_duration_mean_ms=92,
            ),
            reaction=ReactionMetrics(
                mean_reaction_time_ms=280,
                reaction_time_variance_ms=65,
                miss_rate_percent=5,
                anticipation_errors=1,
            ),
            memory=MemoryMetrics(
                recall_accuracy_percent=73,
                recall_latency_ms=1900,
                pattern_recognition_score=78,
                sequence_memory_score=71,
                false_positive_rate_percent=5,
            ),
            voice=VoiceMetrics(
                speech_rate_wpm=132,
                pause_frequency_per_minute=9,
                mean_pause_duration_ms=850,
                pitch_variation_coefficient=0.24,
                articulation_score=80,
            ),
        ),
        data_quality_notes=None,
        sessions_until_stable_baseline=0,
    )

    analysis = create_local_analysis(payload)
    assert 0 <= analysis.overall_risk_score <= 100
    assert analysis.domain_scores["typing"].score is not None
    assert analysis.disclaimer.startswith("NeuroWatch provides early behavioral awareness")
