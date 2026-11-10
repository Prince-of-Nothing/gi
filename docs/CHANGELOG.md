# GidiReads — Documentation

GidiReads is a static web app for web novels, fiction, and fantasy. Readers discover and read stories; authors write and publish them. It runs on plain HTML/CSS/JS (ES modules) with Supabase for auth, data, and storage, and is deployed on Vercel as a static site (no build step).

## Project layout

- **Site root** — all `.html`, `.js`, and `.css` files live at the repository root (this used to be nested under `GidiReads-FULL-site-3/`; it was flattened so Vercel can serve from the repo root).
- **`assets/`** — logos, icons, and static images.
- **`docs/`** — database hardening notes, verification results, and this changelog.
- **`supabase/`** — database migrations, including RPCs used by the frontend.
- **`email/`** — email templates.
- **`vercel.json`** — deploy configuration (static headers, `cleanUrls`/`trailingSlash` off).

## Environment

- The Supabase project URL and publishable key are selected in `supabaseClient.js`.
- **Production** is the default (including Acode Preview). **Padres development** is used only with the explicit `?env=dev` query parameter.
- Never place a `service_role`/secret key in client-side code.

## Changelog

### 2026-11-01 — Account deletion with password + email-code confirmation

**Added — self-service account deletion.** Users can now permanently delete their own account from *Account settings*. Because this is irreversible, it is gated behind a "Danger zone" panel and requires **two factors** before the delete runs.

- `supabase/migrations/20261101_account_deletion.sql` — new `SECURITY DEFINER` function `gidireads_delete_account()`. It deletes only the caller's own `auth.users` row (no parameter, so one user can never target another) and is a no-op for signed-out callers. Granted to `authenticated` only — never `anon`. Related data is removed by foreign-key cascades. **Must be run in Supabase to activate.**
- `account.html` — a red-bordered **Delete account** panel (shown only when signed in) plus a confirmation modal with a password field, a **Send verification code** button, and a 6-digit code field.
- `account.js` — the flow verifies **both** factors before deleting:
  1. **Password** — checked with `supabase.auth.signInWithPassword`.
  2. **Email code** — sent with `signInWithOtp` and confirmed with `verifyOtp`.
  Only after both succeed does it call the `gidireads_delete_account` RPC, sign out, and return to the homepage. Errors display inline in the modal.

### 2026-11-01 — Email verification by code + password reset minimum length

**Added — email verification (6-digit code).** After `signUp` creates an account (with email confirmation enabled), the signup flow now shows a verification screen instead of a passive "check your inbox" message. The user enters the 6-digit code emailed to them to finish.

- `auth.html` — new `#verifyFields` screen with a 6-digit code input (`inputmode="numeric"`, `autocomplete="one-time-code"` for mobile autofill), a **Resend code** button, and a **Verify** button.
- `auth.js`:
  - `showVerifyScreen(email)` renders the verification screen and tracks the pending email.
  - Submit handler gained a `mode === 'verify'` branch: validates the 6-digit code, calls `supabase.auth.verifyOtp({ email, token, type: 'signup' })`, uploads a pending avatar if present, clears pending state, and redirects.
  - **Resend code** → `supabase.auth.resend({ type: 'signup', email })`.
  - Auto-submits when the 6th digit is typed (with digit-only sanitization).
  - The switch button becomes **"Start over"** in verify mode (returns to step 1).

> **Supabase configuration required for the code to work.** `verifyOtp` with a 6-digit code only works if the **Confirm signup** email template sends a token (`{{ .Token }}`) rather than a confirmation link (`{{ .ConfirmationURL }}`). Update this under *Supabase Dashboard → Authentication → Emails → Confirm signup*. Until then, the emailed **confirmation link** still works as a fallback and lands on `auth.html?verified=1`.

**Changed — password reset minimum length.** Password reset now requires at least **8 characters**, matching signup (was 6).

- `reset-password.js` — validation is now `password.length < 8` ("Your password must be at least 8 characters.").
- `reset-password.html` — both the "New password" and "Confirm password" inputs use `minlength="8"`.

### 2026-11-01 — Repository restructuring

- Flattened the site: moved everything from `GidiReads-FULL-site-3/` up to the repository root so Vercel deploys from the root.
- Moved database hardening and verification documents from `phase1-database-and-reports/` into `docs/`.
- Removed build-note `.txt` files and redundant `.zip` archives from the repository.

### 2026-10-31 — Signup validation and failure handling

- **`auth.html`** — step-1 button reads **"Next"** (was "Choose your role"); flow is Next → roles → photo → Create account. Removed a stray `</div>` that let the step-3 block leak into login mode.
- **`auth.js`** — before allowing Next, `validateBasics` strips `+subaddress` from the email, applies a stricter RFC-style email check, verifies **username** availability against `profiles`, and verifies **email** availability via the `gidireads_email_exists` RPC (username and email run concurrently). The normalized email is written back to the field and used for `signUp`.
  - Detects a duplicate email both from Supabase's obfuscated `signUp` response (`identities.length === 0`) and the raw "already registered" error, showing *"Already registered with email. Log in."*
  - On any account-creation failure, the form returns to step 1 with an inline error instead of switching to the login form.
- **New migration** `supabase/migrations/20261031_email_availability_check.sql` — `SECURITY DEFINER` function `gidireads_email_exists` so the client can check email existence before submit. It must be run in Supabase to activate the email pre-check; until then `auth.js` skips it gracefully.
