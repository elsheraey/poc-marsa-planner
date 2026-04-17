import { Middleware } from "@reduxjs/toolkit";

const DRAFT_KEY = "marsa.draft.v1";

export function loadDraft(): unknown | undefined {
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

export const draftPersistenceMiddleware: Middleware<object, { draft: unknown }> =
  (store) => (next) => (action) => {
    const result = next(action);
    const { type } = action as { type: string };
    if (type.startsWith("draft/")) {
      saveDraft(store.getState().draft);
    }
    return result;
  };
