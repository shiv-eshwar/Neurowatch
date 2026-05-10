from app.services.metrics import (
    KeyEvent,
    MemoryInput,
    ReactionTrial,
    derive_memory_metrics,
    derive_reaction_metrics,
    derive_typing_metrics,
)


def test_derive_typing_metrics():
    result = derive_typing_metrics(
        expected_text="hello world",
        typed_text="hello worlz",
        duration_seconds=60,
        key_events=[
            KeyEvent(key="h", downAt=0, upAt=90),
            KeyEvent(key="e", downAt=120, upAt=200),
            KeyEvent(key="l", downAt=230, upAt=310),
            KeyEvent(key="o", downAt=340, upAt=430),
            KeyEvent(key="Backspace", downAt=700, upAt=760),
        ],
    )
    assert result.wpm == 2
    assert result.backspace_frequency_per_100chars > 0
    assert result.key_hold_duration_mean_ms == 80


def test_derive_reaction_metrics():
    result = derive_reaction_metrics(
        [
            ReactionTrial(reactionTimeMs=240, hit=True, anticipated=False),
            ReactionTrial(reactionTimeMs=0, hit=False, anticipated=False),
            ReactionTrial(reactionTimeMs=110, hit=True, anticipated=True),
        ]
    )
    assert result.mean_reaction_time_ms == 240
    assert result.miss_rate_percent == 33
    assert result.anticipation_errors == 1


def test_derive_memory_metrics():
    result = derive_memory_metrics(
        MemoryInput(
            expectedWords=["river", "amber", "quiet", "candle"],
            recalledWords=["river", "amber", "glass", "quiet"],
            recallLatencyMs=1500,
            patternCorrect=7,
            patternTotal=8,
            sequenceCorrect=5,
            sequenceTotal=6,
        )
    )
    assert result.recall_accuracy_percent == 75
    assert result.pattern_recognition_score == 88
    assert result.sequence_memory_score == 83
    assert result.false_positive_rate_percent == 25
