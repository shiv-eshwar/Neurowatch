from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.analysis import Analysis
from app.schemas.metrics import SessionMetrics


class SessionRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    number: int
    created_at: datetime
    raw_metrics: SessionMetrics
    analysis: Analysis


class SessionListResponse(BaseModel):
    sessions: list[SessionRecord]


class SessionDetailResponse(BaseModel):
    session: SessionRecord


class TrendPoint(BaseModel):
    label: str
    overall: int
    typing: int
    reaction: int
    memory: int
    voice: int


class SessionTrendsResponse(BaseModel):
    trends: list[TrendPoint]
    latest: Analysis | None


class DoctorReportSection(BaseModel):
    title: str
    points: list[str]


class DoctorReport(BaseModel):
    session_id: str
    user_id: str
    generated_at: datetime
    title: str
    summary: str
    sections: list[DoctorReportSection]
    email_subject: str
    share_text: str


class SessionDoctorReportResponse(BaseModel):
    report: DoctorReport
