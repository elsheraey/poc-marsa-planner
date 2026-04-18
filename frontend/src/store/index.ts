import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import authReducer from "./slices/authSlice";
import clientsReducer from "./slices/clientsSlice";
import simulationReducer from "./slices/simulationSlice";
import draftReducer, { migrateDraft } from "../pages/NewClient/draftSlice";
import {
  draftPersistenceMiddleware,
  loadDraft,
  loadSimulation,
} from "./persistence";

const persistedDraft = loadDraft();
// Pre-stable-id drafts have scenarios without `id`; back-fill at boot so the
// React key is stable from the first render.
const migratedDraft = persistedDraft
  ? migrateDraft(persistedDraft as Parameters<typeof migrateDraft>[0])
  : undefined;

const persistedSimulation = loadSimulation();

const preloaded: Record<string, unknown> = {};
if (migratedDraft) {
  preloaded.draft = migratedDraft;
}
// Rehydrate the simulation slice from the previous session so a refresh of
// the report page doesn't dead-end on "No simulation has been run yet".
// Status + error are always reset to idle / null; only payload fields are
// persisted.
if (
  persistedSimulation &&
  (persistedSimulation.result || persistedSimulation.results.length > 0)
) {
  preloaded.simulation = {
    result: persistedSimulation.result,
    results: persistedSimulation.results,
    status: "idle",
    error: null,
  };
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
    clients: clientsReducer,
    simulation: simulationReducer,
    draft: draftReducer,
  },
  preloadedState:
    Object.keys(preloaded).length > 0
      ? (preloaded as Parameters<typeof configureStore>[0]["preloadedState"])
      : undefined,
  middleware: (getDefault) => getDefault().concat(draftPersistenceMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
