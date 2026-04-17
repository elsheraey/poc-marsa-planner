"""Generate synthetic NAV + inflation CSVs matching the PDF's stated parameters.

The real Azimut data for ABC Equity Fund, EBE Money Market Fund, and
month-on-month inflation is not included in this repo. This script
produces placeholder CSVs with the same schema and similar statistical
properties so the pipeline can be exercised end-to-end. Replace these
CSVs with real data to get real results.

Equity fund target (from the doc): mu=0.006243724543093228,
sigma=0.09185267212882543 on nominal monthly returns.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

# Equity (variable) params from the PDF.
EQUITY_MU = 0.006243724543093228
EQUITY_SIGMA = 0.09185267212882543

# Money market (fixed): plausible EGP short-rate assumptions.
MMF_MU = 0.008
MMF_SIGMA = 0.002

# Month-on-month inflation: plausible Egypt numbers.
INFL_MU = 0.010
INFL_SIGMA = 0.006


def _nav_from_returns(returns: np.ndarray, start: float = 100.0) -> np.ndarray:
    return start * np.cumprod(1.0 + returns)


def _write_daily_nav(
    data_dir: Path, name: str, monthly_mu: float, monthly_sigma: float, months: int, seed: int
) -> Path:
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2008-08-10", periods=months, freq="ME")
    monthly_returns = rng.normal(monthly_mu, monthly_sigma, size=months)
    monthly_nav = _nav_from_returns(monthly_returns)

    rows = []
    for i, (d, nav_end) in enumerate(zip(dates, monthly_nav, strict=True)):
        nav_prev = monthly_nav[i - 1] if i > 0 else 100.0
        intra_days = pd.date_range(end=d, periods=4, freq="7D")
        fracs = np.linspace(0.2, 1.0, len(intra_days))
        intra_nav = nav_prev + (nav_end - nav_prev) * fracs
        for day, nav_val in zip(intra_days, intra_nav, strict=True):
            rows.append({"date": day.strftime("%Y-%m-%d"), "nav": round(float(nav_val), 4)})

    path = data_dir / f"{name}.csv"
    pd.DataFrame(rows).to_csv(path, index=False)
    return path


def _write_inflation(data_dir: Path, months: int, seed: int) -> Path:
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2008-08-31", periods=months, freq="ME")
    rates = rng.normal(INFL_MU, INFL_SIGMA, size=months)
    path = data_dir / "inflation.csv"
    pd.DataFrame({"date": dates.strftime("%Y-%m-%d"), "rate": np.round(rates, 6)}).to_csv(
        path, index=False
    )
    return path


def generate(months: int = 180, data_dir: Path | None = None) -> dict[str, Path]:
    target = Path(data_dir) if data_dir else DEFAULT_DATA_DIR
    target.mkdir(parents=True, exist_ok=True)
    return {
        "equity": _write_daily_nav(target, "abc_equity_fund", EQUITY_MU, EQUITY_SIGMA, months, seed=1),
        "money_market": _write_daily_nav(target, "ebe_money_market_fund", MMF_MU, MMF_SIGMA, months, seed=2),
        "inflation": _write_inflation(target, months, seed=3),
    }


if __name__ == "__main__":
    paths = generate()
    for k, p in paths.items():
        print(f"wrote {k}: {p}")
