import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { actions } from "./draftSlice";
import { useAppDispatch, useAppSelector } from "../../store";
import { t } from "../../i18n";

// The Profile step used to be a ~400-line wall of inputs — dependents,
// assets, debts, income sources, co-client, monthly expenses — most of
// which never reach the simulation engine. Advisors bounced through
// fields they didn't need before getting to the one that matters (risk
// appetite). The step is now split into:
//
//   - Required (always visible): six fields that drive onboarding and
//     the first simulation — name, email, birthdate, phone, employment
//     status, risk appetite.
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
}: Readonly<{
  label: string;
  children: React.ReactNode;
  required?: boolean;
}>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
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
        <span className="text-sm font-semibold">{t("profile.dossier.coClient")}</span>
        <button
          type="button"
          aria-pressed={p.hasCoClient}
          aria-label={t("profile.dossier.coClient")}
          className={`w-11 h-6 rounded-full transition ${
            p.hasCoClient ? "bg-primary-500" : "bg-border"
          }`}
          onClick={() => upd({ hasCoClient: !p.hasCoClient })}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-white shadow transform transition ${
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
              placeholder="dd/mm/yyyy"
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
          <span className="text-sm font-semibold">{t("profile.dossier.dependents")}</span>
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
            className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end mb-3"
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
                placeholder="dd/mm/yyyy"
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
              className="icon-btn-remove mb-2"
              onClick={() => dispatch(actions.removeDependent(i))}
              aria-label="remove"
            >
              −
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold">
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
            className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end mb-3"
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
              className="icon-btn-remove mb-2"
              onClick={() => dispatch(actions.removeIncome(i))}
              aria-label="remove"
            >
              −
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold">{t("profile.dossier.assets")}</span>
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
            className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end mb-3"
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
              className="icon-btn-remove mb-2"
              onClick={() => dispatch(actions.removeAsset(i))}
              aria-label="remove"
            >
              −
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold">{t("profile.dossier.debts")}</span>
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
            className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-end mb-3"
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
              className="icon-btn-remove mb-2"
              onClick={() => dispatch(actions.removeDebt(i))}
              aria-label="remove"
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

  return (
    <>
      <section className="card">
        <h3 className="text-base font-bold mb-6">{t("profile.section.required")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label={t("profile.field.fullName")} required>
            <input
              className="input"
              value={p.fullName}
              onChange={(e) => upd({ fullName: e.target.value })}
            />
          </Field>
          <Field label={t("profile.field.email")} required>
            <input
              className="input"
              type="email"
              value={p.email}
              onChange={(e) => upd({ email: e.target.value })}
            />
          </Field>
          <Field label={t("profile.field.birthdate")} required>
            <input
              className="input"
              placeholder="dd/mm/yyyy"
              value={p.birthdate}
              onChange={(e) => upd({ birthdate: e.target.value })}
            />
          </Field>
          <Field label={t("profile.field.phone")} required>
            <input
              className="input"
              value={p.phone}
              onChange={(e) => upd({ phone: e.target.value })}
            />
          </Field>
          <Field label={t("profile.field.employmentStatus")} required>
            <select
              className="select"
              value={p.employmentStatus}
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
          <Field label={t("profile.field.riskAppetite")} required>
            <select
              className="select"
              value={p.riskAppetite}
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

      <section className="card mt-6">
        <details
          open={advancedOpen}
          onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer list-none flex items-center gap-2 select-none">
            <span aria-hidden="true" className="text-muted text-xs">
              {advancedOpen ? "▾" : "▸"}
            </span>
            <span className="text-base font-bold">{t("profile.section.dossier")}</span>
          </summary>
          <p className="text-xs text-muted mt-2">
            {t("profile.section.dossier.help")}
          </p>
          <AdvancedDossier />
        </details>
      </section>

      <div className="flex justify-end gap-3 mt-6">
        <button type="button" className="btn-outline" onClick={() => nav("/clients")}>
          {t("profile.cta.cancel")}
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => nav("/clients/new/goals")}
        >
          {t("profile.cta.proceed")}
        </button>
      </div>
    </>
  );
}
