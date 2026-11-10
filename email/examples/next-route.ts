// app/api/email/route.ts  (Next.js App Router)
// Server-only. Never expose RESEND_API_KEY to the browser, and never leave this route open:
// it requires a shared secret so strangers cannot use it to send mail from your domain.
import { timingSafeEqual } from 'node:crypto';
import { sendContestUpdateEmail, sendNotificationEmail, sendPasswordResetEmail, sendVerificationEmail } from '@/email';

const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export async function POST(req: Request) {
  const secret = process.env.EMAIL_API_SECRET ?? '';
  if (!secret || !same(req.headers.get('x-email-secret') ?? '', secret)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b.to !== 'string' || typeof b.type !== 'string') return Response.json({ error: 'Bad request' }, { status: 400 });
  const base = { to: b.to, recipientName: String(b.recipientName ?? ''), idempotencyKey: b.idempotencyKey };
  const result =
    b.type === 'verification' ? await sendVerificationEmail({ ...base, verifyUrl: b.verifyUrl }) :
    b.type === 'password_reset' ? await sendPasswordResetEmail({ ...base, resetUrl: b.resetUrl }) :
    b.type === 'contest' ? await sendContestUpdateEmail({ ...base, update: b.update, entryTitle: b.entryTitle, details: b.details }) :
    b.type === 'notification' ? await sendNotificationEmail({ ...base, heading: b.heading, message: b.message, ctaText: b.ctaText, ctaUrl: b.ctaUrl }) :
    ({ ok: false, error: 'Unknown email type' } as const);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
