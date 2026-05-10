import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

from openai import OpenAI

from app.core.config import get_settings
from app.schemas.analysis import Analysis, DISCLAIMER_TEXT, DomainScore
from app.schemas.metrics import SessionMetrics
from app.services.prompts import NEUROWATCH_SYSTEM_PROMPT


@dataclass
class AnalyzeSessionInput:
    session_id: str
    user_id: str
    session_number: int
    baseline_available: bool
    baseline_metrics: SessionMetrics | None
    current_metrics: SessionMetrics
    data_quality_notes: str | None
    sessions_until_stable_baseline: int


def _round(value: float) -> int:
    return max(0, min(100, round(value)))


def _compare_trend(current: float, baseline: float | None) -> Literal["improving", "stable", "declining", "insufficient_data"]:
    if baseline is None or baseline == 0:
        return "insufficient_data"
    delta = ((current - baseline) / baseline) * 100
    if delta <= -10:
        return "declining"
    if delta >= 10:
        return "improving"
    return "stable"


def _determine_risk_level(score: int):
    if score <= 25:
        return "low", "#22c55e", "Within normal range"
    if score <= 50:
        return "moderate", "#eab308", "Some deviations detected"
    if score <= 70:
        return "elevated", "#f97316", "Notable behavioral change"
    return "high", "#ef4444", "Higher monitoring concern"


def _typing_domain(current, baseline) -> DomainScore:
    if not current:
        return DomainScore(score=None, trend="insufficient_data", flags=[], key_observation="Typing metrics were unavailable for this session.")

    flags: list[str] = []
    score = 0.0
    if baseline and baseline.wpm:
        decline = ((baseline.wpm - current.wpm) / baseline.wpm) * 100
        if decline > 20:
            flags.append("Motor speed decline detected")
            score += 24
    elif current.wpm < 40 or current.wpm > 80:
        score += 12

    if baseline and baseline.keystroke_interval_variance_ms:
        rise = ((current.keystroke_interval_variance_ms - baseline.keystroke_interval_variance_ms) / baseline.keystroke_interval_variance_ms) * 100
        if rise > 35:
            flags.append("Rhythmic disruption in typing")
            score += 18

    if baseline and baseline.error_rate_percent:
        rise = ((current.error_rate_percent - baseline.error_rate_percent) / max(1, baseline.error_rate_percent)) * 100
        if rise > 50:
            flags.append("Increased error frequency")
            score += 16
    elif current.error_rate_percent > 8:
        score += 10

    if current.backspace_frequency_per_100chars > 12:
        score += 8
    if current.key_hold_duration_mean_ms > 150:
        score += 12
    if len(flags) > 1:
        score *= 1.3

    return DomainScore(
        score=_round(score),
        trend=_compare_trend(current.wpm, baseline.wpm if baseline else None),
        flags=flags,
        key_observation=(
            "Typing speed or consistency shifted away from the recent reference range."
            if flags
            else "Typing performance stayed near the expected range for this session."
        ),
    )


def _reaction_domain(current, baseline) -> DomainScore:
    if not current:
        return DomainScore(score=None, trend="insufficient_data", flags=[], key_observation="Reaction metrics were unavailable for this session.")

    flags: list[str] = []
    score = 0.0
    if baseline and baseline.mean_reaction_time_ms:
        rise = ((current.mean_reaction_time_ms - baseline.mean_reaction_time_ms) / baseline.mean_reaction_time_ms) * 100
        if rise > 30:
            flags.append("Processing speed reduction")
            score += 24
    elif current.mean_reaction_time_ms > 400 or current.mean_reaction_time_ms < 200:
        score += 12

    if current.reaction_time_variance_ms > 120:
        score += 12
    if current.miss_rate_percent > 12:
        score += 16
    if current.anticipation_errors > 2:
        score += 10
    if len(flags) > 1:
        score *= 1.3

    return DomainScore(
        score=_round(score),
        trend=_compare_trend(
            -current.mean_reaction_time_ms if baseline and baseline.mean_reaction_time_ms else current.mean_reaction_time_ms,
            -baseline.mean_reaction_time_ms if baseline and baseline.mean_reaction_time_ms else (baseline.mean_reaction_time_ms if baseline else None),
        ),
        flags=flags,
        key_observation=(
            "Reaction speed or attentional steadiness showed some softening this session."
            if score > 0
            else "Reaction timing remained within an expected range for the session."
        ),
    )


