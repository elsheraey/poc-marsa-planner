const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { name: string; email: string; avatar: string | null } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  listClients: () => request<ClientRecord[]>("/clients"),
  getClient: (id: string) => request<ClientRecord>(`/clients/${id}`),
  createClient: (client: Partial<ClientRecord>) =>
    request<ClientRecord>("/clients", { method: "POST", body: JSON.stringify(client) }),
  updateClient: (id: string, client: Partial<ClientRecord>) =>
    request<ClientRecord>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(client),
    }),
  simulate: (payload: SimulateRequest) =>
    request<SimulateResult>("/simulate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export type ClientRecord = {
  id: string;
  clientId: string;
  name: string;
  email: string;
  phone?: string;
  lastModified: string;
  profile: Record<string, unknown>;
  goals: Goal[];
  scenarios: Scenario[];
};

export type Goal = {
  name: string;
  amount: number;
  year: number;
  payments?: number;
  inflationRate?: number;
};

export type Scenario = {
  id?: string;
  name: string;
  model?: string;
  goalNames: string[];
  investments: { amount: number; year: number }[];
  monthlyInvestments: { amount: number; annualIncrease: number }[];
  loans: { amount: number; year: number; duration: number; interestRate: number }[];
};

export type SimulateRequest = {
  duration_years: number;
  initial_investment: number;
  monthly_investment: number;
  annual_increase_pct: number;
  importance: "worst" | "essential" | "medium" | "best";
  risk_tolerance: "very_low" | "low" | "moderate" | "high" | "very_high";
};

export type Portfolio = {
  variable_pct: number;
  percentiles: Record<string, number>;
};

export type SimulateResult = {
  recommended: Portfolio;
  candidates: Portfolio[];
  projection: {
    years: number[];
    pessimistic: number[];
    median: number[];
    optimistic: number[];
  };
  probability_of_goal: number;
};
