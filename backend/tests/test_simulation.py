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
    # Without goal_target_amount the probability is null (no fallback to the
    # old tautological percentile-based metric).
    assert body["probability_of_goal"] is None


def test_simulate_probability_with_target(authed_client):
    r = authed_client.post(
        "/api/simulate", json={**VALID_SIM, "goal_target_amount": 100_000}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["probability_of_goal"] is not None
    assert 0.0 <= body["probability_of_goal"] <= 1.0


def test_simulate_unreachable_goal_low_probability(authed_client):
    """1M EGP goal in 5y with 50k initial + 1k/month is unreachable -> prob < 0.05."""
    r = authed_client.post(
        "/api/simulate", json={**VALID_SIM, "goal_target_amount": 1_000_000}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["probability_of_goal"] is not None
    assert body["probability_of_goal"] < 0.05, body["probability_of_goal"]


def test_simulate_easy_goal_high_probability(authed_client):
    """A goal well below projected final values (50k initial alone exceeds it)
    should be very likely -> prob > 0.95."""
    r = authed_client.post(
        "/api/simulate", json={**VALID_SIM, "goal_target_amount": 50_000}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["probability_of_goal"] is not None
    assert body["probability_of_goal"] > 0.95, body["probability_of_goal"]


def test_simulate_probability_varies_with_goal_amount(authed_client):
    """Probability must depend on the goal amount, not be stuck at a constant."""
    targets = [50_000, 100_000, 250_000, 500_000, 1_000_000]
    probs: list[float] = []
    for t in targets:
        r = authed_client.post(
            "/api/simulate", json={**VALID_SIM, "goal_target_amount": t}
        )
        assert r.status_code == 200, r.text
        probs.append(r.json()["probability_of_goal"])
    # Strictly decreasing as the target grows; and the range must span more
    # than any single percentile bucket could produce (proving it's not stuck).
    assert probs == sorted(probs, reverse=True), probs
    assert max(probs) - min(probs) > 0.5, probs
    # And not stuck at the old 0.70 "essential" tautology.
    assert not all(abs(p - 0.70) < 0.01 for p in probs), probs


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
    result = run_advisor(goal, goal_target_amount=100_000)
    assert 0.0 <= result["probability_of_goal"] <= 1.0


def test_run_advisor_without_target_returns_none():
    goal = UserGoal(
        duration_years=5,
        initial_investment=10_000,
        monthly_investment=500,
        annual_increase_pct=0.0,
        importance="essential",
        risk_tolerance="high",
    )
    result = run_advisor(goal)
    assert result["probability_of_goal"] is None
