import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import WizardTabs from "../components/WizardTabs";
import { fetchClient } from "../store/slices/clientsSlice";
import { useAppDispatch, useAppSelector } from "../store";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm py-1.5">
      <span className="text-muted">{label}:</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  );
}

export default function ClientSummary() {
  const { id } = useParams();
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const client = useAppSelector((s) => (id ? s.clients.byId[id] : undefined));

  useEffect(() => {
    if (id) dispatch(fetchClient(id));
  }, [id, dispatch]);

  if (!client) {
    return (
      <AppShell title="Clients">
        <div className="card">Loading…</div>
      </AppShell>
    );
  }

  const profile = client.profile as Record<string, string | number>;

  return (
    <AppShell
      title={
        <span className="flex items-center gap-2">
          <Link to="/clients" className="text-muted hover:text-primary-500">
            Clients
          </Link>
          <span className="text-muted">›</span>
          <span>{client.name}</span>
        </span>
      }
      trailing={
        <button className="btn-primary" onClick={() => nav("/clients/new/profile")}>
          Modify
        </button>
      }
    >
      <WizardTabs basePath={`/clients/${id}`} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="card">
          <h3 className="font-bold mb-4">Client Information</h3>
          <InfoRow label="Full Name" value={(profile.fullName as string) ?? client.name} />
          <InfoRow label="Mobile" value={client.phone ?? "—"} />
          <InfoRow label="Email" value={client.email} />
          <InfoRow label="Birthdate" value={(profile.birthdate as string) ?? "—"} />
          <InfoRow
            label="Employment status"
            value={(profile.employmentStatus as string) ?? "—"}
          />
          <InfoRow
            label="Employment income"
            value={`$${Number(profile.employmentIncome ?? 0).toLocaleString()}`}
          />
        </section>

        <section className="rounded-2xl bg-report-gradient text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-50" viewBox="0 0 200 200">
            {Array.from({ length: 18 }).map((_, i) => (
              <path
                key={i}
                d={`M 0 ${30 + i * 8} Q 100 ${70 + i * 6} 200 ${50 + i * 7}`}
                stroke="white"
                strokeWidth="0.6"
                fill="none"
                opacity={0.4 - i * 0.015}
              />
            ))}
          </svg>
          <div className="relative text-xs font-semibold tracking-[0.2em] mb-2">NET WORTH</div>
          <div className="relative text-3xl font-extrabold">$530,000</div>
        </section>

        <section className="card">
          <h3 className="font-bold mb-4">Co-Client Information</h3>
          <InfoRow label="Full Name" value="Nada Omar Ismail" />
          <InfoRow label="Birthdate" value="15/09/1970" />
          <InfoRow label="Employment status" value="Employed" />
          <InfoRow label="Employment income" value="$8,000" />
        </section>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="card">
          <div className="text-xs font-semibold text-accent-pink mb-1">RISK APPETITE</div>
          <div className="font-bold">Risk Taker</div>
        </div>
        <div className="card">
          <div className="text-xs font-semibold text-muted mb-1">TOTAL ASSETS</div>
          <div className="font-bold">$509,000,000</div>
        </div>
        <div className="card">
          <div className="text-xs font-semibold text-red-500 mb-1">TOTAL DEBTS</div>
          <div className="font-bold">$33,000</div>
        </div>
        <div className="card">
          <div className="text-xs font-semibold text-primary-500 mb-1">MONTHLY EXPENSES</div>
          <div className="font-bold">$33,000</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <section className="card md:col-span-2">
          <h3 className="font-bold mb-4">Income Sources</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="text-left font-medium pb-3">Income Sources</th>
                <th className="text-left font-medium pb-3">Amount</th>
                <th className="text-left font-medium pb-3">Annual increase</th>
              </tr>
            </thead>
            <tbody>
              {["My Spouse's income", "Properties", "Properties", "Properties"].map((n, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="py-2">{n}</td>
                  <td className="py-2">50,000</td>
                  <td className="py-2">+ 1%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h3 className="font-bold mb-4">Dependents</h3>
          {[
            ["Sahar Ahmed", "Daughter · 19 years"],
            ["Carmen Ahmed", "Daughter · 13 years"],
            ["Omar Ahmed", "Son · 5 years"],
          ].map(([name, meta]) => (
            <div key={name} className="mb-3">
              <div className="font-semibold">{name}</div>
              <div className="text-xs text-muted">{meta}</div>
            </div>
          ))}
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <section className="card">
          <h3 className="font-bold text-green-600 mb-4">Assets</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="text-left font-medium pb-3">Assets</th>
                <th className="text-right font-medium pb-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {["Property owner", "Asset", "Asset"].map((n, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="py-2">{n}</td>
                  <td className="py-2 text-right">50,000</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card">
          <h3 className="font-bold text-red-500 mb-4">Debts</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="text-left font-medium pb-3">Debts</th>
                <th className="text-left font-medium pb-3">Amount</th>
                <th className="text-left font-medium pb-3">Duration</th>
                <th className="text-left font-medium pb-3">Interest Rate</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Loan from Bank", "50,000", "1 year", "2%"],
                ["Loan from bank", "50,000", "3 years", "2%"],
                ["loan from bank", "50,000", "6 years", "2%"],
              ].map((row, i) => (
                <tr key={i} className="border-t border-border/60">
                  {row.map((c, j) => (
                    <td key={j} className="py-2">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
