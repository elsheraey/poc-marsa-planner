"""Client CRUD + multi-tenant isolation tests."""

from __future__ import annotations

VALID = {
    "name": "Bob Client",
    "email": "bob@example.com",
    "phone": "+201234567890",
    "profile": {"riskAppetite": "high"},
    "goals": [],
    "scenarios": [],
}


def test_list_requires_auth(client):
    r = client.get("/api/clients")
    assert r.status_code == 401


def test_create_client_assigns_display_id(authed_client):
    r = authed_client.post("/api/clients", json=VALID)
    assert r.status_code == 201, r.text
    assert r.json()["clientId"] == "158601"
    assert r.json()["name"] == "Bob Client"


def test_sequential_display_ids(authed_client):
    a = authed_client.post("/api/clients", json=VALID).json()
    b = authed_client.post("/api/clients", json={**VALID, "email": "b2@example.com"}).json()
    assert int(b["clientId"]) == int(a["clientId"]) + 1


def test_list_after_create_returns_row(authed_client):
    authed_client.post("/api/clients", json=VALID)
    r = authed_client.get("/api/clients")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["email"] == "bob@example.com"


def test_get_by_id(authed_client):
    created = authed_client.post("/api/clients", json=VALID).json()
    r = authed_client.get(f"/api/clients/{created['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created["id"]


def test_patch_updates_fields(authed_client):
    created = authed_client.post("/api/clients", json=VALID).json()
    r = authed_client.patch(f"/api/clients/{created['id']}", json={"name": "Bob Renamed"})
    assert r.status_code == 200
    assert r.json()["name"] == "Bob Renamed"


def test_delete_removes_client(authed_client):
    created = authed_client.post("/api/clients", json=VALID).json()
    r = authed_client.delete(f"/api/clients/{created['id']}")
    assert r.status_code == 204
    assert authed_client.get(f"/api/clients/{created['id']}").status_code == 404


def test_create_rejects_invalid_email(authed_client):
    r = authed_client.post("/api/clients", json={**VALID, "email": "nope"})
    assert r.status_code == 422


def test_cross_user_isolation(authed_client, second_client):
    created = authed_client.post("/api/clients", json=VALID).json()
    # Eve cannot see Alice's client
    r = second_client.get("/api/clients")
    assert r.status_code == 200
    assert r.json() == []
    # Eve cannot get it by ID either
    r = second_client.get(f"/api/clients/{created['id']}")
    assert r.status_code == 404
    # Nor patch nor delete
    assert second_client.patch(f"/api/clients/{created['id']}", json={"name": "x"}).status_code == 404
    assert second_client.delete(f"/api/clients/{created['id']}").status_code == 404


def test_nonexistent_client_returns_404(authed_client):
    r = authed_client.get("/api/clients/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404
