import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { fetchClients } from "../store/slices/clientsSlice";
import { useAppDispatch, useAppSelector } from "../store";

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}

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
    return clients.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle)
    );
  }, [clients, q]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppShell title="Clients">
      <section className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">All Clients</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                className="input pl-9 h-10 w-72"
                placeholder="Search client"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                aria-label="Search clients"
              />
            </div>
            <button className="btn-primary" onClick={() => nav("/clients/new/profile")}>
              Add New
            </button>
          </div>
        </div>

        {status === "loading" && clients.length === 0 && (
          <div className="py-12 text-center text-muted">Loading clients…</div>
        )}

        {status === "error" && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm" role="alert">
            {error ?? "Failed to load clients"}
          </div>
        )}

        {status !== "loading" && filtered.length === 0 && (
          <div className="py-12 text-center text-muted">
            {q ? "No clients match your search." : "No clients yet. Add your first one."}
          </div>
        )}

        {filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs">
                <th className="text-left font-medium pb-4">Client details</th>
                <th className="text-left font-medium pb-4">Client ID</th>
                <th className="text-left font-medium pb-4">Phone</th>
                <th className="text-left font-medium pb-4">Last modified</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-border/60 hover:bg-surface cursor-pointer"
                  onClick={() => nav(`/clients/${c.id}`)}
                >
                  <td className="py-4">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted">{c.email}</div>
                  </td>
                  <td className="py-4">{c.clientId}</td>
                  <td className="py-4">{c.phone ?? "—"}</td>
                  <td className="py-4">{formatDate(c.lastModified)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-end gap-4 mt-6 text-sm text-muted">
            <span>Page</span>
            <input
              className="input h-9 w-14 text-center"
              value={page}
              onChange={(e) => setPage(Math.max(1, Math.min(pages, Number(e.target.value) || 1)))}
              aria-label="Page number"
            />
            <span>of</span>
            <div className="h-9 w-14 rounded-xl border border-border flex items-center justify-center">
              {pages}
            </div>
            <button
              className="w-9 h-9 rounded-xl border border-border disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              ‹
            </button>
            <button
              className="w-9 h-9 rounded-xl border border-border disabled:opacity-40"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        )}
      </section>
    </AppShell>
  );
}
