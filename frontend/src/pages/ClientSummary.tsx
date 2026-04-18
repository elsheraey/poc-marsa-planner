import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
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

// Azimut tinted pill colours. Mirrors SimulationReport.tsx so the same
// visual language appears wherever attainability is surfaced.
const ATTAINABILITY_CLASS: Record<
  "attainable" | "aspirational" | "out_of_reach",
  string
> = {
  attainable: "bg-emerald-100 text-emerald-800",
  aspirational: "bg-amber-100 text-amber-800",
  out_of_reach: "bg-rose-100 text-rose-800",
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
    <div className="grouped-row">
      <span className="text-sm text-az-ink-muted min-w-[140px] shrink-0">
        {label}
      </span>
      <span className="text-[15px] text-az-ink flex-1 truncate">{value}</span>
    </div>
  );
}

function SectionHeader({ children }: Readonly<{ children: string }>) {
  return (
    <h2 className="section-label mb-2 px-1">{children}</h2>
  );
}

function EmptyState({ message }: Readonly<{ message: string }>) {
  return (
    <p className="text-[15px] text-az-ink-muted py-3 px-4">
      {message}
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

/**
 * ClientSummary — Apple grouped-list pattern.
 *
 * Each logical section is a grouped-inset white card on the bg-grouped
 * canvas, preceded by an all-caps section label (iOS settings style).
 * The summary tiles up top (risk appetite, total assets, total debts,
 * monthly expenses) render as four equal-width cards in a grid so the
 * overview reads as a dashboard header before the lists scroll into
 * view. Saved-simulations stays a grouped list with an attainability
 * pill per row.
 */
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
        <div className="px-6 pt-10">
          <p className="text-az-ink-muted py-12 text-center">
            {t("common.loading")}
          </p>
        </div>
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
          className="text-az-white hover:text-az-gold hover:underline decoration-az-gold underline-offset-4 font-semibold transition"
          onClick={() => nav("/clients/new/profile")}
        >
          {t("client.modify")}
        </button>
      }
    >
      <header className="px-6 pt-10 pb-6">
        <nav
          aria-label="Breadcrumb"
          className="mb-3 text-sm text-az-ink-muted flex items-center gap-2"
        >
          <Link
            to="/clients"
            className="text-az-black hover:text-az-gold-hover"
          >
            {t("nav.clients")}
          </Link>
          <span aria-hidden="true" className="text-az-ink-subtle">
            ›
          </span>
          <span>{client.name}</span>
        </nav>
        <h1 className="text-4xl font-bold tracking-tight">{client.name}</h1>
        <p className="mt-1 text-base text-az-ink-muted">{client.email}</p>
      </header>

      <div className="px-6 space-y-6">
        {/* Summary tiles */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t("client.tile.riskAppetite"), value: dash(profile.riskAppetite) },
            { label: t("client.tile.totalAssets"), value: egpOrDash(totalAssets) },
            { label: t("client.tile.totalDebts"), value: egpOrDash(totalDebts) },
            { label: t("client.tile.monthlyExpenses"), value: egpOrDash(profile.monthlyExpenses) },
          ].map((tile) => (
            <div
              key={tile.label}
              className="rounded-2xl bg-az-white ring-1 ring-az-separator p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-az-ink-muted">
                {tile.label}
              </div>
              <div className="mt-2 text-xl font-semibold tracking-tight tabular text-az-ink">
                {tile.value}
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section>
            <SectionHeader>{t("client.section.info")}</SectionHeader>
            <div className="grouped-list">
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
            </div>
          </section>

          <section>
            <SectionHeader>{t("client.section.coClient")}</SectionHeader>
            <div className="grouped-list">
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
            </div>
          </section>
        </div>

        <section>
          <SectionHeader>{t("client.section.incomeSources")}</SectionHeader>
          <div className="grouped-list">
            {incomeSources.length === 0 ? (
              <EmptyState message={t("client.empty.incomeSources")} />
            ) : (
              incomeSources.map((row, i) => (
                <div key={`income-${i}`} className="grouped-row">
                  <span className="flex-1 text-[15px]">{dash(row.source)}</span>
                  <span className="text-[15px] text-az-ink-muted tabular">
                    {egpOrDash(row.amount)}
                  </span>
                  <span className="text-sm text-az-ink-subtle tabular min-w-[80px] text-end">
                    {row.annualIncrease != null && Number.isFinite(row.annualIncrease)
                      ? `${row.annualIncrease}%`
                      : "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <SectionHeader>{t("client.section.dependents")}</SectionHeader>
          <div className="grouped-list">
            {dependents.length === 0 ? (
              <EmptyState message={t("client.empty.dependents")} />
            ) : (
              dependents.map((d, i) => (
                <div key={`dep-${i}`} className="grouped-row">
                  <span className="flex-1">
                    <span className="block text-[15px] font-semibold text-az-ink">
                      {dash(d.name)}
                    </span>
                    <span className="block text-sm text-az-ink-muted">
                      {dash(d.relation)}
                      {d.birthdate ? ` · ${d.birthdate}` : ""}
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section>
            <SectionHeader>{t("client.section.assets")}</SectionHeader>
            <div className="grouped-list">
              {assets.length === 0 ? (
                <EmptyState message={t("client.empty.assets")} />
              ) : (
                assets.map((row, i) => (
                  <div key={`asset-${i}`} className="grouped-row">
                    <span className="flex-1 text-[15px]">{dash(row.name)}</span>
                    <span className="text-[15px] tabular text-az-ink-muted">
                      {egpOrDash(row.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <SectionHeader>{t("client.section.debts")}</SectionHeader>
            <div className="grouped-list">
              {debts.length === 0 ? (
                <EmptyState message={t("client.empty.debts")} />
              ) : (
                debts.map((row, i) => (
                  <div key={`debt-${i}`} className="grouped-row">
                    <span className="flex-1">
                      <span className="block text-[15px] font-semibold text-az-ink">
                        {dash(row.name)}
                      </span>
                      <span className="block text-sm text-az-ink-muted tabular">
                        {row.duration != null && Number.isFinite(row.duration)
                          ? t("client.years", { n: row.duration })
                          : "—"}
                        {" · "}
                        {row.interestRate != null && Number.isFinite(row.interestRate)
                          ? `${row.interestRate}%`
                          : "—"}
                      </span>
                    </span>
                    <span className="text-[15px] tabular text-az-ink-muted">
                      {egpOrDash(row.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section>
          <SectionHeader>{t("client.section.goals")}</SectionHeader>
          <div className="grouped-list">
            {goals.length === 0 ? (
              <EmptyState message={t("client.empty.goals")} />
            ) : (
              goals.map((g, i) => (
                <div key={`goal-${i}`} className="grouped-row">
                  <span className="flex-1 text-[15px] font-semibold text-az-ink">
                    {dash(g.name)}
                  </span>
                  <span className="text-[15px] tabular text-az-ink-muted">
                    {egpOrDash(g.amount)}
                  </span>
                  <span className="text-sm text-az-ink-subtle tabular min-w-[60px] text-end">
                    {dash(g.year)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section data-testid="saved-simulations">
          <SectionHeader>{t("client.section.savedSims")}</SectionHeader>
          {savedStatus === "loading" && (
            <div className="grouped-list">
              <EmptyState message={t("common.loading")} />
            </div>
          )}
          {savedStatus === "error" && (
            <div
              role="alert"
              className="rounded-xl bg-rose-100 text-rose-800 px-4 py-3 text-sm"
            >
              {savedError ?? t("client.savedSims.error")}
            </div>
          )}
          {savedStatus === "idle" && savedRows.length === 0 && (
            <div className="grouped-list">
              <EmptyState message={t("client.savedSims.empty")} />
            </div>
          )}
          {savedStatus === "idle" && savedRows.length > 0 && (
            <div className="grouped-list">
              {savedRows.map((row) => (
                <div
                  key={row.id}
                  data-testid={`saved-sim-row-${row.id}`}
                  className="grouped-row"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold text-az-ink truncate">
                      {row.name}
                    </span>
                    <span className="block text-sm text-az-ink-muted">
                      {fmtDate(row.created_at)}
                    </span>
                  </span>
                  <span className="text-[15px] font-semibold tabular text-az-ink">
                    {row.detailStatus === "loading"
                      ? "…"
                      : fmtProbabilityPct(row.probability)}
                  </span>
                  {row.detailStatus === "ready" && row.attainability ? (
                    <span
                      className={`pill ${ATTAINABILITY_CLASS[row.attainability]}`}
                    >
                      {attainabilityLabel(row.attainability)}
                    </span>
                  ) : (
                    <span className="text-az-ink-subtle text-sm">—</span>
                  )}
                  <button
                    type="button"
                    className="text-rose-700 text-sm font-semibold hover:text-rose-800"
                    data-testid={`delete-saved-sim-${row.id}`}
                    onClick={() => handleDeleteSaved(row)}
                  >
                    {t("client.savedSims.delete")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
