"""Saved-simulation persistence: CRUD + cross-tenant isolation."""

from __future__ import annotations

VALID_SIM_REQUEST = {
    "duration_years": 5,
    "initial_investment": 50_000,
    "monthly_investment": 1_000,
    "annual_increase_pct": 0.0,
    "importance": "essential",
    "risk_tolerance": "high",
    "goal_target_amount": 100_000,
    "return_in_real_terms": True,
}


def _run_sim(authed_client, overrides: dict | None = None) -> dict:
    payload = {**VALID_SIM_REQUEST, **(overrides or {})}
    r = authed_client.post("/api/simulate", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def _save_payload(authed_client, name: str = "First what-if", client_id: str | None = None) -> dict:
    response = _run_sim(authed_client)
    body: dict = {"name": name, "request": VALID_SIM_REQUEST, "response": response}
    if client_id is not None:
        body["client_id"] = client_id
    return body


def test_list_requires_auth(client):
    r = client.get("/api/simulations")
    assert r.status_code == 401


def test_create_simulation(authed_client):
    body = _save_payload(authed_client, name="Retirement plan A")
    r = authed_client.post("/api/simulations", json=body)
    assert r.status_code == 201, r.text
    saved = r.json()
    assert saved["name"] == "Retirement plan A"
    assert saved["client_id"] is None
    assert saved["request"]["duration_years"] == 5
    assert saved["response"]["probability_of_goal"] is not None
    # `calibration_as_of` is pulled from the response payload on write.
    assert saved["calibration_as_of"] is not None


def test_create_with_client_id_validates_ownership(authed_client):
    # Create a client first.
    client_row = authed_client.post(
        "/api/clients",
        json={"name": "C", "email": "c@example.com", "profile": {}, "goals": [], "scenarios": []},
    ).json()
    body = _save_payload(authed_client, client_id=client_row["id"])
    r = authed_client.post("/api/simulations", json=body)
    assert r.status_code == 201, r.text
    assert r.json()["client_id"] == client_row["id"]


def test_create_with_foreign_client_returns_404(authed_client, second_client):
    # Eve creates a client, Alice tries to pin a saved sim to Eve's client.
    eve_client = second_client.post(
        "/api/clients",
        json={"name": "E", "email": "e@example.com", "profile": {}, "goals": [], "scenarios": []},
    ).json()
    body = _save_payload(authed_client, client_id=eve_client["id"])
    r = authed_client.post("/api/simulations", json=body)
    assert r.status_code == 404


def test_list_returns_newest_first(authed_client):
    a = authed_client.post("/api/simulations", json=_save_payload(authed_client, name="A")).json()
    b = authed_client.post("/api/simulations", json=_save_payload(authed_client, name="B")).json()
    r = authed_client.get("/api/simulations")
    assert r.status_code == 200
    names = [row["name"] for row in r.json()]
    assert names == ["B", "A"]
    # List view excludes the heavy request/response blobs.
    assert "request" not in r.json()[0]
    # But IDs stay stable.
    ids = {row["id"] for row in r.json()}
    assert ids == {a["id"], b["id"]}


def test_list_filters_by_client_id(authed_client):
    client_row = authed_client.post(
        "/api/clients",
        json={"name": "C", "email": "c@example.com", "profile": {}, "goals": [], "scenarios": []},
    ).json()
    # One saved sim tied to the client, one floating.
    authed_client.post("/api/simulations", json=_save_payload(authed_client, name="Tied", client_id=client_row["id"]))
    authed_client.post("/api/simulations", json=_save_payload(authed_client, name="Floating"))
    r = authed_client.get(f"/api/simulations?client_id={client_row['id']}")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["name"] == "Tied"


def test_get_by_id(authed_client):
    saved = authed_client.post("/api/simulations", json=_save_payload(authed_client)).json()
    r = authed_client.get(f"/api/simulations/{saved['id']}")
    assert r.status_code == 200
    # Full payload surfaces on single-fetch.
    assert r.json()["request"]["duration_years"] == 5
    assert "recommended" in r.json()["response"]


def test_delete_removes_simulation(authed_client):
    saved = authed_client.post("/api/simulations", json=_save_payload(authed_client)).json()
    r = authed_client.delete(f"/api/simulations/{saved['id']}")
    assert r.status_code == 204
    assert authed_client.get(f"/api/simulations/{saved['id']}").status_code == 404


def test_cross_tenant_isolation(authed_client, second_client):
    saved = authed_client.post("/api/simulations", json=_save_payload(authed_client)).json()
    # Eve can't list Alice's sims.
    r = second_client.get("/api/simulations")
    assert r.status_code == 200 and r.json() == []
    # Nor get / delete by ID.
    assert second_client.get(f"/api/simulations/{saved['id']}").status_code == 404
    assert second_client.delete(f"/api/simulations/{saved['id']}").status_code == 404


def test_nonexistent_simulation_returns_404(authed_client):
    r = authed_client.get("/api/simulations/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404
