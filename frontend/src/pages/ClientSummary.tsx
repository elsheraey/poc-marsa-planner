import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import WizardTabs from "../components/WizardTabs";
import { fetchClient } from "../store/slices/clientsSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { fmtEGP } from "../utils/format";
import { t } from "../i18n";
import type { Goal } from "../api/client";

// Shape the backend currently returns for `client.profile`. Every field is
// optional — the backend has never been strict about this and the demo
// used to paper over gaps with hardcoded names/incomes (famously another
// advisor's wife's name for *every* client). We now render the real
// record and show a localised empty state when a field is genuinely
// missing.
type CoClient = {
  fullName?: string;
  birthdate?: string;
  employmentStatus?: string;
  employmentIncome?: number;
};

type Dependent = { name?: string; relation?: string; birthdate?: string };
type IncomeSource = { source?: string; amount?: number; annualIncrease?: number };
type Asset = { name?: string; amount?: number };
type Debt = {
  name?: string;
  amount?: number;
  duration?: number;
  interestRate?: number;
};

type Profile = {
  fullName?: string;
  birthdate?: string;
  employmentStatus?: string;
  employmentIncome?: number;
  monthlyExpenses?: number;
  riskAppetite?: string;
  hasCoClient?: boolean;
  coClient?: CoClient;
  dependents?: Dependent[];
  incomeSources?: IncomeSource[];
  assets?: Asset[];
  debts?: Debt[];
};

function dash(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value.trim() === "" ? "—" : value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  return "—";
}

function egpOrDash(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  if (!Number.isFinite(value)) return "—";
  return fmtEGP(value);
}

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex gap-2 text-sm py-1.5">
      <span className="text-muted">{label}:</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  );
}

function EmptyState({ message, cta }: Readonly<{ message: string; cta?: string }>) {
  return (
    <div className="text-sm text-muted py-2">
      {message}
      {cta && <span className="mx-1">·</span>}
      {cta && <span className="text-primary-500 font-medium">{cta}</span>}
    </div>
  );
}

