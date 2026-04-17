import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import authReducer from "./slices/authSlice";
import clientsReducer from "./slices/clientsSlice";
import simulationReducer from "./slices/simulationSlice";
import draftReducer from "../pages/NewClient/draftSlice";
import { draftPersistenceMiddleware, loadDraft } from "./persistence";

const persistedDraft = loadDraft();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    clients: clientsReducer,
    simulation: simulationReducer,
    draft: draftReducer,
  },
  preloadedState: persistedDraft
    ? { draft: persistedDraft as ReturnType<typeof draftReducer> }
    : undefined,
  middleware: (getDefault) => getDefault().concat(draftPersistenceMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
