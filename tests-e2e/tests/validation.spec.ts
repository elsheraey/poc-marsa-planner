import { expect, test } from "@playwright/test";

test.describe("login form validation (client-side, no API)", () => {
  test("blocks empty email/password and never hits /api/auth/login", async ({ page }) => {
    let loginCalls = 0;
    await page.route("**/api/auth/login", (route) => {
      loginCalls++;
      // Don't actually serve it — we should never get here.
      return route.abort();
    });

    await page.goto("/login");

    // Submit with both fields empty.
    await page.getByRole("button", { name: /^login$/i }).click();
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();

    // Malformed email only.
    await page.locator("#login-email").fill("not-an-email");
    await page.locator("#login-password").fill("irrelevant");
    await page.getByRole("button", { name: /^login$/i }).click();
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();

    // Give the app a tick to potentially (incorrectly) fire a request.
    await page.waitForTimeout(300);
    expect(loginCalls).toBe(0);
  });
});
