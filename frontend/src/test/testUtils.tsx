import { ReactNode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../store/slices/authSlice";
import clientsReducer from "../store/slices/clientsSlice";
import simulationReducer from "../store/slices/simulationSlice";
import draftReducer from "../pages/NewClient/draftSlice";

export function makeStore(preloaded?: Record<string, unknown>) {
  return configureStore({
    reducer: {
      auth: authReducer,
      clients: clientsReducer,
      simulation: simulationReducer,
      draft: draftReducer,
    },
    preloadedState: preloaded as any,
  });
}

export function renderWithProviders(
  ui: ReactNode,
  opts: { initialEntries?: string[]; preloadedState?: Record<string, unknown> } = {}
) {
  const store = makeStore(opts.preloadedState);
  const { render } = require("@testing-library/react");
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={opts.initialEntries ?? ["/"]}>{ui}</MemoryRouter>
      </Provider>
    ),
  };
}
