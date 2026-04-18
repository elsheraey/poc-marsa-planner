import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { actions, Scenario } from "./draftSlice";
import { useAppDispatch, useAppSelector } from "../../store";
import { runScenarioBatch } from "../../store/slices/simulationSlice";
import { toast } from "../../components/Toaster";
import { fmtEGP } from "../../utils/format";
import type { SimulateRequest } from "../../api/client";

// Product constraint: the simulation report renders at most 4 donut cards in
// the Goals Achievement Probability grid. Keep this in sync with
// SimulationReport.tsx (MAX_SCENARIOS_RENDERED) so the "extra scenarios were
// dropped" toast matches the visual behaviour.
const MAX_SCENARIOS_PER_RUN = 4;

type BuildCtx = {
  duration: number;
  nowYear: number;
  goals: { name: string; amount: number; year: number; inflationRate: number }[];
  riskAppetite: "very_low" | "low" | "moderate" | "high" | "very_high";
};

// Build a SimulateRequest for a single scenario. Returns `request: null`
// when the scenario has no money in (initial + monthly both zero) so the
// caller can surface it as "skipped" without throwing.
function buildScenarioRequest(
  s: Scenario,
  ctx: BuildCtx
): { name: string; request: SimulateRequest | null } {
  const monthlyTotal = s.monthlyInvestments.reduce((sum, m) => sum + m.amount, 0);
  const initial = s.investments.reduce((sum, inv) => sum + inv.amount, 0);
  const hasMoneyIn = initial > 0 || monthlyTotal > 0;
  if (hasMoneyIn) {
    const annualIncrease = (s.monthlyInvestments[0]?.annualIncrease ?? 0) / 100;
    const selectedGoals = s.goalNames.length
      ? ctx.goals.filter((g) => s.goalNames.includes(g.name))
      : ctx.goals;
    const goalTargetAmount = selectedGoals.reduce((sum, g) => {
      const years = Math.max(0, (g.year || ctx.nowYear) - ctx.nowYear);
      const rate = (g.inflationRate ?? 0) / 100;
      const inflated = (g.amount || 0) * Math.pow(1 + rate, years);
      return sum + inflated;
    }, 0);

    return {
      name: s.name,
      request: {
        duration_years: ctx.duration,
        initial_investment: initial,
        monthly_investment: monthlyTotal,
        annual_increase_pct: annualIncrease,
        importance: "essential",
        risk_tolerance: ctx.riskAppetite,
        goal_target_amount: goalTargetAmount > 0 ? goalTargetAmount : undefined,
      },
    };
  }
  return { name: s.name, request: null };
}

