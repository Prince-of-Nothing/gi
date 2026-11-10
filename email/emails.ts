import { renderEmail, resolveSiteUrl, assertSafeUrl, BRAND } from './template';
import { sendEmail, type SendOptions, type SendResult } from './send';

interface Base { to: string; recipientName: string; senderName?: string; idempotencyKey?: string; siteUrl?: string }

async function deliver(base: Base, subject: string, category: string, tpl: Parameters<typeof renderEmail>[0], options?: SendOptions): Promise<SendResult> {
  let rendered;
  try { rendered = renderEmail({ senderName: base.senderName, siteUrl: base.siteUrl, ...tpl }); }
  catch (e: any) { return { ok: false, error: e?.message || 'Could not build the email.' }; }
  return sendEmail({ to: base.to, subject, html: rendered.html, text: rendered.text, tags: [{ name: 'category', value: category }], idempotencyKey: base.idempotencyKey }, options);
}

/* ---------------- 1. Email verification ---------------- */
export function sendVerificationEmail(p: Base & { verifyUrl: string; expiresInHours?: number }, options?: SendOptions) {
  const hours = p.expiresInHours ?? 24;
  return deliver(p, 'Confirm your email for GidiReads', 'verification', {
    recipientName: p.recipientName,
    emailHeading: 'Confirm your email address',
    preheader: 'One tap to finish setting up your GidiReads account.',
    messageBody: [
      'Welcome to GidiReads. Please confirm your email address so we know it is really you.',
      `This link works for ${hours} hours. If you did not create a GidiReads account, you can safely ignore this email.`
    ],
    ctaText: 'Confirm my email', ctaUrl: p.verifyUrl
  }, options);
}

/* ---------------- 2. Password reset ---------------- */
export function sendPasswordResetEmail(p: Base & { resetUrl: string; expiresInMinutes?: number }, options?: SendOptions) {
  const mins = p.expiresInMinutes ?? 60;
  return deliver(p, 'Reset your GidiReads password', 'password_reset', {
    recipientName: p.recipientName,
    emailHeading: 'Reset your password',
    preheader: 'Use this link to choose a new GidiReads password.',
    messageBody: [
      'We received a request to reset the password for your GidiReads account.',
      `This link expires in ${mins} minutes. If you did not ask for a reset, ignore this email and your password will stay the same. Never share this link with anyone.`
    ],
    ctaText: 'Choose a new password', ctaUrl: p.resetUrl
  }, options);
}

/* ---------------- 3. Contest updates (Holiday Hearts) ---------------- */
export type ContestUpdate =
  | 'submission_received' | 'entry_approved' | 'entry_not_approved' | 'finalist'
  | 'voting_open' | 'voting_closing' | 'results_published' | 'winner' | 'participant_thanks';

