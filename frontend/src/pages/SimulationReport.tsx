import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "../components/AppShell";
import WizardTabs from "../components/WizardTabs";
import DonutChart from "../components/DonutChart";
import { toast } from "../components/Toaster";
import { useAppSelector } from "../store";
import { fmtEGP, fmtProbabilitySeTail } from "../utils/format";
import { t } from "../i18n";
import {
  ApiError,
  api,
  type SimulateInvertResult,
  type SimulateResult,
} from "../api/client";

// Advisor-side rule-of-thumb from ux-audit-v2.md §3: we only propose an
// inversion when the plan comes in below 80% probability. Hits every live
// call to `/api/simulate/invert`.
const INVERSION_TARGET_PROBABILITY = 0.8;

// Product constraint: the Goals Achievement Probability grid renders at most
// 4 donut cards. Keep in sync with MAX_SCENARIOS_PER_RUN in ScenarioStep.tsx.
const MAX_SCENARIOS_RENDERED = 4;

// Fallback used only when the backend calibration manifest is missing/malformed
// and the response comes back without `calibration_as_of`.
const CALIBRATION_FALLBACK = "calibration: 2026-04";

function fmtCalibration(raw: string | null | undefined): string {
  if (!raw) return CALIBRATION_FALLBACK;
  // Normalise `YYYY-MM-DD` to `YYYY-MM` for the disclosure line (month-level
  // precision is what the frontend copy calls for); keep shorter values as-is.
  const trimmed = raw.length >= 7 ? raw.slice(0, 7) : raw;
  return `calibration: ${trimmed}`;
}

function DisclosureBanner({
  calibrationAsOf,
}: Readonly<{ calibrationAsOf: string | null | undefined }>) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const nowStr = now.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  return (
    <div
      data-testid="simulation-disclosure"
      className="mt-5 rounded-xl border border-border bg-surface/60"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-muted hover:text-ink"
        aria-expanded={open}
      >
        <span>{t("report.disclosure")}</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <ul className="px-5 pb-4 space-y-2 text-[11px] leading-relaxed text-muted list-disc list-inside">
          <li>{t("report.disclosure.mc")}</li>
          <li>{t("report.disclosure.real")}</li>
          <li>{t("report.disclosure.past")}</li>
          <li>
            {t("report.disclosure.data", {
              calibration: fmtCalibration(calibrationAsOf),
              now: nowStr,
            })}
          </li>
          <li>{t("report.disclosure.regulator")}</li>
        </ul>
      )}
    </div>
  );
}

type Tab = "chart" | "table";

const ATTAINABILITY_CLASS: Record<"attainable" | "aspirational" | "out_of_reach", string> = {
  attainable: "bg-emerald-100 text-emerald-700",
  aspirational: "bg-amber-100 text-amber-700",
  out_of_reach: "bg-rose-100 text-rose-700",
};

// Prefer the localised string; fall back to the backend label with
// underscores normalised if the i18n key is missing.
function attainabilityLabel(
  attainability: "attainable" | "aspirational" | "out_of_reach"
): string {
  const key = `report.${attainability}`;
  const localised = t(key);
  // Use the global-regex form of replace so both underscores in
  // "out_of_reach" are replaced. An earlier `replace("_", " ")` passed a
  // literal string and only hit the first underscore — "out of_reach"
  // shipped briefly. (ES2020 target lacks String.prototype.replaceAll;
  // /_/g is equivalent.)
  return localised === key ? attainability.replace(/_/g, " ") : localised;
}

