import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { actions } from "./draftSlice";
import { useAppDispatch, useAppSelector } from "../../store";
import { t } from "../../i18n";

// Mirror of the Login.tsx regex — keep in sync. Loose-but-honest: requires
// exactly one "@" and one "." in the domain, which is enough to catch the
// obvious "x" / "foo" / missing-tld mistakes without rejecting legitimate
// addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// dd/mm/yyyy and yyyy-mm-dd are both acceptable — the underlying input is a
// free text field. Parse conservatively so we reject "31/02/2000", "99/99/1",
// and anything that doesn't produce a real past date.
function parseBirthdate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  // dd/mm/yyyy
  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(s);
  if (dmy) {
    const [, d, m, y] = dmy;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    if (
      dt.getFullYear() === Number(y) &&
      dt.getMonth() === Number(m) - 1 &&
      dt.getDate() === Number(d)
    ) {
      return dt;
    }
    return null;
  }
  // yyyy-mm-dd
  const ymd = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(s);
  if (ymd) {
    const [, y, m, d] = ymd;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    if (
      dt.getFullYear() === Number(y) &&
      dt.getMonth() === Number(m) - 1 &&
      dt.getDate() === Number(d)
    ) {
      return dt;
    }
    return null;
  }
  return null;
}

export type ProfileFieldErrors = Partial<{
  fullName: string;
  email: string;
  birthdate: string;
  phone: string;
  employmentStatus: string;
  riskAppetite: string;
}>;

const RISK_VALUES = ["very_low", "low", "moderate", "high", "very_high"] as const;

export function validateProfile(p: {
  fullName: string;
  email: string;
  birthdate: string;
  phone: string;
  employmentStatus: string;
  riskAppetite: string;
}): ProfileFieldErrors {
  const errs: ProfileFieldErrors = {};
  if (!p.fullName.trim()) errs.fullName = t("wizard.profile.error.fullName");
  if (!EMAIL_RE.test(p.email)) errs.email = t("wizard.profile.error.email");
  const dob = parseBirthdate(p.birthdate);
  if (!dob || dob.getTime() >= Date.now()) {
    errs.birthdate = t("wizard.profile.error.birthdate");
  }
  const phoneLen = p.phone.trim().length;
  if (phoneLen < 6 || phoneLen > 32) {
    errs.phone = t("wizard.profile.error.phone");
  }
  if (!p.employmentStatus) {
    errs.employmentStatus = t("wizard.profile.error.employmentStatus");
  }
  if (!RISK_VALUES.includes(p.riskAppetite as (typeof RISK_VALUES)[number])) {
    errs.riskAppetite = t("wizard.profile.error.riskAppetite");
  }
  return errs;
}

// The Profile step used to be a ~400-line wall of inputs — dependents,
// assets, debts, income sources, co-client, monthly expenses — most of
// which never reach the simulation engine. Advisors bounced through
// fields they didn't need before getting to the one that matters (risk
// appetite). The step is split into:
//
//   - Required (always visible): six fields driving onboarding and the
//     first simulation — name, email, birthdate, phone, employment,
//     risk appetite.
//   - Advanced profile (collapsible <details>): everything else. State
//     still goes to `draft` so no data is lost, but the CTA does not
//     require the advisor to open the disclosure.
//
// `<details>` inherits RTL from <html dir=...> naturally — the marker
// sits on the inline-start side in both directions.

function Field({
  label,
  children,
  required,
  error,
}: Readonly<{
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-az-ink-muted">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      {children}
      {error && <div className="text-xs text-rose-600 mt-1.5">{error}</div>}
    </div>
  );
}