interface ContestCopy { subject: string; heading: string; preheader: string; body: (t: string, d: string) => string[]; cta: string; path: string }
const CONTEST = 'Holiday Hearts';
const COPY: Record<ContestUpdate, ContestCopy> = {
  submission_received: { subject: `We received your ${CONTEST} entry`, heading: 'Your entry is in', preheader: 'Your Holiday Hearts entry was submitted.', path: '/holiday-hearts-entry.html', cta: 'View your entry',
    body: (t, d) => [`Thank you. We have received your ${CONTEST} entry${t ? `, “${t}”` : ''}.`, 'Our team will check it for eligibility before it appears publicly. We will email you when there is a decision.', d].filter(Boolean) },
  entry_approved: { subject: `Your ${CONTEST} entry was approved`, heading: 'Your entry is approved', preheader: 'Your story is now in the Holiday Hearts collection.', path: '/holiday-hearts.html#stories', cta: 'See the collection',
    body: (t, d) => [`Good news${t ? `: “${t}”` : ''} was approved and is now part of the ${CONTEST} collection, where readers can discover it.`, d].filter(Boolean) },
  entry_not_approved: { subject: `An update on your ${CONTEST} entry`, heading: 'About your entry', preheader: 'We could not approve your entry this time.', path: '/holiday-hearts-entry.html', cta: 'View your entry',
    body: (t, d) => [`Thank you for entering${t ? ` “${t}”` : ''}. After review, we were not able to approve this entry.`, d || 'You can see the reason on your entry page.'] },
  finalist: { subject: `You are a ${CONTEST} finalist`, heading: 'You are a finalist', preheader: 'Your story made the Holiday Hearts shortlist.', path: '/holiday-hearts.html#stories', cta: 'See the finalists',
    body: (t, d) => [`Congratulations${t ? `. “${t}”` : ''} has been chosen as a ${CONTEST} finalist.`, 'Readers will vote during the voting period. Share your story and invite people to read it.', d].filter(Boolean) },
  voting_open: { subject: `${CONTEST} voting is open`, heading: 'Voting is open', preheader: 'Read the finalists and cast your vote.', path: '/holiday-hearts.html#stories', cta: 'Read and vote',
    body: (_t, d) => [`Voting for ${CONTEST} is now open. Read the finalists and vote for your favourite. Each account has one vote.`, d].filter(Boolean) },
  voting_closing: { subject: `${CONTEST} voting closes soon`, heading: 'Voting closes soon', preheader: 'Last chance to vote.', path: '/holiday-hearts.html#stories', cta: 'Vote now',
    body: (_t, d) => [`Voting for ${CONTEST} is about to close. If you have not voted yet, now is the time.`, d].filter(Boolean) },
  results_published: { subject: `${CONTEST} results are in`, heading: 'The results are in', preheader: 'See who won Holiday Hearts.', path: '/holiday-hearts.html', cta: 'See the results',
    body: (_t, d) => [`The official ${CONTEST} results have been confirmed and published.`, d].filter(Boolean) },
  winner: { subject: `Congratulations from ${CONTEST}`, heading: 'Congratulations', preheader: 'You placed in Holiday Hearts.', path: '/holiday-hearts.html', cta: 'See the results',
    body: (t, d) => [`Congratulations${t ? `. “${t}” placed in ${CONTEST}` : `, you placed in ${CONTEST}`}.`, d,
      'Contract offers are subject to eligibility, editorial review, rights checks and your acceptance of the actual contract terms. The GidiReads team will contact you with the next steps.'].filter(Boolean) },
  participant_thanks: { subject: `Thank you for taking part in ${CONTEST}`, heading: 'Thank you for taking part', preheader: 'Your participant badge is on its way.', path: '/holiday-hearts.html', cta: 'See the results',
    body: (t, d) => [`Thank you for taking part in ${CONTEST}${t ? ` with “${t}”` : ''}. Writing and sharing a story takes courage, and we are glad you did.`, d].filter(Boolean) }
};

export function sendContestUpdateEmail(p: Base & { update: ContestUpdate; entryTitle?: string; details?: string; ctaUrl?: string }, options?: SendOptions) {
  const c = COPY[p.update];
  if (!c) return Promise.resolve<SendResult>({ ok: false, error: 'Unknown contest update type.' });
  let url: string;
  try { url = p.ctaUrl ? assertSafeUrl(p.ctaUrl) : `${resolveSiteUrl(p.siteUrl)}${c.path}`; }
  catch (e: any) { return Promise.resolve<SendResult>({ ok: false, error: e?.message || 'Invalid link.' }); }
  return deliver(p, c.subject, `contest_${p.update}`, {
    recipientName: p.recipientName, emailHeading: c.heading, preheader: c.preheader,
    messageBody: c.body(String(p.entryTitle || '').trim(), String(p.details || '').trim()), ctaText: c.cta, ctaUrl: url
  }, options);
}

/* ---------------- 4. General notifications ---------------- */
export function sendNotificationEmail(p: Base & { subject?: string; heading: string; message: string | string[]; ctaText?: string; ctaUrl?: string; preheader?: string }, options?: SendOptions) {
  return deliver(p, p.subject || p.heading, 'notification', {
    recipientName: p.recipientName, emailHeading: p.heading, messageBody: p.message, ctaText: p.ctaText, ctaUrl: p.ctaUrl, preheader: p.preheader
  }, options);
}

export { BRAND };
