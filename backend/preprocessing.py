"""Part 1: Preprocessing.

Loads historical NAV data, reduces to one point per month (latest), and
converts to nominal monthly returns. Same pipeline for the variable
(equity) and fixed (money market) assets.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


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


def preprocess_asset(csv_path: str | Path) -> np.ndarray:
    return to_returns(to_monthly(load_nav(csv_path)))