// Sum a numeric field across a collection, treating missing/NaN as 0. If the
// collection itself is missing we return null so the UI can show "—" rather
// than a fake EGP 0 that looks like real data.
function sumOrNull<T>(
  items: T[] | undefined,
  pick: (item: T) => number | undefined
): number | null {
  if (!items || items.length === 0) return null;
  const total = items.reduce((acc, it) => {
    const v = pick(it);
    return acc + (Number.isFinite(v) ? Number(v) : 0);
  }, 0);
  return total;
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
      <AppShell title={t("nav.clients")}>
        <div className="card">{t("common.loading")}</div>
      </AppShell>
    );
  }

  const profile = (client.profile ?? {}) as Profile;
  const goals: Goal[] = client.goals ?? [];
  const dependents = profile.dependents ?? [];
  const incomeSources = profile.incomeSources ?? [];
  const assets = profile.assets ?? [];
  const debts = profile.debts ?? [];
  const hasCoClient = !!profile.hasCoClient && !!profile.coClient;

  const totalAssets = sumOrNull(assets, (a) => a.amount);
  const totalDebts = sumOrNull(debts, (d) => d.amount);

  return (
    <AppShell
      title={
        <span className="flex items-center gap-2">
          <Link to="/clients" className="text-muted hover:text-primary-500">
            {t("nav.clients")}
          </Link>
          <span className="text-muted" aria-hidden="true">
            ›
          </span>
          <span>{client.name}</span>
        </span>
      }
      trailing={
        <button className="btn-primary" onClick={() => nav("/clients/new/profile")}>
          {t("client.modify")}
        </button>
      }
    >
      <WizardTabs basePath={`/clients/${id}`} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="card">
          <h3 className="font-bold mb-4">{t("client.section.info")}</h3>
          <InfoRow label={t("client.field.fullName")} value={dash(profile.fullName ?? client.name)} />
          <InfoRow label={t("client.field.mobile")} value={dash(client.phone)} />
          <InfoRow label={t("client.field.email")} value={dash(client.email)} />
          <InfoRow label={t("client.field.birthdate")} value={dash(profile.birthdate)} />
          <InfoRow
            label={t("client.field.employmentStatus")}
            value={dash(profile.employmentStatus)}
          />
          <InfoRow
            label={t("client.field.employmentIncome")}
            value={egpOrDash(profile.employmentIncome)}
          />
        </section>

        <section className="card">
          <h3 className="font-bold mb-4">{t("client.section.coClient")}</h3>
          {hasCoClient ? (
            <>
              <InfoRow
                label={t("client.field.fullName")}
                value={dash(profile.coClient?.fullName)}
              />
              <InfoRow
                label={t("client.field.birthdate")}
                value={dash(profile.coClient?.birthdate)}
              />
              <InfoRow
                label={t("client.field.employmentStatus")}
                value={dash(profile.coClient?.employmentStatus)}
              />
              <InfoRow
                label={t("client.field.employmentIncome")}
                value={egpOrDash(profile.coClient?.employmentIncome)}
              />
            </>
          ) : (
            <EmptyState message={t("client.empty.coClient")} />
          )}
        </section>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="card">
          <div className="text-xs font-semibold text-accent-pink mb-1">
            {t("client.tile.riskAppetite")}
          </div>
          <div className="font-bold">{dash(profile.riskAppetite)}</div>
        </div>
        <div className="card">
          <div className="text-xs font-semibold text-muted mb-1">
            {t("client.tile.totalAssets")}
          </div>
          <div className="font-bold">{egpOrDash(totalAssets)}</div>
        </div>
        <div className="card">
          <div className="text-xs font-semibold text-red-500 mb-1">
            {t("client.tile.totalDebts")}
          </div>
          <div className="font-bold">{egpOrDash(totalDebts)}</div>
        </div>
        <div className="card">
          <div className="text-xs font-semibold text-primary-500 mb-1">
            {t("client.tile.monthlyExpenses")}
          </div>
          <div className="font-bold">{egpOrDash(profile.monthlyExpenses)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <section className="card md:col-span-2">
          <h3 className="font-bold mb-4">{t("client.section.incomeSources")}</h3>
          {incomeSources.length === 0 ? (
            <EmptyState message={t("client.empty.incomeSources")} cta={t("client.empty.addOne")} />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="text-left font-medium pb-3">
                    {t("client.col.source")}
                  </th>
                  <th className="text-left font-medium pb-3">{t("client.col.amount")}</th>
                  <th className="text-left font-medium pb-3">
                    {t("client.col.annualIncrease")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {incomeSources.map((row, i) => (
                  <tr key={`income-${i}`} className="border-t border-border/60">
                    <td className="py-2">{dash(row.source)}</td>
                    <td className="py-2">{egpOrDash(row.amount)}</td>
                    <td className="py-2">
                      {row.annualIncrease != null && Number.isFinite(row.annualIncrease)
                        ? `${row.annualIncrease}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h3 className="font-bold mb-4">{t("client.section.dependents")}</h3>
          {dependents.length === 0 ? (
            <EmptyState message={t("client.empty.dependents")} cta={t("client.empty.addOne")} />
          ) : (
            dependents.map((d, i) => (
              <div key={`dep-${i}`} className="mb-3">
                <div className="font-semibold">{dash(d.name)}</div>
                <div className="text-xs text-muted">
                  {dash(d.relation)}
                  {d.birthdate ? ` · ${d.birthdate}` : ""}
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <section className="card">
          <h3 className="font-bold text-green-600 mb-4">{t("client.section.assets")}</h3>
          {assets.length === 0 ? (
            <EmptyState message={t("client.empty.assets")} cta={t("client.empty.addOne")} />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="text-left font-medium pb-3">{t("client.col.asset")}</th>
                  <th className="text-right font-medium pb-3">{t("client.col.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((row, i) => (
                  <tr key={`asset-${i}`} className="border-t border-border/60">
                    <td className="py-2">{dash(row.name)}</td>
                    <td className="py-2 text-right">{egpOrDash(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="card">
          <h3 className="font-bold text-red-500 mb-4">{t("client.section.debts")}</h3>
          {debts.length === 0 ? (
            <EmptyState message={t("client.empty.debts")} cta={t("client.empty.addOne")} />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="text-left font-medium pb-3">{t("client.col.debt")}</th>
                  <th className="text-left font-medium pb-3">{t("client.col.amount")}</th>
                  <th className="text-left font-medium pb-3">{t("client.col.duration")}</th>
                  <th className="text-left font-medium pb-3">{t("client.col.interestRate")}</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((row, i) => (
                  <tr key={`debt-${i}`} className="border-t border-border/60">
                    <td className="py-2">{dash(row.name)}</td>
                    <td className="py-2">{egpOrDash(row.amount)}</td>
                    <td className="py-2">
                      {row.duration != null && Number.isFinite(row.duration)
                        ? t("client.years", { n: row.duration })
                        : "—"}
                    </td>
                    <td className="py-2">
                      {row.interestRate != null && Number.isFinite(row.interestRate)
                        ? `${row.interestRate}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="card mt-6">
        <h3 className="font-bold mb-4">{t("client.section.goals")}</h3>
        {goals.length === 0 ? (
          <EmptyState message={t("client.empty.goals")} cta={t("client.empty.addOne")} />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="text-left font-medium pb-3">{t("client.col.goal")}</th>
                <th className="text-left font-medium pb-3">{t("client.col.amount")}</th>
                <th className="text-left font-medium pb-3">{t("client.col.year")}</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g, i) => (
                <tr key={`goal-${i}`} className="border-t border-border/60">
                  <td className="py-2">{dash(g.name)}</td>
                  <td className="py-2">{egpOrDash(g.amount)}</td>
                  <td className="py-2">{dash(g.year)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
