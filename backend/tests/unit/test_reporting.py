from app.models.session import Session as SessionModel
from app.schemas.metrics import MemoryMetrics, ReactionMetrics, SessionMetrics, TypingMetrics, VoiceMetrics
from app.services.analysis import AnalyzeSessionInput, create_local_analysis
from app.services.reporting import generate_doctor_report, generate_doctor_report_pdf


def _build_session(data_quality_notes: str) -> SessionModel:
    metrics = SessionMetrics(
        typing=TypingMetrics(
            wpm=54,
            keystroke_interval_variance_ms=122,
            error_rate_percent=2.4,
            backspace_frequency_per_100chars=4.2,
            key_hold_duration_mean_ms=91,
        ),
        reaction=ReactionMetrics(
            mean_reaction_time_ms=276,
            reaction_time_variance_ms=39,
            miss_rate_percent=1.7,
            anticipation_errors=0,
        ),
        memory=MemoryMetrics(
            recall_accuracy_percent=82,
            recall_latency_ms=1430,
            pattern_recognition_score=88,
            sequence_memory_score=84,
            false_positive_rate_percent=3,
        ),
        voice=VoiceMetrics(
            speech_rate_wpm=156,
            pause_frequency_per_minute=7,
            mean_pause_duration_ms=330,
            pitch_variation_coefficient=0,
            articulation_score=79,
        ),
    )
    analysis = create_local_analysis(
        AnalyzeSessionInput(
            session_id="session-1",
            user_id="user-1",
            session_number=1,
            baseline_available=False,
            baseline_metrics=None,
            current_metrics=metrics,
            data_quality_notes=data_quality_notes,
            sessions_until_stable_baseline=6,
        )
    )

    return SessionModel(
        id="session-1",
        user_id="user-1",
        number=1,
        raw_metrics=metrics.model_dump(mode="json"),
        analysis=analysis.model_dump(mode="json"),
    )


def test_generate_doctor_report_sanitizes_technical_quality_notes():
    noisy_note = (
        "OpenAI analysis failed and local fallback was used: 21 validation errors for Analysis "
        "For further information visit https://errors.pydantic.dev/2.11/v/missing"
    )
    session = _build_session(noisy_note)

    report = generate_doctor_report(session)
    quality_section = next(section for section in report.sections if section.title == "Alerting and Data Quality")
    combined_points = " ".join(quality_section.points).lower()

    assert "pydantic.dev" not in combined_points
    assert "validation errors for analysis" not in combined_points
    assert "deterministic scoring" in combined_points


def test_generate_doctor_report_pdf_returns_pdf_binary():
    session = _build_session("No data quality concerns noted.")
    report = generate_doctor_report(session)

    pdf_bytes = generate_doctor_report_pdf(report)

    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 500
