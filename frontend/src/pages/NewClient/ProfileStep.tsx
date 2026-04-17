import { useNavigate } from "react-router-dom";
import { actions } from "./draftSlice";
import { useAppDispatch, useAppSelector } from "../../store";

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
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

export default function ProfileStep() {
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const p = useAppSelector((s) => s.draft.profile);
  const upd = (patch: Partial<typeof p>) => dispatch(actions.updateProfile(patch));

  return (
    <>
      <section className="card">
        <h3 className="text-base font-bold mb-6">Personal Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Name" required>
            <input
              className="input"
              placeholder="Full name"
              value={p.fullName}
              onChange={(e) => upd({ fullName: e.target.value })}
            />
          </Field>
          <Field label="Email" required>
            <input
              className="input"
              placeholder="Email"
              value={p.email}
              onChange={(e) => upd({ email: e.target.value })}
            />
          </Field>
          <Field label="Age/Birthdate" required>
            <input
              className="input"
              placeholder="dd/mm/yyyy"
              value={p.birthdate}
              onChange={(e) => upd({ birthdate: e.target.value })}
            />
          </Field>
          <Field label="Phone" required>
            <input
              className="input"
              placeholder="+2"
              value={p.phone}
              onChange={(e) => upd({ phone: e.target.value })}
            />
          </Field>
          <Field label="Employment Status" required>
            <select
              className="select"
              value={p.employmentStatus}
              onChange={(e) => upd({ employmentStatus: e.target.value })}
            >
              <option value="">Select</option>
              <option>Employed</option>
              <option>Self-employed</option>
              <option>Retired</option>
              <option>Unemployed</option>
            </select>
          </Field>
          <Field label="Employment Income" required>
            <input
              className="input"
              placeholder="Amount"
              type="number"
              value={p.employmentIncome || ""}
              onChange={(e) => upd({ employmentIncome: Number(e.target.value) })}
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 mt-8 mb-4">
          <span className="text-sm font-semibold">Co-Client</span>
          <button
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
            <Field label="Name" required>
              <input
                className="input"
                placeholder="Full name"
                value={p.coClient.fullName}
                onChange={(e) => dispatch(actions.updateCoClient({ fullName: e.target.value }))}
              />
            </Field>
            <Field label="Employment Status" required>
              <select
                className="select"
                value={p.coClient.employmentStatus}
                onChange={(e) =>
                  dispatch(actions.updateCoClient({ employmentStatus: e.target.value }))
                }
              >
                <option value="">Select</option>
                <option>Employed</option>
                <option>Self-employed</option>
                <option>Retired</option>
              </select>
            </Field>
            <Field label="Age/Birthdate" required>
              <input
                className="input"
                placeholder="dd/mm/yyyy"
                value={p.coClient.birthdate}
                onChange={(e) => dispatch(actions.updateCoClient({ birthdate: e.target.value }))}
              />
            </Field>
            <Field label="Employment Income" required>
              <input
                className="input"
                placeholder="Amount"
                type="number"
                value={p.coClient.employmentIncome || ""}
                onChange={(e) =>
                  dispatch(actions.updateCoClient({ employmentIncome: Number(e.target.value) }))
                }
              />
            </Field>
          </div>
        )}

        <div className="flex items-center gap-3 mt-8 mb-4">
          <span className="text-sm font-semibold">Dependents</span>
          <button className="icon-btn-add" onClick={() => dispatch(actions.addDependent())}>
            +
          </button>
        </div>
        {p.dependents.map((d, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end mb-3">
            <Field label="Name">
              <input
                className="input"
                placeholder="Name"
                value={d.name}
                onChange={(e) =>
                  dispatch(actions.updateDependent({ index: i, patch: { name: e.target.value } }))
                }
              />
            </Field>
            <Field label="Son/Daughter">
              <select
                className="select"
                value={d.relation}
                onChange={(e) =>
                  dispatch(
                    actions.updateDependent({ index: i, patch: { relation: e.target.value } })
                  )
                }
              >
                <option value="son">Son</option>
                <option value="daughter">Daughter</option>
              </select>
            </Field>
            <Field label="Age/Birthdate">
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
              className="icon-btn-remove mb-2"
              onClick={() => dispatch(actions.removeDependent(i))}
            >
              −
            </button>
          </div>
        ))}
      </section>

      <section className="card mt-6">
        <h3 className="text-base font-bold mb-6">Financial Info</h3>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-semibold">Income Sources</span>
          <button className="icon-btn-add" onClick={() => dispatch(actions.addIncome())}>
            +
          </button>
        </div>
        {p.incomeSources.map((it, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end mb-3">
            <Field label="Source">
              <input
                className="input"
                placeholder="Source"
                value={it.source}
                onChange={(e) =>
                  dispatch(actions.updateIncome({ index: i, patch: { source: e.target.value } }))
                }
              />
            </Field>
            <Field label="Amount">
              <input
                className="input"
                placeholder="Amount"
                type="number"
                value={it.amount || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateIncome({ index: i, patch: { amount: Number(e.target.value) } })
                  )
                }
              />
            </Field>
            <Field label="Annual Increase">
              <input
                className="input"
                placeholder="%"
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
              className="icon-btn-remove mb-2"
              onClick={() => dispatch(actions.removeIncome(i))}
            >
              −
            </button>
          </div>
        ))}

        <div className="flex items-center gap-3 mt-6 mb-4">
          <span className="text-sm font-semibold">Assets</span>
          <button className="icon-btn-add" onClick={() => dispatch(actions.addAsset())}>
            +
          </button>
        </div>
        {p.assets.map((a, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end mb-3">
            <Field label="Assets">
              <input
                className="input"
                placeholder="Asset"
                value={a.name}
                onChange={(e) =>
                  dispatch(actions.updateAsset({ index: i, patch: { name: e.target.value } }))
                }
              />
            </Field>
            <Field label="Amount">
              <input
                className="input"
                placeholder="Amount"
                type="number"
                value={a.amount || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateAsset({ index: i, patch: { amount: Number(e.target.value) } })
                  )
                }
              />
            </Field>
            <button
              className="icon-btn-remove mb-2"
              onClick={() => dispatch(actions.removeAsset(i))}
            >
              −
            </button>
          </div>
        ))}

        <div className="flex items-center gap-3 mt-6 mb-4">
          <span className="text-sm font-semibold">Debts</span>
          <button className="icon-btn-add" onClick={() => dispatch(actions.addDebt())}>
            +
          </button>
        </div>
        {p.debts.map((d, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-end mb-3">
            <Field label="Debt">
              <input
                className="input"
                placeholder="Debt"
                value={d.name}
                onChange={(e) =>
                  dispatch(actions.updateDebt({ index: i, patch: { name: e.target.value } }))
                }
              />
            </Field>
            <Field label="Amount">
              <input
                className="input"
                placeholder="Amount"
                type="number"
                value={d.amount || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateDebt({ index: i, patch: { amount: Number(e.target.value) } })
                  )
                }
              />
            </Field>
            <Field label="Duration">
              <input
                className="input"
                placeholder="Years"
                type="number"
                value={d.duration || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateDebt({ index: i, patch: { duration: Number(e.target.value) } })
                  )
                }
              />
            </Field>
            <Field label="Interest Rate">
              <input
                className="input"
                placeholder="%"
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
              className="icon-btn-remove mb-2"
              onClick={() => dispatch(actions.removeDebt(i))}
            >
              −
            </button>
          </div>
        ))}

        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3">Expenses</h4>
          <Field label="Average Monthly Expenses">
            <input
              className="input max-w-sm"
              placeholder="Average amount"
              type="number"
              value={p.monthlyExpenses || ""}
              onChange={(e) => upd({ monthlyExpenses: Number(e.target.value) })}
            />
          </Field>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3">Risk</h4>
          <Field label="Risk Appetite">
            <select
              className="select max-w-sm"
              value={p.riskAppetite}
              onChange={(e) => upd({ riskAppetite: e.target.value as typeof p.riskAppetite })}
            >
              <option value="very_low">Very Low</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="very_high">Very High</option>
            </select>
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-outline" onClick={() => nav("/clients")}>
          Cancel
        </button>
        <button className="btn-primary" onClick={() => nav("/clients/new/goals")}>
          Save
        </button>
      </div>
    </>
  );
}
