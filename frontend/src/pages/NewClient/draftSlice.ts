import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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
  name: string;
  model: string;
  goalNames: string[];
  investments: { amount: number; year: number }[];
  monthlyInvestments: { amount: number; annualIncrease: number }[];
  loans: { amount: number; year: number; duration: number; interestRate: number }[];
};

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
      state.scenarios.push({
        name: `Scenario ${state.scenarios.length + 1}`,
        model: "",
        goalNames: [],
        investments: [],
        monthlyInvestments: [],
        loans: [],
      });
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
    reset: () => initialState,
  },
});

export const actions = slice.actions;
export default slice.reducer;
