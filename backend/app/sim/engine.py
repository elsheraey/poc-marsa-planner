"""Part 2: Monte Carlo simulation.

Fit a distribution to each asset's nominal monthly returns, sample
N_SCENARIOS paths over HORIZON_MONTHS, then aggregate into yearly
returns by compound-growth of each consecutive 12-month block.

Joint sampling uses a Gaussian copula on the 3x3 empirical correlation
matrix of the historical series (equity, MMF, inflation), so the
sampled paths preserve cross-asset dependence while keeping each
marginal's KS-selected distribution.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import stats

from ..logging import get_logger

N_SCENARIOS = 10_000
HORIZON_MONTHS = 480  # 40 years — spec §9 hard cap
MONTHS_PER_YEAR = 12

_log = get_logger(__name__)


@dataclass
class FitResult:
    name: str
    params: tuple
    dist: stats.rv_continuous

    def sample(self, shape: tuple[int, ...], rng: np.random.Generator) -> np.ndarray:
        return self.dist.rvs(*self.params, size=shape, random_state=rng)

    def ppf(self, u: np.ndarray) -> np.ndarray:
        return self.dist.ppf(u, *self.params)


def fit_normal(returns: np.ndarray) -> FitResult:
    mu, sigma = stats.norm.fit(returns)
    return FitResult("norm", (mu, sigma), stats.norm)


def _recenter_to_empirical_mean(name: str, params: tuple, returns: np.ndarray) -> tuple:
    """Shift the fitted distribution's location so E[X] matches sample mean.

    Background: `scipy.stats.{t,laplace}.fit` is MLE-based and, on a sample
    with an asymmetric heavy tail (common after CPI-deflation for Egyptian
    MMF / equity — see investigation doc §9), picks a location that is
    closer to the sample MEDIAN than the sample MEAN. That's statistically
    correct for shape-fitting but a disaster for Monte Carlo CAGR — the
    simulated arithmetic mean of monthly returns drives the projection,
    not the median.

    We preserve the fitted (df, scale) and just set the location so that
    the resulting distribution has the same sample mean as the data. For
    `norm` the fit already matches by construction; this is a no-op.

    For `t(df, loc, scale)`: E[X] = loc when df>1, so shifting loc to
    sample mean makes the moment match exactly. For `laplace(loc, scale)`:
    E[X] = loc, same.
    """
    if name == "norm":
        return params  # norm MLE already matches sample mean
    sample_mean = float(np.mean(returns))
    if name == "t":
        df, _loc, scale = params
        return (df, sample_mean, scale)
    if name == "laplace":
        _loc, scale = params
        return (sample_mean, scale)
    return params  # unknown family — don't touch


def fit_best(returns: np.ndarray, candidates: tuple[str, ...] = ("norm", "t", "laplace")) -> FitResult:
    """Pick the candidate with the best Kolmogorov-Smirnov p-value, then
    recenter its location to preserve the sample mean.

    KS selection gives us the best SHAPE (fat tails vs normal vs double-
    exponential); recentering gives us the correct MEAN for compounding.
    Without the recenter step the projection over-reports terminal value
    whenever the residual asymmetry in the post-deflation series pulls
    the MLE location above the empirical mean — the subtle remainder of
    the devaluation bias, even after ±8% winsorization.
    """
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
    recentered = _recenter_to_empirical_mean(best.name, best.params, returns)
    return FitResult(best.name, recentered, best.dist)


def simulate_monthly(
    fit: FitResult,
    n_scenarios: int = N_SCENARIOS,
    horizon_months: int = HORIZON_MONTHS,
    seed: int | None = 42,
) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return fit.sample((n_scenarios, horizon_months), rng)


def empirical_corr(series: list[np.ndarray]) -> np.ndarray:
    """Compute the empirical Pearson correlation matrix of k series.

    Series may have different lengths; they are aligned to the shortest
    length from the right (most recent observations used).
    """
    n = min(len(s) for s in series)
    aligned = np.stack([s[-n:] for s in series])
    return np.corrcoef(aligned)


def _cholesky_or_none(corr: np.ndarray) -> np.ndarray | None:
    """Return the lower Cholesky factor, or None if corr is not PSD."""
    try:
        return np.linalg.cholesky(corr)
    except np.linalg.LinAlgError:
        return None


def sample_correlated_monthly(
    fits: list[FitResult],
    corr: np.ndarray,
    n_scenarios: int,
    horizon_months: int,
    seed: int | None = 42,
) -> list[np.ndarray] | None:
    """Gaussian-copula joint sampling of k marginals with target correlation.

    Returns a list of k arrays, each shape (n_scenarios, horizon_months),
    or ``None`` if the copula could not be built (non-PSD corr, or a
    marginal ppf failure). Callers fall back to independent sampling.
    """
    k = len(fits)
    assert corr.shape == (k, k), "corr matrix must match number of marginals"

    chol = _cholesky_or_none(corr)
    if chol is None:
        _log.warning("correlated_sampling_fallback", reason="corr matrix not PSD")
        return None

    try:
        rng = np.random.default_rng(seed)
        # Draw standard normals and induce correlation via Cholesky.
        z = rng.standard_normal(size=(n_scenarios * horizon_months, k))
        z_corr = z @ chol.T  # rows are now correlated standard normals
        # Push through standard normal CDF -> uniforms, then invert marginal.
        u = stats.norm.cdf(z_corr)
        # Clip to avoid infinities from ppf(0) / ppf(1) with heavy-tailed marginals.
        u = np.clip(u, 1e-12, 1 - 1e-12)
        draws: list[np.ndarray] = []
        for i, fit in enumerate(fits):
            x = fit.ppf(u[:, i]).reshape(n_scenarios, horizon_months)
            if not np.all(np.isfinite(x)):
                _log.warning("correlated_sampling_fallback", reason="non-finite ppf values")
                return None
            draws.append(x)
        return draws
    except Exception as exc:  # noqa: BLE001 - fall back broadly on copula issues
        _log.warning("correlated_sampling_fallback", reason=f"copula error: {exc}")
        return None


def monthly_to_yearly(monthly: np.ndarray) -> np.ndarray:
    """Compound each consecutive 12-month block into a yearly return.

    yearly_j = prod(1 + monthly_{12j..12j+11}) - 1.

    (The previous arithmetic-mean version was a latent bug that
    understated dispersion and biased the mean whenever sigma was
    comparable to mu. See analyst report change #7.)
    """
    n, months = monthly.shape
    years = months // MONTHS_PER_YEAR
    trimmed = monthly[:, : years * MONTHS_PER_YEAR]
    blocks = trimmed.reshape(n, years, MONTHS_PER_YEAR)
    return np.prod(1.0 + blocks, axis=2) - 1.0


def run_simulation(
    variable_returns: np.ndarray,
    fixed_returns: np.ndarray,
    inflation: np.ndarray,
    n_scenarios: int = N_SCENARIOS,
    horizon_months: int = HORIZON_MONTHS,
    seed: int = 42,
    correlated: bool = True,
) -> dict[str, np.ndarray]:
    variable_fit = fit_best(variable_returns)
    fixed_fit = fit_best(fixed_returns)
    inflation_fit = fit_best(inflation)

    corr = empirical_corr([variable_returns, fixed_returns, inflation])

    draws: list[np.ndarray] | None = None
    if correlated:
        draws = sample_correlated_monthly(
            [variable_fit, fixed_fit, inflation_fit],
            corr,
            n_scenarios,
            horizon_months,
            seed=seed,
        )

    if draws is None:
        variable_m = simulate_monthly(variable_fit, n_scenarios, horizon_months, seed)
        fixed_m = simulate_monthly(fixed_fit, n_scenarios, horizon_months, seed + 1)
        inflation_m = simulate_monthly(inflation_fit, n_scenarios, horizon_months, seed + 2)
    else:
        variable_m, fixed_m, inflation_m = draws

    return {
        "variable_monthly": variable_m,
        "fixed_monthly": fixed_m,
        "inflation_monthly": inflation_m,
        "variable_yearly": monthly_to_yearly(variable_m),
        "fixed_yearly": monthly_to_yearly(fixed_m),
        "inflation_yearly": monthly_to_yearly(inflation_m),
        "empirical_corr": corr,
        "fits": {
            "variable": variable_fit,
            "fixed": fixed_fit,
            "inflation": inflation_fit,
        },
    }
