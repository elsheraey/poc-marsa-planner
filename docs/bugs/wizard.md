# Wizard flow bug report

Scan date: 2026-04-18
Pages audited: ProfileStep, GoalsStep, ScenarioStep, WizardTabs
Scope (read-only): `frontend/src/pages/NewClient/*.tsx`, `draftSlice.ts`, `frontend/src/components/WizardTabs.tsx`, `frontend/src/store/slices/simulationSlice.ts`.

## Summary

- 3 blockers, 7 major, 6 minor.
- Wizard submits with no validation (empty email / empty name reach the network).
- Rate normalisation is inconsistent between the persisted client payload and the simulation payload — the *same* input number is treated as two different units in the same click.
- Only `monthlyInvestments[0].annualIncrease` is ever sent to the simulator; additional monthly rows silently drop.
- "Run Simulation" is not guarded against re-entry; a double-click races two `POST /api/clients`.
- The UX lead's suspicion is confirmed: there is no Duplicate Scenario button at all.

## Button inventory (complete)

| Page | Button / handler | File:line | Works? | Notes |
|---|---|---|---|---|
| WizardTabs | Profile tab NavLink | WizardTabs.tsx:37 | Yes | `location.pathname.includes(step.to)` is fuzzy — any URL segment containing "profile" activates it. Fine today. |
| WizardTabs | Goals tab NavLink | WizardTabs.tsx:37 | Yes | Same fuzzy-match caveat. |
| WizardTabs | Scenario tab NavLink | WizardTabs.tsx:37 | Yes | Tabs let the advisor jump forward past empty steps — no gate. |
| ProfileStep | Full name input | ProfileStep.tsx:449 | Yes | Trimmed only at Run-Simulation time (scenario step), not here. |
| ProfileStep | Email input | ProfileStep.tsx:456 | Partial | `type="email"` but no form / no validation — any string passes. |
| ProfileStep | Birthdate input | ProfileStep.tsx:464 | Partial | Plain text w/ "dd/mm/yyyy" placeholder — no parsing, no guard. Sent through to profile.birthdate verbatim. |
| ProfileStep | Phone input | ProfileStep.tsx:471 | Yes | No format validation. |
| ProfileStep | Employment select | ProfileStep.tsx:479 | Yes | Five options. |
| ProfileStep | Risk appetite select | ProfileStep.tsx:493 | Yes | Default `"moderate"`; cast is `as typeof p.riskAppetite`. Fine. |
| ProfileStep | Advanced profile `<details>` toggle | ProfileStep.tsx:509 | Partial | Local `useState(false)`; the open/closed bit is re-initialised on every mount (tab switch remounts), so the disclosure collapses when the advisor returns to the step, even though the underlying data persists. |
| ProfileStep | Co-client toggle | ProfileStep.tsx:54 | Yes | `aria-pressed` correct; dispatches `updateProfile({ hasCoClient })`. |
| ProfileStep | Co-client name/employment/birthdate/income | ProfileStep.tsx:73-120 | Partial | Employment income `Number(e.target.value)` → NaN on empty string; see Bug M3. |
| ProfileStep | Dependents "+" | ProfileStep.tsx:129 | Yes | `addDependent` pushes default row. |
| ProfileStep | Dependent name / relation / birthdate inputs | ProfileStep.tsx:146-178 | Yes | |
| ProfileStep | Dependent "−" | ProfileStep.tsx:183 | Yes, but | No last-row guard; removing all rows hides the list until "+" is clicked again — acceptable since `dependents: []` is the initial state. |
| ProfileStep | Income sources "+" / "−" / inputs | ProfileStep.tsx:200-258 | Partial | Default state seeds one empty row; removing it leaves `incomeSources: []` which the UI handles. `Number("")` produces NaN — see M3. |
| ProfileStep | Assets "+" / "−" / inputs | ProfileStep.tsx:272-316 | Partial | Same NaN-on-empty issue on `amount`. |
| ProfileStep | Debts "+" / "−" / inputs | ProfileStep.tsx:329-403 | Partial | `interestRate` & `duration` both feed `Number(e.target.value)` — NaN + no unit normalisation; the debts array is never simulated but it is persisted on the client record. |
| ProfileStep | Employment income / Monthly expenses | ProfileStep.tsx:413-423 | Partial | NaN-on-empty. |
| ProfileStep | Cancel | ProfileStep.tsx:534 | Yes | `nav("/clients")`. |
| ProfileStep | **Proceed to Goals** | ProfileStep.tsx:539 | **No** | See BLOCKER B1 — zero validation. |
| GoalsStep | Add goal ("+") | GoalsStep.tsx:28 | Yes | |
| GoalsStep | Goal name / amount / year / payments / inflation | GoalsStep.tsx:55-120 | Partial | Amount/year/payments/inflation all `Number(e.target.value)` → NaN. Inflation is typed as a percent in the UI (placeholder "%" and Goal picker renders `${g.inflationRate}%`), but `GoalsStep` stores the raw number. |
| GoalsStep | Remove goal ("−") | GoalsStep.tsx:125 | Yes, but | No last-row guard. Removing the last row is allowed → Scenario step runs the empty-goals check but the step itself does not block. |
| GoalsStep | Cancel | GoalsStep.tsx:136 | Yes | Despite being labelled "Cancel" it is just a back-nav; no draft rollback. |
| GoalsStep | Save | GoalsStep.tsx:143 | Misleading | Button is labelled **Save** but only navigates to `/clients/new/scenario`; no persistence happens until Run Simulation. See M4. |
| ScenarioStep | Add New Scenario | ScenarioStep.tsx:495 | Yes | |
| ScenarioStep | Collapse / Expand | ScenarioStep.tsx:162 | Partial | `useState(false)` local to `ScenarioCard`; remounts on any re-render that changes the `key` (e.g. scenario rename), so collapse flips back open unexpectedly — the `key={\`${sc.name}-${i}\`}` on ScenarioCard makes the card remount on every name keystroke. See M5. |
| ScenarioStep | Remove scenario | ScenarioStep.tsx:169 | Yes, but | No last-row guard. If you remove the only scenario, the Run Simulation CTA toasts "Add at least one scenario", but `addScenario` uses `scenarios.length + 1` for the name; after removing "Scenario 1" and adding, you get "Scenario 1" again, which is fine. |
| ScenarioStep | Duplicate scenario | — | **Missing** | See BLOCKER B2 — UX lead flagged correctly. |
| ScenarioStep | Scenario name | ScenarioStep.tsx:186 | Partial | See M5 (remounts card on every keystroke). |
| ScenarioStep | Model select | ScenarioStep.tsx:197 | Partial | Options are `balanced/aggressive/conservative` but backend never reads this value — it only reads `profile.riskAppetite`. See M6. |
| ScenarioStep | Goal picker Choose/Close | ScenarioStep.tsx:215 | Yes | Toggles a local pickerOpen. |
| ScenarioStep | Goal picker row checkboxes | ScenarioStep.tsx:104 | Yes | Writes to local `setLocal` state only. |
| ScenarioStep | Goal picker Cancel | ScenarioStep.tsx:128 | **Partial** | Closes the picker but does **not** reset `local` — reopening the picker shows the mid-edit selection, not the saved one. See M7. |
| ScenarioStep | Goal picker Select | ScenarioStep.tsx:131 | Yes | `onSelect(local); onClose()`. |
| ScenarioStep | Investments "+" / "−" / amount / year | ScenarioStep.tsx:244-259 | Partial | `value={(it[key] as number) \|\| ""}` means year 0 renders as empty. NaN-on-empty on both fields. |
| ScenarioStep | Monthly Investments "+" / "−" / amount / annualIncrease | ScenarioStep.tsx:261-281 | **Broken for multi-row** | See BLOCKER B3 — only the first row's `annualIncrease` is ever sent to the simulator; the sum of monthly amounts IS used, but only `[0]?.annualIncrease / 100` is passed. |
| ScenarioStep | Loans "+" / "−" / inputs | ScenarioStep.tsx:283-301 | Partial | Loans are persisted but never fed to the simulation engine. NaN-on-empty. |
| ScenarioStep | Save for later | ScenarioStep.tsx:508 | Misleading | Label says "Save for later" but handler only `nav("/clients/new/goals")` — no persistence, no draft save. See M4. |
| ScenarioStep | **Run Simulation** | ScenarioStep.tsx:515 | Partial | Races on double-click (see BLOCKER B4 / Bug M1). |

