"""Part 3: Investment advisor.

Translates user inputs into queries over the simulation matrices from
Part 2. Chooses the best variable/fixed allocation based on the user's
risk tolerance (allocation search space) and goal importance (which
percentile of final portfolio value to maximize).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# Goal importance -> percentile of the final-value distribution to optimize.
# "Essential" means "best value attainable across 70% of scenarios" = P30, etc.
IMPORTANCE_PERCENTILES = {
    "worst": 15,
    "essential": 30,
    "medium": 50,
    "best": 85,
}

# Refined risk mapping (from the doc's Part 3 refinement paragraph):
# Moderate -> 60%, High -> 80%, ... with +/- 10% deviation allowed.
RISK_VARIABLE_PCT = {
    "very_low": 0.0,
    "low": 0.30,
    "moderate": 0.60,
    "high": 0.80,
    "very_high": 1.00,
}
RISK_DEVIATION = 0.10
ALLOCATION_STEP = 0.10


@dataclass
class UserGoal:
    duration_years: int
    initial_investment: float
    monthly_investment: float
    annual_increase_pct: float  # e.g. 0.0, 0.05
    importance: str              # one of IMPORTANCE_PERCENTILES keys
    risk_tolerance: str          # one of RISK_VARIABLE_PCT keys


@dataclass
class PortfolioResult:
    variable_pct: float
    percentiles: dict[int, float]  # {15: ..., 30: ..., 50: ..., 85: ...}
    final_values: np.ndarray       # shape (n_scenarios,)


def _candidate_allocations(risk_tolerance: str) -> list[float]:
    base = RISK_VARIABLE_PCT[risk_tolerance]
    lo = max(0.0, base - RISK_DEVIATION)
    hi = min(1.0, base + RISK_DEVIATION)
    steps = int(round((hi - lo) / ALLOCATION_STEP)) + 1
    return [round(lo + i * ALLOCATION_STEP, 2) for i in range(steps)]


def project_portfolio(
    variable_monthly: np.ndarray,  # shape (n_scenarios, horizon_months)
    fixed_monthly: np.ndarray,
    goal: UserGoal,
    variable_pct: float,
) -> np.ndarray:
    """Simulate the user's cash flows under a fixed allocation, return final values."""
    months = goal.duration_years * 12
    n_scenarios = variable_monthly.shape[0]

    blended = variable_pct * variable_monthly[:, :months] + (1 - variable_pct) * fixed_monthly[:, :months]

    value = np.full(n_scenarios, float(goal.initial_investment))
    monthly_contrib = float(goal.monthly_investment)
    for m in range(months):
        value = value * (1.0 + blended[:, m]) + monthly_contrib
        if (m + 1) % 12 == 0:
            monthly_contrib *= 1.0 + goal.annual_increase_pct
    return value


def evaluate_portfolios(
    variable_monthly: np.ndarray,
    fixed_monthly: np.ndarray,
    goal: UserGoal,
) -> list[PortfolioResult]:
    results: list[PortfolioResult] = []
    for alloc in _candidate_allocations(goal.risk_tolerance):
        finals = project_portfolio(variable_monthly, fixed_monthly, goal, alloc)
        percentiles = {p: float(np.percentile(finals, p)) for p in IMPORTANCE_PERCENTILES.values()}
        results.append(PortfolioResult(variable_pct=alloc, percentiles=percentiles, final_values=finals))
    return results


def pick_best(results: list[PortfolioResult], importance: str) -> PortfolioResult:
    p = IMPORTANCE_PERCENTILES[importance]
    return max(results, key=lambda r: r.percentiles[p])


def advise(
    variable_monthly: np.ndarray,
    fixed_monthly: np.ndarray,
    goal: UserGoal,
) -> tuple[PortfolioResult, list[PortfolioResult]]:
    results = evaluate_portfolios(variable_monthly, fixed_monthly, goal)
    return pick_best(results, goal.importance), results
