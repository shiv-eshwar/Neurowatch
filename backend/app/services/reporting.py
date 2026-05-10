from datetime import datetime, timezone

from app.models.session import Session as SessionModel
from app.schemas.analysis import Analysis
from app.schemas.metrics import SessionMetrics
from app.schemas.session import DoctorReport, DoctorReportSection


def _fmt(value: float | int | None, suffix: str = "") -> str:
    if value is None:
        return "Unavailable"
    return f"{value}{suffix}"


def _domain_metric_lines(metrics: SessionMetrics, domain: str) -> list[str]:
    if domain == "typing" and metrics.typing:
        return [
            f"Words per minute: {_fmt(round(metrics.typing.wpm), ' WPM')}",
            f"Keystroke interval variance: {_fmt(round(metrics.typing.keystroke_interval_variance_ms), ' ms')}",
            f"Error rate: {_fmt(round(metrics.typing.error_rate_percent), '%')}",
            f"Backspace frequency: {_fmt(round(metrics.typing.backspace_frequency_per_100chars), ' per 100 chars')}",
            f"Key hold duration mean: {_fmt(round(metrics.typing.key_hold_duration_mean_ms), ' ms')}",
        ]

    if domain == "reaction" and metrics.reaction:
        return [
            f"Mean reaction time: {_fmt(round(metrics.reaction.mean_reaction_time_ms), ' ms')}",
            f"Reaction time variance: {_fmt(round(metrics.reaction.reaction_time_variance_ms), ' ms')}",
            f"Miss rate: {_fmt(round(metrics.reaction.miss_rate_percent), '%')}",
            f"Anticipation errors: {_fmt(metrics.reaction.anticipation_errors)}",
        ]

    if domain == "memory" and metrics.memory:
        return [
            f"Recall accuracy: {_fmt(round(metrics.memory.recall_accuracy_percent), '%')}",
            f"Recall latency: {_fmt(round(metrics.memory.recall_latency_ms), ' ms')}",
            f"Pattern recognition score: {_fmt(round(metrics.memory.pattern_recognition_score), '/100')}",
            f"Sequence memory score: {_fmt(round(metrics.memory.sequence_memory_score), '/100')}",
            f"False positive rate: {_fmt(round(metrics.memory.false_positive_rate_percent), '%')}",
        ]

    if domain == "voice" and metrics.voice:
        return [
            f"Speech rate: {_fmt(round(metrics.voice.speech_rate_wpm), ' WPM')}",
            f"Pause frequency: {_fmt(round(metrics.voice.pause_frequency_per_minute), ' per minute')}",
            f"Mean pause duration: {_fmt(round(metrics.voice.mean_pause_duration_ms), ' ms')}",
            f"Pitch variation coefficient: {_fmt(metrics.voice.pitch_variation_coefficient)}",
            f"Articulation score: {_fmt(round(metrics.voice.articulation_score), '/100')}",
        ]

    return ["No reliable metrics were captured for this domain in this session."]


def _build_share_text(report: DoctorReport) -> str:
    lines: list[str] = [
        report.title,
        "",
        f"Generated at: {report.generated_at.isoformat()}",
        f"Session ID: {report.session_id}",
        f"User ID: {report.user_id}",
        "",
        "Summary",
        report.summary,
    ]
    for section in report.sections:
        lines.extend(["", section.title])
        lines.extend([f"- {point}" for point in section.points])
    return "\n".join(lines)


def generate_doctor_report(session: SessionModel) -> DoctorReport:
    analysis = Analysis.model_validate(session.analysis)
    metrics = SessionMetrics.model_validate(session.raw_metrics)

    sections: list[DoctorReportSection] = [
        DoctorReportSection(
            title="Clinical Context",
            points=[
                f"Session number: {analysis.session_number}",
                f"Overall behavioral risk score: {analysis.overall_risk_score}/100 ({analysis.risk_level})",
                f"Session compared to baseline: {analysis.session_compared_to_baseline.replace('_', ' ')}",
                f"Strongest signal domain: {analysis.strongest_signal}",
            ],
        ),
    ]

    for domain in ["typing", "reaction", "memory", "voice"]:
        domain_score = analysis.domain_scores[domain]
        sections.append(
            DoctorReportSection(
                title=f"{domain.capitalize()} Domain Assessment",
                points=[
                    f"Risk score: {_fmt(domain_score.score, '/100')}",
                    f"Trend: {domain_score.trend.replace('_', ' ')}",
                    f"Key observation: {domain_score.key_observation}",
                    (
                        f"Flags: {', '.join(domain_score.flags)}"
                        if domain_score.flags
                        else "Flags: none triggered in this session."
                    ),
                    *_domain_metric_lines(metrics, domain),
                ],
            )
        )

    sections.extend(
        [
            DoctorReportSection(
                title="Patient-Facing Summary",
                points=[
                    analysis.personalized_summary,
                    f"Next session focus: {analysis.next_session_focus}",
                ],
            ),
            DoctorReportSection(
                title="Positive Indicators",
                points=analysis.positive_indicators or ["No positive indicators captured."],
            ),
            DoctorReportSection(
                title="Areas To Watch",
                points=analysis.areas_to_watch or ["No specific watch areas were flagged in this session."],
            ),
            DoctorReportSection(
                title="Lifestyle Recommendations",
                points=analysis.lifestyle_recommendations,
            ),
            DoctorReportSection(
                title="Alerting and Data Quality",
                points=[
                    f"Caregiver alert advised: {'Yes' if analysis.should_alert_caregiver else 'No'}",
                    analysis.alert_message or "No caregiver alert message generated.",
                    analysis.data_quality_notes or "No data quality concerns noted.",
                    analysis.disclaimer,
                ],
            ),
        ]
    )

    report = DoctorReport(
        session_id=analysis.session_id,
        user_id=analysis.user_id,
        generated_at=datetime.now(timezone.utc),
        title=f"NeuroWatch Detailed Session Report - Session {analysis.session_number}",
        summary=(
            "This detailed session report summarizes behavioral-domain signals for clinical discussion. "
            "It is intended to support professional interpretation and longitudinal follow-up."
        ),
        sections=sections,
        email_subject=f"NeuroWatch Session {analysis.session_number} Detailed Report",
        share_text="",
    )
    report.share_text = _build_share_text(report)
    return report
