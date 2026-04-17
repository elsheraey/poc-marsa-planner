import { useNavigate } from "react-router-dom";
import { actions } from "./draftSlice";
import { useAppDispatch, useAppSelector } from "../../store";

export default function GoalsStep() {
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const goals = useAppSelector((s) => s.draft.goals);

  return (
    <>
      <section className="card">
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-base font-bold">Goals</h3>
          <button className="icon-btn-add" onClick={() => dispatch(actions.addGoal())}>
            +
          </button>
        </div>

        {goals.map((g, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-end mb-4"
          >
            <div className="flex flex-col gap-2">
              <span className="label">Name</span>
              <input
                className="input"
                placeholder="Goal"
                value={g.name}
                onChange={(e) =>
                  dispatch(actions.updateGoal({ index: i, patch: { name: e.target.value } }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="label">Amount</span>
              <input
                className="input"
                placeholder="Amount"
                type="number"
                value={g.amount || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateGoal({ index: i, patch: { amount: Number(e.target.value) } })
                  )
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="label">Year</span>
              <input
                className="input"
                placeholder="Year"
                type="number"
                value={g.year || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateGoal({ index: i, patch: { year: Number(e.target.value) } })
                  )
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="label">Payments</span>
              <input
                className="input"
                placeholder="Number"
                type="number"
                value={g.payments || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateGoal({
                      index: i,
                      patch: { payments: Number(e.target.value) },
                    })
                  )
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="label">Inflation Rate</span>
              <input
                className="input"
                placeholder="%"
                type="number"
                value={g.inflationRate || ""}
                onChange={(e) =>
                  dispatch(
                    actions.updateGoal({
                      index: i,
                      patch: { inflationRate: Number(e.target.value) },
                    })
                  )
                }
              />
            </div>
            <button
              className="icon-btn-remove mb-2"
              onClick={() => dispatch(actions.removeGoal(i))}
            >
              −
            </button>
          </div>
        ))}
      </section>

      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-outline" onClick={() => nav("/clients/new/profile")}>
          Cancel
        </button>
        <button className="btn-primary" onClick={() => nav("/clients/new/scenario")}>
          Save
        </button>
      </div>
    </>
  );
}
