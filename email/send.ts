import { env } from './env';

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  /** Defaults to env EMAIL_FROM, e.g. "GidiReads <no-reply@yourdomain.com>" (the domain must be verified in Resend). */
  from?: string;
  replyTo?: string;
  /** Resend tags: letters, numbers, "_" and "-" only. */
  tags?: { name: string; value: string }[];
  /** Same key within 24h = Resend will not send the email twice. Use e.g. `contest-approved:${entryId}`. */
  idempotencyKey?: string;
}
export type SendResult = { ok: true; id: string } | { ok: false; error: string; status?: number };
export interface SendOptions { apiKey?: string; fetchImpl?: typeof fetch; maxRetries?: number; timeoutMs?: number }

const RESEND_URL = 'https://api.resend.com/emails';
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
const TAG_RE = /^[A-Za-z0-9_-]{1,256}$/;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Strip anything that could break out of a header (header-injection guard). */
const oneLine = (v: string) => String(v).replace(/[\r\n]+/g, ' ').trim();

export async function sendEmail(input: SendEmailInput, options: SendOptions = {}): Promise<SendResult> {
  const apiKey = options.apiKey ?? env('RESEND_API_KEY');
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY is not configured.' };
  const from = oneLine(input.from ?? env('EMAIL_FROM') ?? '');
  if (!from) return { ok: false, error: 'EMAIL_FROM is not configured.' };

  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map((r) => String(r).trim());
  if (!recipients.length || recipients.length > 50) return { ok: false, error: 'Provide between 1 and 50 recipients.' };
  const bad = recipients.find((r) => !EMAIL_RE.test(r));
  if (bad) return { ok: false, error: 'One of the recipient email addresses is not valid.' };
  const subject = oneLine(input.subject).slice(0, 200);
  if (!subject) return { ok: false, error: 'A subject is required.' };
  if (input.replyTo && !EMAIL_RE.test(input.replyTo.trim())) return { ok: false, error: 'replyTo is not a valid email address.' };
  const tags = (input.tags ?? []).filter((t) => TAG_RE.test(t.name) && TAG_RE.test(t.value)).slice(0, 10);

  const body: Record<string, unknown> = { from, to: recipients, subject, html: input.html, text: input.text };
  if (input.replyTo) body.reply_to = input.replyTo.trim();
  if (tags.length) body.tags = tags;

  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  if (input.idempotencyKey) headers['Idempotency-Key'] = oneLine(input.idempotencyKey).slice(0, 256);

  const doFetch = options.fetchImpl ?? fetch;
  const maxRetries = options.maxRetries ?? 2, timeoutMs = options.timeoutMs ?? 10000;
  let last: SendResult = { ok: false, error: 'The email could not be sent.' };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await doFetch(RESEND_URL, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
      clearTimeout(timer);
      const data: any = await res.json().catch(() => ({}));
      if (res.ok && data?.id) return { ok: true, id: String(data.id) };
      last = { ok: false, status: res.status, error: String(data?.message || data?.error || `Resend responded with status ${res.status}.`) };
      // Retry only when it can succeed later: rate limit or a server error.
      if (res.status !== 429 && res.status < 500) return last;
      const retryAfter = Number(res.headers?.get?.('retry-after'));
      if (attempt < maxRetries) await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 8000) : 500 * 2 ** attempt);
    } catch (err: any) {
      clearTimeout(timer);
      last = { ok: false, error: err?.name === 'AbortError' ? 'The email service took too long to respond.' : 'Could not reach the email service.' };
      if (attempt < maxRetries) await sleep(500 * 2 ** attempt);
    }
  }
  return last;
}
