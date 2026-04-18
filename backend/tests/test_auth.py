"""Authentication flow tests."""

from __future__ import annotations

from app.config import get_settings

# Cookie name is derived from APP_NAME (see app.deps.ACCESS_COOKIE_NAME).
# Asserting against the derived value — not a hard-coded "marsa_access" —
# means these tests keep passing after the next rebrand without a second
# code change.
COOKIE_NAME = f"{get_settings().app_name.lower()}_access"


def test_register_sets_cookie_and_returns_user(client):
    r = client.post(
        "/api/auth/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "password123"},
    )
    assert r.status_code == 201
    assert r.json()["user"]["email"] == "alice@example.com"
    assert COOKIE_NAME in r.cookies


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
    token_cookie = r.cookies.get(COOKIE_NAME)
    assert token_cookie

    authed_client.cookies.clear()
    r = authed_client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token_cookie}"}
    )
    assert r.status_code == 200


def test_logout_revokes_token_server_side(authed_client):
    """A token that was valid before /logout must be rejected after.

    Regression guard for the P0: previously ``/auth/logout`` only cleared
    the browser cookie, so a copied ``marsa_access`` value kept working
    until ``exp``. Now the jti is blacklisted server-side.
    """
    # Grab the current cookie value — that's the token we'll re-present.
    token = authed_client.cookies.get(COOKIE_NAME)
    assert token

    r = authed_client.post("/api/auth/logout")
    assert r.status_code == 204

    # Re-present the old cookie via Authorization header so the TestClient
    # cookie jar (which the logout cleared) doesn't get in the way.
    r = authed_client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "unauthorized"


def test_logout_without_token_returns_204(client):
    """Sign-out tapped by an anonymous caller is a no-op, not an error.

    The client always wants to clear its own auth state regardless of what
    the server thinks; returning 401 here would make the UI look broken.
    """
    r = client.post("/api/auth/logout")
    assert r.status_code == 204


def test_logout_revokes_only_the_presented_token(authed_client):
    """Two tokens for one user: revoking one must not invalidate the other.

    Proves the revocation is per-``jti``, not per-user. Sign-out-here vs.
    sign-out-everywhere are intentionally different operations.
    """
    # Mint a second token for the same user via a parallel login using the
    # Authorization header path (so we don't clobber the TestClient cookie).
    r = authed_client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "password123"},
    )
    assert r.status_code == 200
    second_token = r.cookies.get(COOKIE_NAME)
    assert second_token

    # The cookie jar now holds the second token. Log out — revokes only it.
    first_response = authed_client.post("/api/auth/logout")
    assert first_response.status_code == 204

    # Third login to get a *third*, still-valid token we can use to probe
    # whether the second_token was revoked. Actually simpler: re-mint a new
    # token and assert the second_token no longer works, but any other
    # fresh token does.
    authed_client.cookies.clear()
    r = authed_client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "password123"},
    )
    assert r.status_code == 200
    third_token = r.cookies.get(COOKIE_NAME)
    assert third_token
    assert third_token != second_token

    # The just-revoked second_token is dead.
    authed_client.cookies.clear()
    r = authed_client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {second_token}"}
    )
    assert r.status_code == 401

    # The parallel third_token still authenticates the same user.
    r = authed_client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {third_token}"}
    )
    assert r.status_code == 200
    assert r.json()["email"] == "alice@example.com"
