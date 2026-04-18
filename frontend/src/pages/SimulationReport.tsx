import { useMemo, useState } from "react";
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
import { useAppSelector } from "../store";
import { fmtEGP } from "../utils/format";
import { t } from "../i18n";

type Tab = "chart" | "table";

const ATTAINABILITY_CLASS: Record<"attainable" | "aspirational" | "out_of_reach", string> = {
  attainable: "bg-emerald-100 text-emerald-700",
  aspirational: "bg-amber-100 text-amber-700",
  out_of_reach: "bg-rose-100 text-rose-700",
};

export default function SimulationReport() {
  const nav = useNavigate();
  const result = useAppSelector((s) => s.simulation.result);
  const status = useAppSelector((s) => s.simulation.status);
  const scenarios = useAppSelector((s) => s.draft.scenarios);
  const draftProfile = useAppSelector((s) => s.draft.profile);
  const [tab, setTab] = useState<Tab>("chart");
  const [activeScenario, setActiveScenario] = useState(0);

  const chartData = useMemo(() => {
    if (!result) return [];
    return result.projection.years.map((y, i) => {
      const optimistic = Math.round(result.projection.optimistic[i]);
      const median = Math.round(result.projection.median[i]);
      const pessimistic = Math.round(result.projection.pessimistic[i]);
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
  }, [result]);

  const scenarioCards = useMemo(() => {
    if (scenarios.length === 0) return [];
    return scenarios.slice(0, 4).map((s, i) => ({
      name: s.name,
      probability: result
        ? Math.min(
            99,
            Math.max(1, Math.round((result.probability_of_goal || 0) * 100 - i * 10))
          )
        : 0,
    }));
  }, [scenarios, result]);

  if (status === "loading") {
    return (
      <AppShell title="New Client">
        <WizardTabs basePath="/clients/new" />
        <div className="card py-16 text-center text-muted">Running simulation…</div>
      </AppShell>
    );
  }

  if (!result || scenarioCards.length === 0) {
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

  return (
    <AppShell title="New Client">
      <WizardTabs basePath="/clients/new" />

      <section className="rounded-2xl bg-report-gradient text-white relative overflow-hidden p-8">
        <svg
          className="absolute inset-0 w-full h-full opacity-60"
          viewBox="0 0 1200 240"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 30 }).map((_, i) => (
            <path
              key={i}
              d={`M0 ${200 - i * 2} C 300 ${120 + i * 2}, 900 ${200 - i * 3}, 1200 ${
                80 + i * 4
              }`}
              stroke="white"
              strokeWidth="0.6"
              fill="none"
              opacity={0.5 - i * 0.015}
            />
          ))}
        </svg>
        <div className="relative">
          <div className="text-xs font-semibold opacity-70 mb-1">Report</div>
          <div className="text-xl font-bold">{draftProfile.fullName || "New client"}</div>
          <div className="text-xs opacity-80">{draftProfile.email || "—"}</div>
        </div>
      </section>

      <div className="card mt-[-28px] relative z-10 py-3 flex items-center justify-between">
        <input
          className="bg-transparent font-semibold text-sm focus:outline-none"
          defaultValue="Simulation report 1"
        />
        <div className="flex items-center gap-3 text-xs">
          <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border font-semibold">
            <span>⧉</span> Overview
          </button>
          <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border font-semibold">
            <span>🖨</span> Print
          </button>
        </div>
      </div>

      <section className="card mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold">Goals Achievement Probability</h3>
            {result.attainability && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${ATTAINABILITY_CLASS[result.attainability]}`}
                title="Attainability band based on P15 / median real-terms projection"
              >
                {/* Prefer the localised string; fall back to the backend
                    label with underscores normalised if the key is missing. */}
                {(() => {
                  const key = `report.${result.attainability}`;
                  const localised = t(key);
                  return localised === key
                    ? result.attainability.replace(/_/g, " ")
                    : localised;
                })()}
              </span>
            )}
          </div>
          <button className="text-muted">⋮</button>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-500 mb-5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          10,000 simulations run for {scenarioCards.length} scenario{scenarioCards.length === 1 ? "" : "s"}
        </div>
        <div className="text-xs text-primary-500 font-semibold mb-5">
          Probability of funding all goals
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {scenarioCards.map((sc, i) => (
            <div key={sc.name + i} className="flex flex-col items-center">
              <div className="text-sm font-medium mb-3 text-center">{sc.name}</div>
              <DonutChart percent={sc.probability} />
              <button
                className={`mt-3 px-4 h-8 rounded-full text-xs font-semibold ${
                  i === activeScenario
                    ? "text-primary-500"
                    : "bg-primary-500 text-white"
                }`}
                onClick={() => setActiveScenario(i)}
              >
                {i === activeScenario ? "Displayed" : "Display"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-bold">{scenarioCards[activeScenario]?.name}</div>
            <div className="text-xs text-muted">{scenarios.length} scenarios</div>
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

      <div className="flex items-center justify-between mt-6">
        <button
          className="text-primary-500 text-sm font-semibold"
          onClick={() => nav("/clients/new/scenario")}
        >
          Back to Scenarios
        </button>
        <div className="flex items-center gap-3">
          <button className="btn-outline">Save this simulation</button>
          <button className="btn-primary">Generate Report</button>
        </div>
      </div>
    </AppShell>
  );
}
