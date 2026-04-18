"""`POST /api/simulate/invert` — bisection over monthly / horizon."""

from __future__ import annotations

BASE = {
    "duration_years": 5,
    "initial_investment": 50_000,
    "annual_increase_pct": 0.0,
    "importance": "essential",
    "risk_tolerance": "high",
    "goal_target_amount": 250_000,
    "return_in_real_terms": True,
}


def test_invert_requires_auth(client):
    r = client.post("/api/simulate/invert", json={**BASE, "target_probability": 0.80})
    assert r.status_code == 401


def test_invert_hits_target_within_tolerance(authed_client):
    """The required monthly it returns should clear the target (±2pp) when
    fed back into the regular simulate endpoint."""
    r = authed_client.post("/api/simulate/invert", json={**BASE, "target_probability": 0.80})
    assert r.status_code == 200, r.text
    out = r.json()
    required = out["required_monthly_investment"]
    assert required is not None
    assert required > 0
    # Round-trip: feed the solved monthly back through /simulate and check prob.
    r2 = authed_client.post(
        "/api/simulate",
        json={
            "duration_years": BASE["duration_years"],
            "initial_investment": BASE["initial_investment"],
            "monthly_investment": required,
            "annual_increase_pct": BASE["annual_increase_pct"],
            "importance": BASE["importance"],
            "risk_tolerance": BASE["risk_tolerance"],
            "goal_target_amount": BASE["goal_target_amount"],
            "return_in_real_terms": BASE["return_in_real_terms"],
        },
    )
    assert r2.status_code == 200
    achieved = r2.json()["probability_of_goal"]
    assert achieved >= 0.80 - 0.02, (achieved, required)


def test_invert_monotonic_higher_target_requires_higher_monthly(authed_client):
    """Raising the target probability must not decrease the required monthly."""
    results: list[float] = []
    for target in [0.60, 0.75, 0.90]:
        r = authed_client.post("/api/simulate/invert", json={**BASE, "target_probability": target})
        assert r.status_code == 200, r.text
        required = r.json()["required_monthly_investment"]
        assert required is not None, target
        results.append(required)
    # Non-decreasing; allow equality when the bisection tolerance dominates.
    assert results[0] <= results[1] <= results[2], results
    # And strictly increasing over the full range (60% vs 90% must diverge).
    assert results[0] < results[2], results


def test_invert_unreachable_returns_null(authed_client):
    """10T EGP goal in 1y with 10k initial: even 10M EGP/month is insufficient."""
    payload = {
        **BASE,
        "duration_years": 1,
        "initial_investment": 10_000,
        "goal_target_amount": 1e12,
        "target_probability": 0.95,
    }
    r = authed_client.post("/api/simulate/invert", json=payload)
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["required_monthly_investment"] is None
    # Sanity: the achieved prob at cap is below target.
    assert out["achieved_probability_at_required"] < 0.95


def test_invert_trivial_goal_returns_zero(authed_client):
    """A 1 EGP goal clears at 0 EGP/month."""
    payload = {
        **BASE,
        "goal_target_amount": 1.0,
        "target_probability": 0.80,
    }
    r = authed_client.post("/api/simulate/invert", json=payload)
    assert r.status_code == 200, r.text
    assert r.json()["required_monthly_investment"] == 0.0
    assert r.json()["achieved_probability_at_required"] >= 0.80


def test_invert_double_prob_never_lower_than_required_prob(authed_client):
    """Sanity anchor: contributing 2× required never hurts the probability."""
    r = authed_client.post("/api/simulate/invert", json={**BASE, "target_probability": 0.80})
    assert r.status_code == 200, r.text
    out = r.json()
    if out["achieved_probability_at_double"] is not None:
        assert out["achieved_probability_at_double"] >= out["achieved_probability_at_required"] - 0.02


def test_invert_horizon_extension_is_within_range(authed_client):
    """The horizon-alternative must fall in [input_duration_years, 40] or be null."""
    r = authed_client.post("/api/simulate/invert", json={**BASE, "target_probability": 0.80})
    assert r.status_code == 200, r.text
    horizon = r.json()["required_horizon_years"]
    if horizon is not None:
        assert BASE["duration_years"] <= horizon <= 40


def test_invert_rejects_target_out_of_range(authed_client):
    r = authed_client.post("/api/simulate/invert", json={**BASE, "target_probability": 0.4})
    assert r.status_code == 422


def test_invert_rejects_missing_goal(authed_client):
    payload = {k: v for k, v in BASE.items() if k != "goal_target_amount"}
    r = authed_client.post("/api/simulate/invert", json={**payload, "target_probability": 0.80})
    assert r.status_code == 422
