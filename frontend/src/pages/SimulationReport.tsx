import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "../components/AppShell";
import WizardTabs from "../components/WizardTabs";
import ProbabilityBar from "../components/ProbabilityBar";
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

// Product constraint: the report renders at most 4 scenario rows. Keep in
// sync with MAX_SCENARIOS_PER_RUN in ScenarioStep.tsx.
const MAX_SCENARIOS_RENDERED = 4;

// Fallback used only when the backend calibration manifest is missing/malformed
// and the response comes back without `calibration_as_of`.
const CALIBRATION_FALLBACK = "calibration: 2026-04";

function fmtCalibration(raw: string | null | undefined): string {
  if (!raw) return CALIBRATION_FALLBACK;
  const trimmed = raw.length >= 7 ? raw.slice(0, 7) : raw;
  return `calibration: ${trimmed}`;
}

/**
 * Disclosure — Apple disclosure-row pattern. A rounded card with a
 * clickable header: icon chevron rotates 90° on open; the bullet list
 * slides into view below.
 */
function DisclosureBanner({
  calibrationAsOf,
}: Readonly<{ calibrationAsOf: string | null | undefined }>) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const nowStr = now.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  return (
    <section
      data-testid="simulation-disclosure"
      className="mt-10 rounded-xl bg-bg-primary ring-1 ring-separator overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-[15px] font-semibold text-label hover:bg-bg-secondary transition"
        aria-expanded={open}
      >
        <span>{t("report.disclosure")}</span>
        <span
          aria-hidden="true"
          className={`text-label-tertiary transition-transform ${open ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </button>
      {open && (
        <ul className="px-5 pb-5 space-y-2 text-sm text-label-secondary leading-relaxed list-disc list-inside border-t border-separator pt-4">
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
    </section>
  );
}

type Tab = "chart" | "table";

/*
  Attainability pill colours — iOS tinted-pill pattern. Each state uses a
  system-* foreground on a system-*-tint background, reading as a soft
  status chip rather than a saturated badge. See tailwind.config.js for
  the exact hex triples.
*/
const ATTAINABILITY_CLASS: Record<"attainable" | "aspirational" | "out_of_reach", string> = {
  attainable: "bg-system-green-tint text-system-green",
  aspirational: "bg-system-orange-tint text-system-orange",
  out_of_reach: "bg-system-red-tint text-system-red",
};

// Prefer the localised string; fall back to the backend label with
// underscores normalised.
function attainabilityLabel(
  attainability: "attainable" | "aspirational" | "out_of_reach"
): string {
  const key = `report.${attainability}`;
  const localised = t(key);
  return localised === key ? attainability.replace(/_/g, " ") : localised;
}

export default function SimulationReport() {
  const nav = useNavigate();
  const results = useAppSelector((s) => s.simulation.results);
  const legacyResult = useAppSelector((s) => s.simulation.result);
  const status = useAppSelector((s) => s.simulation.status);
  const draftProfile = useAppSelector((s) => s.draft.profile);
  const [tab, setTab] = useState<Tab>("chart");
  const [activeScenario, setActiveScenario] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [reportTitle, setReportTitle] = useState("Simulation report 1");
  const [inversionByScenario, setInversionByScenario] = useState<
    Record<number, SimulateInvertResult | null>
  >({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const draftClientId = useAppSelector((s) => {
    const raw = (s.draft as unknown as { clientId?: string | null }).clientId;
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  });

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
      };
    });
  }, [activeResult]);

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

  const firedInversionRef = useRef<Set<number>>(new Set());

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
        const msg =
          e instanceof ApiError ? e.message : "Could not compute inversion";
        toast(msg, "error");
        firedInversionRef.current.delete(activeScenario);
      });
  }, [shouldFetchInversion, activeScenario, activeRequest]);

  if (status === "loading") {
    return (
      <AppShell>
        <header className="px-6 pt-10 pb-6">
          <h1 className="text-4xl font-bold tracking-tight">
            {t("report.title")}
          </h1>
        </header>
        <div className="px-6">
          <WizardTabs basePath="/clients/new" />
          <p className="text-center text-label-secondary py-16">
            Running simulation…
          </p>
        </div>
      </AppShell>
    );
  }

  if (!activeResult || scenarioCards.length === 0) {
    return (
      <AppShell>
        <header className="px-6 pt-10 pb-6">
          <h1 className="text-4xl font-bold tracking-tight">
            {t("report.title")}
          </h1>
        </header>
        <div className="px-6">
          <WizardTabs basePath="/clients/new" />
          <div className="rounded-xl bg-bg-primary ring-1 ring-separator p-10 text-center">
            <p className="text-label-secondary mb-4">
              No simulation has been run yet. Go back and run a scenario to see the report.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => nav("/clients/new/scenario")}
            >
              Back to Scenarios
            </button>
          </div>
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

  const seTailPp =
    probabilityPct != null
      ? fmtProbabilitySeTail(activeResult.probability_of_goal_se)
      : null;
  const seTail = seTailPp ? t("report.se.tail", { pp: seTailPp }) : null;

  const inversionResponse = inversionByScenario[activeScenario];
  const suggestions: string[] = [];
  if (shouldFetchInversion && inversionResponse) {
    const { required_monthly_investment, required_horizon_years } =
      inversionResponse;
    if (required_monthly_investment != null) {
      const bracketed =
        Math.round(required_monthly_investment / 100) * 100;
      suggestions.push(
        t("report.suggest.monthly", { monthly: fmtEGP(bracketed) })
      );
    } else if (required_horizon_years != null) {
      const calendarYear =
        new Date().getFullYear() + required_horizon_years - 1;
      suggestions.push(
        t("report.suggest.horizon", { year: calendarYear })
      );
    } else {
      suggestions.push(t("report.suggest.unreachable"));
    }
  }

  function handlePrint() {
    if (typeof globalThis.window !== "undefined") globalThis.window.print();
  }

  async function handleSave() {
    if (saveState !== "idle" || !activeRequest || !activeResult) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    const defaultName = reportTitle || `Simulation ${todayIso}`;
    const hasWindow = globalThis.window !== undefined;
    const raw = hasWindow
      ? globalThis.window.prompt(t("report.save.prompt"), defaultName)
      : defaultName;
    if (raw == null) return;
    const name = raw.trim();
    if (name.length === 0) return;
    setSaveState("saving");
    try {
      await api.createSimulation({
        name,
        client_id: draftClientId,
        request: activeRequest,
        response: activeResult,
      });
      setSaveState("saved");
      toast(t("report.save.toast.success", { name }), "success");
    } catch (e) {
      setSaveState("idle");
      const msg = e instanceof ApiError ? e.message : "Save failed";
      toast(msg, "error");
    }
  }

  const clientName = draftProfile.fullName || "New client";
  const clientEmail = draftProfile.email || "";

  const activeAttainability = activeResult.attainability;

  return (
    <AppShell focus={presenting}>
      <header className="px-6 pt-10 pb-6">
        <h1 className="text-4xl font-bold tracking-tight truncate">
          {clientName}
        </h1>
        {clientEmail && (
          <p className="mt-1 text-base text-label-secondary">{clientEmail}</p>
        )}
      </header>

      <div className="px-6 space-y-6">
        {!presenting && <WizardTabs basePath="/clients/new" />}

        {/*
          Moment-of-truth card. System-blue accent via the attainability
          pill when present. The sentence itself is a Title 2 on a white
          card — iOS-y without being shouty.
        */}
        <section
          data-testid="moment-of-truth"
          className="rounded-2xl bg-bg-primary ring-1 ring-separator p-6"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <p
              className="text-2xl font-semibold tracking-tight leading-snug text-label flex-1"
              data-testid="moment-of-truth-headline"
            >
              {headline}
              {seTail && (
                <>
                  {" "}
                  <em
                    className="text-lg text-label-secondary not-italic tabular font-normal"
                    data-testid="moment-of-truth-se"
                  >
                    {seTail}
                  </em>
                </>
              )}
            </p>
            {activeAttainability && (
              <span
                className={`pill ${ATTAINABILITY_CLASS[activeAttainability]}`}
              >
                {attainabilityLabel(activeAttainability)}
              </span>
            )}
          </div>

          {suggestions.length > 0 && (
            <ul
              className="mt-4 space-y-1.5 text-[15px] text-label-secondary"
              data-testid="moment-of-truth-suggestions"
            >
              {suggestions.map((s) => (
                <li key={s} className="leading-relaxed">
                  — {s}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/*
          Action row. Blue text buttons (`btn-plain`) for present / print /
          save. Editable report title sits to the left.
        */}
        <div className="flex items-center justify-between gap-4 flex-wrap print:hidden">
          <input
            aria-label="Report title"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="text-[17px] font-semibold tracking-tight bg-transparent border-0 outline-none flex-1 min-w-0 focus:ring-0 focus:outline-none text-label"
          />
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setPresenting((p) => !p)}
              aria-pressed={presenting}
              className="btn-plain"
            >
              {presenting ? t("report.action.exit_present") : t("report.action.present")}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-plain"
            >
              {t("report.action.print")}
            </button>
            <button
              type="button"
              data-testid="save-simulation-button"
              onClick={handleSave}
              disabled={saveState !== "idle"}
              className="btn-plain"
            >
              {saveState === "saving" && t("report.action.saving")}
              {saveState === "saved" && t("report.action.saved")}
              {saveState === "idle" && t("report.action.save")}
            </button>
          </div>
        </div>

        {/*
          Scenario cards. Vertical stack of rounded cards; click to
          promote the row to "active". The active card gets a 2px
          system-blue ring so the selection is unambiguous on the page.
        */}
        <section
          aria-live="polite"
          data-testid="scenario-cards"
          className="space-y-3"
        >
          <h2 className="text-2xl font-semibold tracking-tight mb-2">
            {t("report.section.probability")}
          </h2>
          {scenarioCards.map((sc, i) => {
            const isActive = i === activeScenario;
            return (
              <button
                type="button"
                key={sc.name + i}
                data-testid={`scenario-card-${i}`}
                data-scenario-name={sc.name}
                data-probability={sc.probability}
                aria-pressed={isActive}
                onClick={() => setActiveScenario(i)}
                className={`w-full text-start rounded-2xl bg-bg-primary p-5 ring-1 transition grid grid-cols-1 md:grid-cols-[2fr_3fr_auto] gap-5 items-center ${
                  isActive
                    ? "ring-2 ring-system-blue"
                    : "ring-separator hover:bg-bg-secondary"
                }`}
              >
                <div className="text-xl font-semibold tracking-tight text-label">
                  {sc.name}
                </div>
                <ProbabilityBar
                  percent={sc.probability}
                  seTail={
                    isActive
                      ? fmtProbabilitySeTail(sc.result.probability_of_goal_se)
                      : null
                  }
                />
                {sc.result.attainability && (
                  <span
                    className={`pill justify-self-start md:justify-self-end ${ATTAINABILITY_CLASS[sc.result.attainability]}`}
                    title="Attainability band based on P15 / median real-terms projection"
                  >
                    {attainabilityLabel(sc.result.attainability)}
                  </span>
                )}
              </button>
            );
          })}
        </section>

        {/*
          Projection card. Header row: Title 2 + iOS segmented control for
          chart / table. Inside: Recharts chart restyled Apple (system-
          blue median, gray-1 bounds, gray-5 horizontal grid, white
          tooltip card).
        */}
        <section className="rounded-2xl bg-bg-primary p-6 ring-1 ring-separator">
          <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("report.section.projection")}
            </h2>
            <div className="segmented">
              <button
                type="button"
                onClick={() => setTab("chart")}
                title="Chart"
                className={`segmented-item ${tab === "chart" ? "segmented-item-active" : ""}`}
              >
                Chart
              </button>
              <button
                type="button"
                onClick={() => setTab("table")}
                title="Table"
                className={`segmented-item ${tab === "table" ? "segmented-item-active" : ""}`}
              >
                Table
              </button>
            </div>
          </div>
          <div className="text-sm text-label-secondary mb-4">
            {scenarioCards[activeScenario]?.name} · {scenarioCards.length} scenario{scenarioCards.length === 1 ? "" : "s"} · N=10k
          </div>

          {tab === "chart" ? (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    stroke="#E5E5EA"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: "#8E8E93" }}
                    stroke="#D1D1D6"
                    axisLine={{ stroke: "#D1D1D6", strokeWidth: 1 }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => fmtEGP(v, { compact: true })}
                    tick={{ fontSize: 11, fill: "#8E8E93" }}
                    stroke="#D1D1D6"
                    axisLine={false}
                    tickLine={false}
                    width={72}
                  />
                  <Tooltip
                    cursor={{ stroke: "#8E8E93", strokeWidth: 1, strokeDasharray: "2 4" }}
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
                            background: "#FFFFFF",
                            border: "1px solid #D1D1D6",
                            borderRadius: 8,
                            padding: "10px 14px",
                            fontSize: 12,
                            color: "#000000",
                            fontVariantNumeric: "tabular-nums",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                        >
                          <div style={{ marginBottom: 4, fontSize: 11, color: "#8E8E93", fontWeight: 600 }}>
                            {label}
                          </div>
                          <div>Optimistic: {fmtEGP(row.optimistic)}</div>
                          <div style={{ color: "#007AFF", fontWeight: 600 }}>Median: {fmtEGP(row.median)}</div>
                          <div>Pessimistic: {fmtEGP(row.pessimistic)}</div>
                        </div>
                      );
                    }}
                  />
                  {/* P15 — dashed gray-1 */}
                  <Line
                    type="monotone"
                    dataKey="pessimistic"
                    stroke="#8E8E93"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                    name="Pessimistic"
                  />
                  {/* Median — solid system-blue */}
                  <Line
                    type="monotone"
                    dataKey="median"
                    stroke="#007AFF"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    name="Median"
                  />
                  {/* P85 — dashed gray-1 */}
                  <Line
                    type="monotone"
                    dataKey="optimistic"
                    stroke="#8E8E93"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                    name="Optimistic"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {(() => {
                const birthYear = draftProfile.birthdate
                  ? new Date(draftProfile.birthdate).getFullYear()
                  : null;
                const showAge = birthYear != null && !Number.isNaN(birthYear);
                return (
                  <table className="w-full text-sm tabular">
                    <thead>
                      <tr className="text-xs font-semibold uppercase tracking-wider text-label-secondary">
                        {showAge && (
                          <th className="text-start font-semibold pb-3">Age</th>
                        )}
                        <th className="text-start font-semibold pb-3">Year</th>
                        <th className="text-start font-semibold pb-3">Optimistic</th>
                        <th className="text-start font-semibold pb-3">Median</th>
                        <th className="text-start font-semibold pb-3">Pessimistic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row) => (
                        <tr key={row.year} className="border-t border-separator">
                          {showAge && (
                            <td className="py-2 text-label-secondary">
                              {row.year - (birthYear as number)}
                            </td>
                          )}
                          <td className="py-2 text-label-secondary">{row.year}</td>
                          <td className="py-2" data-testid={`row-${row.year}-optimistic`}>
                            {fmtEGP(row.optimistic)}
                          </td>
                          <td className="py-2 font-semibold text-system-blue" data-testid={`row-${row.year}-median`}>
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
            className="btn-plain"
            onClick={() => nav("/clients/new/scenario")}
          >
            ← {t("report.action.back")}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
