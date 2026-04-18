import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "./Login";
import { renderWithProviders } from "../test/testUtils";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("Login", () => {
  it("shows field-level validation before submit", async () => {
    renderWithProviders(<Login />);
    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits to /api/auth/login on valid input", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ user: { id: "u1", name: "A", email: "a@b.co" }, expires_at: "2030-01-01" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    renderWithProviders(<Login />);
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.co");
    await userEvent.type(screen.getByLabelText(/password/i), "password1");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({ method: "POST", credentials: "include" })
      );
    });
  });

  it("shows server error on 401", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "invalid credentials" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    );
    renderWithProviders(<Login />);
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.co");
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    // Banner now renders the i18n lookup for `auth.error.server.unauthorized`
    // rather than the raw backend English `invalid credentials`.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /incorrect email or password/i
    );
  });

  it("localises 429 rate-limit responses on the banner", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "rate_limited", message: "Rate limit exceeded" },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      )
    );
    renderWithProviders(<Login />);
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.co");
    await userEvent.type(screen.getByLabelText(/password/i), "password1");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /too many attempts/i
    );
  });
});
