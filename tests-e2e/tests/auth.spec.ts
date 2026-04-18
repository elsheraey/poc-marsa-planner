import { expect, test } from "@playwright/test";
import { registerNewUser } from "./helpers";

test.describe("auth flow", () => {
  test("register -> clients -> logout -> login", async ({ page }) => {
    const creds = await registerNewUser(page);

    // On /clients after register.
    await expect(page).toHaveURL(/\/clients(\?|$)/);
    await expect(page.getByRole("heading", { name: /all clients/i })).toBeVisible();

    // Logout from TopBar ("Sign out" button).
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Log back in with the same creds.
    await page.locator("#login-email").fill(creds.email);
    await page.locator("#login-password").fill(creds.password);
    await page.getByRole("button", { name: /^login$/i }).click();

    await expect(page).toHaveURL(/\/clients(\?|$)/);
    await expect(page.getByRole("heading", { name: /all clients/i })).toBeVisible();
  });
});