function GoalPicker({
  open,
  onClose,
  availableGoals,
  selected,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  availableGoals: { name: string; amount: number; year: number; inflationRate: number }[];
  selected: string[];
  onSelect: (names: string[]) => void;
}) {
  const [local, setLocal] = useState(selected);
  if (!open) return null;
  return (
    <div className="border border-border rounded-xl p-4 mt-2 bg-white shadow-card">
      <div className="text-xs font-semibold mb-3">Goals</div>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted">
          <tr>
            <th></th>
            <th className="text-left font-medium pb-2">Goal</th>
            <th className="text-left font-medium pb-2">Amount</th>
            <th className="text-left font-medium pb-2">Year</th>
            <th className="text-left font-medium pb-2">Inflation rate</th>
          </tr>
        </thead>
        <tbody>
          {availableGoals.map((g, i) => {
            const checked = local.includes(g.name);
            return (
              <tr key={i} className="border-t border-border/60">
                <td className="py-2 w-10">
                  <input
                    type="checkbox"
                    className="accent-primary-500 w-4 h-4"
                    checked={checked}
                    onChange={() =>
                      setLocal((prev) =>
                        prev.includes(g.name)
                          ? prev.filter((n) => n !== g.name)
                          : [...prev, g.name]
                      )
                    }
                  />
                </td>
                <td className="py-2">{g.name || "—"}</td>
                <td className="py-2">{fmtEGP(g.amount)}</td>
                <td className="py-2">{g.year}</td>
                <td className="py-2">{g.inflationRate}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex justify-end gap-4 mt-3 text-xs font-semibold">
        <button className="text-muted" onClick={onClose}>
          CANCEL
        </button>
        <button
          className="text-primary-500"
          onClick={() => {
            onSelect(local);
            onClose();
          }}
        >
          SELECT
        </button>
      </div>
    </div>
  );
}

function ScenarioCard({ index }: { index: number }) {
  const dispatch = useAppDispatch();
  const scenario = useAppSelector((s) => s.draft.scenarios[index]);
  const goals = useAppSelector((s) => s.draft.goals);
  const [collapsed, setCollapsed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const upd = (patch: Partial<Scenario>) =>
    dispatch(actions.updateScenario({ index, patch }));

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-5">
        <div className="text-primary-500 font-bold">{scenario.name}</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            className="text-muted font-semibold"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
          <button
            type="button"
            className="px-3 h-7 rounded-md border border-red-300 text-red-500 font-semibold"
            onClick={() => dispatch(actions.removeScenario(index))}
          >
            Remove Scenario
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div>
              <div className="label mb-2">Scenario Name</div>
              <input
                className="input"
                placeholder="Scenario name"
                value={scenario.name}
                onChange={(e) => upd({ name: e.target.value })}
              />
            </div>
            <div>
              <div className="label mb-2">Model</div>
              <select
                className="select"
                value={scenario.model}
                onChange={(e) => upd({ model: e.target.value })}
              >
                <option value="">Select model</option>
                <option value="balanced">Balanced</option>
                <option value="aggressive">Aggressive</option>
                <option value="conservative">Conservative</option>
              </select>
            </div>
          </div>

          <div className="border-t border-border/70 pt-5 mb-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="label">Select Goals</span>
              <button
                type="button"
                className="px-3 h-7 rounded-md bg-primary-500 text-white text-xs font-semibold"
                onClick={() => setPickerOpen((o) => !o)}
              >
                Select
              </button>
            </div>
            {scenario.goalNames.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {scenario.goalNames.map((name) => (
                  <span
                    key={name}
                    className="px-3 py-1 rounded-full bg-primary-100 text-primary-600 text-xs font-medium"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
            <GoalPicker
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              availableGoals={goals}
              selected={scenario.goalNames}
              onSelect={(names) => upd({ goalNames: names })}
            />
          </div>

          <GroupList
            title="Investments"
            onAdd={() =>
              upd({
                investments: [...scenario.investments, { amount: 0, year: new Date().getFullYear() }],
              })
            }
            items={scenario.investments}
            columns={["Amount", "Year"]}
            onChange={(i, patch) => {
              const next = [...scenario.investments];
              next[i] = { ...next[i], ...(patch as object) };
              upd({ investments: next });
            }}
            onRemove={(i) => upd({ investments: scenario.investments.filter((_, j) => j !== i) })}
          />

          <GroupList
            title="Monthly Investments"
            onAdd={() =>
              upd({
                monthlyInvestments: [
                  ...scenario.monthlyInvestments,
                  { amount: 0, annualIncrease: 0 },
                ],
              })
            }
            items={scenario.monthlyInvestments}
            columns={["Amount", "Annual Increase Rate"]}
            onChange={(i, patch) => {
              const next = [...scenario.monthlyInvestments];
              next[i] = { ...next[i], ...(patch as object) };
              upd({ monthlyInvestments: next });
            }}
            onRemove={(i) =>
              upd({ monthlyInvestments: scenario.monthlyInvestments.filter((_, j) => j !== i) })
            }
          />

          <GroupList
            title="Loans"
            onAdd={() =>
              upd({
                loans: [
                  ...scenario.loans,
                  { amount: 0, year: new Date().getFullYear(), duration: 0, interestRate: 0 },
                ],
              })
            }
            items={scenario.loans}
            columns={["Amount", "Withdrawal Year", "Duration", "Interest Rate"]}
            onChange={(i, patch) => {
              const next = [...scenario.loans];
              next[i] = { ...next[i], ...(patch as object) };
              upd({ loans: next });
            }}
            onRemove={(i) => upd({ loans: scenario.loans.filter((_, j) => j !== i) })}
          />
        </>
      )}
    </section>
  );
}

function GroupList<T extends Record<string, number>>({
  title,
  items,
  columns,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string;
  items: T[];
  columns: string[];
  onAdd: () => void;
  onChange: (i: number, patch: Partial<T>) => void;
  onRemove: (i: number) => void;
}) {
  const keys = Object.keys(items[0] ?? {}) as (keyof T)[];
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-semibold">{title}</span>
        <button className="icon-btn-add" onClick={onAdd}>
          +
        </button>
      </div>
      {items.map((it, i) => (
        <div
          key={i}
          className="grid gap-4 items-end mb-2"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) auto` }}
        >
          {columns.map((label, c) => {
            const key = keys[c];
            return (
              <div key={c}>
                <div className="label mb-2">{label}</div>
                <input
                  className="input"
                  type="number"
                  placeholder={label.includes("Year") ? "Year" : label}
                  value={(it[key] as number) || ""}
                  onChange={(e) =>
                    onChange(i, { [key]: Number(e.target.value) } as Partial<T>)
                  }
                />
              </div>
            );
          })}
          <button className="icon-btn-remove mb-2" onClick={() => onRemove(i)}>
            −
          </button>
        </div>
      ))}
    </div>
  );
}

export default function ScenarioStep() {
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const scenarios = useAppSelector((s) => s.draft.scenarios);
  const profile = useAppSelector((s) => s.draft.profile);
  const goals = useAppSelector((s) => s.draft.goals);

  const totalYears = useMemo(() => {
    const now = new Date().getFullYear();
    const maxGoalYear = Math.max(now + 1, ...goals.map((g) => g.year || 0));
    return Math.max(1, maxGoalYear - now);
  }, [goals]);

  async function runAll() {
    if (scenarios.length === 0) {
      toast("Add at least one scenario before running a simulation", "error");
      return;
    }
    if (goals.length === 0 || goals.every((g) => !g.name || !g.amount)) {
      toast("Add at least one goal with a name and target amount", "error");
      return;
    }

    const duration = Math.min(60, Math.max(1, totalYears));
    const nowYear = new Date().getFullYear();

    // Build one SimulateRequest per scenario: profile + goals are shared,
    // investments / monthly / loans come from each scenario. Scenarios with
    // no money in at all are skipped — the backend would reject them anyway
    // and advisors don't want empty cards.
    const candidates = scenarios.slice(0, MAX_SCENARIOS_PER_RUN);
    const built = candidates.map((s) =>
      buildScenarioRequest(s, { duration, nowYear, goals, riskAppetite: profile.riskAppetite })
    );
    const batch: { name: string; request: SimulateRequest }[] = built
      .filter((b) => b.request !== null)
      .map((b) => ({ name: b.name, request: b.request as SimulateRequest }));
    const skipped = built.filter((b) => b.request === null).map((b) => b.name);

    if (batch.length === 0) {
      toast("Add at least one investment or monthly contribution", "error");
      return;
    }
    if (skipped.length > 0) {
      toast(
        `Skipped ${skipped.length} scenario${skipped.length === 1 ? "" : "s"} with no investments: ${skipped.join(", ")}`,
        "error"
      );
    }
    if (scenarios.length > MAX_SCENARIOS_PER_RUN) {
      toast(
        `Only the first ${MAX_SCENARIOS_PER_RUN} scenarios are simulated; the rest were dropped.`,
        "error"
      );
    }

    const res = await dispatch(runScenarioBatch(batch));
    if (runScenarioBatch.fulfilled.match(res)) {
      nav("/clients/new/report");
    }
  }

  return (
    <>
      <div className="flex justify-end mt-4 mb-4">
        <button
          type="button"
          className="btn-primary"
          onClick={() => dispatch(actions.addScenario())}
        >
          Add New Scenario
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {scenarios.map((sc, i) => (
          <ScenarioCard key={`${sc.name}-${i}`} index={i} />
        ))}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-outline" onClick={() => nav("/clients/new/goals")}>
          Save for later
        </button>
        <button className="btn-primary" onClick={runAll}>
          Run Simulation
        </button>
      </div>
    </>
  );
}
