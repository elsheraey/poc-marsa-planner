import { useNavigate } from "react-router-dom";
import { actions } from "./draftSlice";
import { useAppDispatch, useAppSelector } from "../../store";

/**
 * Goals step. A single rounded card on the bg-grouped canvas; each goal
 * is a 5-column row of grouped-inset inputs with a trailing remove
 * button. The row separator is a top border on the next row so the
 * whole block reads as one Apple grouped form.
 *
 * NOTE: the "Add goal" button is rendered as a `<span>Goals</span>` +
 * `<button class="icon-btn-add">` pair because the e2e tests target it
 * via `span:text-is("Goals") + button.icon-btn-add`. Keep the span /
 * button pair for every GroupList header in the wizard.
 */
export default function GoalsStep() {
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const goals = useAppSelector((s) => s.draft.goals);

  return (
    <>
      <section className="rounded-2xl bg-az-white ring-1 ring-az-separator p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xl font-semibold tracking-tight text-az-ink">
            Goals
          </span>
          <button
            type="button"
            className="icon-btn-add"
            onClick={() => dispatch(actions.addGoal())}
            aria-label="Add goal"
          >
            +
          </button>
        </div>

        {goals.length === 0 && (
          <p className="text-[15px] text-az-ink-muted py-6 text-center">
            No goals yet. Tap <span className="text-az-black font-semibold">+</span> to add one.
          </p>
        )}

        {goals.map((g, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-end mb-5 pb-5 border-b border-az-separator last:border-b-0 last:pb-0 last:mb-0"
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-az-ink-muted">Name</span>
              <input
                className="input"
                placeholder="Goal"
                value={g.name}
                onChange={(e) =>
                  dispatch(actions.updateGoal({ index: i, patch: { name: e.target.value } }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-az-ink-muted">Amount</span>
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
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-az-ink-muted">Year</span>
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
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-az-ink-muted">Payments</span>
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
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-az-ink-muted">Inflation %</span>
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
              type="button"
              className="icon-btn-remove mb-1"
              onClick={() => dispatch(actions.removeGoal(i))}
              aria-label="Remove goal"
            >
              −
            </button>
          </div>
        ))}
      </section>

      <div className="flex justify-end gap-4 pt-2">
        <button
          type="button"
          className="btn-plain"
          onClick={() => nav("/clients/new/profile")}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => nav("/clients/new/scenario")}
        >
          Save
        </button>
      </div>
    </>
  );
}
