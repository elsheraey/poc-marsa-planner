import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { actions, MAX_SCENARIOS_PER_RUN, Scenario } from "./draftSlice";
import { useAppDispatch, useAppSelector } from "../../store";
import { runScenarioBatch } from "../../store/slices/simulationSlice";
import { createClient, updateClient } from "../../store/slices/clientsSlice";
import { toast } from "../../components/Toaster";
import { fmtEGP } from "../../utils/format";
import { t } from "../../i18n";
import type { ClientRecord, SimulateRequest } from "../../api/client";

// Backend validators (`schemas.py`) bound inflation_rate, annual_increase and
// interest_rate to the decimal range [-1, 1]. The wizard lets advisors type
// either decimals ("0.05") or percents ("5"); normalise to decimal so we never
// round-trip to a 422.
export function toDecimalRate(v: number | null | undefined): number | undefined {
  if (v == null || !Number.isFinite(v)) return undefined;
  return Math.abs(v) > 1 ? v / 100 : v;
}

// Weighted mean of per-row annualIncrease by row amount. The backend accepts
// a single `annual_increase_pct`, so when the advisor enters multiple monthly
// investment rows with different rates we collapse to an amount-weighted
// average rather than silently dropping rows 2…N.
//
// Guard rail: if total amount is zero (all rows empty), return 0 — the caller
// further guards with `hasMoneyIn` so we never actually ship a weighted
// average of zero-amount rows to the simulator.
export function weightedAnnualIncrease(
  rows: { amount: number; annualIncrease: number }[]
): number {
  const sumAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  if (sumAmount <= 0) return 0;
  const sumWeighted = rows.reduce(
    (s, r) => s + (Number(r.amount) || 0) * (Number(r.annualIncrease) || 0),
    0
  );
  return sumWeighted / sumAmount;
}

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
    // Amount-weighted mean across all monthly rows (see weightedAnnualIncrease
    // docstring). toDecimalRate lets the advisor type either "0.05" or "5".
    const annualIncrease =
      toDecimalRate(weightedAnnualIncrease(s.monthlyInvestments)) ?? 0;
    const selectedGoals = s.goalNames.length
      ? ctx.goals.filter((g) => s.goalNames.includes(g.name))
      : ctx.goals;
    const goalTargetAmount = selectedGoals.reduce((sum, g) => {
      const years = Math.max(0, (g.year || ctx.nowYear) - ctx.nowYear);
      const rate = toDecimalRate(g.inflationRate) ?? 0;
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
    <div className="mt-3 rounded-xl bg-az-canvas p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-az-ink-muted mb-3">
        Goals
      </div>
      <table className="w-full text-sm tabular">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wider text-az-ink-muted">
            <th></th>
            <th className="text-start pb-2">Goal</th>
            <th className="text-start pb-2">Amount</th>
            <th className="text-start pb-2">Year</th>
            <th className="text-start pb-2">Inflation</th>
          </tr>
        </thead>
        <tbody>
          {availableGoals.map((g, i) => {
            const checked = local.includes(g.name);
            return (
              <tr key={i} className="border-t border-az-separator">
                <td className="py-2 w-8">
                  <input
                    type="checkbox"
                    className="accent-az-black w-4 h-4"
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
      <div className="flex justify-end gap-4 mt-3">
        <button type="button" className="btn-plain" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            onSelect(local);
            onClose();
          }}
        >
          Select
        </button>
      </div>
    </div>
  );
}

function ScenarioCard({ index }: { index: number }) {
  const dispatch = useAppDispatch();
  const scenario = useAppSelector((s) => s.draft.scenarios[index]);
  const scenarioCount = useAppSelector((s) => s.draft.scenarios.length);
  const goals = useAppSelector((s) => s.draft.goals);
  const [collapsed, setCollapsed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const upd = (patch: Partial<Scenario>) =>
    dispatch(actions.updateScenario({ index, patch }));

  function onDuplicate() {
    if (scenarioCount >= MAX_SCENARIOS_PER_RUN) {
      toast(
        t("wizard.scenario.duplicate.atCap", { max: MAX_SCENARIOS_PER_RUN }),
        "error"
      );
      return;
    }
    dispatch(actions.duplicateScenario(index));
  }

  return (
    <section className="rounded-2xl bg-az-white ring-1 ring-az-separator p-6">
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div className="text-xl font-semibold tracking-tight text-az-ink">
          {scenario.name}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="btn-plain"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
          <button
            type="button"
            className="btn-plain"
            onClick={onDuplicate}
          >
            {t("wizard.scenario.duplicate")}
          </button>
          <button
            type="button"
            className="text-rose-700 text-[15px] font-semibold hover:text-rose-800"
            onClick={() => dispatch(actions.removeScenario(index))}
          >
            Remove
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <div className="text-xs font-semibold text-az-ink-muted mb-1.5">
                Scenario Name
              </div>
              <input
                className="input"
                placeholder="Scenario name"
                value={scenario.name}
                onChange={(e) => upd({ name: e.target.value })}
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-az-ink-muted mb-1.5">
                Model
              </div>
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

          <div className="mb-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[15px] font-semibold text-az-ink">
                Select Goals
              </span>
              <button
                type="button"
                className="btn-plain text-sm"
                onClick={() => setPickerOpen((o) => !o)}
              >
                {pickerOpen ? "Close" : "Choose"}
              </button>
            </div>
            {scenario.goalNames.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {scenario.goalNames.map((name) => (
                  <span
                    key={name}
                    className="pill bg-az-gold-soft text-az-black"
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
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-3">
        {/*
          NOTE: this span / icon-btn-add pair is the stable selector the
          e2e tests use (`span:text-is("Investments") + button.icon-btn-add`).
          Do not restructure.
        */}
        <span className="text-[15px] font-semibold text-az-ink">{title}</span>
        <button type="button" className="icon-btn-add" onClick={onAdd} aria-label={`Add ${title}`}>
          +
        </button>
      </div>
      {items.map((it, i) => (
        <div
          key={i}
          className="grid gap-3 items-end mb-2"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) auto` }}
        >
          {columns.map((label, c) => {
            const key = keys[c];
            return (
              <div key={c}>
                <div className="text-xs font-semibold text-az-ink-muted mb-1.5">
                  {label}
                </div>
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
          <button
            type="button"
            className="icon-btn-remove mb-1"
            onClick={() => onRemove(i)}
            aria-label={`Remove ${title}`}
          >
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
  const draftClientId = useAppSelector((s) => s.draft.clientId);
  // In-flight guard: blocks a double-click from racing two POST /api/clients
  // and two POST /api/simulate. The finally clause below guarantees we
  // release the latch even on thrown errors / early-return error toasts.
  const [running, setRunning] = useState(false);

  const totalYears = useMemo(() => {
    const now = new Date().getFullYear();
    const maxGoalYear = Math.max(now + 1, ...goals.map((g) => g.year || 0));
    return Math.max(1, maxGoalYear - now);
  }, [goals]);

  async function runAll() {
    if (running) return;
    setRunning(true);
    try {
      await runAllInner();
    } finally {
      setRunning(false);
    }
  }

  async function runAllInner() {
    if (scenarios.length === 0) {
      toast("Add at least one scenario before running a simulation", "error");
      return;
    }
    if (goals.length === 0 || goals.every((g) => !g.name || !g.amount)) {
      toast("Add at least one goal with a name and target amount", "error");
      return;
    }
    const trimmedName = profile.fullName.trim();
    if (!trimmedName || !profile.email) {
      toast("Add the client's name and email in the Profile step first", "error");
      nav("/clients/new/profile");
      return;
    }

    // Persist the client BEFORE running the batch — saved simulations
    // reference client_id, and the clients list is the primary advisor view.
    const persistedGoals = goals
      .filter((g) => g.name && g.amount > 0)
      .map((g) => ({
        name: g.name,
        amount: g.amount,
        year: g.year,
        payments: g.payments || undefined,
        inflationRate: toDecimalRate(g.inflationRate),
      }));
    const persistedScenarios = scenarios.slice(0, MAX_SCENARIOS_PER_RUN).map((s) => ({
      name: s.name,
      model: s.model || undefined,
      goalNames: s.goalNames,
      investments: s.investments,
      monthlyInvestments: s.monthlyInvestments.map((m) => ({
        amount: m.amount,
        annualIncrease: toDecimalRate(m.annualIncrease) ?? 0,
      })),
      loans: s.loans.map((l) => ({
        amount: l.amount,
        year: l.year,
        duration: l.duration,
        interestRate: toDecimalRate(l.interestRate) ?? 0,
      })),
    }));
    const clientPayload: Partial<ClientRecord> = {
      name: trimmedName,
      email: profile.email,
      phone: profile.phone || undefined,
      profile: { ...profile, fullName: trimmedName },
      goals: persistedGoals as ClientRecord["goals"],
      scenarios: persistedScenarios as ClientRecord["scenarios"],
    };
    if (draftClientId) {
      // Best-effort update; don't block the simulation if the PATCH fails —
      // the client row already exists, worst case it's slightly stale.
      dispatch(updateClient({ id: draftClientId, data: clientPayload }));
    } else {
      const createRes = await dispatch(createClient(clientPayload));
      if (createClient.rejected.match(createRes)) {
        // createClient thunk already fired the error toast.
        return;
      }
      dispatch(actions.setClientId(createRes.payload.id));
    }

    const duration = Math.min(60, Math.max(1, totalYears));
    const nowYear = new Date().getFullYear();

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
      <div className="flex justify-end">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => dispatch(actions.addScenario())}
        >
          Add New Scenario
        </button>
      </div>

      <div className="space-y-5">
        {scenarios.map((sc, i) => (
          <ScenarioCard key={sc.id} index={i} />
        ))}
      </div>

      <div className="flex justify-end gap-4 pt-2">
        <button
          type="button"
          className="btn-plain"
          onClick={() => nav("/clients/new/goals")}
        >
          Save for later
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={runAll}
          disabled={running}
        >
          Run Simulation
        </button>
      </div>
    </>
  );
}
