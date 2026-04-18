import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { fetchClients } from "../store/slices/clientsSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { fmtDate } from "../utils/format";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "–";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Clients list — Azimut grouped-inset pattern.
 *
 *   - Large Title "All Clients" + subtitle with live count
 *   - Search input with a leading magnifier inside the canvas fill
 *   - `.btn-primary` (black) "Add New" button on the inline-end of the
 *     header
 *   - Grouped-inset white list rounded on an az-canvas background, one
 *     row per client. Each row is a gold-soft avatar circle with black
 *     initials, name + email stacked, last-modified date in
 *     az-ink-muted, trailing chevron.
 *   - Pagination as plain "Showing X–Y of N" + two chevron buttons.
 */
export default function ClientsList() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const clients = useAppSelector((s) => s.clients.list);
  const status = useAppSelector((s) => s.clients.status);
  const error = useAppSelector((s) => s.clients.error);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 9;

  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return clients.filter((c) => {
      const name = (c.name ?? "").toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      return name.includes(needle) || email.includes(needle);
    });
  }, [clients, q]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(filtered.length, page * pageSize);

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">All Clients</h1>
          <p className="mt-1 text-base text-az-ink-muted">
            {clients.length === 0
              ? "No clients yet."
              : `Manage your ${clients.length} client${clients.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => nav("/clients/new/profile")}
        >
          Add New
        </button>
      </header>

      <div className="px-6 mb-4">
        <div className="relative max-w-md">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 start-0 ps-3 flex items-center text-az-ink-subtle"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            id="clients-search"
            className="input ps-9"
            placeholder="Search name or email"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            aria-label="Search clients"
          />
        </div>
      </div>

      <div className="px-6 pb-4">
        {status === "loading" && clients.length === 0 && (
          <p className="py-16 text-center text-az-ink-muted">Loading clients…</p>
        )}

        {status === "error" && (
          <div
            className="rounded-xl bg-rose-100 text-rose-800 px-4 py-3 text-sm"
            role="alert"
          >
            {error ?? "Failed to load clients"}
          </div>
        )}

        {status !== "loading" && filtered.length === 0 && (
          <div className="rounded-xl bg-az-white ring-1 ring-az-separator p-10 text-center text-az-ink-muted">
            {q ? "No clients match your search." : "No clients yet. Add your first one."}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grouped-list">
            {slice.map((c) => (
              <button
                type="button"
                key={c.id}
                className="grouped-row-hover w-full text-start"
                onClick={() => nav(`/clients/${c.id}`)}
              >
                <span
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full bg-az-gold-soft text-az-black font-semibold flex items-center justify-center shrink-0 text-sm"
                >
                  {initials(c.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-az-ink truncate">
                    {c.name}
                  </span>
                  <span className="block text-sm text-az-ink-muted truncate">
                    {c.email}
                  </span>
                </span>
                <span className="hidden md:block text-sm text-az-ink-muted tabular shrink-0">
                  {fmtDate(c.lastModified)}
                </span>
                <span
                  aria-hidden="true"
                  className="text-az-ink-subtle text-lg shrink-0"
                >
                  ›
                </span>
              </button>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm text-az-ink-muted tabular">
            <span>
              Showing {rangeStart}–{rangeEnd} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-8 h-8 rounded-lg bg-az-white ring-1 ring-az-separator text-az-black hover:text-az-gold disabled:text-az-ink-subtle disabled:ring-az-separator/60 hover:bg-az-canvas transition"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                ‹
              </button>
              <span className="px-2">
                {page} / {pages}
              </span>
              <button
                type="button"
                className="w-8 h-8 rounded-lg bg-az-white ring-1 ring-az-separator text-az-black hover:text-az-gold disabled:text-az-ink-subtle disabled:ring-az-separator/60 hover:bg-az-canvas transition"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
