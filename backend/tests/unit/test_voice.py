from app.services.voice import derive_articulation_score, derive_pause_metrics, derive_speech_rate


def test_derive_speech_rate():
    assert derive_speech_rate(90, 45) == 120


def test_derive_pause_metrics():
    result = derive_pause_metrics(
        [
            {"start": 0, "end": 0.2},
            {"start": 0.8, "end": 1.0},
            {"start": 1.9, "end": 2.1},
        ]
    )
    assert result["pause_frequency_per_minute"] == 57
    assert result["mean_pause_duration_ms"] == 750


def test_derive_articulation_score():
    result = derive_articulation_score([0.92, 0.9, 0.88], 0.02)
    assert result > 80
