import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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
 * Disclosure banner. Editorial, not a card: a 1px top rule, a small-caps
 * summary toggle, a bullet list inside when open. No rounded corners, no
 * background fill.
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
      className="border-t border-rule py-6 mt-16 text-xs text-ink-muted"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between uppercase tracking-widest text-ink-muted hover:text-ink"
        aria-expanded={open}
      >
        <span>{t("report.disclosure")}</span>
        <span aria-hidden="true">{open ? "–" : "+"}</span>
      </button>
      {open && (
        <ul className="mt-4 space-y-2 leading-relaxed list-disc list-inside">
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
  Muted attainability palette. The saturated 700/600 fills from the old
  pill badges would stab through the cream — we drop to 900 ink on 100
  tints, which read as a quiet editorial annotation. Contrast against
  bg-{color}-100 clears 4.5:1 at 900.
*/
const ATTAINABILITY_CLASS: Record<"attainable" | "aspirational" | "out_of_reach", string> = {
  attainable: "bg-emerald-100 text-emerald-900",
  aspirational: "bg-amber-100 text-amber-900",
  out_of_reach: "bg-rose-100 text-rose-900",
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
        <WizardTabs basePath="/clients/new" />
        <p className="text-center text-ink-muted font-serif italic py-16">
          Running simulation…
        </p>
      </AppShell>
    );
  }

  if (!activeResult || scenarioCards.length === 0) {
    return (
      <AppShell>
        <WizardTabs basePath="/clients/new" />
        <div className="py-16 text-center">
          <p className="font-serif italic text-ink-muted mb-6">
            No simulation has been run yet. Go back and run a scenario to see the report.
          </p>
          <button className="btn" onClick={() => nav("/clients/new/scenario")}>
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

  return (
    <AppShell focus={presenting}>
      {!presenting && <WizardTabs basePath="/clients/new" />}

      {/*
        Moment-of-truth headline — at the TOP of the page, above every
        other element. No hero panel, no gradient, no decorative chrome.
        The page opens with the sentence that answers "can my client
        afford this?", set in a large serif, and nothing more.
      */}
      <section data-testid="moment-of-truth" className="mb-12">
        <p
          className="font-serif text-3xl md:text-4xl tracking-tight leading-tight text-ink"
          data-testid="moment-of-truth-headline"
        >
          {headline}
          {seTail && (
            <>
              {" "}
              <em
                className="text-xl md:text-2xl text-ink-muted not-italic tabular"
                data-testid="moment-of-truth-se"
              >
                {seTail}
              </em>
            </>
          )}
        </p>

        {suggestions.length > 0 && (
          <ul
            className="mt-6 space-y-2 text-base text-ink-muted"
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
        Client masthead. A thin rule underneath, name in serif, email in
        small-caps ink-muted below. Replaces the gradient "Report" panel.
      */}
      <header className="border-b border-rule pb-6 mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="label mb-1">{t("report.title")}</div>
          <h2 className="font-serif text-2xl tracking-tight truncate">
            {clientName}
          </h2>
          {clientEmail && (
            <div className="label mt-1">{clientEmail}</div>
          )}
        </div>
        <div className="flex items-center gap-6 print:hidden">
          <button
            type="button"
            onClick={() => setPresenting((p) => !p)}
            aria-pressed={presenting}
            className="text-sm text-ink hover:underline underline-offset-4"
          >
            {presenting ? t("report.action.exit_present") : t("report.action.present")}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="text-sm text-ink hover:underline underline-offset-4"
          >
            {t("report.action.print")}
          </button>
          <button
            type="button"
            data-testid="save-simulation-button"
            onClick={handleSave}
            disabled={saveState !== "idle"}
            className="text-sm text-ink hover:underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveState === "saving" && t("report.action.saving")}
            {saveState === "saved" && t("report.action.saved")}
            {saveState === "idle" && t("report.action.save")}
          </button>
        </div>
      </header>

      {/*
        Editable report title. A plain unstyled input with a bottom rule
        on focus — writes to local state only; `handleSave` uses it as
        the default when the user hits "Save simulation".
      */}
      <input
        aria-label="Report title"
        value={reportTitle}
        onChange={(e) => setReportTitle(e.target.value)}
        className="font-serif text-2xl tracking-tight bg-transparent border-0 border-b border-transparent focus:border-rule outline-none w-full mb-10 py-2 px-0"
      />

      {/*
        Scenario list. Vertical stack of sections, each separated by a
        top rule. Click a row to promote it to "active"; the selected
        row gets the accent underline.
      */}
      <section
        aria-live="polite"
        data-testid="scenario-cards"
        className="mb-12"
      >
        <h3 className="font-serif text-2xl tracking-tight mb-6">
          {t("report.section.probability")}
        </h3>
        {scenarioCards.map((sc, i) => (
          <button
            type="button"
            key={sc.name + i}
            data-testid={`scenario-card-${i}`}
            data-scenario-name={sc.name}
            data-probability={sc.probability}
            aria-pressed={i === activeScenario}
            onClick={() => setActiveScenario(i)}
            className={`w-full text-start border-t border-rule py-6 grid grid-cols-1 md:grid-cols-[2fr_3fr_1fr] gap-6 items-center hover:bg-paper-deep transition ${
              i === activeScenario ? "border-t-2 border-t-accent" : ""
            }`}
          >
            <div className="font-serif text-xl tracking-tight">{sc.name}</div>
            <ProbabilityBar
              percent={sc.probability}
              seTail={
                i === activeScenario
                  ? fmtProbabilitySeTail(sc.result.probability_of_goal_se)
                  : null
              }
            />
            {sc.result.attainability && (
              <span
                className={`text-xs uppercase tracking-widest px-2 py-0.5 justify-self-start md:justify-self-end ${ATTAINABILITY_CLASS[sc.result.attainability]}`}
                title="Attainability band based on P15 / median real-terms projection"
              >
                {attainabilityLabel(sc.result.attainability)}
              </span>
            )}
          </button>
        ))}
      </section>

      {/*
        Projection. Section rule, small-caps header, a toggle sitting to
        the right as plain text (no pill tab). The chart is all ink lines
        — no gradient fills, no cartesian grid.
      */}
      <section className="border-t border-rule pt-6 mb-12">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-serif text-2xl tracking-tight">
            {t("report.section.projection")}
          </h3>
          <div className="flex items-center gap-4 text-xs uppercase tracking-widest">
            <button
              type="button"
              onClick={() => setTab("chart")}
              title="Chart"
              className={tab === "chart" ? "text-ink underline decoration-accent underline-offset-4" : "text-ink-muted hover:text-ink"}
            >
              Chart
            </button>
            <button
              type="button"
              onClick={() => setTab("table")}
              title="Table"
              className={tab === "table" ? "text-ink underline decoration-accent underline-offset-4" : "text-ink-muted hover:text-ink"}
            >
              Table
            </button>
          </div>
        </div>
        <div className="text-xs text-ink-muted mb-4">
          {scenarioCards[activeScenario]?.name} · {scenarioCards.length} scenario{scenarioCards.length === 1 ? "" : "s"} · N=10k
        </div>

        {tab === "chart" ? (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: "#6B655C" }}
                  stroke="#1A1816"
                  axisLine={{ stroke: "#1A1816", strokeWidth: 1 }}
                  tickLine={{ stroke: "#1A1816" }}
                />
                <YAxis
                  tickFormatter={(v) => fmtEGP(v, { compact: true })}
                  tick={{ fontSize: 11, fill: "#6B655C" }}
                  stroke="#1A1816"
                  axisLine={{ stroke: "#1A1816", strokeWidth: 1 }}
                  tickLine={{ stroke: "#1A1816" }}
                  width={72}
                />
                <Tooltip
                  cursor={{ stroke: "#6B655C", strokeWidth: 1, strokeDasharray: "2 4" }}
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
                          background: "#FBF8F1",
                          border: "1px solid #E8E2D4",
                          padding: "8px 12px",
                          fontSize: 12,
                          color: "#1A1816",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <div style={{ marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 10, color: "#6B655C" }}>
                          {label}
                        </div>
                        <div>Optimistic: {fmtEGP(row.optimistic)}</div>
                        <div>Median: {fmtEGP(row.median)}</div>
                        <div>Pessimistic: {fmtEGP(row.pessimistic)}</div>
                      </div>
                    );
                  }}
                />
                {/* P15 — dashed muted */}
                <Line
                  type="monotone"
                  dataKey="pessimistic"
                  stroke="#6B655C"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                  name="Pessimistic"
                />
                {/* Median — solid ink */}
                <Line
                  type="monotone"
                  dataKey="median"
                  stroke="#1A1816"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  name="Median"
                />
                {/* P85 — dashed muted */}
                <Line
                  type="monotone"
                  dataKey="optimistic"
                  stroke="#6B655C"
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
                    <tr className="text-xs uppercase tracking-widest text-ink-muted">
                      {showAge && (
                        <th className="text-start font-normal pb-3">Client age</th>
                      )}
                      <th className="text-start font-normal pb-3">Year</th>
                      <th className="text-start font-normal pb-3">Optimistic</th>
                      <th className="text-start font-normal pb-3">Median</th>
                      <th className="text-start font-normal pb-3">Pessimistic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row) => (
                      <tr key={row.year} className="border-t border-rule">
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

      <div className="flex items-center justify-between mt-10 print:hidden">
        <button
          type="button"
          className="text-sm text-ink hover:underline underline-offset-4"
          onClick={() => nav("/clients/new/scenario")}
        >
          ← {t("report.action.back")}
        </button>
      </div>
    </AppShell>
  );
}
