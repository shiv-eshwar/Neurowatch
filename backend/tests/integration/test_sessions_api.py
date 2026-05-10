import json

import app.api.v1.sessions as sessions_api


def _signup(client):
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "display_name": "Session User",
            "email": "session@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 200


def test_sessions_endpoints_require_auth(client):
    response = client.get("/api/v1/sessions")
    assert response.status_code == 401


def test_session_create_list_and_detail(client):
    _signup(client)
    metrics = {
        "typing": {
            "wpm": 55,
            "keystroke_interval_variance_ms": 120,
            "error_rate_percent": 2.1,
            "backspace_frequency_per_100chars": 4.5,
            "key_hold_duration_mean_ms": 93,
        },
        "reaction": {
            "mean_reaction_time_ms": 280,
            "reaction_time_variance_ms": 40,
            "miss_rate_percent": 2.0,
            "anticipation_errors": 0,
        },
        "memory": {
            "recall_accuracy_percent": 80,
            "recall_latency_ms": 1500,
            "pattern_recognition_score": 85,
            "sequence_memory_score": 82,
            "false_positive_rate_percent": 5,
        },
        "voice": None,
    }

    create_response = client.post(
        "/api/v1/sessions",
        data={"metrics": json.dumps(metrics)},
    )
    assert create_response.status_code == 200
    payload = create_response.json()
    session_id = payload["id"]

    list_response = client.get("/api/v1/sessions")
    assert list_response.status_code == 200
    assert len(list_response.json()["sessions"]) == 1

    trends_response = client.get("/api/v1/sessions/trends")
    assert trends_response.status_code == 200
    assert len(trends_response.json()["trends"]) == 1

    detail_response = client.get(f"/api/v1/sessions/{session_id}")
    assert detail_response.status_code == 200
    assert detail_response.json()["session"]["id"] == session_id

    report_response = client.post(f"/api/v1/sessions/{session_id}/report")
    assert report_response.status_code == 200
    report_payload = report_response.json()["report"]
    assert report_payload["session_id"] == session_id
    assert "Detailed Session Report" in report_payload["title"]
    assert isinstance(report_payload["sections"], list)
    assert len(report_payload["sections"]) > 0

    pdf_response = client.get(f"/api/v1/sessions/{session_id}/report/pdf")
    assert pdf_response.status_code == 200
    assert pdf_response.headers["content-type"] == "application/pdf"
    assert pdf_response.content.startswith(b"%PDF")


def test_session_create_survives_voice_transcription_failure(client, monkeypatch):
    _signup(client)
    metrics = {
        "typing": {
            "wpm": 58,
            "keystroke_interval_variance_ms": 110,
            "error_rate_percent": 2.0,
            "backspace_frequency_per_100chars": 4.1,
            "key_hold_duration_mean_ms": 90,
        },
        "reaction": {
            "mean_reaction_time_ms": 275,
            "reaction_time_variance_ms": 38,
            "miss_rate_percent": 1.5,
            "anticipation_errors": 0,
        },
        "memory": {
            "recall_accuracy_percent": 83,
            "recall_latency_ms": 1400,
            "pattern_recognition_score": 87,
            "sequence_memory_score": 84,
            "false_positive_rate_percent": 4,
        },
        "voice": None,
    }

    def _boom(*args, **kwargs):
        raise RuntimeError("simulated whisper failure")

    monkeypatch.setattr(sessions_api, "transcribe_and_derive_voice_metrics", _boom)
    response = client.post(
        "/api/v1/sessions",
        data={"metrics": json.dumps(metrics)},
        files={"audio": ("voice.webm", b"fake-bytes", "audio/webm")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["analysis"]["data_quality_notes"] is not None
    assert "voice transcription failed" in payload["analysis"]["data_quality_notes"].lower()
