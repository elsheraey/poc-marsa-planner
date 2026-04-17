import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ApiError, api } from "./client";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("throws ApiError with structured body on non-2xx", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "not_found", message: "client not found" } }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    );
    await expect(api.getClient("nope")).rejects.toMatchObject({
      status: 404,
      code: "not_found",
      message: "client not found",
    });
    await expect(api.getClient("nope")).rejects.toBeInstanceOf(ApiError);
  });

  it("returns undefined on 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.logout()).resolves.toBeUndefined();
  });

  it("includes credentials on every request", async () => {
    fetchMock.mockResolvedValue(
      new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } })
    );
    await api.listClients();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/clients",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("retries on network error when retries > 0", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(
        new Response('{"id":"u"}', { status: 200, headers: { "Content-Type": "application/json" } })
      );
    const u = await api.me();
    expect(u).toEqual({ id: "u" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
