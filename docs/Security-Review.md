# GidiReads — Security Review

**Date:** 2026-11-01
**Scope:** Production Supabase project `mbikuyuhcttkcqpgiihr` + the frontend in this repository.
**Method:** Live probing of the production API with only the public (anon) publishable key, plus a static review of the frontend and the SQL migrations. Findings are labelled **[PROVEN — live]**, **[INTENDED — SQL]**, or **[CODE]** so it is clear what was observed versus what was only read from a file.

> **Publishable key note:** The frontend ships `sb_publishable_...` in `supabaseClient.js`. This is by design and is safe to expose — it is the *anon* role. Every finding below is what that public key alone can already do.

---

## Overall status

The app is **functional but not hardened for production.** There is no evidence of secrets committed to the repo, and the auth flows (login, password reset, signup) are structurally sound. However, **Row Level Security on the production database is not enforcing the restrictions the project's own hardening script specifies**, which exposes per-user economic and private data to anonymous visitors. That is the one issue to fix before treating production as safe.

| Area | Verdict |
|---|---|
| Secrets in code | ✅ Clean — no `service_role`/secret keys found |
| Auth flow logic | ✅ Sound (no open redirect; password rules enforced) |
| XSS | ⚠️ Large surface (257 `innerHTML` sinks), partially mitigated by escape helpers |
| Security headers | ⚠️ Missing (no CSP / HSTS / X-Frame-Options) |
| **Database RLS (production)** | 🔴 **Not enforced — private data readable anonymously** |
| Rate limiting | ⚠️ None client-side (relies on Supabase defaults) |

---

## 🔴 Critical — Production RLS is not enforcing the intended restrictions

**[PROVEN — live]** With only the public anon key, an anonymous (signed-out) visitor can read:

- **Per-user economic state** — `echo_credits` (wallet balance) and `role` for every user:
  ```
  GET /rest/v1/profiles?select=username,role,echo_credits
  → 200  [{"username":"...","role":"user","echo_credits":0}, ...]
  ```
- **The `echoes` table** (spending/transaction records) — `200` with rows returned.
- **The `notifications` table** — `200` (empty in sample, but the table is readable, i.e. not blocked).

`username`, `display_name`, `bio`, and `avatar_url` being public is **expected** (profiles are meant to be public). `role`, `echo_credits`, `echoes`, and `notifications` are **not** public-facing data.

**Why this happened — [INTENDED — SQL]:** The hardening script `docs/PHASE-1-RLS-HARDENING-APPLIED.sql` opens with two explicit warnings:

```sql
-- APPLIED to Padres development project only: uyrsljueizptkgeqrawu
-- Do not apply to production without a separate schema/policy review.
```

That script is what revokes broad access and adds `profiles_update_self`, `notifications_read_self`, `echoes_read_self`, etc. **It was applied to the *dev* project only, never to production.** Production is therefore running without those restrictions. This matches the observation that the two RPC migrations (`gidireads_email_exists`, `gidireads_delete_account`) are also absent from production — migrations here are applied by hand, and this hardening set was never applied to prod.

**Fix (before any public launch):**
1. Review `docs/PHASE-1-RLS-HARDENING-APPLIED.sql` against the current production schema (the warning asks for a separate review — do not paste blindly).
2. At minimum, stop anonymous read of `role` and `echo_credits`. Either drop the `GRANT SELECT` on those columns to `anon`, or move them behind a view / a `SECURITY DEFINER` RPC that only returns the caller's own values.
3. Enable RLS + a self-only policy on `notifications` and `echoes` in production.

> **Caveat on the write test:** An anonymous `PATCH /rest/v1/profiles?id=eq.<nonexistent-uuid>` returned `204`. This is **ambiguous** and not proof of a write vulnerability — PostgREST returns `204` for an update that matches zero rows even when RLS blocks everything. It was tested against a deliberately non-existent ID, so no data was touched. A definitive write test requires updating a **real** row, which was intentionally **not** attempted. Treat write-access as *unconfirmed*, not as *broken*.

---

## 🟠 High — Missing security headers

