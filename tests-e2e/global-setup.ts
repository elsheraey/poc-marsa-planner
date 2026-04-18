import { request } from "@playwright/test";

/**
 * Warm the backend's simulation cache before any test runs.
 *
 * First call to `/api/simulate` fits marginals + builds the Gaussian copula
 * (cold path ≈ 3-9s), which pushes the first test that exercises the full
 * register → wizard → report chain past the per-test timeout when the box
 * is under load. Pre-warming here moves that cost out of the suite's clock.
 *
 * Also deterministic-by-design: every test can now assume warm-cache
 * latency (≈ 25 ms P95) regardless of host load or prior state.
 */
async function globalSetup() {
  const baseURL = process.env.API_URL ?? "http://127.0.0.1:8000";
  const ctx = await request.newContext({ baseURL });

  const email = `warmup-${Date.now()}@example.com`;
  const password = "password123";
  const register = await ctx.post("/api/auth/register", {
    data: { name: "Warmup", email, password },
  });
  if (!register.ok()) {
    // If register fails (e.g. pre-existing email collision across suite runs),
    // fall back to login with the same throwaway creds. Either way we need a
    // valid session cookie on this context before hitting /api/simulate.
    const login = await ctx.post("/api/auth/login", {
      data: { email, password },
    });
    if (!login.ok()) {
      await ctx.dispose();
      throw new Error(
        `[globalSetup] warmup failed: register=${register.status()} login=${login.status()}`
      );
    }
  }

  const sim = await ctx.post("/api/simulate", {
    data: {
      duration_years: 5,
      initial_investment: 50_000,
      monthly_investment: 1_000,
      annual_increase_pct: 0,
      importance: "essential",
      risk_tolerance: "high",
      goal_target_amount: 100_000,
    },
  });
  if (!sim.ok()) {
    await ctx.dispose();
    throw new Error(`[globalSetup] warmup simulate failed: ${sim.status()}`);
  }
  // Fire-and-forget logout — the revoked_tokens table grows during tests but
  // cleans up on its own via `expires_at`.
  await ctx.post("/api/auth/logout").catch(() => undefined);
  await ctx.dispose();
}

export default globalSetup;
