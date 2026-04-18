# Bugs — Clients list & Client summary

QA sweep of `ClientsList`, `ClientSummary`, saved-simulations CRUD, and the
Redux/Api surfaces behind them. Severity legend:

- **P0** broken contract / data loss / dead-end UX
- **P1** wrong result or visibly confusing, but not blocking
- **P2** polish / i18n / affordance gaps

Scope files:

- `frontend/src/pages/ClientsList.tsx`
- `frontend/src/pages/ClientSummary.tsx`
- `frontend/src/store/slices/clientsSlice.ts`
- `frontend/src/api/client.ts`

---

## BUG-CL-01 — "Modify" button on ClientSummary does not edit the current client (P0)

**Where:** `ClientSummary.tsx:293–301`

```tsx
<button … onClick={() => nav("/clients/new/profile")}>
  {t("client.modify")}
</button>
```

The only edit affordance on the client summary routes the user into the
**new-client wizard** (`/clients/new/profile`). Nothing about the current
`:id` is passed — the wizard starts blank and, on submit, will CREATE a
second client record. No `PATCH /api/clients/{id}` is ever fired from this
page.

The API layer does expose `api.updateClient` and the slice exposes
`updateClient` thunk (`clientsSlice.ts:56–68`), but no component wires
them up.

**Impact:** Edit is impossible from the UI. A user clicking "Modify"
silently duplicates data or, worse, overwrites the profile draft in
localStorage if the wizard stores one.

**Repro:** navigate to `/clients/<uuid>`, click "Modify" → lands on an
empty profile form, breadcrumb / header does not show the target client.

---

## BUG-CL-02 — Non-existent client id dead-ends on "Loading…" forever (P0)

**Where:** `ClientSummary.tsx:156–158, 268–278` + `clientsSlice.ts:89–100`

Direct navigation to `/clients/<bogus-uuid>` dispatches `fetchClient(id)`.
The slice's `extraReducers` only handles `fetchClient.fulfilled`. There is
**no `.pending` / `.rejected` handler**, so a 404 response is swallowed:
`status` stays `idle`, no error is written. `byId[id]` never fills →
`client` stays `undefined` → the component renders
`t("common.loading")` indefinitely.

There is also no 404 / "client not found" UI state in `ClientSummary`.

**Impact:** Permalinks to deleted clients, typo'd URLs, and cross-advisor
shares all dead-end on a spinner message with no recovery path.

---

## BUG-CL-03 — Saved-simulations list fires N parallel detail fetches on every mount (P1)

**Where:** `ClientSummary.tsx:160–215`

The list endpoint intentionally omits the big `request` / `response`
blobs (see comment on `SavedSimulationListItem`, `client.ts:223–229`),
yet `ClientSummary` calls `api.getSimulation(item.id)` for **every** row
just to surface two scalar fields: `probability_of_goal` and
`attainability`. For a client with 20 saved simulations that's 1 list
request + 20 detail requests on every mount, and the same waterfall
repeats after every delete (see BUG-CL-04).

The fix is either (a) include those two fields on the list endpoint,
or (b) lazy-fetch detail on hover / row click. As written, the list-only
optimisation in the API is defeated.

---

## BUG-CL-04 — Delete saved simulation re-runs the entire list+detail waterfall (P1)

**Where:** `ClientSummary.tsx:226–261`

After `api.deleteSimulation(row.id)` succeeds, the code re-lists and then
re-fires the per-row `getSimulation` loop — same N+1 as BUG-CL-03. A
cheaper fix is to splice the deleted id out of `savedRows` locally; the
state is already authoritative client-side.

Also the refetch block is a near-verbatim copy of the effect body
(~50 lines duplicated); any future change to detail handling has to be
kept in sync in two places.

---

## BUG-CL-05 — "Created at" column never localises, breaks Arabic locale (P1)

**Where:** `ClientSummary.tsx:43–46, 547`

```ts
function fmtDate(iso: string): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}
```

Also `ClientsList.tsx:7–11`:

```ts
return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
```