## Bugs (sorted by severity)

### BLOCKER B1: "Proceed to Goals" submits the wizard with empty / invalid required fields

- File: `frontend/src/pages/NewClient/ProfileStep.tsx:539-546`
- Repro: open `/clients/new/profile`, do not fill anything, click **Proceed to Goals**.
- Expected: the CTA should block advancement and surface field-level errors. All six fields are marked `required` in the UI with a red asterisk.
- Actual: the handler is `onClick={() => nav("/clients/new/goals")}` — no read of `p`, no form, no `type="submit"`, no `disabled` bind. The only validation in the whole flow lives in `ScenarioStep.runAll()` at the very end, and it only checks `fullName.trim()` and `email` truthiness (so whitespace-trimmed empty and an obviously-bad email like `x` both pass).
- Fix sketch: compute `const isValid = p.fullName.trim() && /^\S+@\S+\.\S+$/.test(p.email) && p.birthdate && p.phone && p.employmentStatus && p.riskAppetite;` and `disabled={!isValid}` on the CTA, or surface inline errors on click.

### BLOCKER B2: Duplicate Scenario button does not exist

- File: `frontend/src/pages/NewClient/ScenarioStep.tsx` (ScenarioCard header, lines 157-177).
- Repro: open `/clients/new/scenario`, inspect the scenario card header; there are only Collapse and Remove controls.
- Expected: the QA brief (and prior UX-lead flag) references a Duplicate affordance to let advisors clone a scenario and tweak.
- Actual: no Duplicate button is rendered and no handler exists in the slice. A `duplicateScenario` reducer would also have to be added.
- Fix sketch: add `duplicateScenario(state, { index })` in `draftSlice.ts` (deep-copy the scenario, append with ` (copy)` suffix), render a "Duplicate" button in the card header.

