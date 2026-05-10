from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.metrics import DomainTrend

DISCLAIMER_TEXT = (
    "NeuroWatch provides early behavioral awareness only. This is not a medical diagnosis. "
    "Please consult a qualified healthcare professional for any health concerns."
)


class DomainScore(BaseModel):
    model_config = ConfigDict(extra="forbid")

    score: int | None = Field(default=None, ge=0, le=100)
    trend: DomainTrend
    flags: list[str] = Field(default_factory=list)
    key_observation: str


class Analysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    user_id: str
    analysis_timestamp: datetime
    session_number: int = Field(ge=1)
    baseline_available: bool

    overall_risk_score: int = Field(ge=0, le=100)
    risk_level: Literal["low", "moderate", "elevated", "high"]
    risk_color: Literal["#22c55e", "#eab308", "#f97316", "#ef4444"]
    risk_label: str

    domain_scores: dict[Literal["typing", "reaction", "memory", "voice"], DomainScore]
    strongest_signal: Literal["typing", "reaction", "memory", "voice", "none"]
    session_compared_to_baseline: Literal["better", "similar", "worse", "no_baseline"]

    personalized_summary: str
    positive_indicators: list[str]
    areas_to_watch: list[str]
    lifestyle_recommendations: list[str]

    should_alert_caregiver: bool
    alert_message: str | None
    next_session_focus: str

    data_quality_notes: str | None
    sessions_until_stable_baseline: int = Field(ge=0)
    disclaimer: str = DISCLAIMER_TEXT


class SessionAnalysisResponse(BaseModel):
    id: str
    analysis: Analysis
