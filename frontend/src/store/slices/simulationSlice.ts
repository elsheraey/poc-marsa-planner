import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ApiError, api, SimulateRequest, SimulateResult } from "../../api/client";
import { toast } from "../../components/Toaster";

type State = {
  result: SimulateResult | null;
  status: "idle" | "loading" | "error";
  error: string | null;
};

const initialState: State = { result: null, status: "idle", error: null };

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

const slice = createSlice({
  name: "simulation",
  initialState,
  reducers: {
    reset(state) {
      state.result = null;
      state.status = "idle";
      state.error = null;
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
      })
      .addCase(runSimulation.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? action.error.message ?? "Simulation failed";
      });
  },
});

export const { reset } = slice.actions;
export default slice.reducer;
