import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import SimulationReport from "./SimulationReport";
import { renderWithProviders } from "../test/testUtils";
import type { SimulateResult } from "../api/client";

// Recharts renders into SVG using ResponsiveContainer which needs a real
// width/height. jsdom has no layout, so we force a size via ResizeObserver
// stubs + a wrapped ResponsiveContainer. For this test we only care about
// the *table* values (unstacked), so we click the table toggle.

const baseResult: SimulateResult = {
  recommended: { variable_pct: 60, percentiles: {} },
  candidates: [],
  projection: {
    years: [1, 2, 3, 4, 5],
    // deliberately different per year so a stacking bug is impossible to
    // miss (stacked values would be very different from these)
    pessimistic: [10000, 20000, 30000, 40000, 50000],
    median: [15000, 30000, 45000, 60000, 80000],
    optimistic: [25000, 45000, 70000, 100000, 120000],
  },
  probability_of_goal: 0.72,
  attainability: "attainable",
};

beforeAll(() => {
  class MockResizeObserver {
    observe() {
      /* noop */
    }
    unobserve() {
      /* noop */
    }
    disconnect() {
      /* noop */
    }
  }
  (globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
    MockResizeObserver;
});
afterAll(() => {
  vi.restoreAllMocks();
});

describe("SimulationReport stacking", () => {
  it("renders unstacked optimistic >= median >= pessimistic in the table", async () => {
    const { container } = renderWithProviders(<SimulationReport />, {
      preloadedState: {
        auth: {
          user: { id: "u1", name: "Tester", email: "t@e.com" },
          status: "idle",
          error: null,
          initialized: true,
        },
        simulation: { result: baseResult, status: "idle", error: null },
        draft: {
          profile: {
            fullName: "Sample Client",
            email: "sample@example.com",
            birthdate: "",
            phone: "",
            employmentStatus: "",
            employmentIncome: 0,
            hasCoClient: false,
            coClient: {
              fullName: "",
              birthdate: "",
              employmentStatus: "",
              employmentIncome: 0,
            },
            dependents: [],
            incomeSources: [],
            assets: [],
            debts: [],
            monthlyExpenses: 0,
            riskAppetite: "moderate",
          },
          goals: [],
          scenarios: [
            {
              name: "Base",
              model: "balanced",
              goalNames: [],
              investments: [{ amount: 100000, year: 2026 }],
              monthlyInvestments: [{ amount: 5000, annualIncrease: 0 }],
              loans: [],
            },
          ],
        } as never,
      },
    });
    // Switch to table view
    const tableBtn = container.querySelector('button[title="Table"]') as HTMLButtonElement;
    expect(tableBtn).toBeTruthy();
    act(() => {
      tableBtn.click();
    });

    const nowYear = new Date().getFullYear();
    for (let i = 0; i < baseResult.projection.years.length; i++) {
      const year = nowYear + baseResult.projection.years[i] - 1;
      const pess = baseResult.projection.pessimistic[i];
      const med = baseResult.projection.median[i];
      const opt = baseResult.projection.optimistic[i];

      const pessCell = await screen.findByTestId(`row-${year}-pessimistic`);
      const medCell = await screen.findByTestId(`row-${year}-median`);
      const optCell = await screen.findByTestId(`row-${year}-optimistic`);

      // Extract the numeric value from each cell; the formatter strips
      // non-digits except digits themselves.
      const parse = (el: HTMLElement) => Number(el.textContent?.replace(/\D/g, ""));
      const pessVal = parse(pessCell);
      const medVal = parse(medCell);
      const optVal = parse(optCell);

      // Unstacked: each cell equals the backend value (rounded).
      expect(pessVal).toBe(pess);
      expect(medVal).toBe(med);
      expect(optVal).toBe(opt);

      // Invariant QA asserts.
      expect(optVal).toBeGreaterThanOrEqual(medVal);
      expect(medVal).toBeGreaterThanOrEqual(pessVal);
    }
  });
});
