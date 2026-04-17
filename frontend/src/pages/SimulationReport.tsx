import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "../components/AppShell";
import WizardTabs from "../components/WizardTabs";
import DonutChart from "../components/DonutChart";
import { useAppSelector } from "../store";

type Tab = "chart" | "table";

export default function SimulationReport() {
  const nav = useNavigate();
  const result = useAppSelector((s) => s.simulation.result);
  const scenarios = useAppSelector((s) => s.draft.scenarios);
  const draftProfile = useAppSelector((s) => s.draft.profile);
  const [tab, setTab] = useState<Tab>("chart");
  const [activeScenario, setActiveScenario] = useState(0);

  const chartData = useMemo(() => {
    if (!result) return [];
    return result.projection.years.map((y, i) => ({
      year: new Date().getFullYear() + y - 1,
      optimistic: Math.round(result.projection.optimistic[i]),
      median: Math.round(result.projection.median[i]),
      pessimistic: Math.round(result.projection.pessimistic[i]),
    }));
  }, [result]);

  const scenarioCards =
    scenarios.length > 0
      ? scenarios.slice(0, 4).map((s, i) => ({
          name: s.name,
          probability: result
            ? Math.min(
                99,
                Math.max(5, Math.round((result.probability_of_goal || 0.5) * 100 - i * 10))
              )
            : 50,
        }))
      : [
          { name: "Invest 500k + 1M Loan", probability: 97 },
          { name: "Invest 500k", probability: 13 },
          { name: "Goal 1 + Goal 2", probability: 51 },
          { name: "Goal 3 + Goal 4", probability: 51 },
        ];

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
          <div className="text-xl font-bold">
            {draftProfile.fullName || "Ahmed Ali Mohammed"}
          </div>
          <div className="text-xs opacity-80">{draftProfile.email || "ahmed.ali@gmail.com"}</div>
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
          <h3 className="font-bold">Goals Achievement Probability</h3>
          <button className="text-muted">⋮</button>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-500 mb-5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          1000 simulation are done for {scenarioCards.length} scenarios
        </div>
        <div className="text-xs text-primary-500 font-semibold mb-5">
          Probability of funding all goals
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {scenarioCards.map((sc, i) => (
            <div key={i} className="flex flex-col items-center">
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
            <div className="text-xs text-muted">{scenarios.length || 4} Goals</div>
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
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g-opt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#86E3A9" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#86E3A9" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="g-med" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F7D768" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#F7D768" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="g-pes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F7A678" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#F7A678" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v) => `${Math.round(v / 1000)}`}
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "Portfolio Value (thousands)",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "#6B7280", fontSize: 11 },
                  }}
                />
                <Tooltip
                  formatter={(v: number) => `${v.toLocaleString()}`}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB" }}
                />
                <Area
                  type="monotone"
                  dataKey="optimistic"
                  stackId="1"
                  stroke="#4FAE6E"
                  fill="url(#g-opt)"
                  name="Optimistic"
                />
                <Area
                  type="monotone"
                  dataKey="median"
                  stackId="1"
                  stroke="#D4AC33"
                  fill="url(#g-med)"
                  name="Median"
                />
                <Area
                  type="monotone"
                  dataKey="pessimistic"
                  stackId="1"
                  stroke="#D47C33"
                  fill="url(#g-pes)"
                  name="Pessimistic"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="text-center text-xs text-primary-500 font-semibold mb-3">
              Portfolio Value by the end of the year
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="text-left font-medium pb-3">Earned at age</th>
                  <th className="text-left font-medium pb-3">Year</th>
                  <th className="text-left font-medium pb-3">Optimistic</th>
                  <th className="text-left font-medium pb-3">Median</th>
                  <th className="text-left font-medium pb-3">Pessimistic</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="py-2">
                      {48 + i} / {49 + i} years
                    </td>
                    <td className="py-2">{row.year}</td>
                    <td className="py-2">{row.optimistic.toLocaleString()}</td>
                    <td className="py-2">{row.median.toLocaleString()}</td>
                    <td className="py-2">{row.pessimistic.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
