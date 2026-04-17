import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { fetchClients } from "../store/slices/clientsSlice";
import { useAppDispatch, useAppSelector } from "../store";

function SortArrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" className="inline ml-1 text-muted">
      <path d="M3 5 l3 -3 l3 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M3 7 l3 3 l3 -3" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export default function ClientsList() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const clients = useAppSelector((s) => s.clients.list);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 9;

  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  const filtered = useMemo(
    () =>
      clients.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.email.toLowerCase().includes(q.toLowerCase())
      ),
    [clients, q]
  );
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
              >
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                className="input pl-9 h-10 w-72"
                placeholder="Search client"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={() => nav("/clients/new/profile")}>
              Add New
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-xs">
              <th className="text-left font-medium pb-4">
                Client details <SortArrow />
              </th>
              <th className="text-left font-medium pb-4">
                Client ID <SortArrow />
              </th>
              <th className="text-left font-medium pb-4">Phone</th>
              <th className="text-left font-medium pb-4">
                Last Modified <SortArrow />
              </th>
              <th className="text-right font-medium pb-4">Actions</th>
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
                <td className="py-4">{c.phone}</td>
                <td className="py-4">{c.lastModified}</td>
                <td className="py-4 text-right">
                  <button
                    className="w-8 h-8 rounded-full bg-border/60 text-muted"
                    onClick={(e) => e.stopPropagation()}
                  >
                    …
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-end gap-4 mt-6 text-sm text-muted">
          <span>Page</span>
          <input
            className="input h-9 w-14 text-center"
            value={page}
            onChange={(e) => setPage(Math.max(1, Math.min(pages, Number(e.target.value) || 1)))}
          />
          <span>of</span>
          <div className="h-9 w-14 rounded-xl border border-border flex items-center justify-center">
            {pages}
          </div>
          <button
            className="w-9 h-9 rounded-xl border border-border disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹
          </button>
          <button
            className="w-9 h-9 rounded-xl border border-border disabled:opacity-40"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            ›
          </button>
        </div>
      </section>
    </AppShell>
  );
}
