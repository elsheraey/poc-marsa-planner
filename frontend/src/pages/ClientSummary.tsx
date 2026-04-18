import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import WizardTabs from "../components/WizardTabs";
import { toast } from "../components/Toaster";
import { fetchClient } from "../store/slices/clientsSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { fmtEGP } from "../utils/format";
import { t } from "../i18n";
import {
  ApiError,
  api,
  type Goal,
  type SavedSimulation,
  type SavedSimulationListItem,
} from "../api/client";

// Shape we render per row in the Saved-simulations section.
type SavedSimRow = SavedSimulationListItem & {
  probability: number | null;
  attainability: "attainable" | "aspirational" | "out_of_reach" | null;
  detailStatus: "loading" | "ready" | "error";
};

// Muted attainability palette — 900 ink on 100 tint. Same decision as
// SimulationReport: the old 700/600 fills were too saturated for the
// cream surface.
const ATTAINABILITY_CLASS: Record<
  "attainable" | "aspirational" | "out_of_reach",
  string
> = {
  attainable: "bg-emerald-100 text-emerald-900",
  aspirational: "bg-amber-100 text-amber-900",
  out_of_reach: "bg-rose-100 text-rose-900",
};

function attainabilityLabel(
  a: "attainable" | "aspirational" | "out_of_reach"
): string {
  const key = `report.${a}`;
  const localised = t(key);
  return localised === key ? a.replace(/_/g, " ") : localised;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function fmtProbabilityPct(p: number | null): string {
  if (p == null) return "—";
  return `${Math.round(p * 100)}%`;
}

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
    <div className="grid grid-cols-[minmax(140px,1fr)_2fr] gap-4 py-2 border-t border-rule text-sm">
      <span className="label self-center">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

function EmptyState({ message, cta }: Readonly<{ message: string; cta?: string }>) {
  return (
    <p className="font-serif italic text-ink-muted py-4">
      {message}
      {cta && <span className="mx-2">·</span>}
      {cta && <span className="text-ink underline decoration-accent underline-offset-4">{cta}</span>}
    </p>
  );
}

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

  const [savedStatus, setSavedStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [savedError, setSavedError] = useState<string | null>(null);
  const [savedRows, setSavedRows] = useState<SavedSimRow[]>([]);

  useEffect(() => {
    if (id) dispatch(fetchClient(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setSavedStatus("loading");
    setSavedError(null);
    api
      .listSimulations(id)
      .then((list) => {
        if (cancelled) return;
        const initial: SavedSimRow[] = list.map((item) => ({
          ...item,
          probability: null,
          attainability: null,
          detailStatus: "loading",
        }));
        setSavedRows(initial);
        setSavedStatus("idle");
        list.forEach((item) => {
          api
            .getSimulation(item.id)
            .then((detail: SavedSimulation) => {
              if (cancelled) return;
              setSavedRows((prev) =>
                prev.map((r) =>
                  r.id === item.id
                    ? {
                        ...r,
                        probability: detail.response.probability_of_goal,
                        attainability: detail.response.attainability,
                        detailStatus: "ready",
                      }
                    : r
                )
              );
            })
            .catch(() => {
              if (cancelled) return;
              setSavedRows((prev) =>
                prev.map((r) =>
                  r.id === item.id ? { ...r, detailStatus: "error" } : r
                )
              );
            });
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg =
          e instanceof ApiError ? e.message : "Failed to load saved simulations";
        setSavedStatus("error");
        setSavedError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDeleteSaved(row: SavedSimRow) {
    const message = t("client.savedSims.confirmDelete", { name: row.name });
    const confirmed =
      globalThis.window !== undefined
        ? globalThis.window.confirm(message)
        : true;
    if (!confirmed) return;
    try {
      await api.deleteSimulation(row.id);
      if (id) {
        const list = await api.listSimulations(id);
        setSavedRows(
          list.map((item) => ({
            ...item,
            probability: null,
            attainability: null,
            detailStatus: "loading",
          }))
        );
        list.forEach((item) => {
          api
            .getSimulation(item.id)
            .then((detail) => {
              setSavedRows((prev) =>
                prev.map((r) =>
                  r.id === item.id
                    ? {
                        ...r,
                        probability: detail.response.probability_of_goal,
                        attainability: detail.response.attainability,
                        detailStatus: "ready",
                      }
                    : r
                )
              );
            })
            .catch(() => {
              setSavedRows((prev) =>
                prev.map((r) =>
                  r.id === item.id ? { ...r, detailStatus: "error" } : r
                )
              );
            });
        });
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Delete failed";
      toast(msg, "error");
    }
  }

  if (!client) {
    return (
      <AppShell>
        <p className="font-serif italic text-ink-muted py-12 text-center">
          {t("common.loading")}
        </p>
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
      trailing={
        <button
          type="button"
          className="text-ink hover:underline underline-offset-4"
          onClick={() => nav("/clients/new/profile")}
        >
          {t("client.modify")}
        </button>
      }
    >
      <div className="mb-8 text-xs uppercase tracking-widest text-ink-muted">
        <Link to="/clients" className="hover:text-ink">
          {t("nav.clients")}
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-ink">{client.name}</span>
      </div>

      <h1 className="font-serif text-4xl tracking-tight mb-10">{client.name}</h1>

      <WizardTabs basePath={`/clients/${id}`} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <section>
          <h3 className="font-serif text-2xl tracking-tight mb-4">
            {t("client.section.info")}
          </h3>
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

        <section>
          <h3 className="font-serif text-2xl tracking-tight mb-4">
            {t("client.section.coClient")}
          </h3>
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

      <section className="border-t border-rule pt-8 mt-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <div className="label mb-2">{t("client.tile.riskAppetite")}</div>
          <div className="font-serif text-xl">{dash(profile.riskAppetite)}</div>
        </div>
        <div>
          <div className="label mb-2">{t("client.tile.totalAssets")}</div>
          <div className="font-serif text-xl tabular">{egpOrDash(totalAssets)}</div>
        </div>
        <div>
          <div className="label mb-2">{t("client.tile.totalDebts")}</div>
          <div className="font-serif text-xl tabular">{egpOrDash(totalDebts)}</div>
        </div>
        <div>
          <div className="label mb-2">{t("client.tile.monthlyExpenses")}</div>
          <div className="font-serif text-xl tabular">{egpOrDash(profile.monthlyExpenses)}</div>
        </div>
      </section>

      <section className="border-t border-rule pt-8 mt-12">
        <h3 className="font-serif text-2xl tracking-tight mb-4">
          {t("client.section.incomeSources")}
        </h3>
        {incomeSources.length === 0 ? (
          <EmptyState message={t("client.empty.incomeSources")} cta={t("client.empty.addOne")} />
        ) : (
          <table className="w-full text-sm border-t border-b border-rule tabular">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-ink-muted">
                <th className="text-start font-normal py-3">{t("client.col.source")}</th>
                <th className="text-start font-normal py-3">{t("client.col.amount")}</th>
                <th className="text-start font-normal py-3">
                  {t("client.col.annualIncrease")}
                </th>
              </tr>
            </thead>
            <tbody>
              {incomeSources.map((row, i) => (
                <tr key={`income-${i}`} className="border-t border-rule">
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

      <section className="border-t border-rule pt-8 mt-12">
        <h3 className="font-serif text-2xl tracking-tight mb-4">
          {t("client.section.dependents")}
        </h3>
        {dependents.length === 0 ? (
          <EmptyState message={t("client.empty.dependents")} cta={t("client.empty.addOne")} />
        ) : (
          <div className="space-y-4">
            {dependents.map((d, i) => (
              <div key={`dep-${i}`} className="border-t border-rule pt-3">
                <div className="font-serif text-base">{dash(d.name)}</div>
                <div className="text-xs text-ink-muted">
                  {dash(d.relation)}
                  {d.birthdate ? ` · ${d.birthdate}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-rule pt-8 mt-12 grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h3 className="font-serif text-2xl tracking-tight mb-4">
            {t("client.section.assets")}
          </h3>
          {assets.length === 0 ? (
            <EmptyState message={t("client.empty.assets")} cta={t("client.empty.addOne")} />
          ) : (
            <table className="w-full text-sm border-t border-b border-rule tabular">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-ink-muted">
                  <th className="text-start font-normal py-3">{t("client.col.asset")}</th>
                  <th className="text-end font-normal py-3">{t("client.col.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((row, i) => (
                  <tr key={`asset-${i}`} className="border-t border-rule">
                    <td className="py-2">{dash(row.name)}</td>
                    <td className="py-2 text-end">{egpOrDash(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <h3 className="font-serif text-2xl tracking-tight mb-4">
            {t("client.section.debts")}
          </h3>
          {debts.length === 0 ? (
            <EmptyState message={t("client.empty.debts")} cta={t("client.empty.addOne")} />
          ) : (
            <table className="w-full text-sm border-t border-b border-rule tabular">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-ink-muted">
                  <th className="text-start font-normal py-3">{t("client.col.debt")}</th>
                  <th className="text-start font-normal py-3">{t("client.col.amount")}</th>
                  <th className="text-start font-normal py-3">{t("client.col.duration")}</th>
                  <th className="text-start font-normal py-3">{t("client.col.interestRate")}</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((row, i) => (
                  <tr key={`debt-${i}`} className="border-t border-rule">
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
        </div>
      </section>

      <section className="border-t border-rule pt-8 mt-12">
        <h3 className="font-serif text-2xl tracking-tight mb-4">
          {t("client.section.goals")}
        </h3>
        {goals.length === 0 ? (
          <EmptyState message={t("client.empty.goals")} cta={t("client.empty.addOne")} />
        ) : (
          <table className="w-full text-sm border-t border-b border-rule tabular">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-ink-muted">
                <th className="text-start font-normal py-3">{t("client.col.goal")}</th>
                <th className="text-start font-normal py-3">{t("client.col.amount")}</th>
                <th className="text-start font-normal py-3">{t("client.col.year")}</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g, i) => (
                <tr key={`goal-${i}`} className="border-t border-rule">
                  <td className="py-2">{dash(g.name)}</td>
                  <td className="py-2">{egpOrDash(g.amount)}</td>
                  <td className="py-2">{dash(g.year)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section
        className="border-t border-rule pt-8 mt-12"
        data-testid="saved-simulations"
      >
        <h3 className="font-serif text-2xl tracking-tight mb-4">
          {t("client.section.savedSims")}
        </h3>
        {savedStatus === "loading" && (
          <p className="font-serif italic text-ink-muted py-3">{t("common.loading")}</p>
        )}
        {savedStatus === "error" && (
          <div
            role="alert"
            className="text-sm text-accent border-t border-b border-accent py-3"
          >
            {savedError ?? t("client.savedSims.error")}
          </div>
        )}
        {savedStatus === "idle" && savedRows.length === 0 && (
          <EmptyState message={t("client.savedSims.empty")} />
        )}
        {savedStatus === "idle" && savedRows.length > 0 && (
          <table className="w-full text-sm border-t border-b border-rule tabular">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-ink-muted">
                <th className="text-start font-normal py-3">
                  {t("client.savedSims.col.name")}
                </th>
                <th className="text-start font-normal py-3">
                  {t("client.savedSims.col.createdAt")}
                </th>
                <th className="text-start font-normal py-3">
                  {t("client.savedSims.col.probability")}
                </th>
                <th className="text-start font-normal py-3">
                  {t("client.savedSims.col.attainability")}
                </th>
                <th className="text-end font-normal py-3">
                  {t("client.savedSims.col.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {savedRows.map((row) => (
                <tr
                  key={row.id}
                  data-testid={`saved-sim-row-${row.id}`}
                  className="border-t border-rule"
                >
                  <td className="py-2 font-serif">{row.name}</td>
                  <td className="py-2 text-ink-muted">{fmtDate(row.created_at)}</td>
                  <td className="py-2">
                    {row.detailStatus === "loading"
                      ? "…"
                      : fmtProbabilityPct(row.probability)}
                  </td>
                  <td className="py-2">
                    {row.detailStatus === "ready" && row.attainability ? (
                      <span
                        className={`px-2 py-0.5 text-[10px] uppercase tracking-widest ${ATTAINABILITY_CLASS[row.attainability]}`}
                      >
                        {attainabilityLabel(row.attainability)}
                      </span>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="py-2 text-end">
                    <button
                      type="button"
                      className="text-accent text-xs hover:underline underline-offset-4"
                      data-testid={`delete-saved-sim-${row.id}`}
                      onClick={() => handleDeleteSaved(row)}
                    >
                      {t("client.savedSims.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
