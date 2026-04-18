# Marsa — UX Audit v2

Reviewer: Senior UX lead, April 2026. Mandate: red-team the v1 audit, walk
the app as an Egyptian advisor would, and decide what to kill before the
design-partner pilots start in May.

## Executive summary

- The report's moment of truth is not the donut. It is a single sentence:
  "You need EGP X/month to reach this goal at 80% confidence." Today we
  bury that answer — or omit it — and lead with four opaque donuts. Invert
  the page.
- The three-step wizard is not wrong, but the Profile step is. It collects
  nine fields we don't simulate against and bouncess advisors mid-meeting.
  Slice it to the six inputs that drive the engine; push the rest to a
  post-simulation "client dossier".
- The product is wearing a boardroom skin over a demo. Every screen has a
  cosmetic button with no handler (Overview, Print, ⋮, Modify) and a
  hard-coded © 2021 footer. That loses credibility in ten seconds.

## Assumptions challenged

1. **Prior:** Keep the 3-step wizard (Profile → Goals → Scenario).
   **My position:** Keep the 3 steps, but restructure Profile. 80% of the
   Profile inputs (dependents, debts, assets, income sources, monthly
   expenses) do not feed the engine. They are CRM data, not advice
   inputs. Move them behind a "Client dossier" progressive-disclosure
   panel so the wizard path is six required fields. **Evidence:** the
   only profile value read in `ScenarioStep.runAll` is
   `profile.riskAppetite`. The engine request (`SimulateRequest`) takes
   seven numeric fields; nine of the profile fields are write-only.

2. **Prior:** Per-scenario donut grid is the primary metaphor.
   **My position:** A single horizontal probability bar with a confidence
   interval and an explanatory sentence is more honest and more useful.
   Donuts hide magnitude (70% of a 2× median reads the same as 70% of a
   barely-grazing median) and read as precision theatre
   (`.toFixed(2)` = 49.83% implies sub-percent confidence we do not have:
   spec §4(c) caps SE at 0.5 pp). **Evidence:** 70% from N=10,000 has
   ±0.5 pp — nobody gains from the second decimal. The donut also
   crowds out the three things advisors actually ask: "what's my
   required monthly?", "what's the achievable year?", "what's the
   answer in real EGP?"

3. **Prior:** Sidebar is the nav shell.
   **My position:** Kill it for the report view. The sidebar has two
   destinations (Overview, Clients) and steals 230px from the page an
   advisor turns to a client. Keep the sidebar on list/CRM screens; on
   the report it is pure visual noise (decorative gradient curves, no
   nav utility). **Evidence:** `Sidebar.tsx` routes to `/overview`
   which redirects to `/clients`. It's a dead link visualised.

4. **Prior:** Scenarios are a discrete primitive (four cards, pick one).
   **My position:** Scenarios should become *sliders on one scenario*.
   The advisor's question is rarely "compare four plans" — it's "at
   these inputs, what's the answer, and if I move monthly-contribution,
   what happens?" Sliders on contribution, horizon, and risk-bucket, with
   the probability recomputing (debounced) on release, is closer to the
   real counseling workflow. Keep discrete scenarios as a "save this
   state" feature, not the default. **Evidence:** the backend engine
   runs in <800ms warm (spec §6); we can afford a re-run on slider
   release. The current "Duplicate Scenario" button proves the
   desire-path.

5. **Prior:** Recharts for the probability band.
   **My position:** Recharts is ~100KB gzipped and gives us a generic
   chart that still stacks wrong by default. A 60-line hand-drawn SVG
   band — P15/P50/P85 ribbon + goal line — renders honestly the first
   time, is smaller, and works in RTL without polyfills. Keep Recharts
   only if we ship a second chart. We do not. **Evidence:** the one
   chart we have has already shipped two stacking bugs (see previous
   `SimulationReport.tsx:219`).

