from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.session import Session as SessionModel
from app.schemas.metrics import MemoryMetrics, ReactionMetrics, SessionMetrics, TypingMetrics, VoiceMetrics


def _average(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _average_block(block: list[dict[str, Any]]) -> dict[str, float] | None:
    if not block:
        return None
    keys = block[0].keys()
    averaged: dict[str, float] = {}
    for key in keys:
        values = [float(item[key]) for item in block]
        averaged[key] = _average(values) or 0
    return averaged


@dataclass
class BaselineResult:
    baseline_available: bool
    baseline_metrics: SessionMetrics | None
    session_number: int
    sessions_until_stable_baseline: int


def build_baseline_from_metrics(session_metrics: list[SessionMetrics]) -> tuple[bool, SessionMetrics | None, int]:
    sessions_until_stable = max(0, 7 - len(session_metrics))
    if len(session_metrics) < 7:
        return False, None, sessions_until_stable

    typing_blocks = [m.typing.model_dump() for m in session_metrics if m.typing]
    reaction_blocks = [m.reaction.model_dump() for m in session_metrics if m.reaction]
    memory_blocks = [m.memory.model_dump() for m in session_metrics if m.memory]
    voice_blocks = [m.voice.model_dump() for m in session_metrics if m.voice]

    typing = _average_block(typing_blocks)
    reaction = _average_block(reaction_blocks)
    memory = _average_block(memory_blocks)
    voice = _average_block(voice_blocks)

    return (
        True,
        SessionMetrics(
            typing=TypingMetrics(**typing) if typing else None,
            reaction=ReactionMetrics(**reaction) if reaction else None,
            memory=MemoryMetrics(**memory) if memory else None,
            voice=VoiceMetrics(**voice) if voice else None,
        ),
        sessions_until_stable,
    )


def get_user_baseline(db: Session, user_id: str) -> BaselineResult:
    sessions = db.scalars(
        select(SessionModel).where(SessionModel.user_id == user_id).order_by(SessionModel.created_at.asc())
    ).all()
    metrics = [SessionMetrics.model_validate(item.raw_metrics) for item in sessions]
    baseline_available, baseline_metrics, sessions_until_stable = build_baseline_from_metrics(metrics[-7:])
    return BaselineResult(
        baseline_available=baseline_available,
        baseline_metrics=baseline_metrics,
        session_number=len(sessions) + 1,
        sessions_until_stable_baseline=sessions_until_stable,
    )
