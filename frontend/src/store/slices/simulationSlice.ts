import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ApiError, api, SimulateRequest, SimulateResult } from "../../api/client";
import { toast } from "../../components/Toaster";

export type ScenarioResult = {
  name: string;
  request: SimulateRequest;
  result: SimulateResult;
};

type State = {
  // First scenario's result — retained so existing views that read a single
  // result (projection chart, table) keep working. Equal to
  // `results[activeIndex]?.result` once per-scenario runs complete.
  result: SimulateResult | null;
  results: ScenarioResult[];
  status: "idle" | "loading" | "error";
  error: string | null;
};

const initialState: State = { result: null, results: [], status: "idle", error: null };

function errMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Simulation failed";
}

export const runSimulation = createAsyncThunk<SimulateResult, SimulateRequest, { rejectValue: string }>(
  "simulation/run",
  async (body, { rejectWithValue }) => {
    try {
      return await api.simulate(body);
    } catch (e) {
      const msg = errMessage(e);
      toast(msg, "error");
      return rejectWithValue(msg);
    }
  }
);

// Run N scenarios in parallel. Requests with identical payloads are
// deduplicated (one HTTP call, result fanned out to every scenario with that
// payload) so duplicate scenarios don't burn backend cycles.
export const runScenarioBatch = createAsyncThunk<
  ScenarioResult[],
  { name: string; request: SimulateRequest }[],
  { rejectValue: string }
>("simulation/runBatch", async (scenarios, { rejectWithValue }) => {
  try {
    const cache = new Map<string, Promise<SimulateResult>>();
    const results = await Promise.all(
      scenarios.map((sc) => {
        const key = JSON.stringify(sc.request);
        let p = cache.get(key);
        if (!p) {
          p = api.simulate(sc.request);
          cache.set(key, p);
        }
        return p.then((result) => ({ name: sc.name, request: sc.request, result }));
      })
    );
    return results;
  } catch (e) {
    const msg = errMessage(e);
    toast(msg, "error");
    return rejectWithValue(msg);
  }
});

const slice = createSlice({
  name: "simulation",
  initialState,
  reducers: {
    reset(state) {
      state.result = null;
      state.results = [];
      state.status = "idle";
      state.error = null;
    },
    // Allow tests (and any future consumer) to preload multi-scenario
    // results without going through the thunk.
    setResults(state, action: PayloadAction<ScenarioResult[]>) {
      state.results = action.payload;
      state.result = action.payload[0]?.result ?? null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runSimulation.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(runSimulation.fulfilled, (state, action) => {
        state.status = "idle";
        state.result = action.payload;
        // Keep results in sync for the single-scenario path so the report
        // always has at least one card to render.
        state.results = [
          { name: "Scenario 1", request: action.meta.arg, result: action.payload },
        ];
      })
      .addCase(runSimulation.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? action.error.message ?? "Simulation failed";
      })
      .addCase(runScenarioBatch.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(runScenarioBatch.fulfilled, (state, action) => {
        state.status = "idle";
        state.results = action.payload;
        state.result = action.payload[0]?.result ?? null;
      })
      .addCase(runScenarioBatch.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? action.error.message ?? "Simulation failed";
      });
  },
});

export const { reset, setResults } = slice.actions;
export default slice.reducer;
