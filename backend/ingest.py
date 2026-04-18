"""Calibration-data ingest CLI: `python ingest.py ingest --source azimut`.

Re-reads backend/data/*.csv, checks spec §1 fit-range guardrails, writes
backend/data/calibration_<YYYY-MM>.json (per-series μ/σ, empirical corr, git SHA).
Exits non-zero if any fitted μ/σ is out of range.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from app.sim.engine import empirical_corr
from app.sim.preprocessing import inflation_series, preprocess_asset
from app.sim.service import reset_cache

DATA_DIR = Path(__file__).parent / "data"

# Spec §1 acceptable ranges. Equity/MMF μ is μ_real (CPI-deflated); inflation μ is nominal MoM.
FIT_RANGES = {
    "equity": {"mu": (0.001, 0.012), "sigma": (0.060, 0.095)},
    "mmf": {"mu": (0.002, 0.008), "sigma": (0.0010, 0.0025)},
    "inflation": {"mu": (0.010, 0.016), "sigma": (0.008, 0.014)},
}


def _git_sha() -> str:
    try:
        out = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=Path(__file__).parent, stderr=subprocess.DEVNULL)
        return out.decode().strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


def _fit_stats(returns: np.ndarray, infl: np.ndarray | None = None) -> dict:
    """μ on the CPI-deflated series (§1 μ_monthly_real); σ on the nominal series."""
    if infl is not None:
        n = min(len(returns), len(infl))
        r_real = (1 + returns[-n:]) / (1 + infl[-n:]) - 1
        return {"mu": float(np.mean(r_real)), "sigma": float(np.std(returns[-n:], ddof=0))}
    return {"mu": float(np.mean(returns)), "sigma": float(np.std(returns, ddof=0))}


def _check(series: str, stats: dict) -> list[str]:
    errs: list[str] = []
    for key in ("mu", "sigma"):
        lo, hi = FIT_RANGES[series][key]
        if not (lo <= stats[key] <= hi):
            errs.append(f"{series}: {key}={stats[key]:.6f} outside [{lo}, {hi}]")
    return errs


def ingest(source: str) -> int:
    if source != "azimut":
        print(f"unknown --source {source!r}; only 'azimut' is implemented", file=sys.stderr)
        return 2
    eq = preprocess_asset(DATA_DIR / "abc_equity_fund.csv")
    mmf = preprocess_asset(DATA_DIR / "ebe_money_market_fund.csv")
    infl = inflation_series(DATA_DIR / "inflation.csv")
    stats = {"equity": _fit_stats(eq, infl), "mmf": _fit_stats(mmf, infl), "inflation": _fit_stats(infl)}
    errors = [e for k, v in stats.items() for e in _check(k, v)]
    if errors:
        print("FAIL — fit-range guardrail (spec §1):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1
    snapshot = {
        "as_of": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "source": source,
        "git_sha": _git_sha(),
        "fits": stats,
        "empirical_corr": empirical_corr([eq, mmf, infl]).tolist(),
        "corr_labels": ["equity", "mmf", "inflation"],
    }
    out = DATA_DIR / f"calibration_{datetime.now(timezone.utc).strftime('%Y-%m')}.json"
    out.write_text(json.dumps(snapshot, indent=2) + "\n")
    reset_cache()  # in-process only; a separate uvicorn still needs a restart.
    print(f"OK — wrote {out} ({len(eq)} eq / {len(mmf)} mmf / {len(infl)} infl obs)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(prog="ingest", description="Marsa planner calibration ingest")
    sub = ap.add_subparsers(dest="cmd", required=True)
    ig = sub.add_parser("ingest", help="refit calibration snapshot from backend/data/*.csv")
    ig.add_argument("--source", choices=["azimut"], required=True)
    args = ap.parse_args()
    if args.cmd == "ingest":
        return ingest(args.source)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
