import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ClientRecord } from "../../api/client";

export type Dependent = { name: string; relation: string; birthdate: string };
export type IncomeSource = { source: string; amount: number; annualIncrease: number };
export type Asset = { name: string; amount: number };
export type Debt = { name: string; amount: number; duration: number; interestRate: number };
export type Goal = {
  name: string;
  amount: number;
  year: number;
  payments: number;
  inflationRate: number;
};
export type Scenario = {
  // Stable client-side identifier. Used as the React key for ScenarioCard
  // so the card does NOT remount when the scenario's user-editable name
  // changes. Populated at creation (addScenario / duplicateScenario) and
  // back-filled for pre-existing persisted drafts at slice init.
  id: string;
  name: string;
  model: string;
  goalNames: string[];
  investments: { amount: number; year: number }[];
  monthlyInvestments: { amount: number; annualIncrease: number }[];
  loans: { amount: number; year: number; duration: number; interestRate: number }[];
};

// Prefer crypto.randomUUID (browser + jsdom + Node 19+) and fall back to a
// time-seeded random hex so older JSDOM / test environments still work.
function makeId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  const randomUUID = g.crypto?.randomUUID;
  if (typeof randomUUID === "function") return randomUUID.call(g.crypto);
  return `sc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type State = {
  // Server-assigned id of the persisted Client row. Null until the advisor
  // first triggers persistence (wizard run-simulation step), then reused so
  // subsequent edits PATCH the same row instead of creating duplicates.
  clientId: string | null;
  profile: {
    fullName: string;
    email: string;
    birthdate: string;
    phone: string;
    employmentStatus: string;
    employmentIncome: number;
    hasCoClient: boolean;
    coClient: {
      fullName: string;
      birthdate: string;
      employmentStatus: string;
      employmentIncome: number;
    };
    dependents: Dependent[];
    incomeSources: IncomeSource[];
    assets: Asset[];
    debts: Debt[];
    monthlyExpenses: number;
    riskAppetite: "very_low" | "low" | "moderate" | "high" | "very_high";
  };
  goals: Goal[];
  scenarios: Scenario[];
  // Editable report title. Seeds the "Save simulation" prompt default
  // and the inline <input> at the top of SimulationReport.
  reportTitle: string;
};

const initialState: State = {
  clientId: null,
  profile: {
    fullName: "",
    email: "",
    birthdate: "",
    phone: "",
    employmentStatus: "",
    employmentIncome: 0,
    hasCoClient: false,
    coClient: { fullName: "", birthdate: "", employmentStatus: "", employmentIncome: 0 },
    dependents: [],
    incomeSources: [{ source: "", amount: 0, annualIncrease: 0 }],
    assets: [{ name: "", amount: 0 }],
    debts: [{ name: "", amount: 0, duration: 0, interestRate: 0 }],
    monthlyExpenses: 0,
    riskAppetite: "moderate",
  },
  goals: [
    { name: "", amount: 0, year: new Date().getFullYear() + 5, payments: 0, inflationRate: 0 },
  ],
  scenarios: [
    {
      id: makeId(),
      name: "Scenario 1",
      model: "",
      goalNames: [],
      investments: [],
      monthlyInvestments: [],
      loans: [],
    },
  ],
  reportTitle: "Simulation report 1",
};

// Product constraint mirrored in ScenarioStep.tsx: the simulation report
// renders at most 4 scenario cards, so we cap the wizard at the same bound
// for Add + Duplicate. Kept here so the slice can no-op at the cap.
export const MAX_SCENARIOS_PER_RUN = 4;

// Back-fill `id` on any scenario hydrated from a pre-stable-id localStorage
// draft. Pure; safe to call on both initial state and persisted state.
function migrateScenarios(scenarios: Scenario[] | undefined): Scenario[] {
  if (!scenarios || scenarios.length === 0) return [];
  return scenarios.map((sc) => (sc.id ? sc : { ...sc, id: makeId() }));
}

const slice = createSlice({
  name: "draft",
  initialState,
  reducers: {
    setClientId(state, action: PayloadAction<string | null>) {
      state.clientId = action.payload;
    },
    updateProfile(state, action: PayloadAction<Partial<State["profile"]>>) {
      state.profile = { ...state.profile, ...action.payload };
    },
    updateCoClient(state, action: PayloadAction<Partial<State["profile"]["coClient"]>>) {
      state.profile.coClient = { ...state.profile.coClient, ...action.payload };
    },
    addDependent(state) {
      state.profile.dependents.push({ name: "", relation: "son", birthdate: "" });
    },
    removeDependent(state, action: PayloadAction<number>) {
      state.profile.dependents.splice(action.payload, 1);
    },
    updateDependent(
      state,
      action: PayloadAction<{ index: number; patch: Partial<Dependent> }>
    ) {
      const d = state.profile.dependents[action.payload.index];
      state.profile.dependents[action.payload.index] = { ...d, ...action.payload.patch };
    },
    addIncome(state) {
      state.profile.incomeSources.push({ source: "", amount: 0, annualIncrease: 0 });
    },
    removeIncome(state, action: PayloadAction<number>) {
      state.profile.incomeSources.splice(action.payload, 1);
    },
    updateIncome(
      state,
      action: PayloadAction<{ index: number; patch: Partial<IncomeSource> }>
    ) {
      const i = state.profile.incomeSources[action.payload.index];
      state.profile.incomeSources[action.payload.index] = { ...i, ...action.payload.patch };
    },
    addAsset(state) {
      state.profile.assets.push({ name: "", amount: 0 });
    },
    removeAsset(state, action: PayloadAction<number>) {
      state.profile.assets.splice(action.payload, 1);
    },
    updateAsset(state, action: PayloadAction<{ index: number; patch: Partial<Asset> }>) {
      state.profile.assets[action.payload.index] = {
        ...state.profile.assets[action.payload.index],
        ...action.payload.patch,
      };
    },
    addDebt(state) {
      state.profile.debts.push({ name: "", amount: 0, duration: 0, interestRate: 0 });
    },
    removeDebt(state, action: PayloadAction<number>) {
      state.profile.debts.splice(action.payload, 1);
    },
    updateDebt(state, action: PayloadAction<{ index: number; patch: Partial<Debt> }>) {
      state.profile.debts[action.payload.index] = {
        ...state.profile.debts[action.payload.index],
        ...action.payload.patch,
      };
    },
    addGoal(state) {
      state.goals.push({
        name: "",
        amount: 0,
        year: new Date().getFullYear() + 5,
        payments: 0,
        inflationRate: 0,
      });
    },
    removeGoal(state, action: PayloadAction<number>) {
      state.goals.splice(action.payload, 1);
    },
    updateGoal(state, action: PayloadAction<{ index: number; patch: Partial<Goal> }>) {
      state.goals[action.payload.index] = {
        ...state.goals[action.payload.index],
        ...action.payload.patch,
      };
    },
    addScenario(state) {
      if (state.scenarios.length >= MAX_SCENARIOS_PER_RUN) return;
      state.scenarios.push({
        id: makeId(),
        name: `Scenario ${state.scenarios.length + 1}`,
        model: "",
        goalNames: [],
        investments: [],
        monthlyInvestments: [],
        loans: [],
      });
    },
    duplicateScenario(state, action: PayloadAction<number>) {
      const idx = action.payload;
      const original = state.scenarios[idx];
      if (!original) return;
      if (state.scenarios.length >= MAX_SCENARIOS_PER_RUN) return;
      // Deep-enough clone — arrays of primitives / flat objects.
      const copy: Scenario = {
        id: makeId(),
        name: `${original.name} (copy)`,
        model: original.model,
        goalNames: [...original.goalNames],
        investments: original.investments.map((v) => ({ ...v })),
        monthlyInvestments: original.monthlyInvestments.map((v) => ({ ...v })),
        loans: original.loans.map((v) => ({ ...v })),
      };
      state.scenarios.push(copy);
    },
    removeScenario(state, action: PayloadAction<number>) {
      state.scenarios.splice(action.payload, 1);
    },
    updateScenario(
      state,
      action: PayloadAction<{ index: number; patch: Partial<Scenario> }>
    ) {
      state.scenarios[action.payload.index] = {
        ...state.scenarios[action.payload.index],
        ...action.payload.patch,
      };
    },
    setReportTitle(state, action: PayloadAction<string>) {
      state.reportTitle = action.payload;
    },
    // Load a persisted client into the wizard draft so "Modify" is an
    // actual edit path (PATCH) rather than a silent new-client reset.
    // Sets `clientId` so ScenarioStep.runAll takes the updateClient branch.
    // Missing fields fall back to the initial-state defaults so partial
    // records don't wipe the wizard into a broken shape.
    hydrateFromClient(state, action: PayloadAction<ClientRecord>) {
      const c = action.payload;
      const p = (c.profile ?? {}) as Partial<State["profile"]> & {
        coClient?: Partial<State["profile"]["coClient"]>;
      };
      state.clientId = c.id;
      state.profile = {
        ...initialState.profile,
        ...p,
        fullName:
          p.fullName != null && p.fullName !== ""
            ? String(p.fullName)
            : c.name,
        email: p.email != null && p.email !== "" ? String(p.email) : c.email,
        phone:
          p.phone != null && p.phone !== ""
            ? String(p.phone)
            : (c.phone ?? ""),
        coClient: {
          ...initialState.profile.coClient,
          ...(p.coClient ?? {}),
        },
      };
      state.goals = (c.goals ?? []).map((g) => ({
        name: g.name ?? "",
        amount: Number(g.amount) || 0,
        year: Number(g.year) || new Date().getFullYear() + 5,
        payments: Number(g.payments) || 0,
        inflationRate: Number(g.inflationRate) || 0,
      }));
      state.scenarios = migrateScenarios(
        (c.scenarios ?? []).map((s) => ({
          id: "",
          name: s.name ?? "Scenario 1",
          model: s.model ?? "",
          goalNames: s.goalNames ?? [],
          investments: s.investments ?? [],
          monthlyInvestments: s.monthlyInvestments ?? [],
          loans: s.loans ?? [],
        })) as Scenario[]
      );
      if (state.scenarios.length === 0) {
        state.scenarios = [
          {
            id: makeId(),
            name: "Scenario 1",
            model: "",
            goalNames: [],
            investments: [],
            monthlyInvestments: [],
            loans: [],
          },
        ];
      }
      state.reportTitle = "Simulation report 1";
    },
    reset: () => initialState,
  },
});

// Back-fill any missing stable-ids on scenarios pulled from a pre-stable-id
// localStorage draft. Exported so the store bootstrap can migrate the payload
// before handing it to `preloadedState`.
export function migrateDraft(draft: State | undefined): State | undefined {
  if (!draft) return draft;
  return { ...draft, scenarios: migrateScenarios(draft.scenarios) };
}

export const actions = slice.actions;
export default slice.reducer;
