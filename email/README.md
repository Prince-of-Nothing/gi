# GidiReads transactional email (Resend)

Files
- `template.ts`  – `renderEmail()` master template -> `{ html, text }`. All text is escaped; CTA links must be https.
- `send.ts`      – `sendEmail()` Resend API call (fetch, timeout, retry on 429/5xx, idempotency key, header-injection guard).
- `emails.ts`    – `sendVerificationEmail`, `sendPasswordResetEmail`, `sendContestUpdateEmail` (9 Holiday Hearts updates), `sendNotificationEmail`.
- `examples/next-route.ts` – protected Next.js route handler. Server-only.

Environment variables (server only, never in browser code)
- `RESEND_API_KEY`   from resend.com
- `EMAIL_FROM`       e.g. `GidiReads <no-reply@yourdomain.com>` (domain must be verified in Resend: SPF + DKIM)
- `SITE_URL`         production origin, no trailing slash. The logo is loaded from `${SITE_URL}/logo.png`
                     (the file `logo.png` is in the site root).
- `EMAIL_API_SECRET` only if you use the example route

Usage
```ts
import { sendContestUpdateEmail } from '@/email';
await sendContestUpdateEmail({ to, recipientName: 'Ada', update: 'entry_approved', entryTitle: 'The Cabin Between Us',
                               idempotencyKey: `contest-approved:${entryId}` });
```
Master template directly:
```ts
const { html, text } = renderEmail({ recipientName, emailHeading, messageBody, ctaText, ctaUrl, senderName });
```
Supabase Auth emails (sign-up confirmation, password reset)
- Easiest: Supabase Dashboard -> Authentication -> SMTP: host `smtp.resend.com`, port 465, user `resend`, password = your Resend API key.
- To use these exact templates for Auth emails, use Supabase's "Send Email" Auth Hook and call
  `sendVerificationEmail` / `sendPasswordResetEmail` from it.
