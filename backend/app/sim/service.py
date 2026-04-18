"""Thread-safe lazy initialization of the Monte Carlo simulation matrices."""

from __future__ import annotations

import json
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


def load_calibration_as_of() -> str | None:
    """Return the analyst-shipped calibration snapshot date as `YYYY-MM-DD`
    (or `YYYY-MM`), or None if the manifest is missing / malformed.

    Cached per-process under the shared `_cache` lock so the JSON is read at
    most once. Looks for the first `calibration_*.json` file under the data
    dir and reads `as_of` (preferred), `snapshot_date`, or `calibration_id`
    (tail-stripped) in that order.
    """
    with _lock:
        if "calibration_as_of" in _cache:
            return _cache["calibration_as_of"]
        value: str | None = None
        try:
            data_dir = _data_dir()
            candidates = sorted(data_dir.glob("calibration_*.json"))
            if candidates:
                with candidates[-1].open("r", encoding="utf-8") as f:
                    calib = json.load(f)
                for key in ("as_of", "snapshot_date", "calibration_date"):
                    raw = calib.get(key)
                    if isinstance(raw, str) and raw:
                        value = raw
                        break
                if value is None:
                    # Fall back to deriving from `calibration_id` like
                    # "calibration_2026-04" -> "2026-04".
                    cid = calib.get("calibration_id")
                    if isinstance(cid, str) and "_" in cid:
                        tail = cid.rsplit("_", 1)[-1]
                        if tail:
                            value = tail
        except (OSError, json.JSONDecodeError, ValueError):
            value = None
        _cache["calibration_as_of"] = value
        return value


def _classify_attainability(
    pessimistic_final: float,
    median_final: float,
    goal_real_final: float,
) -> str:
    """Map final-year projection bands to an attainability bucket."""
    if pessimistic_final >= goal_real_final:
        return "attainable"
    if median_final >= goal_real_final:
        return "aspirational"
    return "out_of_reach"


def run_advisor(
    goal: UserGoal,
    goal_target_amount: float | None = None,
    return_in_real_terms: bool = True,
) -> dict[str, Any]:
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
    infl_m = sim["inflation_monthly"][:, :months]
    blended = best.variable_pct * var_m + (1 - best.variable_pct) * fix_m

    n = blended.shape[0]
    value = np.full(n, float(goal.initial_investment))
    monthly_contrib = float(goal.monthly_investment)
    # Per-scenario cumulative inflation factor at month m: prod_{i<=m} (1+infl_i).
    cum_infl = np.ones(n)
    yearly_nominal: list[np.ndarray] = []
    yearly_cum_infl: list[np.ndarray] = []
    for m in range(months):
        value = value * (1.0 + blended[:, m]) + monthly_contrib
        cum_infl = cum_infl * (1.0 + infl_m[:, m])
        if (m + 1) % 12 == 0:
            yearly_nominal.append(value.copy())
            yearly_cum_infl.append(cum_infl.copy())
            monthly_contrib *= 1.0 + goal.annual_increase_pct
    nominal_paths = np.stack(yearly_nominal, axis=1)           # (n, years)
    cum_infl_paths = np.stack(yearly_cum_infl, axis=1)          # (n, years)

    if return_in_real_terms:
        paths = nominal_paths / cum_infl_paths
    else:
        paths = nominal_paths

    projection = {
        "years": list(range(1, goal.duration_years + 1)),
        "pessimistic": np.percentile(paths, 15, axis=0).tolist(),
        "median": np.percentile(paths, 50, axis=0).tolist(),
        "optimistic": np.percentile(paths, 85, axis=0).tolist(),
    }

    # Probability-of-goal and attainability are evaluated on the same
    # basis (real or nominal) as the projection. In real terms the goal
    # target is CPI-deflated per scenario at the target (final) year.
    prob: float | None
    prob_se: float | None
    attainability: str | None
    if goal_target_amount is None:
        prob = None
        prob_se = None
        attainability = None
    elif float(goal_target_amount) == 0.0:
        # Trivially-funded goal: any non-negative terminal value clears 0
        # EGP, so short-circuit to a deterministic 1.0 / attainable. This
        # also side-steps the `target / cum_infl_final` pathology below.
        prob = 1.0
        prob_se = 0.0
        attainability = "attainable"
    else:
        target = float(goal_target_amount)
        nominal_final = nominal_paths[:, -1]
        cum_infl_final = cum_infl_paths[:, -1]
        if return_in_real_terms:
            # Equivalent: real_final >= target / cum_infl_final. Clip the
            # per-scenario real goal to a 1e-6 EGP floor so extreme Egyptian
            # CPI paths can't round `target / cum_infl_final` down to 0 and
            # trivially satisfy `final_value >= 0` for empty portfolios.
            real_final = nominal_final / cum_infl_final
            goal_real_per_scenario = np.maximum(target / cum_infl_final, 1e-6)
            prob = round(float((real_final >= goal_real_per_scenario).mean()), 4)
            # For the attainability bucket we compare the (deterministic)
            # percentile bands of the real projection against the
            # median-inflation-deflated goal at the target year.
            goal_real_at_target = target / float(np.median(cum_infl_final))
        else:
            prob = round(float((nominal_final >= target).mean()), 4)
            goal_real_at_target = target

        # Monte Carlo standard error — Bernoulli: sqrt(p(1-p)/N).
        # Spec §4(c): SE ≤ 0.005 at N=10,000 by construction.
        n_scenarios = int(nominal_final.shape[0])
        prob_se = round(float(np.sqrt(prob * (1.0 - prob) / n_scenarios)), 6)

        attainability = _classify_attainability(
            pessimistic_final=float(projection["pessimistic"][-1]),
            median_final=float(projection["median"][-1]),
            goal_real_final=goal_real_at_target,
        )

    return {
        "recommended": recommended,
        "candidates": candidates,
        "projection": projection,
        "probability_of_goal": prob,
        "probability_of_goal_se": prob_se,
        "attainability": attainability,
        "calibration_as_of": load_calibration_as_of(),
    }