### BLOCKER B3: Inconsistent rate normalisation between persistence and simulation

- Files:
  - `ScenarioStep.tsx:42` — `const annualIncrease = (s.monthlyInvestments[0]?.annualIncrease ?? 0) / 100;`
  - `ScenarioStep.tsx:48` — `const rate = (g.inflationRate ?? 0) / 100;`
  - `ScenarioStep.tsx:415,424,430` — persistence path uses `toDecimalRate()` which only divides by 100 when `|v| > 1`.
- Repro:
  1. Advisor types `0.05` into Goal Inflation (treating it as a decimal, as the backend schema expects).
  2. Run Simulation.
- Expected: the same number flows to both `POST /api/clients` and `POST /api/simulate` under the same interpretation.
- Actual:
  - Saved to the client row as `0.05` (toDecimalRate passes it through, `|0.05| ≤ 1`).
  - Sent to the simulator as `0.0005` (divided by 100 unconditionally).
  - The inverse happens if the advisor types `5`: persisted as `0.05` (smart), simulated as `0.05` (also happens to be right, but by coincidence).
- Impact: `goal_target_amount` and `annual_increase_pct` are mis-scaled in simulation for the "decimal-literate" advisor; the report will under-inflate goals by 100x. Backend bounds (`[-1, 1]`) mean the 422 risk that `toDecimalRate` was written to solve is still present in the simulate path if the advisor types e.g. `120` (becomes `1.2` via toDecimalRate for persistence, but `1.2` for simulate — wait no, simulate uses unconditional /100 so `1.2`; simulate path sends `1.2` into `annual_increase_pct` which is bounded `[-1,1]` → 422).
- Fix sketch: delete the inline `/100` math in `buildScenarioRequest` and use `toDecimalRate()` consistently; OR forbid mixed units in the UI and force a single canonical unit with a suffix (`%` vs decimal).

### MAJOR M1: Run Simulation double-click races two client creations

- File: `frontend/src/pages/NewClient/ScenarioStep.tsx:515` and `runAll()` at 390-487.
- Repro: slow network (or any latency > the click interval); double-click **Run Simulation**.
- Expected: exactly one `POST /api/clients`.
- Actual: no disabled state, no in-flight guard. Both clicks hit `runAll`; neither can observe the other's thunk pending. Both see `draftClientId == null` and dispatch `createClient`. Result: two clients created, then `setClientId(createRes.payload.id)` wins a last-write race.
- Fix sketch: read `simulation.status === "loading"` from the store (or track a local `submitting` flag) and `disabled` the button; OR guard the function entry with a ref.

