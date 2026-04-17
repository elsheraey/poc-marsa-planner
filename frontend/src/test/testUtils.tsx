import { ReactNode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";
import authReducer from "../store/slices/authSlice";
import clientsReducer from "../store/slices/clientsSlice";
import simulationReducer from "../store/slices/simulationSlice";
import draftReducer from "../pages/NewClient/draftSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  clients: clientsReducer,
  simulation: simulationReducer,
  draft: draftReducer,
});

export type TestRootState = ReturnType<typeof rootReducer>;

export function makeStore(preloaded?: Partial<TestRootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloaded as TestRootState | undefined,
  });
}

export function renderWithProviders(
  ui: ReactNode,
  opts: { initialEntries?: string[]; preloadedState?: Partial<TestRootState> } = {}
) {
  const store = makeStore(opts.preloadedState);
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={opts.initialEntries ?? ["/"]}>{ui}</MemoryRouter>
      </Provider>
    ),
  };
}
