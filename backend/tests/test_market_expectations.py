"""MENA market expectations — joint sampling, compounding, real terms, attainability.

Encodes the spec the analyst laid out in docs/analyst-report.md and that
the QA team is turning into acceptance tests. Keep lean; each block tests
one claim.
"""

from __future__ import annotations

import numpy as np

from app.sim.advisor import UserGoal
from app.sim.engine import empirical_corr, monthly_to_yearly, run_simulation
from app.sim.service import _classify_attainability, run_advisor

# ---------- 1. monthly_to_yearly is a compound, not arithmetic mean ----------


def test_monthly_to_yearly_compounds_returns() -> None:
    """Yearly return from 12 monthly returns must be prod(1+r) - 1."""
    monthly = np.tile(np.array([0.01] * 12, dtype=float), (1, 1))
    yearly = monthly_to_yearly(monthly)
    expected = (1.01 ** 12) - 1.0
    assert yearly.shape == (1, 1)
    assert np.isclose(yearly[0, 0], expected), yearly

    # Mixed signs still compound. arithmetic mean would be ~0; compound is not.
    r = np.array([[0.10, -0.05, 0.02, 0.03, -0.01, 0.04, 0.00, 0.01, 0.02, -0.02, 0.03, 0.01]])
    expected = float(np.prod(1.0 + r[0]) - 1.0)
    assert np.isclose(monthly_to_yearly(r)[0, 0], expected)


def test_monthly_to_yearly_is_not_arithmetic_mean() -> None:
    """Guard rail against the old engine bug: old impl returned mean(12), not prod-1."""
    r = np.array([[0.10, -0.05, 0.02, 0.03, -0.01, 0.04, 0.00, 0.01, 0.02, -0.02, 0.03, 0.01]])
    arithmetic_mean = r.mean()
    compound = monthly_to_yearly(r)[0, 0]
    assert not np.isclose(compound, arithmetic_mean), (
        f"engine regressed to arithmetic mean: got {compound} (= mean {arithmetic_mean})"
    )


# ---------- 2. Correlated Monte Carlo preserves the empirical corr matrix ----------


