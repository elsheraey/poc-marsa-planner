"""Authentication flow tests."""

from __future__ import annotations


def test_register_sets_cookie_and_returns_user(client):
    r = client.post(
        "/api/auth/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "password123"},
    )
    assert r.status_code == 201
    assert r.json()["user"]["email"] == "alice@example.com"
    assert "marsa_access" in r.cookies


def test_register_rejects_short_password(client):
    r = client.post(
        "/api/auth/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "short"},
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "validation_error"


def test_register_rejects_invalid_email(client):
    r = client.post(
        "/api/auth/register",
        json={"name": "Alice", "email": "not-an-email", "password": "password123"},
    )
    assert r.status_code == 422


def test_register_duplicate_email_returns_conflict(client):
    body = {"name": "Alice", "email": "alice@example.com", "password": "password123"}
    assert client.post("/api/auth/register", json=body).status_code == 201
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "conflict"


def test_login_rejects_wrong_password(authed_client):
    r = authed_client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "wrong-password"},
    )
    assert r.status_code == 401
    assert r.json()["error"]["message"] == "invalid credentials"


def test_login_unknown_user_returns_same_message(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "doesntmatter1"},
    )
    assert r.status_code == 401
    assert r.json()["error"]["message"] == "invalid credentials"


def test_me_requires_auth(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_returns_current_user(authed_client):
    r = authed_client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == "alice@example.com"


def test_logout_clears_cookie(authed_client):
    r = authed_client.post("/api/auth/logout")
    assert r.status_code == 204
    r = authed_client.get("/api/auth/me")
    assert r.status_code == 401


def test_login_accepts_bearer_header(authed_client):
    # Clear cookies; use Authorization header instead.
    authed_client.cookies.clear()
    r = authed_client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "password123"},
    )
    assert r.status_code == 200
    token_cookie = r.cookies.get("marsa_access")
    assert token_cookie

    authed_client.cookies.clear()
    r = authed_client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token_cookie}"}
    )
    assert r.status_code == 200