def _memory_domain(current, baseline) -> DomainScore:
    if not current:
        return DomainScore(score=None, trend="insufficient_data", flags=[], key_observation="Memory metrics were unavailable for this session.")

    flags: list[str] = []
    score = 0.0
    if baseline and baseline.recall_accuracy_percent:
        decline = ((baseline.recall_accuracy_percent - current.recall_accuracy_percent) / baseline.recall_accuracy_percent) * 100
        if decline > 20:
            flags.append("Memory recall degradation")
            score += 28
    elif current.recall_accuracy_percent < 70:
        score += 18

    if current.recall_latency_ms > 2500:
        score += 14
    if current.pattern_recognition_score < 65:
        score += 14
    if current.sequence_memory_score < 65:
        score += 16
    if current.false_positive_rate_percent > 20:
        score += 12
    if len(flags) > 1:
        score *= 1.3

    return DomainScore(
        score=_round(score),
        trend=_compare_trend(current.recall_accuracy_percent, baseline.recall_accuracy_percent if baseline else None),
        flags=flags,
        key_observation=(
            "Recall accuracy, latency, or working-memory signals deserve a closer look over future sessions."
            if score > 0
            else "Memory performance remained broadly steady in this session."
        ),
    )


def _voice_domain(current, baseline) -> DomainScore:
    if not current:
        return DomainScore(score=None, trend="insufficient_data", flags=[], key_observation="Voice metrics were unavailable for this session.")

    flags: list[str] = []
    score = 0.0
    if baseline and baseline.speech_rate_wpm:
        decline = ((baseline.speech_rate_wpm - current.speech_rate_wpm) / baseline.speech_rate_wpm) * 100
        if decline > 25:
            flags.append("Speech rate reduction")
            score += 24
    elif current.speech_rate_wpm < 120 or current.speech_rate_wpm > 180:
        score += 14

    if baseline and baseline.mean_pause_duration_ms:
        rise = ((current.mean_pause_duration_ms - baseline.mean_pause_duration_ms) / baseline.mean_pause_duration_ms) * 100
        if rise > 40:
            flags.append("Increased speech hesitancy")
            score += 18

    if baseline and baseline.pitch_variation_coefficient:
        decline = ((baseline.pitch_variation_coefficient - current.pitch_variation_coefficient) / baseline.pitch_variation_coefficient) * 100
        if decline > 30:
            flags.append("Reduced vocal prosody")
            score += 18

    if current.articulation_score < 70:
        score += 12
    if len(flags) > 1:
        score *= 1.3

    return DomainScore(
        score=_round(score),
        trend=_compare_trend(current.speech_rate_wpm, baseline.speech_rate_wpm if baseline else None),
        flags=flags,
        key_observation=(
            "Speech pacing or pause behavior shifted enough to monitor over the next few sessions."
            if score > 0
            else "Voice pacing and articulation stayed within an expected range."
        ),
    )