6. **Prior:** Clients-first IA.
   **My position:** Defensible for now. Advisors do think clients-first
   in Egypt (they're CRM-style users, not quants). But promote
   "Simulations" to a peer of Clients in the nav once we have a
   simulation history per client. Don't invert yet.

7. **Prior:** Arabic is a "Phase 2 polish".
   **My position:** Arabic is table-stakes *now*. The i18n scaffold is
   in but half the copy is hardcoded English (`<div>Report</div>`,
   `Back to Scenarios`, `Save this simulation`, `Generate Report`,
   every wizard field label in Profile/Goals/Scenario, every Clients
   list header). Extract to `t()` before May pilots. **Evidence:** grep
   the tree — fewer than 20 keys exist; a real extraction is 150+.

## The moment of truth

**The one interaction an advisor will point to when they decide to pay:**

> The advisor enters IN / MC / H / goal / risk, clicks Run. The report
> opens on a single-line headline:
>
>   "At EGP 20,000/month, your client reaches a 6M EGP goal in 2028
>    with 42% confidence. To reach 80%, they'd need EGP 34,000/month
>    **or** extend the horizon to 2033."
>
> Below that, the probability band (P15/P50/P85 over time with the goal
> line overlaid) and the EGP-formatted table. Donut, attainability
> badge, disclosures — all secondary.

This is defensible because:

- It answers the client's question in one sentence, in real EGP.
- It pre-empts the advisor's next question (what if we saved more?)
  which is the whole reason the meeting exists.
- It maps to the engine's actual outputs: `probability_of_goal`,
  `projection.median[T]`, and an inversion we can compute client-side.
- It forces the advisor into a coaching posture, not a verdict posture.

The current report leads with "10,000 simulations run" and four donuts.
The advisor reads that as "the tool thinks my client's goal is 37%".
That is the wrong frame.

## What to kill

1. **Landing page investor-voice** (`Landing.tsx:42`).
   "Start your investment plan now / be one step ahead" targets
   end-investors. The CTA targets advisors. Pick one — advisors — and
   rewrite. Killed in this pass.
2. **Decorative header SVGs on every card/hero** (`Landing.tsx:13-33`,
   `SimulationReport.tsx:180-197`, `ClientSummary.tsx:75-86`). Thirty
   `<path>` nodes of opacity-0.5 ribbons, rendered three times per
   session. Nobody is reading these. Replace with a flat brand fill;
   save render and reviewer time.
3. **Cosmetic "Overview" and "Print" buttons** on the report
   (`SimulationReport.tsx:211-217`). Zero onClick. Worst kind of
   dishonesty — a fake affordance on a trust-dependent page. Kill
   Overview, wire Print to `window.print()`. Done in this pass.
4. **`⋮` ellipsis menu** on the Goals Achievement card
   (`SimulationReport.tsx:233`). No menu attached. Remove.
5. **Sort arrows on Clients list** (`ClientsList.tsx:100-109`). No
   click handlers; decoration. Either wire in client-side sort or remove.
6. **Ellipsis row action** on Clients list (`ClientsList.tsx:131`).
   Same problem.
7. **Hard-coded "© 2021" footer** (`AppShell.tsx:15`). Visible on every
   screen. Fixed in this pass.
8. **Client dashboard fake data** — hard-coded "530,000 net worth",
   "Nada Omar Ismail" co-client, three dependents for every real
   client (`ClientSummary.tsx:69-155`). This ships to a paying advisor
   and shows another advisor's wife. Rip it out; render empty states.
9. **"Base Scenario Simulation" promo card** on ScenarioStep
   (`ScenarioStep.tsx:63-86`). Vaporware marketing copy sitting above
   the actual work. The Run Simulation button inside it doesn't even
   wire to the real run.

## What to rebuild

### Report header — invert the hierarchy

Before:

```
+----------------------------------------------------+
| [purple hero with curves]                          |
|   Report                                           |
|   Client name                                      |
|   client@email                                     |
+----------------------------------------------------+
 [Simulation report 1]          [Overview] [Print]
 
 Goals Achievement Probability    [attainable]  ⋮
 · 10,000 simulations run for 1 scenario
 · Probability of funding all goals
 
 [donut] [donut] [donut] [donut]
```

After:

```
+----------------------------------------------------+
| Simulation report · Jane Public                    |
|                                                    |
|  At EGP 20,000/month, Jane reaches a               |
|  EGP 6,000,000 goal in 2028 with 42%               |
|  confidence.   [Out of reach]                      |
|                                                    |
|  To reach 80%, she would need                      |
|   • EGP 34,000/month, same horizon, or             |
|   • EGP 20,000/month, horizon 2033                 |
|                                                    |
|  [Present to client]  [Print]  [Save simulation]   |
+----------------------------------------------------+
 [probability band chart with goal line overlay]
 [table view toggle]
 [scenario-switcher pills, small]
 [disclosures, collapsed]
```

### Wizard Profile step — split into "required" and "dossier"

Before: one 400-line form asking dependents, debts, assets, monthly
expenses, co-client birthdate, employment income — none of which
reaches the engine.

After: one card with six required fields (name, birthdate, phone,
email, risk appetite, monthly contribution capacity). A collapsible
"Full dossier" panel below with the CRM data. Save button enabled on
the six required; dossier is save-later.

### DonutChart — honest precision

Before: `{p.toFixed(2)}%` (49.83%).

After: `~{Math.round(p)}%` with SE annotation below
(e.g., "± 0.5 pp, N=10k"). Applied in this pass.

### Sidebar — shrink

Before: 230px fixed, two destinations, 70px of decorative gradient.

After: On report view, collapse to a 60px icon rail (or hide entirely
in presentation mode). On list views, keep current behavior. The
AppShell gets a `variant="focus" | "standard"` prop. Not shipped in
this pass — deferred.

### Landing page — advisor-voice

Before: "Start your investment plan now / be one step ahead."

After: "Answer your client's next question in thirty seconds. /
Marsa turns your Monte Carlo into a conversation, in Arabic or
English." CTA: "Advisor sign-in". Shipped in this pass.

## What to add

1. **Required-monthly / achievable-year inversion.** Client-side.
   Given `probability_of_goal` and `projection.median`, compute the
   monthly contribution that would push P_goal to 80% (Newton-Raphson
   on a closed-form approximation, or a binary search firing one extra
   backend call). **Most important missing piece.**
2. **Present-to-client mode.** A toggle on the report that (a) hides
   Redux devtools / topbar / sidebar / disclosures into an accordion,
   (b) fixes typography to 18px min, (c) locks the locale to Arabic
   if the client side is Arabic-preferring. Turn the laptop, tap the
   toggle, have the conversation. **Ship before pilots.**
3. **Arabic client summary card.** A one-page MSA Arabic card the
   advisor prints and hands the client, auto-generated from the
   simulation (matches the strategy memo's 90-day LLM bet; stub with
   a template-based version now, LLM-ify later).
4. **Save-simulation-as-snapshot.** Today "Save this simulation" is
   cosmetic. An advisor needs to come back next quarter and say
   "here's what we agreed last meeting, here's where we are now".
   Requires backend.
5. **Feasibility banner on Goals step.** Compute a quick sanity check
   (total undiscounted contributions vs. inflated goal). Flag before
   Run Simulation. Already proposed in v1 audit; reiterated.
6. **Arabic-numeral toggle.** Some advisors present in Arabic script
   digits; some in Latin (client expectations differ). Locale-level
   toggle, not a per-number one.
7. **Keyboard shortcut: `R` to run, `P` to print, `ESC` to exit
   presentation mode.** Advisors keyboard-drive when they know the flow.
8. **Real footer.** Year, build hash, legal. Done in this pass.

## New information architecture

```
/                        Landing (advisor voice)
/login
/register
/clients                 Clients list (dossier-style)
/clients/:id             Client dossier (read-only summary + history)
/clients/:id/simulate    New simulation for existing client (skips wizard)
/clients/new             Three-step wizard
   /profile              6 required + expandable dossier
   /goals                unchanged
   /scenario             one scenario, sliders on contribution/horizon
/simulations/:id         Saved simulation (shareable within firm)
/simulations/:id/present Presentation mode (fullscreen, advisor-hidden)
/settings                Locale, firm/advisor license (FRA), billing
```

Two changes from today: (a) `/simulations/:id` becomes a first-class
route so advisors can link back to a point-in-time view; (b)
`/present` is a distinct page, not a modal, so advisors can open it on
a second display. Both defer to backend-side work (simulation
persistence). Today: tolerate the read-only/stub version.

## Top 10 changes ranked by impact × effort

| # | Title | Effort | Impact | Files | Implemented |
|---|---|---|---|---|---|
| 1 | Report moment-of-truth headline (required-monthly inversion) | M | transformative | `SimulationReport.tsx`, `utils/inversion.ts` (new), `i18n/{en,ar}.ts` | yes |
| 2 | Kill cosmetic Overview/Print/⋮ buttons; wire real Print | XS | medium | `SimulationReport.tsx` | yes |
| 3 | Landing page re-voice + kill decorative SVG noise | S | high | `Landing.tsx`, `i18n/{en,ar}.ts` | yes |
| 4 | DonutChart honest precision (~%, not to-two-decimals) | XS | medium | `DonutChart.tsx`, `tests-e2e/helpers.ts`, `SimulationReport.test.tsx` | yes |
| 5 | Fix attainability `.replace` → `.replaceAll`; dynamic footer year | XS | medium | `SimulationReport.tsx`, `AppShell.tsx` | yes |
| 6 | Presentation mode (fullscreen, hidden advisor chrome) | M | transformative | `SimulationReport.tsx` | partial (stub) |
| 7 | Profile step split into 6-required + dossier | M | high | `ProfileStep.tsx`, `draftSlice.ts` | no |
| 8 | Sliders replace discrete scenarios on ScenarioStep | L | transformative | `ScenarioStep.tsx`, `simulationSlice.ts` | no |
| 9 | Replace Recharts band with hand-drawn SVG (-100KB, honest render) | M | medium | `SimulationReport.tsx`, remove `recharts` | no |
| 10 | ClientSummary hard-coded data → real rendering + empty states | S | high | `ClientSummary.tsx` | no |

## Disclosures on this audit

Everything above is one senior UX reviewer's opinion with no tenant
research behind it. The previous v1 audit had the same caveat and it
still holds — we don't have N≥3 advisors observed on the tool. Treat
rankings as prior-to-pilot; re-rank after the first two design-partner
sessions. The "kill the donut" call specifically is the most
opinionated — if advisors tell us in sessions 1-3 that donuts are the
thing they screenshot for WhatsApp, reinstate them.
