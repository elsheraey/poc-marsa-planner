import { Middleware } from "@reduxjs/toolkit";
import type { ScenarioResult } from "./slices/simulationSlice";
import type { SimulateResult } from "../api/client";

const DRAFT_KEY = "marsa.draft.v1";
const SIM_KEY = "marsa.simulation.v1";

export function loadDraft(): unknown {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function saveDraft(state: unknown): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors / disabled storage
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

// Persisted simulation slice — only the payload fields the advisor cares
// about across refresh. `status` is derived ("idle" on boot) and `error`
// is transient, so both are dropped at serialisation time.
export type PersistedSimulation = {
  result: SimulateResult | null;
  results: ScenarioResult[];
};

export function loadSimulation(): PersistedSimulation | undefined {
  try {
    const raw = localStorage.getItem(SIM_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<PersistedSimulation> | null;
    if (!parsed || typeof parsed !== "object") return undefined;
    return {
      result: parsed.result ?? null,
      results: Array.isArray(parsed.results) ? parsed.results : [],
    };
  } catch {
    return undefined;
  }
}

export function saveSimulation(state: PersistedSimulation): void {
  try {
    localStorage.setItem(SIM_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors / disabled storage
  }
}

export function clearSimulation(): void {
  try {
    localStorage.removeItem(SIM_KEY);
  } catch {
    // ignore
  }
}

/**
 * Middleware that mirrors `draft` and `simulation` payload state into
 * localStorage. We write-after-reduce (next(action) then read) so the
 * persisted copy always matches the in-memory state the UI just rendered.
 *
 * Draft writes fire on every `draft/*` action; simulation writes fire on
 * `simulation/*` actions. `status` / `error` are excluded — they are
 * always derived fresh on boot.
 */
export const draftPersistenceMiddleware: Middleware<
  object,
  { draft: unknown; simulation: { result: SimulateResult | null; results: ScenarioResult[] } }
> = (store) => (next) => (action) => {
  const result = next(action);
  const { type } = action as { type: string };
  if (type.startsWith("draft/")) {
    saveDraft(store.getState().draft);
  } else if (type.startsWith("simulation/")) {
    const sim = store.getState().simulation;
    saveSimulation({ result: sim.result, results: sim.results });
  }
  return result;
};
