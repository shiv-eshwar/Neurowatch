from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TypingMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    wpm: float = Field(ge=0)
    keystroke_interval_variance_ms: float = Field(ge=0)
    error_rate_percent: float = Field(ge=0, le=100)
    backspace_frequency_per_100chars: float = Field(ge=0)
    key_hold_duration_mean_ms: float = Field(ge=0)


class ReactionMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mean_reaction_time_ms: float = Field(ge=0)
    reaction_time_variance_ms: float = Field(ge=0)
    miss_rate_percent: float = Field(ge=0, le=100)
    anticipation_errors: int = Field(ge=0)


class MemoryMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recall_accuracy_percent: float = Field(ge=0, le=100)
    recall_latency_ms: float = Field(ge=0)
    pattern_recognition_score: float = Field(ge=0, le=100)
    sequence_memory_score: float = Field(ge=0, le=100)
    false_positive_rate_percent: float = Field(ge=0, le=100)


class VoiceMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    speech_rate_wpm: float = Field(ge=0)
    pause_frequency_per_minute: float = Field(ge=0)
    mean_pause_duration_ms: float = Field(ge=0)
    pitch_variation_coefficient: float = Field(ge=0)
    articulation_score: float = Field(ge=0, le=100)


class SessionMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    typing: TypingMetrics | None = None
    reaction: ReactionMetrics | None = None
    memory: MemoryMetrics | None = None
    voice: VoiceMetrics | None = None


DomainTrend = Literal["improving", "stable", "declining", "insufficient_data"]
