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
