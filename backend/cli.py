"""End-to-end runner for the Marsa RFA simulation.

Runs Part 1 (preprocessing) -> Part 2 (Monte Carlo) -> Part 3 (advice)
for the Car / 5-year / Essential / High-risk scenario from the PDF.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from app.sim import (
    IMPORTANCE_PERCENTILES,
    UserGoal,
    advise,
    generate_sample_data,
    inflation_series,
    preprocess_asset,
    run_simulation,
)

DATA_DIR = Path(__file__).parent / "data"


def run(goal: UserGoal, seed: int = 42) -> None:
    equity_csv = DATA_DIR / "abc_equity_fund.csv"
    mmf_csv = DATA_DIR / "ebe_money_market_fund.csv"
    infl_csv = DATA_DIR / "inflation.csv"
    if not (equity_csv.exists() and mmf_csv.exists() and infl_csv.exists()):
        print("No data found — generating synthetic sample data.")
        generate_sample_data(data_dir=DATA_DIR)

    variable_returns = preprocess_asset(equity_csv)
    fixed_returns = preprocess_asset(mmf_csv)
    inflation = inflation_series(infl_csv)

    print(
        f"Preprocessed: equity n={len(variable_returns)}, "
        f"mmf n={len(fixed_returns)}, inflation n={len(inflation)}"
    )

    sim = run_simulation(variable_returns, fixed_returns, inflation, seed=seed)
    fits = sim["fits"]
    print(
        f"Fit: variable={fits['variable'].name}{tuple(round(p, 4) for p in fits['variable'].params)} "
        f"fixed={fits['fixed'].name}{tuple(round(p, 4) for p in fits['fixed'].params)}"
    )

    best, all_results = advise(sim["variable_monthly"], sim["fixed_monthly"], goal)

    header = (
        f"{'Variable %':>11} | {'Worst (15th)':>14} | {'Essential (30th)':>18} | "
        f"{'Med. (50th)':>13} | {'Best (85th)':>13}"
    )
    print("\nCandidate portfolios:")
    print(header)
    print("-" * len(header))
    for r in all_results:
        print(
            f"{int(r.variable_pct * 100):>10}% | "
            f"{r.percentiles[15]:>14,.0f} | "
            f"{r.percentiles[30]:>18,.0f} | "
            f"{r.percentiles[50]:>13,.0f} | "
            f"{r.percentiles[85]:>13,.0f}"
        )

    p = IMPORTANCE_PERCENTILES[goal.importance]
    print(
        f"\nRecommended: variable={int(best.variable_pct * 100)}% "
        f"(maximizing P{p} at {best.percentiles[p]:,.0f})"
    )


def cli() -> tuple[UserGoal, int]:
    ap = argparse.ArgumentParser(description="Marsa RFA — robotic financial advisor simulation")
    ap.add_argument("--duration-years", type=int, default=5)
    ap.add_argument("--initial", type=float, default=50_000)
    ap.add_argument("--monthly", type=float, default=1_000)
    ap.add_argument("--annual-increase", type=float, default=0.0)
    ap.add_argument("--importance", choices=list(IMPORTANCE_PERCENTILES), default="essential")
    ap.add_argument(
        "--risk",
        choices=["very_low", "low", "moderate", "high", "very_high"],
        default="high",
    )
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    return (
        UserGoal(
            duration_years=args.duration_years,
            initial_investment=args.initial,
            monthly_investment=args.monthly,
            annual_increase_pct=args.annual_increase,
            importance=args.importance,
            risk_tolerance=args.risk,
        ),
        args.seed,
    )


if __name__ == "__main__":
    goal, seed = cli()
    run(goal, seed=seed)