def create_local_analysis(payload: AnalyzeSessionInput) -> Analysis:
    typing = _typing_domain(payload.current_metrics.typing, payload.baseline_metrics.typing if payload.baseline_metrics else None)
    reaction = _reaction_domain(payload.current_metrics.reaction, payload.baseline_metrics.reaction if payload.baseline_metrics else None)
    memory = _memory_domain(payload.current_metrics.memory, payload.baseline_metrics.memory if payload.baseline_metrics else None)
    voice = _voice_domain(payload.current_metrics.voice, payload.baseline_metrics.voice if payload.baseline_metrics else None)

    weighted_score = (typing.score or 0) * 0.25 + (reaction.score or 0) * 0.25 + (memory.score or 0) * 0.30 + (voice.score or 0) * 0.20
    overall_risk_score = _round(weighted_score)
    entries = {"typing": typing, "reaction": reaction, "memory": memory, "voice": voice}
    strongest_signal = max(entries, key=lambda item: entries[item].score or -1)
    strongest_score = entries[strongest_signal].score or -1
    if strongest_score < 0:
        strongest_signal = "none"

    risk_level, risk_color, risk_label = _determine_risk_level(overall_risk_score)
    if any((domain.score or 0) > 70 for domain in entries.values()) and risk_level != "high":
        overall_risk_score = min(100, overall_risk_score + 10)
        risk_level, risk_color, risk_label = _determine_risk_level(overall_risk_score)

    declining_count = len([domain for domain in entries.values() if domain.trend == "declining"])
    flagged_domains = [name for name, domain in entries.items() if domain.flags]

    return Analysis.model_validate(
        {
            "session_id": payload.session_id,
            "user_id": payload.user_id,
            "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
            "session_number": payload.session_number,
            "baseline_available": payload.baseline_available,
            "overall_risk_score": overall_risk_score,
            "risk_level": risk_level,
            "risk_color": risk_color,
            "risk_label": risk_label,
            "domain_scores": entries,
            "strongest_signal": strongest_signal,
            "session_compared_to_baseline": (
                "no_baseline"
                if not payload.baseline_available
                else "similar"
                if len(flagged_domains) == 0
                else "worse"
            ),
            "personalized_summary": (
                "You stayed close to your current reference range in this session. Keeping the routine consistent will help NeuroWatch build a clearer long-term picture."
                if not flagged_domains
                else "You showed a few shifts in the monitored behavioral signals today. That does not indicate a diagnosis, but it does make continued tracking useful over the next few sessions."
            ),
            "positive_indicators": [
                "At least one behavioral domain remained stable.",
                "The session completed with usable response-time data.",
                "Structured memory data was captured for longitudinal monitoring.",
                "Voice metrics were captured and included in the report."
                if payload.current_metrics.voice
                else "Missing voice data was handled transparently rather than guessed.",
            ],
            "areas_to_watch": [f"{item.capitalize()} patterns" for item in flagged_domains[:3]],
            "lifestyle_recommendations": [
                "Aim for steady sleep and wake times before your next session.",
                "Stay hydrated and take the session when you feel reasonably rested.",
                "Keep a short routine of movement or mental stimulation between sessions.",
            ],
            "should_alert_caregiver": risk_level in {"elevated", "high"} and declining_count > 0,
            "alert_message": (
                "NeuroWatch noticed a meaningful shift in recent behavioral signals. A supportive check-in may be helpful."
                if risk_level in {"elevated", "high"} and declining_count > 0
                else None
            ),
            "next_session_focus": (
                "Continue across all four domains to strengthen your personal baseline."
                if strongest_signal == "none"
                else f"Pay extra attention to {strongest_signal} next session because it showed the strongest change today."
            ),
            "data_quality_notes": " ".join(
                [
                    note
                    for note in [
                        payload.data_quality_notes,
                        "Narrative AI enhancement was unavailable in this environment; validated deterministic scoring was used.",
                    ]
                    if note
                ]
            )
            if not get_settings().openai_api_key
            else payload.data_quality_notes,
            "sessions_until_stable_baseline": payload.sessions_until_stable_baseline,
            "disclaimer": DISCLAIMER_TEXT,
        }
    )


def analyze_session(payload: AnalyzeSessionInput) -> Analysis:
    settings = get_settings()
    if not settings.openai_api_key:
        return create_local_analysis(payload)

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        completion = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": NEUROWATCH_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            **payload.__dict__,
                            "baseline_metrics": payload.baseline_metrics.model_dump() if payload.baseline_metrics else None,
                            "current_metrics": payload.current_metrics.model_dump(),
                            "instructions": [
                                "Analyze only the metrics provided.",
                                "Use exact threshold wording when a baseline trigger is crossed.",
                                "Return only the JSON object.",
                            ],
                        }
                    ),
                },
            ],
        )

        content = completion.choices[0].message.content
        if not content:
            raise ValueError("OpenAI returned an empty analysis response.")
        return Analysis.model_validate_json(content)
    except Exception:  # noqa: BLE001
        fallback_input = AnalyzeSessionInput(
            **{
                **payload.__dict__,
                "data_quality_notes": " ".join(
                    [
                        note
                        for note in [
                            payload.data_quality_notes,
                            "Narrative AI enhancement was unavailable; validated deterministic scoring was used.",
                        ]
                        if note
                    ]
                ),
            }
        )
        return create_local_analysis(fallback_input)
