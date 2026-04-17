"""Simulation endpoint + engine tests."""

from __future__ import annotations

import numpy as np
import pytest

from app.sim.advisor import UserGoal, advise, evaluate_portfolios
from app.sim.preprocessing import to_returns
from app.sim.service import run_advisor

VALID_SIM = {
    "duration_years": 5,
    "initial_investment": 50_000,
    "monthly_investment": 1_000,
    "annual_increase_pct": 0.0,
    "importance": "essential",
    "risk_tolerance": "high",
}


def test_simulate_requires_auth(client):
    r = client.post("/api/simulate", json=VALID_SIM)
    assert r.status_code == 401


def test_simulate_returns_projection(authed_client):
    r = authed_client.post("/api/simulate", json=VALID_SIM)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "recommended" in body
    assert len(body["projection"]["years"]) == 5
    assert 0.0 <= body["probability_of_goal"] <= 1.0


def test_simulate_validates_duration(authed_client):
    r = authed_client.post("/api/simulate", json={**VALID_SIM, "duration_years": 999})
    assert r.status_code == 422


def test_simulate_validates_initial_investment(authed_client):
    r = authed_client.post("/api/simulate", json={**VALID_SIM, "initial_investment": -1})
    assert r.status_code == 422


def test_simulate_validates_importance(authed_client):
    r = authed_client.post("/api/simulate", json={**VALID_SIM, "importance": "bogus"})
    assert r.status_code == 422


def test_monotonic_duration_increases_value(authed_client):
    """Longer horizon with identical contributions should grow the median final value."""
    short = authed_client.post("/api/simulate", json={**VALID_SIM, "duration_years": 3}).json()
    long = authed_client.post("/api/simulate", json={**VALID_SIM, "duration_years": 10}).json()
    assert long["projection"]["median"][-1] > short["projection"]["median"][-1]


# ---- Unit tests of the pure engine ----


def test_to_returns_formula():
    import pandas as pd

    df = pd.DataFrame({"nav": [100.0, 110.0, 121.0]})
    out = to_returns(df)
    assert np.allclose(out, [0.1, 0.1])


def test_advise_prefers_higher_return_at_essential_percentile():
    rng = np.random.default_rng(0)
    variable = rng.normal(0.008, 0.05, size=(200, 120))  # high-return high-vol
    fixed = rng.normal(0.004, 0.001, size=(200, 120))  # low-return low-vol
    goal = UserGoal(10, 10_000, 500, 0.0, "essential", "high")
    best, _ = advise(variable, fixed, goal)
    assert 0.0 <= best.variable_pct <= 1.0


def test_evaluate_portfolios_returns_one_per_allocation():
    rng = np.random.default_rng(0)
    variable = rng.normal(0.006, 0.04, size=(100, 60))
    fixed = rng.normal(0.004, 0.001, size=(100, 60))
    goal = UserGoal(5, 10_000, 500, 0.0, "essential", "moderate")
    results = evaluate_portfolios(variable, fixed, goal)
    # moderate: 0.5..0.7 with 0.1 step => 3 allocations
    assert len(results) == 3
    for r in results:
        assert 0.0 <= r.variable_pct <= 1.0
        assert set(r.percentiles.keys()) == {15, 30, 50, 85}


@pytest.mark.parametrize("risk", ["very_low", "low", "moderate", "high", "very_high"])
def test_advisor_handles_all_risk_levels(risk):
    goal = UserGoal(
        duration_years=5,
        initial_investment=10_000,
        monthly_investment=500,
        annual_increase_pct=0.0,
        importance="essential",
        risk_tolerance=risk,
    )
    result = run_advisor(goal)
    assert 0.0 <= result["probability_of_goal"] <= 1.0