**[CODE]** `vercel.json` sets only `Cache-Control`, `Content-Type`, and `Service-Worker-Allowed`. There is **no** `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, or `X-Content-Type-Options`.

Impact: no CSP means the XSS surface below is unmitigated by the browser; no HSTS means initial requests can be downgraded; no frame protection leaves clickjacking open.

**Fix:** add headers in `vercel.json`. A CSP is the highest-value one here given the heavy `innerHTML` usage.

---

## 🟠 High — Large XSS surface (257 `innerHTML` sinks)

**[CODE]** The codebase uses `innerHTML` in 36 JS files, ~257 times, frequently interpolating data via template literals (e.g. `el.innerHTML = \`...${userContent}...\``).

**Partially mitigated:** there are ~22 `esc()`/`escapeHtml()`/`escapeAttr()` helpers used at ~183 call sites — e.g. `app.js` correctly wraps values (`${escapeHtml(x.title)}`, `escapeAttr(profile.avatar_url)`). So escaping is a real, established practice here.

**Risk:** coverage is not universal. Any single missed escape on user-generated content (usernames, bios, comment text, story/chapter titles) is a stored-XSS vector, and without a CSP there is no second line of defence. This is the kind of issue that is fine until one unescaped field slips through.

**Fix:** (1) add a CSP now (cheap, broad protection); (2) audit the `innerHTML` sites that interpolate user-generated content and confirm each is escaped; (3) prefer `textContent` for pure-text sinks.

---

## 🟡 Medium — Account-enumeration surface (deliberate, pending decision)

**[CODE]** The planned `gidireads_email_exists` RPC (in `supabase/migrations/20261031_email_availability_check.sql`) lets a signed-out visitor check whether any email is registered. Username availability is already public by design, so this is consistent — but it does confirm email registration to anonymous callers.

**Status:** not yet deployed (404 on production), so it is currently inert. **Decide** before deploying it whether the UX benefit outweighs enumeration; consider rate-limiting or always returning an ambiguous response.

---

## 🟡 Medium — No client-side rate limiting on auth

**[CODE]** No throttle/cooldown logic exists in the frontend for login, signup, password-reset, or the OTP/verification steps. Protection relies entirely on Supabase's built-in rate limits (which do exist, e.g. for `signInWithPassword` and email sending, but are not visible/configured from this repo). Low severity on its own, but relevant for brute-force and email-bombing via the reset/verification endpoints.

---

## ✅ What is already good

- **No secrets committed.** No `service_role` keys, no JWT secrets, no `.env` files in the repo. `supabaseClient.js` carries only the publishable key and documents "Never place a service_role/secret key in this browser file."
- **No open redirect.** The post-login `returnTo` is validated with a strict allow-list regex (`/^[\w.\-]+(\?[^#]*)?(#.*)?$/`) that requires a bare relative path — it rejects `//evil.com` and `http://...` targets. Falls back to `index.html`.
- **Password rules enforced** consistently (8+ chars on signup and reset).
- **Account deletion is designed safely** (when its RPC is deployed): `SECURITY DEFINER`, deletes only `auth.uid()`, granted to `authenticated` never `anon`, gated behind password + email-code confirmation in the UI.
- **Payment/order creation** is deliberately kept server-side (`20261023_disable_client_payment_order_creation.sql` — "restricted to trusted server-side service_role operations").
- **Public storage is intentional** where present (e.g. the badges bucket is documented as a public-read, admin-write bucket).

---

## Priority action list

1. **[Critical]** Apply RLS hardening to **production** (with the requested schema review) — at least stop anonymous reads of `role`, `echo_credits`, `echoes`, and `notifications`.
2. **[High]** Add a Content-Security-Policy (and HSTS, `X-Content-Type-Options`, `frame-ancestors`) in `vercel.json`.
3. **[High]** Audit the `innerHTML` sinks that render user-generated content for missing escapes.
4. **[Medium]** Decide on the email-enumeration tradeoff before deploying `gidireads_email_exists`.
5. **[Medium]** Confirm Supabase-side rate limits on auth/email endpoints, or add throttling.
6. **[Housekeeping]** Deploy the two pending RPC migrations (`20261031_email_availability_check.sql`, `20261101_account_deletion.sql`) only after items above are addressed.

---

## Testing notes / limitations

- All live probes used **only** the public anon key and were read-only, except one deliberate write probe against a **non-existent** row (see the caveat above). No real user data was modified or deleted during this review.
- RLS **write** enforcement was **not** definitively verified (would require mutating a real row). Read exposure **was** definitively verified.
- Auth **config** beyond the `/auth/v1/settings` public response (e.g. whether "Confirm email" is on) was not fully enumerated; the email-verification feature depends on that setting being enabled.
