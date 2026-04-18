const BASE = "/api";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOpts = RequestInit & { retries?: number };

async function request<T>(path: string, init: RequestOpts = {}): Promise<T> {
  const { retries = 0, ...rest } = init;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(rest.headers ?? {}) },
        ...rest,
      });
      if (res.status === 204) return undefined as T;
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const err = (body as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
        throw new ApiError(
          res.status,
          err?.code ?? "http_error",
          err?.message ?? `${res.status} ${res.statusText}`,
          err?.details
        );
      }
      return body as T;
    } catch (e) {
      lastErr = e;
      const isNetwork = !(e instanceof ApiError);
      if (!isNetwork || attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export const api = {
  register: (payload: { name: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/auth/me", { retries: 1 }),

  listClients: () => request<ClientRecord[]>("/clients", { retries: 1 }),
  getClient: (id: string) => request<ClientRecord>(`/clients/${id}`, { retries: 1 }),
  createClient: (client: Partial<ClientRecord>) =>
    request<ClientRecord>("/clients", { method: "POST", body: JSON.stringify(client) }),
  updateClient: (id: string, client: Partial<ClientRecord>) =>
    request<ClientRecord>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(client),
    }),
  deleteClient: (id: string) => request<void>(`/clients/${id}`, { method: "DELETE" }),

  simulate: (payload: SimulateRequest) =>
    request<SimulateResult>("/simulate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Server-side inversion (replaces the client-side ratio-scaling
  // approximation in utils/inversion.ts). Solves for the monthly
  // contribution (and, as a second pass, the horizon) that would clear
  // `target_probability`. See backend/app/routers/simulations.py.
  simulateInvert: (payload: SimulateInvertRequest) =>
    request<SimulateInvertResult>("/simulate/invert", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Saved-simulation snapshots. `client_id: null` is a prospective-client
  // what-if (no record to attach to yet).
  createSimulation: (payload: {
    name: string;
    client_id: string | null;
    request: SimulateRequest;
    response: SimulateResult;
  }) =>
    request<SavedSimulation>("/simulations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listSimulations: (clientId?: string | null) => {
    const qs =
      clientId == null || clientId === ""
        ? ""
        : `?client_id=${encodeURIComponent(clientId)}`;
    return request<SavedSimulationListItem[]>(`/simulations${qs}`, {
      retries: 1,
    });
  },
  getSimulation: (id: string) =>
    request<SavedSimulation>(`/simulations/${id}`, { retries: 1 }),
  deleteSimulation: (id: string) =>
    request<void>(`/simulations/${id}`, { method: "DELETE" }),
};

export type User = { id: string; name: string; email: string };

export type AuthResponse = { user: User; expires_at: string };

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
  goal_target_amount?: number;
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
  probability_of_goal: number | null;
  probability_of_goal_se?: number | null;
  attainability: "attainable" | "aspirational" | "out_of_reach" | null;
  // ISO date / YYYY-MM from the backend calibration manifest. Surfaces the
  // real snapshot date the analyst pinned in `calibration_*.json`.
  calibration_as_of?: string | null;
};

// Mirrors backend.SimulateInvertRequest. `current_monthly_investment` is
// optional and anchors the horizon pass to the advisor's *current* plan; if
// omitted the backend reuses whatever `required_monthly_investment` it just
// solved for.
export type SimulateInvertRequest = {
  duration_years: number;
  initial_investment: number;
  current_monthly_investment?: number | null;
  annual_increase_pct?: number;
  importance: "worst" | "essential" | "medium" | "best";
  risk_tolerance: "very_low" | "low" | "moderate" | "high" | "very_high";
  goal_target_amount: number;
  target_probability: number; // 0.5–0.99
  return_in_real_terms?: boolean;
};

// Mirrors backend.SimulateInvertResponse. `required_monthly_investment: null`
// means the goal is unreachable even at the 10M-EGP/month cap;
// `required_horizon_years: null` means even the 40y cap can't clear it at the
// anchor monthly.
export type SimulateInvertResult = {
  required_monthly_investment: number | null;
  required_horizon_years: number | null;
  achieved_probability_at_required: number;
  achieved_probability_at_double: number | null;
};

// Shape returned by POST /api/simulations and GET /api/simulations/{id}.
// `request` / `response` are the full snapshot payloads the backend stored;
// we treat them as opaque here and only read them in the dedicated viewer.
export type SavedSimulation = {
  id: string;
  name: string;
  client_id: string | null;
  request: SimulateRequest;
  response: SimulateResult;
  calibration_as_of?: string | null;
  created_at: string;
};

// Lighter shape returned by GET /api/simulations (list). Backend omits the
// big `request` / `response` blobs on the list endpoint, so we only surface
// the fields the Saved-simulations card on ClientSummary actually renders.
export type SavedSimulationListItem = {
  id: string;
  name: string;
  client_id: string | null;
  calibration_as_of?: string | null;
  created_at: string;
};