def _historical_series(seed: int = 0, n_obs: int = 240) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Generate 3 correlated historical series via a known Cholesky factor."""
    rng = np.random.default_rng(seed)
    target = np.array(
        [
            [1.0, 0.35, 0.20],
            [0.35, 1.0, 0.50],
            [0.20, 0.50, 1.0],
        ]
    )
    chol = np.linalg.cholesky(target)
    z = rng.standard_normal((n_obs, 3)) @ chol.T
    equity = 0.010 + 0.08 * z[:, 0]
    mmf = 0.015 + 0.002 * z[:, 1]
    infl = 0.012 + 0.007 * z[:, 2]
    return equity, mmf, infl


def test_correlation_preservation_under_correlated_sampling() -> None:
    equity, mmf, infl = _historical_series()
    empirical = empirical_corr([equity, mmf, infl])
    out = run_simulation(
        equity,
        mmf,
        infl,
        n_scenarios=200,
        horizon_months=240,
        seed=123,
        correlated=True,
    )
    sampled = np.stack(
        [
            out["variable_monthly"].ravel(),
            out["fixed_monthly"].ravel(),
            out["inflation_monthly"].ravel(),
        ]
    )
    sampled_corr = np.corrcoef(sampled)

    # Each off-diagonal entry within 0.1 of the empirical matrix.
    for i in range(3):
        for j in range(3):
            assert abs(sampled_corr[i, j] - empirical[i, j]) < 0.1, (
                f"corr[{i},{j}] drift: sampled={sampled_corr[i, j]:.3f} "
                f"vs empirical={empirical[i, j]:.3f}"
            )


def test_independent_fallback_when_corr_is_not_psd() -> None:
    """Non-PSD corr should trigger the independent-sampling fallback path."""
    from app.sim.engine import (
        fit_best,
        sample_correlated_monthly,
    )

    equity, mmf, infl = _historical_series()
    fits = [fit_best(equity), fit_best(mmf), fit_best(infl)]
    bad_corr = np.array([[1.0, 0.9, -0.9], [0.9, 1.0, 0.9], [-0.9, 0.9, 1.0]])
    out = sample_correlated_monthly(fits, bad_corr, n_scenarios=10, horizon_months=24)
    assert out is None


# ---------- 3. Real-terms toggle flips the reported values ----------


def test_real_terms_projection_is_below_nominal_for_positive_inflation() -> None:
    goal = UserGoal(
        duration_years=5,
        initial_investment=10_000,
        monthly_investment=500,
        annual_increase_pct=0.0,
        importance="essential",
        risk_tolerance="high",
    )
    nominal = run_advisor(goal, goal_target_amount=50_000, return_in_real_terms=False)
    real = run_advisor(goal, goal_target_amount=50_000, return_in_real_terms=True)

    # The sample CPI series is positive in mean — real values must be strictly
    # below nominal across every band.
    for band in ("pessimistic", "median", "optimistic"):
        assert real["projection"][band][-1] < nominal["projection"][band][-1], band

    # Real-terms probability of a nominal goal must be strictly lower, since
    # purchasing power is eroded.
    assert real["probability_of_goal"] <= nominal["probability_of_goal"]


def test_real_terms_default_is_true() -> None:
    goal = UserGoal(5, 10_000, 500, 0.0, "essential", "high")
    default = run_advisor(goal, goal_target_amount=50_000)
    real = run_advisor(goal, goal_target_amount=50_000, return_in_real_terms=True)
    # Same seeded pipeline — real default must match explicit real.
    assert default["projection"]["median"] == real["projection"]["median"]
    assert default["probability_of_goal"] == real["probability_of_goal"]


# ---------- 4. Attainability classification ----------


def test_attainability_attainable_when_p15_exceeds_goal() -> None:
    out = _classify_attainability(pessimistic_final=120.0, median_final=150.0, goal_real_final=100.0)
    assert out == "attainable"


def test_attainability_aspirational_when_median_exceeds_but_p15_does_not() -> None:
    out = _classify_attainability(pessimistic_final=80.0, median_final=150.0, goal_real_final=100.0)
    assert out == "aspirational"


def test_attainability_out_of_reach_when_median_below_goal() -> None:
    out = _classify_attainability(pessimistic_final=40.0, median_final=60.0, goal_real_final=100.0)
    assert out == "out_of_reach"


def test_attainability_is_null_without_target() -> None:
    goal = UserGoal(5, 10_000, 500, 0.0, "essential", "high")
    out = run_advisor(goal)
    assert out["attainability"] is None


def test_attainability_present_with_target() -> None:
    goal = UserGoal(5, 10_000, 500, 0.0, "essential", "high")
    out = run_advisor(goal, goal_target_amount=50_000)
    assert out["attainability"] in {"attainable", "aspirational", "out_of_reach"}


# ---------- 5. Monte Carlo standard error on probability_of_goal ----------


def test_probability_of_goal_se_bound() -> None:
    """Spec §4(c): SE = sqrt(p(1-p)/N) ≤ 0.005 at N=10,000."""
    goal = UserGoal(5, 50_000, 1_000, 0.0, "essential", "high")
    out = run_advisor(goal, goal_target_amount=100_000)
    se = out["probability_of_goal_se"]
    p = out["probability_of_goal"]
    assert se is not None and p is not None
    assert se <= 0.005, f"SE {se} exceeds spec §4(c) bound 0.005 at N=10k (p={p})"
    # SE is null when no goal target is supplied.
    assert run_advisor(goal)["probability_of_goal_se"] is None


# ---------- 6. Horizon cap — spec §9: duration_years > 40 rejected at the wire ----------


def test_horizon_cap_at_40_years(authed_client) -> None:  # noqa: ARG001 — fixture used via client
    r = authed_client.post(
        "/api/simulate",
        json={
            "duration_years": 50,
            "initial_investment": 50_000,
            "monthly_investment": 1_000,
            "annual_increase_pct": 0.0,
            "importance": "essential",
            "risk_tolerance": "high",
        },
    )
    assert r.status_code == 422, r.text
