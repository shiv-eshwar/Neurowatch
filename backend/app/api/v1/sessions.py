import json
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.core.config import get_settings
from app.db.session import get_db
from app.middleware.rate_limit import limiter
from app.models.session import Session as SessionModel
from app.models.user import User
from app.schemas.analysis import Analysis, SessionAnalysisResponse
from app.schemas.metrics import SessionMetrics
from app.schemas.session import (
    SessionDoctorReportResponse,
    SessionDetailResponse,
    SessionListResponse,
    SessionRecord,
    SessionTrendsResponse,
    TrendPoint,
)
from app.services.analysis import AnalyzeSessionInput, analyze_session
from app.services.baseline import get_user_baseline
from app.services.reporting import generate_doctor_report, generate_doctor_report_pdf
from app.services.voice import transcribe_and_derive_voice_metrics

router = APIRouter(prefix="/sessions", tags=["sessions"])
DEFAULT_RATE_LIMIT = get_settings().rate_limit_default


def _combine_notes(notes: list[str | None]) -> str | None:
    values = [note.strip() for note in notes if note and note.strip()]
    return " ".join(values) if values else None


def _to_record(session_model: SessionModel) -> SessionRecord:
    return SessionRecord(
        id=session_model.id,
        number=session_model.number,
        created_at=session_model.created_at,
        raw_metrics=SessionMetrics.model_validate(session_model.raw_metrics),
        analysis=Analysis.model_validate(session_model.analysis),
    )


@router.post("", response_model=SessionAnalysisResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def create_session(
    request: Request,
    metrics: str = Form(...),
    session_id: str | None = Form(default=None),
    audio: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    try:
        parsed = SessionMetrics.model_validate(json.loads(metrics))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Missing or invalid session metrics payload: {exc}") from exc

    voice_notes = None
    merged_metrics = parsed
    if audio and audio.filename:
        try:
            voice_result = transcribe_and_derive_voice_metrics(audio.file.read(), audio.filename)
            merged_metrics = SessionMetrics(
                typing=parsed.typing,
                reaction=parsed.reaction,
                memory=parsed.memory,
                voice=voice_result.voice or parsed.voice,
            )
            voice_notes = voice_result.data_quality_notes
        except Exception:  # noqa: BLE001
            voice_notes = (
                "Voice transcription failed for this upload, so voice pacing metrics were unavailable."
            )

    baseline = get_user_baseline(db, current_user.id)
    actual_session_id = session_id if session_id else str(uuid.uuid4())
    data_quality_notes = _combine_notes(
        [
            voice_notes,
            None if merged_metrics.typing else "Typing metrics were missing.",
            None if merged_metrics.reaction else "Reaction metrics were missing.",
            None if merged_metrics.memory else "Memory metrics were missing.",
            None if merged_metrics.voice else "Voice metrics were missing or unavailable.",
        ]
    )
    analysis = analyze_session(
        AnalyzeSessionInput(
            session_id=actual_session_id,
            user_id=current_user.id,
            session_number=baseline.session_number,
            baseline_available=baseline.baseline_available,
            baseline_metrics=baseline.baseline_metrics,
            current_metrics=merged_metrics,
            data_quality_notes=data_quality_notes,
            sessions_until_stable_baseline=baseline.sessions_until_stable_baseline,
        )
    )
    record = SessionModel(
        id=actual_session_id,
        user_id=current_user.id,
        number=baseline.session_number,
        raw_metrics=merged_metrics.model_dump(),
        analysis=analysis.model_dump(mode="json"),
    )
    db.add(record)
    db.commit()

    return SessionAnalysisResponse(id=record.id, analysis=analysis)


@router.get("", response_model=SessionListResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def list_sessions(request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    sessions = db.scalars(
        select(SessionModel)
        .where(SessionModel.user_id == current_user.id)
        .order_by(desc(SessionModel.created_at))
    ).all()
    return SessionListResponse(sessions=[_to_record(item) for item in sessions])


@router.get("/trends", response_model=SessionTrendsResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def session_trends(request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    sessions = db.scalars(
        select(SessionModel)
        .where(SessionModel.user_id == current_user.id)
        .order_by(SessionModel.created_at.asc())
    ).all()
    analyses = [Analysis.model_validate(item.analysis) for item in sessions]
    trends = [
        TrendPoint(
            label=f"S{index + 1}",
            overall=analysis.overall_risk_score,
            typing=analysis.domain_scores["typing"].score or 0,
            reaction=analysis.domain_scores["reaction"].score or 0,
            memory=analysis.domain_scores["memory"].score or 0,
            voice=analysis.domain_scores["voice"].score or 0,
        )
        for index, analysis in enumerate(analyses)
    ]
    return SessionTrendsResponse(trends=trends, latest=analyses[-1] if analyses else None)


@router.get("/{session_id}", response_model=SessionDetailResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_session(
    request: Request,
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    session = db.scalar(
        select(SessionModel).where(
            SessionModel.id == session_id,
            SessionModel.user_id == current_user.id,
        )
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return SessionDetailResponse(session=_to_record(session))


@router.post("/{session_id}/report", response_model=SessionDoctorReportResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def generate_session_report(
    request: Request,
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    session = db.scalar(
        select(SessionModel).where(
            SessionModel.id == session_id,
            SessionModel.user_id == current_user.id,
        )
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    report = generate_doctor_report(session)
    return SessionDoctorReportResponse(report=report)


@router.get("/{session_id}/report/pdf")
@limiter.limit(DEFAULT_RATE_LIMIT)
def download_session_report_pdf(
    request: Request,
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    session = db.scalar(
        select(SessionModel).where(
            SessionModel.id == session_id,
            SessionModel.user_id == current_user.id,
        )
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    report = generate_doctor_report(session)
    pdf_bytes = generate_doctor_report_pdf(report)
    filename = f"neurowatch-session-{session.number}-clinical-report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
