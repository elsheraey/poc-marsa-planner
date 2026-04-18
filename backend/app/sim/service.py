"""Thread-safe lazy initialization of the Monte Carlo simulation matrices."""

from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

import numpy as np

from ..config import get_settings
from .advisor import UserGoal, advise
from .engine import run_simulation
from .preprocessing import inflation_series, preprocess_asset
from .sample_data import generate as generate_sample_data

_lock = threading.Lock()
_cache: dict[str, Any] = {}


def _data_dir() -> Path:
    settings = get_settings()
    path = Path(settings.data_dir)
    if not path.is_absolute():
        path = (Path(__file__).resolve().parent.parent.parent / path).resolve()
    return path


def _ensure_data(data_dir: Path) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    if not (data_dir / "abc_equity_fund.csv").exists():
        generate_sample_data(data_dir=data_dir)


def load_simulation() -> dict[str, Any]:
    with _lock:
        if "sim" in _cache:
            return _cache["sim"]
        data_dir = _data_dir()
        _ensure_data(data_dir)
        variable_returns = preprocess_asset(data_dir / "abc_equity_fund.csv")
        fixed_returns = preprocess_asset(data_dir / "ebe_money_market_fund.csv")
        inflation = inflation_series(data_dir / "inflation.csv")
        _cache["sim"] = run_simulation(variable_returns, fixed_returns, inflation)
        return _cache["sim"]


def reset_cache() -> None:
    with _lock:
        _cache.clear()


def run_advisor(goal: UserGoal, goal_target_amount: float | None = None) -> dict[str, Any]:
    sim = load_simulation()
    best, all_results = advise(sim["variable_monthly"], sim["fixed_monthly"], goal)

    candidates = [
        {"variable_pct": r.variable_pct, "percentiles": {str(k): v for k, v in r.percentiles.items()}}
        for r in all_results
    ]
    recommended = {
        "variable_pct": best.variable_pct,
        "percentiles": {str(k): v for k, v in best.percentiles.items()},
    }

    months = goal.duration_years * 12
    var_m = sim["variable_monthly"][:, :months]
    fix_m = sim["fixed_monthly"][:, :months]
    blended = best.variable_pct * var_m + (1 - best.variable_pct) * fix_m

    n = blended.shape[0]
    value = np.full(n, float(goal.initial_investment))
    monthly_contrib = float(goal.monthly_investment)
    yearly_paths: list[np.ndarray] = []
    for m in range(months):
        value = value * (1.0 + blended[:, m]) + monthly_contrib
        if (m + 1) % 12 == 0:
            yearly_paths.append(value.copy())
            monthly_contrib *= 1.0 + goal.annual_increase_pct
    paths = np.stack(yearly_paths, axis=1)

    projection = {
        "years": list(range(1, goal.duration_years + 1)),
        "pessimistic": np.percentile(paths, 15, axis=0).tolist(),
        "median": np.percentile(paths, 50, axis=0).tolist(),
        "optimistic": np.percentile(paths, 85, axis=0).tolist(),
    }

    # Probability of goal: P(final_portfolio_value >= goal_target_amount).
    # `importance` still steers the advisor's allocation pick (which percentile
    # to optimize for), but is decoupled from this probability metric.
    prob: float | None
    if goal_target_amount is not None:
        prob = round(float((best.final_values >= float(goal_target_amount)).mean()), 4)
    else:
        prob = None

    return {
        "recommended": recommended,
        "candidates": candidates,
        "projection": projection,
        "probability_of_goal": prob,
    }