### MAJOR M2: Only first monthly investment's annualIncrease is sent to simulator

- File: `ScenarioStep.tsx:42` — `s.monthlyInvestments[0]?.annualIncrease ?? 0`.
- Repro: add two Monthly Investments rows with different annualIncrease, run the simulation.
- Expected: either the UI surfaces that only one rate is supported, or the payload is computed as a weighted average.
- Actual: the sum of `amount` is used but the rate is whatever row 0 has; rows 2…N are silent data loss.
- Fix sketch: either collapse monthly investments to a single row in the UI (matching the backend's single-rate contract), or compute an amount-weighted mean of `annualIncrease` across all rows.

### MAJOR M3: `Number(e.target.value)` on cleared numeric inputs produces NaN, which propagates to the payload

- Files (non-exhaustive): ProfileStep.tsx:115, 232, 247, 302, 360, 375, 390, 414, 422; GoalsStep.tsx:69, 83, 99, 117; ScenarioStep.tsx:356.
- Repro: focus any numeric input, select-all, Backspace. Redux state now has `NaN` for that field.
- Expected: empty input → `0` or `null`, not `NaN`.
- Actual: `Number("")` is 0 (that's fine), but `Number("-")` (mid-edit negative), `Number("1.")` (mid-edit decimal), or `Number("abc")` are all `NaN`. `NaN` survives through Redux, JSON-serialises as `null`, and then the backend rejects with 422 (fields like `interest_rate` are `ge=0.0`).
- Fix sketch: `const n = e.target.value === "" ? 0 : Number(e.target.value); if (Number.isFinite(n)) dispatch(...);`.

### MAJOR M4: "Save" / "Save for later" do not save

- Files: GoalsStep.tsx:143 (`Save` → navigates forward), ScenarioStep.tsx:508 (`Save for later` → navigates back).
- Repro: click either button and then reload the page.
- Expected: either persist the draft (localStorage or backend draft) or rename the buttons.
- Actual: neither dispatches any persistence; the draft lives in memory-only Redux. "Save for later" in particular is a lie — there is nothing to come back to.
- Fix sketch: hydrate the draft slice from localStorage on mount, or rename to "Back" / "Continue".

### MAJOR M5: ScenarioCard remounts on every scenario-name keystroke, dropping transient UI state

- File: `ScenarioStep.tsx:503` — `key={\`${sc.name}-${i}\`}`.
- Repro: open a scenario card; click Collapse; now edit the Scenario Name. The card instantly expands again.
- Expected: typing in the name field must not remount the card (and therefore must not reset Collapse / pickerOpen / local picker state).
- Actual: the React `key` is derived from a value that changes on every keystroke → full remount; `useState(false)` for `collapsed` and `pickerOpen` resets; any in-progress Goal Picker edits are nuked.
- Fix sketch: use a stable id in `addScenario` (`crypto.randomUUID()` into `Scenario.id`) and key on that.

### MAJOR M6: Scenario Model dropdown has no effect on the simulation

- File: `ScenarioStep.tsx:197` (select) and `buildScenarioRequest` (34-67, no reference to `s.model`).
- Repro: set one scenario to "Aggressive" and another to "Conservative", both with identical inputs, and run.
- Expected: the model choice should influence `risk_tolerance` or an analogous backend parameter.
- Actual: `buildScenarioRequest` passes only `profile.riskAppetite` as `risk_tolerance`. The per-scenario model is stored and persisted but never sent to `/api/simulate`. Advisors will reasonably expect it to.
- Fix sketch: either map `s.model` → `risk_tolerance` (aggressive → high, conservative → low) and override the profile setting, or remove the dropdown until it is wired.

### MAJOR M7: Goal Picker "Cancel" does not discard mid-edit state

- File: `ScenarioStep.tsx:82` (`useState(selected)` is initialised once on open; the prop changes on reopen do not reset), `ScenarioStep.tsx:128` (Cancel calls `onClose()` only).
- Repro: open picker, toggle some checkboxes, click Cancel, reopen.
- Expected: reopening shows the last saved selection.
- Actual: `local` is kept across cancellations because `GoalPicker` remains mounted (it early-returns on `!open` but the state persists until parent unmounts or `open` prop driven by `pickerOpen` re-mounts it — which it does not, because of how it's rendered). Users perceive Cancel as "keep my edits", which silently diverges from saved.
- Fix sketch: in Cancel also call `setLocal(selected)` before `onClose`, OR key the picker on `open`.

### MAJOR M8: Wizard tabs let the advisor skip required steps

- File: `WizardTabs.tsx:37`.
- Repro: go directly to `/clients/new/scenario` from the tab strip without visiting Profile or Goals.
- Expected: forward navigation should be blocked until the prior step is at least partially valid; otherwise the user lands on Scenario and the `runAll` guards fire error toasts that do not point back to the right tab.
- Actual: tabs are unconditional NavLinks. The `runAll` guard *does* redirect to Profile when name/email are empty, but Scenario can still be edited unusefully first.
- Fix sketch: disable tabs (or render them non-clickable) until the preceding step passes a minimal gate.

### MINOR m1: `addScenario` name generator collides after deletes

- File: `draftSlice.ts:168` — `name: \`Scenario ${state.scenarios.length + 1}\``.
- Repro: start with `["Scenario 1"]`, add to get `["Scenario 1", "Scenario 2"]`, remove "Scenario 1", add — new one is `"Scenario 2"`, now the list has two "Scenario 2" rows. Both get POSTed with the same name and backend dedupe in `runScenarioBatch` collapses them into one HTTP call (the JSON-stringified key matches too if inputs match), so the report shows one card where advisor expected two.
- Fix sketch: use `Math.max(...scenarios.map(s => numFromName(s.name))) + 1` or a UUID + display counter.

### MINOR m2: Scenario name can be blank; used as `key` in results

- File: `simulationSlice.ts:60` / `ScenarioStep.tsx:417`.
- Fixed-name scenarios start as "Scenario 1" but are user-editable; an empty name flows to `ScenarioResult.name` and the report uses it as a card title / key.
- Fix sketch: require a non-empty trimmed name or fall back to `Scenario ${i + 1}` at render.

### MINOR m3: Year inputs use `value={n || ""}` so year 0 renders as empty

- File: ScenarioStep.tsx:354 (GroupList), GoalsStep.tsx:80.
- Typing `0` in a year input silently shows empty; typing `2` shows "2" briefly and is a valid year. Not fatal but confusing.
- Fix sketch: `value={Number.isFinite(v) ? v : ""}`.

### MINOR m4: Cancel-on-ProfileStep nav to `/clients` discards the entire draft with no confirmation

- File: ProfileStep.tsx:534.
- Fix sketch: confirm on Cancel if any draft field is non-default.

### MINOR m5: Dependent relation dropdown only lists son/daughter

- File: ProfileStep.tsx:155-167.
- No parent/spouse/other options; hard-codes gendered labels which will not translate cleanly. (Arabic translations exist.)

### MINOR m6: Advanced profile default-state empty rows get persisted even when untouched

- File: draftSlice.ts:65-67 — `incomeSources`, `assets`, and `debts` are seeded with one empty object each. These flow into the persisted client record as `{ name: "", amount: 0 }` rows regardless of whether the advisor opened the Advanced disclosure.
- Fix sketch: initialise as `[]`; only seed a blank row when the user clicks "+".

## Things I could not prove without product edits

- Whether the actual network traffic shows exactly one `POST /api/clients` on a normal (single-click) run — the code path is correct for a single click. Only the double-click race (M1) is provable by static read; confirming network behaviour end-to-end needs a running server and the test account `mourad@syntheia.io`, which is out of this read-only scope.
- Whether the backend 422s on the mis-scaled `annual_increase_pct` from BLOCKER B3 when the advisor types a large decimal (e.g. `120` → `1.2`). The schema bound is `[-1.0, 1.0]`, so the math says yes; empirical confirmation would require running the simulation.
- Whether tabbing order (Tab / Shift-Tab / Enter) through all inputs is sensible — not auditable statically across every field layout; recommend a Playwright keyboard sweep.

## File written

`docs/bugs/wizard.md`
