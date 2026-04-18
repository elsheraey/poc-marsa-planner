# Auth flow bug report

Scan date: 2026-04-18
Pages audited: Landing, Login, Register, AppShell nav, Logo, Toaster (auth-adjacent)

Services probed: backend on :8000, frontend on :5173 (both running).

## Summary

- 1 blocker
- 6 major
- 3 minor
- Total: 10 bugs

Playwright `auth.spec.ts` passes. The 7 failing e2e specs in the suite
(`attainability`, `clients` wizard, `currency`, `disclosure`, `stacking`) all
fail downstream of a successful register — i.e. in the new-client wizard /
report flow, not in auth. No pre-existing auth e2e is red.

## Bugs (sorted by severity)

### BLOCKER: Server-side `/auth/logout` is a no-op for the JWT — stolen/leaked tokens keep working after Sign out

- File: `backend/app/routers/auth.py:92` (logout) + `backend/app/deps.py:32`
  (`get_current_user` trusts any unexpired JWT)
- Repro:
  1. Log in through the UI. Copy the `marsa_access` cookie value.
  2. Click "Sign out". Cookie is cleared from the browser (`/api/auth/logout`
     returns 204 with `Max-Age=0`).
  3. From a separate shell:
     `curl -H "Cookie: marsa_access=<old-value>" http://127.0.0.1:8000/api/auth/me`
  4. Confirmed in the probe: status 200, full user payload returned.
- Expected: once logged out, the presented token should no longer authenticate
  anyone — either via a server-side revocation table (jti blacklist) or by
  binding the token to a rotating `token_version` column on `User`.
- Actual: logout only clears the client cookie. The JWT stays valid for its
  full `access_token_expire_minutes` TTL (currently 60m per the cookie
  `Max-Age=3600`). Any actor who captured the cookie (XSS, device hand-off,
  shared browser) retains a full session.
- Fix sketch: on logout, either (a) insert `jti` into a short-lived
  `revoked_tokens` table and check it in `decode_access_token`, or (b) bump
  `user.token_version`, embed the version in the JWT, and reject tokens whose
  version doesn't match. Option (b) is cheap and covers "sign out everywhere".

### MAJOR: Stale `auth.error` leaks between Login and Register

- File: `frontend/src/store/slices/authSlice.ts:65-109` +
  `frontend/src/pages/Login.tsx:117` + `frontend/src/pages/Register.tsx:156`
- Repro:
  1. Go to `/login`, submit wrong credentials → red "invalid credentials"
     banner appears (correct).
  2. Click the "Sign up" link (`data-testid=registerLink`) to go to
     `/register`.
  3. The `/register` page renders with the same "invalid credentials" banner
     inside `<div role="alert">` — even though the user has typed nothing.
- Confirmed by ephemeral probe script:
  `[3] On Register after failed Login, stale banner?: invalid credentials`
- Expected: error state is scoped per page. Navigating to a different auth
  page (or unmounting the current one) should clear `auth.error`.
- Actual: the slice already exports `clearError`, but nobody dispatches it.
  `Login` and `Register` both read `s.auth.error` directly, so the Register
  form shows a Login server error.
- Fix sketch: dispatch `clearError()` in `useEffect(..., [])` of both
  `Login.tsx` and `Register.tsx`, or clear `state.error` in the `.pending`
  reducer of the *opposite* thunk, or in a shared `authRoute` reducer on
  route change.

### MAJOR: Locale toggle is unreachable from `/login` and `/register`

- File: `frontend/src/pages/Login.tsx` + `frontend/src/pages/Register.tsx`
  (no header bar) vs. `frontend/src/components/AppShell.tsx:92-100`
- Repro: open `/login` as a first-time visitor. There is no `[data-testid=
  locale-toggle]` on the page — the only interactive header elements are the
  Logo (→ `/`) and the two input fields. An Arabic-speaking advisor landing
  directly on `/login` (e.g. via a password-manager deep link or a
  remembered URL) cannot switch to Arabic without visiting `/` first.
- Expected: a locale toggle on every unauthenticated page, matching the
  Landing header.
- Actual: Landing and the authenticated AppShell expose the toggle; the two
  unauth card pages do not. Arabic UX depends on `localStorage` already
  being `ar`.
- Fix sketch: extract the `<button data-testid="locale-toggle">` JSX into
  a tiny `<LocaleToggle />` component and render it in the card header of
  both Login and Register, or above the card.

### MAJOR: Server error messages are not localized — Arabic users see raw English strings in the error banner

- File: `frontend/src/store/slices/authSlice.ts:18-22,92,104` (passes
  `ApiError.message` through verbatim) + backend responses in
  `backend/app/routers/auth.py`
- Repro:
  1. Toggle locale to Arabic (on Landing).
  2. Go to `/register`. The page chrome is Arabic.
  3. Submit with an email that already exists.
  4. The banner renders English text `email already registered` inside a
     right-to-left Arabic card.
  5. Same for Login: `invalid credentials` (EN) inside an AR page.
- Confirmed by probe: banner text is literally `email already registered`
  and `invalid credentials` — verbatim `HTTPException.detail` strings from
  the backend.
- Expected: localized banners, e.g. map `err.code` → i18n key
  (`auth.error.conflict`, `auth.error.unauthorized`, `auth.error.server`,
  `auth.error.network`).
- Actual: `errMessage(e)` in `authSlice.ts` just returns `e.message`, so the
  English backend string is displayed directly.
- Fix sketch: in `authSlice`, switch on `ApiError.status`/`code` and
  `rejectWithValue(t("auth.error.conflict"))` etc. Add the keys in
  `i18n/en.ts` + `i18n/ar.ts`.

