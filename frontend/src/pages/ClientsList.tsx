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

/**
 * Editorial clients list.
 *
 * No card wrapper, no drop-shadow. A serif "All Clients" heading with a
 * small-caps "Add new" action on the right; below, a plain table bounded
 * by top/bottom rules, with one hairline between rows. Empty / error /
 * loading branches render centred serif italic paragraphs rather than
 * coloured blocks — same ethos as the rest of the document.
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
    return clients.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle)
    );
  }, [clients, q]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="font-serif text-4xl tracking-tight">All Clients</h1>
        <button
          className="btn"
          onClick={() => nav("/clients/new/profile")}
        >
          Add New
        </button>
      </div>

      <div className="mb-8">
        <label className="label block mb-2" htmlFor="clients-search">
          Search
        </label>
        <input
          id="clients-search"
          className="input max-w-md"
          placeholder="Name or email"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          aria-label="Search clients"
        />
      </div>

      {status === "loading" && clients.length === 0 && (
        <p className="py-16 text-center font-serif italic text-ink-muted">
          Loading clients…
        </p>
      )}

      {status === "error" && (
        <div
          className="border-t border-b border-accent py-3 my-4 text-sm text-accent"
          role="alert"
        >
          {error ?? "Failed to load clients"}
        </div>
      )}

      {status !== "loading" && filtered.length === 0 && (
        <p className="py-16 text-center font-serif italic text-ink-muted">
          {q ? "No clients match your search." : "No clients yet. Add your first one."}
        </p>
      )}

      {filtered.length > 0 && (
        <table className="w-full text-sm border-t border-b border-rule">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-ink-muted">
              <th className="text-start font-normal py-4">Client details</th>
              <th className="text-start font-normal py-4">Client ID</th>
              <th className="text-start font-normal py-4">Phone</th>
              <th className="text-start font-normal py-4">Last modified</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((c) => (
              <tr
                key={c.id}
                className="border-t border-rule hover:bg-paper-deep cursor-pointer"
                onClick={() => nav(`/clients/${c.id}`)}
              >
                <td className="py-4">
                  <div className="font-serif text-base">{c.name}</div>
                  <div className="text-xs text-ink-muted">{c.email}</div>
                </td>
                <td className="py-4 tabular">{c.clientId}</td>
                <td className="py-4 tabular">{c.phone ?? "—"}</td>
                <td className="py-4 tabular">{formatDate(c.lastModified)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-end gap-4 mt-8 text-sm text-ink-muted tabular">
          <span className="uppercase tracking-widest text-xs">Page</span>
          <input
            className="input h-9 w-12 text-center"
            value={page}
            onChange={(e) => setPage(Math.max(1, Math.min(pages, Number(e.target.value) || 1)))}
            aria-label="Page number"
          />
          <span className="uppercase tracking-widest text-xs">of</span>
          <span>{pages}</span>
          <button
            className="px-3 h-9 border border-rule text-ink hover:border-ink disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            ‹
          </button>
          <button
            className="px-3 h-9 border border-rule text-ink hover:border-ink disabled:opacity-40"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      )}
    </AppShell>
  );
}
