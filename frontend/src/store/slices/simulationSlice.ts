import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api, SimulateRequest, SimulateResult } from "../../api/client";

type State = {
  result: SimulateResult | null;
  status: "idle" | "loading" | "error";
  error: string | null;
};

const initialState: State = { result: null, status: "idle", error: null };

export const runSimulation = createAsyncThunk("simulation/run", async (body: SimulateRequest) => {
  return await api.simulate(body);
});

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
        state.error = action.error.message ?? "Simulation failed";
      });
  },
});

export const { reset } = slice.actions;
export default slice.reducer;
