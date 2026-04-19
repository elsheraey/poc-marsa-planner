"""Part 1: Preprocessing.

Loads historical NAV data, reduces to one point per month (latest), and
converts to monthly returns. When an inflation series is supplied we
convert to REAL monthly returns at source — `r_real = (1+r_nom)/(1+infl) - 1`
— so the fitted distribution downstream is a stationary real-return
distribution. This removes the devaluation-spike bias: a +30% nominal
equity jump during the 2016-11 float deflates against the coincident +4.85%
MoM CPI to a +22.7% real move, still an outlier but no longer fat-tailing
the whole sample to a 13-17% implied real CAGR.

A fixed ±8% winsorizer provides a second defensive layer — see
`winsorize_returns` — that caps residual devaluation-scale draws without
destroying normal tail behaviour. The pair (real fit + winsorization) is
what the investigation in `docs/bugs/attainability-investigation.md` §10
calls "approach A + belt-and-braces".
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

# Default symmetric winsorization bound for post-deflation residual spikes.
# Calibrated against `docs/bugs/attainability-investigation.md` §9.3: after
# deflation 21/135 months still exceed ±10% real; clipping at ±8% drops
# those devaluation tails while keeping normal ±2σ moves (σ_real ≈ 4.7%).
WINSOR_BOUND_DEFAULT = 0.08


def load_nav(csv_path: str | Path, date_col: str = "date", nav_col: str = "nav") -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df[date_col] = pd.to_datetime(df[date_col])
    df = df.sort_values(date_col).reset_index(drop=True)
    return df.rename(columns={date_col: "date", nav_col: "nav"})[["date", "nav"]]


def to_monthly(nav: pd.DataFrame) -> pd.DataFrame:
    """Keep the latest NAV per calendar month (STEP 1 in the doc)."""
    idx = nav.groupby(nav["date"].dt.to_period("M"))["date"].idxmax()
    monthly = nav.loc[idx].reset_index(drop=True)
    monthly["month"] = monthly["date"].dt.to_period("M")
    return monthly


def to_returns(monthly_nav: pd.DataFrame) -> np.ndarray:
    """Nominal monthly returns r_t = NAV_t / NAV_{t-1} - 1 (STEP 2)."""
    nav = monthly_nav["nav"].to_numpy(dtype=float)
    return nav[1:] / nav[:-1] - 1.0


def inflation_series(csv_path: str | Path) -> np.ndarray:
    """Month-on-month inflation rates (already monthly)."""
    df = pd.read_csv(csv_path)
    return df["rate"].to_numpy(dtype=float)


def to_real_returns(nominal: np.ndarray, inflation: np.ndarray) -> np.ndarray:
    """Convert nominal monthly returns to real monthly returns.

    `r_real_t = (1 + r_nom_t) / (1 + infl_t) - 1`.

    Aligns the two arrays from the right (most recent observations) to the
    shorter length — e.g. equity has n=136 and inflation has n=135, so we
    drop the first equity observation. This matches the index alignment
    used by `empirical_corr` elsewhere in the engine.
    """
    n = min(len(nominal), len(inflation))
    return (1.0 + nominal[-n:]) / (1.0 + inflation[-n:]) - 1.0


def winsorize_returns(returns: np.ndarray, bound: float = WINSOR_BOUND_DEFAULT) -> np.ndarray:
    """Symmetrically clip returns to ±bound.

    Defensive layer against residual devaluation-scale moves that survive
    CPI deflation (Egyptian equity often overshoots the monthly CPI pass-
    through in float months). At bound=0.08 this only touches the top ~15%
    of the sample — see the investigation doc §9.3.
    """
    return np.clip(returns, -bound, bound)


def preprocess_asset(
    csv_path: str | Path,
    inflation: np.ndarray | None = None,
    winsorize: bool = False,
    winsor_bound: float = WINSOR_BOUND_DEFAULT,
) -> np.ndarray:
    """Load an asset's NAV series and return monthly returns.

    Arguments:
        csv_path: path to the NAV CSV (columns: date, nav).
        inflation: optional MoM inflation series. When supplied, the returned
            array is REAL (CPI-deflated) monthly returns; when None, the
            returned array is nominal (legacy behaviour).
        winsorize: if True, clip the returned series symmetrically at
            ±winsor_bound. Used to tame devaluation spikes that survive
            deflation — see `docs/bugs/attainability-investigation.md` §10.
        winsor_bound: clipping bound (default 8%).
    """
    nominal = to_returns(to_monthly(load_nav(csv_path)))
    if inflation is not None:
        out = to_real_returns(nominal, inflation)
    else:
        out = nominal
    if winsorize:
        out = winsorize_returns(out, bound=winsor_bound)
    return out