export default function SimulationReport() {
  const nav = useNavigate();
  const results = useAppSelector((s) => s.simulation.results);
  // `result` is kept as a backward-compat fallback for callers that set the
  // legacy single-result shape; prefer `results[0]` when present.
  const legacyResult = useAppSelector((s) => s.simulation.result);
  const status = useAppSelector((s) => s.simulation.status);
  const draftProfile = useAppSelector((s) => s.draft.profile);
  const [tab, setTab] = useState<Tab>("chart");
  const [activeScenario, setActiveScenario] = useState(0);
  const [presenting, setPresenting] = useState(false);
  // Server-side inversion for the active scenario. `null` = not yet fetched
  // or not applicable (goal met, or no goal target). Keyed per-scenario so
  // flipping between tabs doesn't flash stale suggestions.
  const [inversionByScenario, setInversionByScenario] = useState<
    Record<number, SimulateInvertResult | null>
  >({});

  // One card per backend-returned scenario (truncated to MAX). The probability
  // comes straight from `result.probability_of_goal` — no per-index synthesis.
  const scenarioCards = useMemo(() => {
    let src: { name: string; result: SimulateResult }[] = [];
    if (results.length > 0) {
      src = results.map((r) => ({ name: r.name, result: r.result }));
    } else if (legacyResult) {
      src = [{ name: "Scenario 1", result: legacyResult }];
    }
    return src.slice(0, MAX_SCENARIOS_RENDERED).map((r) => {
      const rawPct = r.result.probability_of_goal;
      const pct = rawPct == null ? 0 : Math.round(rawPct * 100);
      return {
        name: r.name,
        probability: Math.min(100, Math.max(0, pct)),
        result: r.result,
      };
    });
  }, [results, legacyResult]);

  const activeResult: SimulateResult | null =
    scenarioCards[activeScenario]?.result ?? scenarioCards[0]?.result ?? null;

  const chartData = useMemo(() => {
    if (!activeResult) return [];
    return activeResult.projection.years.map((y, i) => {
      const optimistic = Math.round(activeResult.projection.optimistic[i]);
      const median = Math.round(activeResult.projection.median[i]);
      const pessimistic = Math.round(activeResult.projection.pessimistic[i]);
      return {
        year: new Date().getFullYear() + y - 1,
        optimistic,
        median,
        pessimistic,
        // Derived bands for the ribbon visualisation. Recharts renders an
        // <Area> from y=0 by default; to draw a band between pessimistic and
        // optimistic we stack a transparent base at `pessimistic` and a delta
        // on top. The displayed values (tooltip/table) use the unstacked
        // `optimistic` / `median` / `pessimistic` fields above, so the QA
        // stacking assertion (optimistic >= median >= pessimistic) holds.
        bandBase: pessimistic,
        bandDelta: Math.max(0, optimistic - pessimistic),
      };
    });
  }, [activeResult]);

  // Moment-of-truth inversion for the active scenario. Derived from the
  // backend probability + (async) inversion response. The inversion call is
  // only meaningful when the active run has a goal target AND is below the
  // 80% advisor bar — otherwise we show the "met" headline and no
  // suggestions.
  const activeRequest = results[activeScenario]?.request ?? results[0]?.request;
  const probabilityOfGoal = activeResult?.probability_of_goal ?? null;
  const probabilityPct =
    probabilityOfGoal == null ? null : Math.round(probabilityOfGoal * 100);
  const meetsEightyPct =
    probabilityOfGoal != null && probabilityOfGoal >= INVERSION_TARGET_PROBABILITY;
  const hasGoal =
    activeRequest?.goal_target_amount != null &&
    activeRequest.goal_target_amount > 0;
  const shouldFetchInversion = !!activeResult && hasGoal && !meetsEightyPct;

  // Track which scenarios have had an inversion request fired (or finished
  // firing). We deliberately use a ref rather than adding
  // `inversionByScenario` to the effect deps: if the effect depended on the
  // map, the state update that records "in-flight" would re-run the effect
  // and the cleanup's `cancelled = true` would orphan the pending fetch's
  // `.then` — the real response would never land in state.
  const firedInversionRef = useRef<Set<number>>(new Set());

  // Fire the async inversion when the active scenario shifts or a new
  // simulation result arrives. Keyed by scenario index so switching between
  // cards renders the right suggestion list. We deliberately don't block
  // the initial render: the headline always shows immediately, and the
  // `suggestions` list is appended once the fetch resolves.
  //
  // NOTE: this hook sits above every early return so React's hook-ordering
  // invariant holds across the "no result" / "loading" / "ready" branches.
  useEffect(() => {
    if (!shouldFetchInversion || !activeRequest) return;
    if (firedInversionRef.current.has(activeScenario)) return;
    firedInversionRef.current.add(activeScenario);
    const payload = {
      duration_years: activeRequest.duration_years,
      initial_investment: activeRequest.initial_investment,
      current_monthly_investment: activeRequest.monthly_investment,
      annual_increase_pct: activeRequest.annual_increase_pct,
      importance: activeRequest.importance,
      risk_tolerance: activeRequest.risk_tolerance,
      goal_target_amount: activeRequest.goal_target_amount as number,
      target_probability: INVERSION_TARGET_PROBABILITY,
      return_in_real_terms: true,
    };
    api
      .simulateInvert(payload)
      .then((res) => {
        setInversionByScenario((prev) => ({ ...prev, [activeScenario]: res }));
      })
      .catch((e) => {
        // Soft-fail: the headline still renders. The shared error toast
        // surfaces ApiError shape consistently with the rest of the app.
        const msg =
          e instanceof ApiError ? e.message : "Could not compute inversion";
        toast(msg, "error");
        // Clear the in-flight marker so the advisor can trigger a retry
        // by re-clicking the scenario (or running another simulation).
        firedInversionRef.current.delete(activeScenario);
      });
  }, [shouldFetchInversion, activeScenario, activeRequest]);

  if (status === "loading") {
    return (
      <AppShell title="New Client">
        <WizardTabs basePath="/clients/new" />
        <div className="card py-16 text-center text-muted">Running simulation…</div>
      </AppShell>
    );
  }

  if (!activeResult || scenarioCards.length === 0) {
    return (
      <AppShell title="New Client">
        <WizardTabs basePath="/clients/new" />
        <div className="card py-16 text-center">
          <p className="text-muted mb-4">
            No simulation has been run yet. Go back and run a scenario to see the report.
          </p>
          <button className="btn-primary" onClick={() => nav("/clients/new/scenario")}>
            Back to Scenarios
          </button>
        </div>
      </AppShell>
    );
  }

  let headlineKey: string;
  if (probabilityPct == null) {
    headlineKey = "report.headline.no_goal";
  } else if (meetsEightyPct) {
    headlineKey = "report.headline.met";
  } else {
    headlineKey = "report.headline.shortfall";
  }
  const headline = t(headlineKey, {
    pct: probabilityPct ?? 0,
    monthly: activeRequest?.monthly_investment
      ? fmtEGP(activeRequest.monthly_investment)
      : "—",
  });

  // Honest-SE tail on the moment-of-truth headline. The backend already
  // attaches `probability_of_goal_se` to SimulateResponse; render it only
  // when the engine returned a measurable SE (≥ 0.001 decimal = 0.1 pp)
  // and only when we actually have a probability sentence to append to.
  // Rounding lives in fmtProbabilitySeTail so the copy stays a dumb
  // interpolation.
  const seTailPp =
    probabilityPct != null
      ? fmtProbabilitySeTail(activeResult.probability_of_goal_se)
      : null;
  const seTail = seTailPp ? t("report.se.tail", { pp: seTailPp }) : null;

  // Suggestions are derived strictly from the backend inversion response,
  // once it arrives. Rendered below the headline; the headline itself is
  // never blocked on this fetch.
  const inversionResponse = inversionByScenario[activeScenario];
  const suggestions: string[] = [];
  if (shouldFetchInversion && inversionResponse) {
    const { required_monthly_investment, required_horizon_years } =
      inversionResponse;
    if (required_monthly_investment != null) {
      // Bracket to the nearest 100 EGP — the backend solves to a 100-EGP
      // tolerance so we drop the "approx." hedge and round display to match.
      const bracketed =
        Math.round(required_monthly_investment / 100) * 100;
      suggestions.push(
        t("report.suggest.monthly", { monthly: fmtEGP(bracketed) })
      );
    } else if (required_horizon_years != null) {
      // No feasible monthly under the 10M cap, but extending the horizon
      // clears the bar. Use the calendar-year end of the required horizon
      // (today's year + years - 1) to match `chartData` framing.
      const calendarYear =
        new Date().getFullYear() + required_horizon_years - 1;
      suggestions.push(
        t("report.suggest.horizon", { year: calendarYear })
      );
    } else {
      // Unreachable at 10M/month AND at the 40y horizon cap — honest "no".
      suggestions.push(t("report.suggest.unreachable"));
    }
  }

  function handlePrint() {
    if (typeof globalThis.window !== "undefined") globalThis.window.print();
  }

  return (
    <AppShell title="New Client" focus={presenting}>
      {!presenting && <WizardTabs basePath="/clients/new" />}

      {/*
        Moment-of-truth headline. Replaces the decorative purple-hero +
        cosmetic button row. The advisor now sees one sentence answering
        "can my client afford this?" as the first thing on the page.
      */}
      <section
        className="rounded-2xl bg-report-gradient text-white p-8 print:bg-white print:text-ink"
        data-testid="moment-of-truth"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold opacity-80 mb-1 print:opacity-100">
              {t("report.title")}
            </div>
            <div className="text-lg font-bold truncate">
              {draftProfile.fullName || "New client"}
            </div>
          </div>
          {activeResult.attainability && (
            <span
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${ATTAINABILITY_CLASS[activeResult.attainability]}`}
              title="Attainability band based on P15 / median real-terms projection"
            >
              {attainabilityLabel(activeResult.attainability)}
            </span>
          )}
        </div>

        <p
          className="text-2xl md:text-3xl font-extrabold leading-snug max-w-3xl"
          data-testid="moment-of-truth-headline"
        >
          {headline}
          {seTail && (
            <>
              {" "}
              <em
                className="text-base md:text-lg font-semibold italic opacity-90"
                data-testid="moment-of-truth-se"
              >
                {seTail}
              </em>
            </>
          )}
        </p>

        {suggestions.length > 0 && (
          <ul
            className="mt-4 space-y-1 text-sm md:text-base text-white/95 print:text-ink"
            data-testid="moment-of-truth-suggestions"
          >
            {suggestions.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-1">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            className="h-9 px-4 rounded-lg bg-white/95 text-primary-600 text-sm font-semibold hover:bg-white"
            onClick={() => setPresenting((p) => !p)}
            aria-pressed={presenting}
          >
            {presenting ? t("report.action.exit_present") : t("report.action.present")}
          </button>
          <button
            type="button"
            className="h-9 px-4 rounded-lg border border-white/70 text-white text-sm font-semibold hover:bg-white/10"
            onClick={handlePrint}
          >
            {t("report.action.print")}
          </button>
          <button
            type="button"
            className="h-9 px-4 rounded-lg border border-white/70 text-white text-sm font-semibold hover:bg-white/10"
            onClick={() =>
              // eslint-disable-next-line no-alert
              alert(
                "Snapshot save is not yet wired to the backend. Coming in the pilot release."
              )
            }
            title="Requires backend: save the current simulation as a client-shareable snapshot"
          >
            {t("report.action.save")}
          </button>
        </div>
      </section>

      <section className="card mt-6 print:break-inside-avoid">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">{t("report.section.scenarios")}</h3>
          <span className="text-xs text-muted">
            {scenarioCards.length} scenario{scenarioCards.length === 1 ? "" : "s"} · N=10k
          </span>
        </div>

        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          aria-live="polite"
          data-testid="scenario-cards"
        >
          {scenarioCards.map((sc, i) => (
            <button
              type="button"
              key={sc.name + i}
              className={`flex flex-col items-center p-3 rounded-xl border ${
                i === activeScenario
                  ? "border-primary-500 bg-primary-50"
                  : "border-border hover:bg-surface"
              }`}
              data-testid={`scenario-card-${i}`}
              data-scenario-name={sc.name}
              data-probability={sc.probability}
              onClick={() => setActiveScenario(i)}
              aria-pressed={i === activeScenario}
            >
              <div className="text-sm font-medium mb-3 text-center">{sc.name}</div>
              <DonutChart percent={sc.probability} size={90} stroke={8} />
              {sc.result.attainability && (
                <span
                  className={`mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${ATTAINABILITY_CLASS[sc.result.attainability]}`}
                  title="Attainability band for this scenario"
                >
                  {attainabilityLabel(sc.result.attainability)}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="card mt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-bold">{scenarioCards[activeScenario]?.name}</div>
            <div className="text-xs text-muted">
              {scenarioCards.length} scenario{scenarioCards.length === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex items-center gap-1 bg-surface p-1 rounded-lg">
            <button
              className={`w-9 h-8 rounded-md ${
                tab === "chart" ? "bg-primary-100 text-primary-600" : "text-muted"
              }`}
              onClick={() => setTab("chart")}
              title="Chart"
            >
              ≋
            </button>
            <button
              className={`w-9 h-8 rounded-md ${
                tab === "table" ? "bg-primary-100 text-primary-600" : "text-muted"
              }`}
              onClick={() => setTab("table")}
              title="Table"
            >
              ☰
            </button>
          </div>
        </div>

        {tab === "chart" ? (
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="g-band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#86E3A9" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#F7A678" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v) => fmtEGP(v, { compact: true })}
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "Portfolio value (EGP)",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "#6B7280", fontSize: 11 },
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0].payload as {
                      optimistic: number;
                      median: number;
                      pessimistic: number;
                    };
                    return (
                      <div
                        style={{
                          background: "#fff",
                          border: "1px solid #E5E7EB",
                          borderRadius: 12,
                          padding: "8px 12px",
                          fontSize: 12,
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
                        <div style={{ color: "#4FAE6E" }}>
                          Optimistic: {fmtEGP(row.optimistic)}
                        </div>
                        <div style={{ color: "#D4AC33" }}>
                          Median: {fmtEGP(row.median)}
                        </div>
                        <div style={{ color: "#D47C33" }}>
                          Pessimistic: {fmtEGP(row.pessimistic)}
                        </div>
                      </div>
                    );
                  }}
                />
                {/* Transparent base stacks the band up to the pessimistic curve */}
                <Area
                  type="monotone"
                  dataKey="bandBase"
                  stackId="band"
                  stroke="none"
                  fill="transparent"
                  activeDot={false}
                  legendType="none"
                  isAnimationActive={false}
                />
                {/* Delta stacks on top to fill up to the optimistic curve */}
                <Area
                  type="monotone"
                  dataKey="bandDelta"
                  stackId="band"
                  stroke="none"
                  fill="url(#g-band)"
                  activeDot={false}
                  legendType="none"
                  isAnimationActive={false}
                  name="Optimistic–Pessimistic band"
                />
                <Line
                  type="monotone"
                  dataKey="median"
                  stroke="#D4AC33"
                  strokeWidth={2.5}
                  dot={false}
                  name="Median"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="text-center text-xs text-primary-500 font-semibold mb-3">
              Portfolio Value by the end of the year
            </div>
            {(() => {
              const birthYear = draftProfile.birthdate
                ? new Date(draftProfile.birthdate).getFullYear()
                : null;
              const showAge = birthYear != null && !Number.isNaN(birthYear);
              return (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted">
                    <tr>
                      {showAge && (
                        <th className="text-left font-medium pb-3">Client age</th>
                      )}
                      <th className="text-left font-medium pb-3">Year</th>
                      <th className="text-left font-medium pb-3">Optimistic</th>
                      <th className="text-left font-medium pb-3">Median</th>
                      <th className="text-left font-medium pb-3">Pessimistic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row) => (
                      <tr key={row.year} className="border-t border-border/60">
                        {showAge && (
                          <td className="py-2">{row.year - (birthYear as number)} years</td>
                        )}
                        <td className="py-2">{row.year}</td>
                        <td className="py-2" data-testid={`row-${row.year}-optimistic`}>
                          {fmtEGP(row.optimistic)}
                        </td>
                        <td className="py-2" data-testid={`row-${row.year}-median`}>
                          {fmtEGP(row.median)}
                        </td>
                        <td className="py-2" data-testid={`row-${row.year}-pessimistic`}>
                          {fmtEGP(row.pessimistic)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}
      </section>

      <DisclosureBanner calibrationAsOf={activeResult.calibration_as_of} />

      <div className="flex items-center justify-between mt-6 print:hidden">
        <button
          type="button"
          className="text-primary-500 text-sm font-semibold"
          onClick={() => nav("/clients/new/scenario")}
        >
          {t("report.action.back")}
        </button>
      </div>
    </AppShell>
  );
}
