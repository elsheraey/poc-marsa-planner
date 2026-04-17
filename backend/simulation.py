"""Part 2: Monte Carlo simulation.

Fit a distribution to each asset's nominal monthly returns, sample
N_SCENARIOS paths over HORIZON_MONTHS, then aggregate into yearly
returns by averaging each consecutive 12-month block (per the doc).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import stats

N_SCENARIOS = 10_000
HORIZON_MONTHS = 1_200  # 100 years
MONTHS_PER_YEAR = 12


@dataclass
class FitResult:
    name: str
    params: tuple
    dist: stats.rv_continuous

    def sample(self, shape: tuple[int, ...], rng: np.random.Generator) -> np.ndarray:
        return self.dist.rvs(*self.params, size=shape, random_state=rng)


def fit_normal(returns: np.ndarray) -> FitResult:
    mu, sigma = stats.norm.fit(returns)
    return FitResult("norm", (mu, sigma), stats.norm)


def fit_best(returns: np.ndarray, candidates: tuple[str, ...] = ("norm", "t", "laplace")) -> FitResult:
    """Pick the candidate with the best Kolmogorov-Smirnov p-value."""
    best: FitResult | None = None
    best_p = -1.0
    for name in candidates:
        dist = getattr(stats, name)
        params = dist.fit(returns)
        _, p = stats.kstest(returns, name, args=params)
        if p > best_p:
            best_p = p
            best = FitResult(name, params, dist)
    assert best is not None
    return best


def simulate_monthly(
    fit: FitResult,
    n_scenarios: int = N_SCENARIOS,
    horizon_months: int = HORIZON_MONTHS,
    seed: int | None = 42,
) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return fit.sample((n_scenarios, horizon_months), rng)


def monthly_to_yearly(monthly: np.ndarray) -> np.ndarray:
    """Average each consecutive 12-month block (STEP 3)."""
    n, months = monthly.shape
    years = months // MONTHS_PER_YEAR
    trimmed = monthly[:, : years * MONTHS_PER_YEAR]
    return trimmed.reshape(n, years, MONTHS_PER_YEAR).mean(axis=2)


def run_simulation(
    variable_returns: np.ndarray,
    fixed_returns: np.ndarray,
    inflation: np.ndarray,
    n_scenarios: int = N_SCENARIOS,
    horizon_months: int = HORIZON_MONTHS,
    seed: int = 42,
) -> dict[str, np.ndarray]:
    variable_fit = fit_best(variable_returns)
    fixed_fit = fit_best(fixed_returns)
    inflation_fit = fit_best(inflation)

    variable_m = simulate_monthly(variable_fit, n_scenarios, horizon_months, seed)
    fixed_m = simulate_monthly(fixed_fit, n_scenarios, horizon_months, seed + 1)
    inflation_m = simulate_monthly(inflation_fit, n_scenarios, horizon_months, seed + 2)

    return {
        "variable_monthly": variable_m,
        "fixed_monthly": fixed_m,
        "inflation_monthly": inflation_m,
        "variable_yearly": monthly_to_yearly(variable_m),
        "fixed_yearly": monthly_to_yearly(fixed_m),
        "inflation_yearly": monthly_to_yearly(inflation_m),
        "fits": {
            "variable": variable_fit,
            "fixed": fixed_fit,
            "inflation": inflation_fit,
        },
    }