### MAJOR: Network failure renders untranslated `Failed to fetch`

- File: `frontend/src/api/client.ts:17-47` + `authSlice.ts:18-22`
- Repro: intercept `/api/auth/login` (e.g. route.abort or kill the
  backend), click Login. Banner shows literal `Failed to fetch`.
- Expected: "Couldn't reach the server — check your connection" in the
  active locale.
- Actual: the raw browser Fetch `TypeError("Failed to fetch")` message is
  surfaced. Not translatable, not helpful.
- Fix sketch: in `request()`, wrap the `fetch(...)` `catch` so that
  non-`ApiError` failures throw a `NetworkError` whose message is a stable
  i18n key. Then resolve it in the slice via `t(...)`.

### MAJOR: Login/Register submit button disables during `status === "loading"` but `status` is only cleared on success/failure of *that same* thunk — stale loading state across navigations

- File: `frontend/src/store/slices/authSlice.ts:82-104`
- Repro: easier to reason about than to reproduce deterministically — the
  slice never resets `status` to `idle` when the user navigates away from a
  submit that is still in-flight. If the user hits Login, then clicks the
  logo to go Home before the response lands, and then navigates back to
  `/login`, the submit button is rendered in the `Signing in...` state
  (disabled). Confirmed by reading the slice — only `login.fulfilled` and
  `login.rejected` reset `status`.
- Expected: `status` resets to `idle` on unmount, or `bootstrap`/route
  change, or whichever thunk fires first.
- Actual: `status` is sticky until the awaited thunk settles. Redux devtools
  shows `loading` for seconds after the user has left the page.
- Fix sketch: same `clearError` / `resetAuthUi` reducer dispatched on each
  auth page mount, resetting `status: "idle"` alongside `error: null`.

### MAJOR: Register duplicate-email 409 does not preserve form (all four fields intact, but no positive affordance to fix just the email)

- File: `frontend/src/pages/Register.tsx:40-48,156-163`
- Repro: submit a Register with an email that already exists → banner says
  "email already registered" (untranslated — see previous bug) but the email
  input has no `aria-invalid`, no inline error, and is not focused. Users
  have to re-read the banner and manually reach up to the email field.
- Expected: banner + `aria-invalid="true"` + red ring on the `#reg-email`
  input + focus returned to that input. This matches the field-validation
  pattern the same component uses for client-side errors (see the
  `errs.email` branch at lines 107-109).
- Actual: server-side 409 is treated opaquely; only the page-level banner
  reacts.
- Fix sketch: in `onSubmit`, when `register.rejected` returns
  `code === "conflict"`, set `errs.email = t("auth.error.email_taken")` and
  call `.focus()` on `reg-email`.

### MINOR: `fieldErrors` on Login/`errs` on Register are not cleared when the user fixes the field

- File: `frontend/src/pages/Login.tsx:36-42,80-89` +
  `frontend/src/pages/Register.tsx:30-38,76-106`
- Repro: leave email blank → submit → "Enter a valid email address" appears
  under the input. Now type a valid email. The error text stays until the
  next submit click. Likewise for the password-mismatch inline error.
- Expected: inline errors clear as soon as the field becomes valid (onBlur
  or onChange-driven).
- Actual: errors only recompute inside `validate()` on submit. Typing a
  valid email after a failed submit does not hide the error.
- Fix sketch: clear the specific error key inside each `onChange` handler,
  or switch to an `onBlur` validation pass.

### MINOR: No `autoFocus` on the first input of Login/Register

- File: `frontend/src/pages/Login.tsx:80-93` /
  `frontend/src/pages/Register.tsx:76-88`
- Repro: land on `/login`, press Enter. Nothing happens because the email
  input is not focused; tab-key is required first.
- Expected: first input is focused on mount.
- Actual: focus stays on `document.body`.
- Fix sketch: `autoFocus` on `#login-email` and `#reg-name`. (Accessibility
  note: use with care inside a modal, but these are full pages — safe.)

### MINOR: Landing header's "Open the portal" link and the primary CTA button duplicate the same target (`/login`), with differing control types

- File: `frontend/src/pages/Landing.tsx:34-39` (Link → /login) vs.
  `Landing.tsx:65-71` (button → `nav("/login")`)
- Repro: the header has `<Link to="/login">Open the portal</Link>` which
  navigates correctly; the hero uses `<button onClick={() => nav("/login")}>`
  with the same label. Both work, but the button forfeits browser niceties
  (right-click "Open in new tab", middle-click, Ctrl-click) that users
  expect from a nav CTA.
- Expected: the hero CTA should also be a `<Link>` styled as a button
  (`className="btn-primary"`) — same as the "Register" link next to it.
- Actual: the hero renders `<button>` — slightly worse UX, trivially fixed.
- Fix sketch: replace the `<button type="button" onClick={() =>
  nav("/login")}>` with `<Link to="/login" className="btn-primary">`.

---

## Investigation items (couldn't definitively classify without a product change)

- **Rate-limit UX on `/login` and `/register`**: the backend applies
  `slowapi` `rate_limit_login` to both endpoints (`routers/auth.py:47,75`)
  but the frontend does not special-case 429. If the limiter fires under
  real traffic, the banner will show whatever raw message slowapi emits
  (likely not translated and possibly a plain string, not the
  `{error: {code, message}}` envelope). Worth a follow-up probe.
- **Session TTL surface**: `AuthResponse.expires_at` is sent to the client
  but never read or surfaced; the UI has no "your session will expire in X
  minutes" behaviour and will simply 401 on the next request. Not a
  behavioural bug today, but a UX gap.
