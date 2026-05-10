import app.api.v1.auth as auth_api


def test_signup_login_me_logout_flow(client):
    signup_response = client.post(
        "/api/v1/auth/signup",
        json={
            "display_name": "Test User",
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert signup_response.status_code == 200
    assert signup_response.json()["user"]["email"] == "test@example.com"

    me_response = client.get("/api/v1/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["user"]["display_name"] == "Test User"

    logout_response = client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 200

    unauthorized_me = client.get("/api/v1/auth/me")
    assert unauthorized_me.status_code == 401

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["email"] == "test@example.com"


def test_firebase_token_login_flow(client, monkeypatch):
    def _fake_authenticate(db, id_token):
        assert id_token == "valid-firebase-token"
        return auth_api.get_auth_provider().signup(
            db,
            auth_api.SignupRequest(
                display_name="Firebase User",
                email="firebase@example.com",
                password="password123",
            ),
        )

    monkeypatch.setattr(auth_api, "authenticate_with_firebase_token", _fake_authenticate)

    response = client.post("/api/v1/auth/firebase", json={"id_token": "valid-firebase-token"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["email"] == "firebase@example.com"
