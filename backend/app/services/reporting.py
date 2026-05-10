import re
from datetime import datetime, timezone
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.session import Session as SessionModel
from app.schemas.analysis import Analysis
from app.schemas.metrics import SessionMetrics
from app.schemas.session import DoctorReport, DoctorReportSection


def _fmt(value: float | int | None, suffix: str = "") -> str:
    if value is None:
        return "Unavailable"
    return f"{value}{suffix}"


def _sanitize_data_quality_notes(data_quality_notes: str | None) -> list[str]:
    if not data_quality_notes or not data_quality_notes.strip():
        return ["No data quality concerns were identified for this session."]

    normalized = " ".join(data_quality_notes.split())
    if "validation errors for Analysis" in normalized or "pydantic.dev" in normalized:
        return [
            "Narrative AI output could not be validated for this session, so NeuroWatch used validated deterministic scoring."
        ]

    replacements = {
        "OpenAI API key missing; local fallback analysis was used.": (
            "Narrative AI enhancement was unavailable in this environment; validated deterministic scoring was used."
        ),
        "OpenAI analysis failed and local fallback was used:": (
            "Narrative AI enhancement was unavailable; validated deterministic scoring was used."
        ),
        "Voice transcription failed for this upload, so voice pacing metrics were unavailable.": (
            "Voice transcription could not be completed for this upload, so voice pacing metrics were marked unavailable."
        ),
        "Pitch variation could not be derived from this audio pipeline and was set to 0.": (
            "Pitch-variation metrics are not available in the current audio pipeline and were omitted."
        ),
    }
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)

    normalized = re.sub(r"Error:\s*[^.]+\.?", "", normalized, flags=re.IGNORECASE).strip()
    sentences = [item.strip() for item in re.split(r"(?<=[.!?])\s+", normalized) if item.strip()]
    cleaned = [item if item[-1] in ".!?" else f"{item}." for item in sentences]
    return cleaned or ["No data quality concerns were identified for this session."]


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
        "Confidential clinical support document for treating professionals.",
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
                    *_sanitize_data_quality_notes(analysis.data_quality_notes),
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
            "This report summarizes behavioral-domain signals captured in the current NeuroWatch session. "
            "Use it as structured decision-support for longitudinal clinical follow-up."
        ),
        sections=sections,
        email_subject=f"NeuroWatch Session {analysis.session_number} Clinical Report",
        share_text="",
    )
    report.share_text = _build_share_text(report)
    return report


def _build_pdf_footer(canvas_obj, doc):  # noqa: ANN001
    canvas_obj.saveState()
    canvas_obj.setStrokeColor(colors.HexColor("#CBD5E1"))
    canvas_obj.line(doc.leftMargin, 12 * mm, A4[0] - doc.rightMargin, 12 * mm)
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(colors.HexColor("#475569"))
    canvas_obj.drawString(doc.leftMargin, 8 * mm, "NeuroWatch Clinical Support Report")
    canvas_obj.drawRightString(A4[0] - doc.rightMargin, 8 * mm, f"Page {doc.page}")
    canvas_obj.restoreState()


def generate_doctor_report_pdf(report: DoctorReport) -> bytes:
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=report.title,
        author="NeuroWatch",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#334155"),
        spaceAfter=10,
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=8,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "SectionBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1E293B"),
    )

    story: list = [
        Paragraph("NeuroWatch Clinical Session Report", title_style),
        Paragraph("Confidential document. For professional medical review.", subtitle_style),
    ]

    metadata_table = Table(
        [
            ["Generated", report.generated_at.strftime("%Y-%m-%d %H:%M UTC"), "Session ID", report.session_id],
            ["Patient ID", report.user_id, "Report Type", "Behavioral signal summary"],
        ],
        colWidths=[28 * mm, 58 * mm, 28 * mm, 58 * mm],
    )
    metadata_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.extend([metadata_table, Spacer(1, 8), Paragraph(report.summary, body_style), Spacer(1, 6)])

    for section in report.sections:
        story.append(Paragraph(section.title, heading_style))
        bullets = ListFlowable(
            [ListItem(Paragraph(point, body_style), leftIndent=6) for point in section.points],
            bulletType="bullet",
            start="circle",
            leftIndent=12,
            bulletFontName="Helvetica",
            bulletFontSize=8,
            bulletColor=colors.HexColor("#334155"),
        )
        story.append(bullets)
        story.append(Spacer(1, 4))

    document.build(story, onFirstPage=_build_pdf_footer, onLaterPages=_build_pdf_footer)
    return buffer.getvalue()