Both sites emit a raw ISO `YYYY-MM-DD`. In Arabic locale we should render
localised digits and month order via `Intl.DateTimeFormat("ar-EG")`. The
spec explicitly calls this out ("does the saved-simulations table's
'Created at' render a localised date?"). Today: **no**.

`toISOString()` also forces UTC, which silently shifts the displayed day
for users east of the dateline — not an Egypt problem, but wrong.

---

## BUG-CL-06 — Saved-simulation rows have no click affordance and no action (P1)

**Where:** `ClientSummary.tsx:536–573`

Each row is a `<div>` with name, date, probability, pill, and Delete.
Clicking the name / probability area does nothing — there is no way to
open the saved simulation from this page. There is also no "View"
button, no hover cue, no cursor-pointer styling. Users following the
metaphor of ClientsList (where the row is the link) will click and
nothing will happen.

Either wire the row to `SimulationReport` / a saved-sim viewer, or make
it visually unambiguous that rows are read-only cards.

---

## BUG-CL-07 — No UI for renaming a saved simulation; PATCH is not exposed (P1)

**Where:** `api/client.ts:88–111`, `ClientSummary.tsx`

The API layer exposes `createSimulation`, `listSimulations`,
`getSimulation`, `deleteSimulation` — no `updateSimulation`. The UI has
no rename control. Flagged as **missing feature** per the brief, not a
regression, but worth tracking: advisors will inevitably want to rename
"Untitled 3" after the fact.

---

## BUG-CL-08 — Pagination has no manual page input; stale `page` survives filter shrink (P1)

**Where:** `ClientsList.tsx:160–188`, `47–56`

The spec describes "page input accepts manual entry, invalid entry
clamps" — the component renders only a static `{page} / {pages}` span
between prev/next buttons. No input, no jump-to-page.

Separately, there is no guard against `page > pages`: on change of `q`,
page is reset to 1 (good), but on any upstream list refresh that shrinks
`filtered`, `page` is left stale. `slice(…).slice((page-1)*9, page*9)`
returns an empty array and the "Showing 19–18 of 5" readout goes
negative. Clamp `page` with `Math.min(page, pages)` in render.

---

## BUG-CL-09 — Search filter crashes if a client has `email == null` (P1)

**Where:** `ClientsList.tsx:47–52`

```ts
return clients.filter(
  (c) => c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle)
);
```

`ClientRecord.email` is typed as `string` but backend records created
via the quick-add path can omit it, and `c.name` itself is not defended.
If either is `null`/`undefined`, `.toLowerCase()` throws and the whole
page unmounts into a blank screen (no error boundary on this route).

Guard with `(c.email ?? "").toLowerCase()` — or narrow the type at the
API boundary.

---

## BUG-CL-10 — `initials()` breaks for Arabic / emoji / surrogate-pair names (P2)

**Where:** `ClientsList.tsx:13–18`

- `parts[0].slice(0, 2)` slices by UTF-16 code units, so a single
  astral-plane codepoint (emoji name, some extended Arabic ligatures)
  yields a lone surrogate → `�`.
- `parts[0][0]` + `parts[parts.length-1][0]` uses the same indexing;
  for compound Arabic names the "last initial" can be a non-letter
  combining mark.
- `.toUpperCase()` is a no-op on Arabic, but we still paint the uppercase
  pipeline which obscures bugs from tests that assume the display is
  cased.

Safer: split graphemes (`Intl.Segmenter("und", { granularity: "grapheme" })`)
and pick the first of the first + first of the last.

---

## BUG-CL-11 — ClientsList shows stale list behind error banner during refetch (P2)

**Where:** `ClientsList.tsx:104–121`

When the list has already been populated and a subsequent `fetchClients`
fails, the error banner is prepended *above* the previously-rendered
list. The user sees "Failed to load clients" together with the 9 rows
they already had — these may now be stale / deleted server-side. There's
no "stale data" indication and no retry button.

Minimum fix: add a retry button to the banner and label the list below
as "(may be out of date)". Or blow the list away on refetch failure —
but that's worse UX.

---

## BUG-CL-12 — `client.years` has no singular form (P2)

**Where:** `i18n/en.ts:157`, `i18n/ar.ts:201`, used at
`ClientSummary.tsx:473`

```
"client.years": "{n} years"
```

A 1-year loan renders "1 years". Arabic plural handling is worse:
`"{n} سنوات"` is the plural form regardless of `n` (Arabic has six plural
categories). Needs ICU-style plural selection or at least a
`one / other` branch.

---

## BUG-CL-13 — Dependent birthdate rendered as raw ISO (P2)

**Where:** `ClientSummary.tsx:431`

```tsx
{d.birthdate ? ` · ${d.birthdate}` : ""}
```

The string is whatever the backend stored (commonly `1990-03-21T00:00:00`
full timestamp). No formatting, no locale. Use the same
`Intl.DateTimeFormat` helper that should exist after BUG-CL-05.

---

## BUG-CL-14 — Saved-sim detail-fetch failure is indistinguishable from "no data" (P2)

**Where:** `ClientSummary.tsx:555–563`

If `detailStatus === "error"` the row silently shows `—` for probability
and `—` for the pill. There is no tooltip, no retry, no log surfaced to
the UI. Advisors cannot tell "this sim has no probability" from "the
detail endpoint 500'd". Add an explicit error pill or a retry affordance
on that row.

---

## BUG-CL-15 — "Add New" CTA is duplicated on empty state with no explicit empty-state CTA (P2)

**Where:** `ClientsList.tsx:69–76, 117–121`

When the list is empty, the page shows:

- Header subtitle: "No clients yet."
- Top-right button: "Add New"
- Empty-state card: "No clients yet. Add your first one." (plain text, no
  button)

The empty-state card should itself contain the primary action. Today the
new user's eye lands on the bottom card and has to hunt back to the
top-right for the CTA — weak affordance. Inline a "Add your first
client" button inside the empty-state card.