function AdvancedDossier() {
  const dispatch = useAppDispatch();
  const p = useAppSelector((s) => s.draft.profile);
  const upd = (patch: Partial<typeof p>) => dispatch(actions.updateProfile(patch));

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-3">
        <span className="text-[15px] font-semibold text-az-ink">
          {t("profile.dossier.coClient")}
        </span>
        <button
          type="button"
          aria-pressed={p.hasCoClient}
          aria-label={t("profile.dossier.coClient")}
          className={`w-11 h-6 rounded-full transition ${
            p.hasCoClient ? "bg-az-black" : "bg-az-separator-strong"
          }`}
          onClick={() => upd({ hasCoClient: !p.hasCoClient })}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-az-white shadow transform transition ${
              p.hasCoClient ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {p.hasCoClient && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label={t("profile.field.fullName")}>
            <input
              className="input"
              placeholder={t("wizard.profile.placeholder.fullName")}
              value={p.coClient.fullName}
              onChange={(e) =>
                dispatch(actions.updateCoClient({ fullName: e.target.value }))
              }
            />
          </Field>
          <Field label={t("profile.field.employmentStatus")}>
            <select
              className="select"
              value={p.coClient.employmentStatus}
              onChange={(e) =>
                dispatch(actions.updateCoClient({ employmentStatus: e.target.value }))
              }
            >
              <option value="">{t("profile.employmentStatus.select")}</option>
              <option value="employed">{t("profile.employmentStatus.employed")}</option>
              <option value="self-employed">{t("profile.employmentStatus.selfEmployed")}</option>
              <option value="retired">{t("profile.employmentStatus.retired")}</option>
            </select>
          </Field>
          <Field label={t("profile.field.birthdate")}>
            <input
              className="input"
              placeholder={t("wizard.profile.placeholder.birthdate")}
              value={p.coClient.birthdate}
              onChange={(e) =>
                dispatch(actions.updateCoClient({ birthdate: e.target.value }))
              }
            />
          </Field>
          <Field label={t("profile.dossier.employmentIncome")}>
            <input
              className="input"
              type="number"
              value={p.coClient.employmentIncome || ""}
              onChange={(e) =>
                dispatch(
                  actions.updateCoClient({
                    employmentIncome: Number(e.target.value),
                  })
                )
              }
            />
          </Field>
        </div>
      )}

      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[15px] font-semibold text-az-ink">
            {t("profile.dossier.dependents")}
          </span>
          <button
            type="button"
            className="icon-btn-add"
            onClick={() => dispatch(actions.addDependent())}
            aria-label={t("profile.dossier.dependents")}
          >
            +
          </button>
        </div>
        {p.dependents.map((d, i) => (
          <div
            key={`dep-${i}`}
            className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end mb-3"
          >
            <Field label={t("profile.field.fullName")}>
              <input
                className="input"
                value={d.name}
                onChange={(e) =>
                  dispatch(
                    actions.updateDependent({ index: i, patch: { name: e.target.value } })
                  )
                }
              />
            </Field>
            <Field label={t("profile.dossier.relation")}>
              <select
                className="select"
                value={d.relation}
                onChange={(e) =>
                  dispatch(
                    actions.updateDependent({ index: i, patch: { relation: e.target.value } })
                  )
                }
              >
                <option value="son">{t("profile.dossier.relation.son")}</option>
                <option value="daughter">{t("profile.dossier.relation.daughter")}</option>
              </select>
            </Field>
            <Field label={t("profile.field.birthdate")}>
              <input
                className="input"
                placeholder={t("wizard.profile.placeholder.birthdate")}
                value={d.birthdate}
                onChange={(e) =>
                  dispatch(
                    actions.updateDependent({ index: i, patch: { birthdate: e.target.value } })
                  )
                }
              />
            </Field>
            <button
              type="button"
              className="icon-btn-remove mb-1"
              onClick={() => dispatch(actions.removeDependent(i))}
              aria-label={t("wizard.profile.repeater.remove", {
                group: t("profile.dossier.dependents"),
              })}
            >
              −
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[15px] font-semibold text-az-ink">
            {t("profile.dossier.incomeSources")}
          </span>
          <button
            type="button"
            className="icon-btn-add"
            onClick={() => dispatch(actions.addIncome())}
            aria-label={t("profile.dossier.incomeSources")}
          >
            +
          </button>
        </div>
        {p.incomeSources.map((it, i) => (
          <div
            key={`inc-${i}`}
            className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end mb-3"
          >
            <Field label={t("profile.dossier.source")}>
              <input
                className="input"
                value={it.source}
                onChange={(e) =>
                  dispatch(
                    actions.updateIncome({ index: i, patch: { source: e.target.value } })
                  )
                }
              />
            </Field>
            <Field label={t("profile.dossier.amount")}>
              <input
                className="input"
                type="number"
                value={it.amount || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateIncome({
                      index: i,
                      patch: { amount: Number(e.target.value) },
                    })
                  )
                }
              />
            </Field>
            <Field label={t("profile.dossier.annualIncrease")}>
              <input
                className="input"
                type="number"
                value={it.annualIncrease || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateIncome({
                      index: i,
                      patch: { annualIncrease: Number(e.target.value) },
                    })
                  )
                }
              />
            </Field>
            <button
              type="button"
              className="icon-btn-remove mb-1"
              onClick={() => dispatch(actions.removeIncome(i))}
              aria-label={t("wizard.profile.repeater.remove", {
                group: t("profile.dossier.incomeSources"),
              })}
            >
              −
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[15px] font-semibold text-az-ink">
            {t("profile.dossier.assets")}
          </span>
          <button
            type="button"
            className="icon-btn-add"
            onClick={() => dispatch(actions.addAsset())}
            aria-label={t("profile.dossier.assets")}
          >
            +
          </button>
        </div>
        {p.assets.map((a, i) => (
          <div
            key={`asset-${i}`}
            className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end mb-3"
          >
            <Field label={t("profile.dossier.asset")}>
              <input
                className="input"
                value={a.name}
                onChange={(e) =>
                  dispatch(
                    actions.updateAsset({ index: i, patch: { name: e.target.value } })
                  )
                }
              />
            </Field>
            <Field label={t("profile.dossier.amount")}>
              <input
                className="input"
                type="number"
                value={a.amount || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateAsset({
                      index: i,
                      patch: { amount: Number(e.target.value) },
                    })
                  )
                }
              />
            </Field>
            <button
              type="button"
              className="icon-btn-remove mb-1"
              onClick={() => dispatch(actions.removeAsset(i))}
              aria-label={t("wizard.profile.repeater.remove", {
                group: t("profile.dossier.assets"),
              })}
            >
              −
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[15px] font-semibold text-az-ink">
            {t("profile.dossier.debts")}
          </span>
          <button
            type="button"
            className="icon-btn-add"
            onClick={() => dispatch(actions.addDebt())}
            aria-label={t("profile.dossier.debts")}
          >
            +
          </button>
        </div>
        {p.debts.map((d, i) => (
          <div
            key={`debt-${i}`}
            className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end mb-3"
          >
            <Field label={t("profile.dossier.debt")}>
              <input
                className="input"
                value={d.name}
                onChange={(e) =>
                  dispatch(
                    actions.updateDebt({ index: i, patch: { name: e.target.value } })
                  )
                }
              />
            </Field>
            <Field label={t("profile.dossier.amount")}>
              <input
                className="input"
                type="number"
                value={d.amount || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateDebt({
                      index: i,
                      patch: { amount: Number(e.target.value) },
                    })
                  )
                }
              />
            </Field>
            <Field label={t("profile.dossier.duration")}>
              <input
                className="input"
                type="number"
                value={d.duration || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateDebt({
                      index: i,
                      patch: { duration: Number(e.target.value) },
                    })
                  )
                }
              />
            </Field>
            <Field label={t("profile.dossier.interestRate")}>
              <input
                className="input"
                type="number"
                value={d.interestRate || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateDebt({
                      index: i,
                      patch: { interestRate: Number(e.target.value) },
                    })
                  )
                }
              />
            </Field>
            <button
              type="button"
              className="icon-btn-remove mb-1"
              onClick={() => dispatch(actions.removeDebt(i))}
              aria-label={t("wizard.profile.repeater.remove", {
                group: t("profile.dossier.debts"),
              })}
            >
              −
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label={t("profile.dossier.employmentIncome")}>
          <input
            className="input"
            type="number"
            value={p.employmentIncome || ""}
            onChange={(e) => upd({ employmentIncome: Number(e.target.value) })}
          />
        </Field>
        <Field label={t("profile.dossier.monthlyExpenses")}>
          <input
            className="input"
            type="number"
            value={p.monthlyExpenses || ""}
            onChange={(e) => upd({ monthlyExpenses: Number(e.target.value) })}
          />
        </Field>
      </div>
    </div>
  );
}

export default function ProfileStep() {
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const p = useAppSelector((s) => s.draft.profile);
  const upd = (patch: Partial<typeof p>) => dispatch(actions.updateProfile(patch));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});

  function onProceed() {
    const errs = validateProfile(p);
    setFieldErrors(errs);
    if (Object.keys(errs).length === 0) {
      nav("/clients/new/goals");
    }
  }

  return (
    <>
      <section className="rounded-2xl bg-az-white ring-1 ring-az-separator p-6">
        <h2 className="text-xl font-semibold tracking-tight mb-5">
          {t("profile.section.required")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <Field
            label={t("profile.field.fullName")}
            required
            error={fieldErrors.fullName}
          >
            <input
              className="input"
              placeholder={t("wizard.profile.placeholder.fullName")}
              value={p.fullName}
              aria-invalid={!!fieldErrors.fullName}
              onChange={(e) => upd({ fullName: e.target.value })}
            />
          </Field>
          <Field
            label={t("profile.field.email")}
            required
            error={fieldErrors.email}
          >
            <input
              className="input"
              type="email"
              value={p.email}
              aria-invalid={!!fieldErrors.email}
              onChange={(e) => upd({ email: e.target.value })}
            />
          </Field>
          <Field
            label={t("profile.field.birthdate")}
            required
            error={fieldErrors.birthdate}
          >
            <input
              className="input"
              placeholder={t("wizard.profile.placeholder.birthdate")}
              value={p.birthdate}
              aria-invalid={!!fieldErrors.birthdate}
              onChange={(e) => upd({ birthdate: e.target.value })}
            />
          </Field>
          <Field
            label={t("profile.field.phone")}
            required
            error={fieldErrors.phone}
          >
            <input
              className="input"
              value={p.phone}
              aria-invalid={!!fieldErrors.phone}
              onChange={(e) => upd({ phone: e.target.value })}
            />
          </Field>
          <Field
            label={t("profile.field.employmentStatus")}
            required
            error={fieldErrors.employmentStatus}
          >
            <select
              className="select"
              value={p.employmentStatus}
              aria-invalid={!!fieldErrors.employmentStatus}
              onChange={(e) => upd({ employmentStatus: e.target.value })}
            >
              <option value="">{t("profile.employmentStatus.select")}</option>
              <option value="employed">{t("profile.employmentStatus.employed")}</option>
              <option value="self-employed">
                {t("profile.employmentStatus.selfEmployed")}
              </option>
              <option value="retired">{t("profile.employmentStatus.retired")}</option>
              <option value="unemployed">{t("profile.employmentStatus.unemployed")}</option>
            </select>
          </Field>
          <Field
            label={t("profile.field.riskAppetite")}
            required
            error={fieldErrors.riskAppetite}
          >
            <select
              className="select"
              value={p.riskAppetite}
              aria-invalid={!!fieldErrors.riskAppetite}
              onChange={(e) =>
                upd({ riskAppetite: e.target.value as typeof p.riskAppetite })
              }
            >
              <option value="very_low">{t("profile.risk.very_low")}</option>
              <option value="low">{t("profile.risk.low")}</option>
              <option value="moderate">{t("profile.risk.moderate")}</option>
              <option value="high">{t("profile.risk.high")}</option>
              <option value="very_high">{t("profile.risk.very_high")}</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl bg-az-white ring-1 ring-az-separator p-6">
        <details
          open={advancedOpen}
          onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer list-none flex items-center gap-2 select-none">
            <span
              aria-hidden="true"
              className={`text-az-ink-subtle transition-transform ${advancedOpen ? "rotate-90" : ""}`}
            >
              ›
            </span>
            <span className="text-xl font-semibold tracking-tight">
              {t("profile.section.dossier")}
            </span>
          </summary>
          <p className="text-sm text-az-ink-muted mt-2 leading-relaxed">
            {t("profile.section.dossier.help")}
          </p>
          <AdvancedDossier />
        </details>
      </section>

      <div className="flex justify-end gap-4 pt-2">
        <button
          type="button"
          className="btn-plain"
          onClick={() => nav("/clients")}
        >
          {t("profile.cta.cancel")}
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={onProceed}
        >
          {t("profile.cta.proceed")}
        </button>
      </div>
    </>
  );
}
