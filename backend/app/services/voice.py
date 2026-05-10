from dataclasses import dataclass
from io import BytesIO

from openai import OpenAI

from app.core.config import get_settings
from app.schemas.metrics import VoiceMetrics


@dataclass
class VoiceDerivationResult:
    voice: VoiceMetrics | None
    data_quality_notes: str | None


def derive_speech_rate(word_count: int, duration_seconds: float) -> int:
    if not word_count or not duration_seconds:
        return 0
    return round((word_count / duration_seconds) * 60)


def derive_pause_metrics(words: list[dict[str, float]]) -> dict[str, int]:
    if len(words) <= 1:
        return {"pause_frequency_per_minute": 0, "mean_pause_duration_ms": 0}

    pauses = [
        words[idx]["start"] - words[idx - 1]["end"]
        for idx in range(1, len(words))
        if words[idx]["start"] - words[idx - 1]["end"] > 0.25
    ]
    duration_seconds = words[-1]["end"] - words[0]["start"]
    pause_frequency = (len(pauses) / duration_seconds) * 60 if duration_seconds > 0 else 0
    mean_pause_duration = (sum(pauses) / len(pauses)) if pauses else 0
    return {
        "pause_frequency_per_minute": round(pause_frequency),
        "mean_pause_duration_ms": round(mean_pause_duration * 1000),
    }


def derive_articulation_score(confidences: list[float], filler_ratio: float) -> int:
    average_confidence = (sum(confidences) / len(confidences)) if confidences else 0.65
    confidence_score = average_confidence * 100
    filler_penalty = min(30, filler_ratio * 120)
    return max(0, min(100, round(confidence_score - filler_penalty)))


def _safe_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _extract_confidence(item) -> float | None:
    # Newer SDK objects may not include confidence for word-level timestamps.
    if isinstance(item, dict):
        return _safe_float(item.get("confidence"))
    return _safe_float(getattr(item, "confidence", None))


def _extract_word_timestamps(transcript) -> list[dict[str, float | None]]:
    if hasattr(transcript, "words") and transcript.words:
        words: list[dict[str, float | None]] = []
        for item in transcript.words:
            start = _safe_float(getattr(item, "start", None))
            end = _safe_float(getattr(item, "end", None))
            if start is not None and end is not None:
                words.append({"start": start, "end": end, "confidence": _extract_confidence(item)})
        return words

    segments = getattr(transcript, "segments", None) or []
    words: list[dict[str, float | None]] = []
    for segment in segments:
        for item in getattr(segment, "words", []) or []:
            if isinstance(item, dict):
                start = _safe_float(item.get("start"))
                end = _safe_float(item.get("end"))
            else:
                start = _safe_float(getattr(item, "start", None))
                end = _safe_float(getattr(item, "end", None))
            if start is not None and end is not None:
                words.append({"start": start, "end": end, "confidence": _extract_confidence(item)})
    return words


def transcribe_and_derive_voice_metrics(audio_bytes: bytes, filename: str) -> VoiceDerivationResult:
    settings = get_settings()
    if not settings.openai_api_key:
        return VoiceDerivationResult(
            voice=None,
            data_quality_notes="Voice analysis was skipped because OPENAI_API_KEY is not configured in this environment.",
        )

    client = OpenAI(api_key=settings.openai_api_key)
    data_quality_notes: list[str] = []

    file_obj = BytesIO(audio_bytes)
    file_obj.name = filename
    transcript = client.audio.transcriptions.create(
        file=file_obj,
        model="whisper-1",
        response_format="verbose_json",
        timestamp_granularities=["word"],
    )

    words = _extract_word_timestamps(transcript)
    transcript_text = getattr(transcript, "text", "") or ""
    spoken_words = len(transcript_text.strip().split()) if transcript_text.strip() else len(words)
    duration_seconds = (words[-1]["end"] - words[0]["start"]) if words else float(getattr(transcript, "duration", 0) or 0)
    pause_metrics = derive_pause_metrics(words)
    filler_count = len(__import__("re").findall(r"\b(um|uh|like|you know)\b", transcript_text, __import__("re").IGNORECASE))
    filler_ratio = (filler_count / spoken_words) if spoken_words else 0
    confidences = [item["confidence"] for item in words if item.get("confidence") is not None]

    # Whisper does not expose robust pitch contours; keep this explicit instead of guessing.
    pitch_variation = 0.0
    data_quality_notes.append("Pitch variation could not be derived from this audio pipeline and was set to 0.")

    if not spoken_words or not duration_seconds:
        data_quality_notes.append("The uploaded voice sample did not contain enough transcribed speech.")

    voice = VoiceMetrics(
        speech_rate_wpm=derive_speech_rate(spoken_words, duration_seconds),
        pause_frequency_per_minute=pause_metrics["pause_frequency_per_minute"],
        mean_pause_duration_ms=pause_metrics["mean_pause_duration_ms"],
        pitch_variation_coefficient=pitch_variation,
        articulation_score=derive_articulation_score(confidences, filler_ratio),
    )
    return VoiceDerivationResult(voice=voice, data_quality_notes=" ".join(data_quality_notes) if data_quality_notes else None)
