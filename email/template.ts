import { env } from './env';

/** GidiReads brand tokens for email. */
export const BRAND = {
  primary: '#1D0822',      // Deep Dark Plum
  background: '#F4F3F7',   // page background
  card: '#FFFFFF',         // card
  text: '#2B2130',         // body copy on the white card (high contrast)
  muted: '#6B6072',        // footer / small print
  line: '#E6E1EC',
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
  defaultSender: 'GidiReads Team',
  tagline: 'Born in Africa. Built for storytellers everywhere.'
} as const;

export interface EmailTemplateInput {
  recipientName: string;
  emailHeading: string;
  /** Plain text. Blank lines start a new paragraph; single line breaks are kept. Pass an array to control paragraphs. Always escaped. */
  messageBody: string | string[];
  ctaText?: string;
  /** Must be an https:// link (http://localhost is allowed for development). */
  ctaUrl?: string;
  senderName?: string;           // default "GidiReads Team"
  /** Optional inbox preview text. */
  preheader?: string;
  /** Production site origin, no trailing slash. Defaults to env SITE_URL. The logo is served from `${siteUrl}/logo.png`. */
  siteUrl?: string;
}

export interface RenderedEmail { html: string; text: string }

const FALLBACK_SITE = 'https://gidireads-library-redesign-02-1.vercel.app';

export function resolveSiteUrl(explicit?: string): string {
  const raw = (explicit || env('SITE_URL') || FALLBACK_SITE).trim().replace(/\/+$/, '');
  if (!/^https:\/\/[^\s/]+(\/[^\s]*)?$/i.test(raw) && !/^http:\/\/localhost(:\d+)?$/i.test(raw)) {
    throw new Error('SITE_URL must be an https:// origin such as https://gidireads.com');
  }
  return raw;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function assertSafeUrl(url: string): string {
  const v = String(url).trim();
  if (!/^(https:\/\/|http:\/\/localhost)[^\s"'<>\\]+$/i.test(v)) {
    throw new Error('ctaUrl must be a valid https:// link');
  }
  return v;
}

function paragraphs(body: string | string[]): string[] {
  const list = Array.isArray(body) ? body : String(body ?? '').split(/\r?\n\s*\r?\n/);
  return list.map((p) => String(p).replace(/\r/g, '').trim()).filter(Boolean);
}

/**
 * Master template. All text is escaped; only brand-controlled markup is emitted.
 * Inline styles everywhere (email clients strip <style>), plus colour-scheme meta tags
 * so mobile clients do not invert the card and wreck contrast.
 */
export function renderEmail(input: EmailTemplateInput): RenderedEmail {
  const name = String(input.recipientName || '').trim() || 'there';
  const heading = String(input.emailHeading || '').trim();
  if (!heading) throw new Error('emailHeading is required');
  const paras = paragraphs(input.messageBody);
  if (!paras.length) throw new Error('messageBody is required');
  if ((input.ctaText && !input.ctaUrl) || (!input.ctaText && input.ctaUrl)) throw new Error('ctaText and ctaUrl must be provided together');
  const cta = input.ctaText && input.ctaUrl ? { text: String(input.ctaText).trim(), url: assertSafeUrl(input.ctaUrl) } : null;
  const sender = String(input.senderName || '').trim() || BRAND.defaultSender;
  const site = resolveSiteUrl(input.siteUrl);
  const logo = `${site}/logo.png`;
  const preheader = String(input.preheader || '').trim();
  const B = BRAND;

  const bodyHtml = paras.map((p) =>
    `<p style="margin:0 0 16px 0;font-family:${B.sans};font-size:16px;line-height:1.65;color:${B.text};">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');

  const ctaHtml = cta ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px 0;">
                <tr><td align="center" bgcolor="${B.primary}" style="background-color:${B.primary};background-image:linear-gradient(${B.primary},${B.primary});border-radius:8px;">
                  <a href="${escapeHtml(cta.url)}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 30px;font-family:${B.sans};font-size:16px;font-weight:700;line-height:1.2;color:#FFFFFF;text-decoration:none;border-radius:8px;">${escapeHtml(cta.text)}</a>
                </td></tr>
              </table>
              <p style="margin:12px 0 0 0;font-family:${B.sans};font-size:13px;line-height:1.5;color:${B.muted};">If the button does not work, copy and paste this link into your browser:<br><a href="${escapeHtml(cta.url)}" target="_blank" rel="noopener" style="color:${B.primary};word-break:break-all;">${escapeHtml(cta.url)}</a></p>` : '';

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" style="color-scheme:light dark;supported-color-schemes:light dark;">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(heading)}</title>
<style>
  :root{color-scheme:light dark;supported-color-schemes:light dark}
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  body{margin:0!important;padding:0!important;width:100%!important}
  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
  @media (max-width:620px){.container{width:100%!important}.px{padding-left:22px!important;padding-right:22px!important}.h1{font-size:24px!important}}
  /* Keep the designed light card in dark mode: same colours, so nothing inverts */
  @media (prefers-color-scheme:dark){
    .bg-page{background-color:${B.background}!important;background-image:linear-gradient(${B.background},${B.background})!important}
    .bg-card{background-color:${B.card}!important;background-image:linear-gradient(${B.card},${B.card})!important}
    .bg-brand{background-color:${B.primary}!important;background-image:linear-gradient(${B.primary},${B.primary})!important}
    .t-body{color:${B.text}!important}.t-head{color:${B.primary}!important}.t-muted{color:${B.muted}!important}
  }
  [data-ogsc] .bg-card{background-color:${B.card}!important}[data-ogsc] .t-body{color:${B.text}!important}[data-ogsc] .t-head{color:${B.primary}!important}
</style>
</head>
<body class="bg-page" style="margin:0;padding:0;background-color:${B.background};background-image:linear-gradient(${B.background},${B.background});">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${B.background};">${escapeHtml(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" bgcolor="${B.background}" style="background-color:${B.background};background-image:linear-gradient(${B.background},${B.background});">
<tr><td align="center" style="padding:28px 12px 36px 12px;">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
    <tr><td class="bg-card" bgcolor="${B.card}" style="background-color:${B.card};background-image:linear-gradient(${B.card},${B.card});border-radius:12px;overflow:hidden;border:1px solid ${B.line};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td class="bg-brand" align="center" bgcolor="${B.primary}" style="background-color:${B.primary};background-image:linear-gradient(${B.primary},${B.primary});padding:26px 20px;">
          <a href="${escapeHtml(site)}" target="_blank" rel="noopener"><img src="${escapeHtml(logo)}" width="72" height="72" alt="GidiReads" style="display:block;width:72px;height:72px;border-radius:16px;border:0;"></a>
        </td></tr>
        <tr><td class="px" style="padding:36px 40px 12px 40px;">
          <h1 class="h1 t-head" style="margin:0 0 20px 0;font-family:${B.serif};font-size:28px;line-height:1.25;font-weight:normal;color:${B.primary};">${escapeHtml(heading)}</h1>
          <p class="t-body" style="margin:0 0 16px 0;font-family:${B.sans};font-size:16px;line-height:1.65;color:${B.text};">Hi ${escapeHtml(name)},</p>
          ${bodyHtml}${ctaHtml}
        </td></tr>
        <tr><td class="px" style="padding:12px 40px 36px 40px;">
          <p class="t-body" style="margin:18px 0 0 0;font-family:${B.sans};font-size:16px;line-height:1.65;color:${B.text};">Warm regards,<br><strong style="font-family:${B.serif};font-weight:bold;color:${B.primary};">${escapeHtml(sender)}</strong></p>
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:22px 16px 0 16px;">
      <p class="t-muted" style="margin:0 0 6px 0;font-family:${B.sans};font-size:12px;line-height:1.6;color:${B.muted};">${escapeHtml(B.tagline)}</p>
      <p class="t-muted" style="margin:0;font-family:${B.sans};font-size:12px;line-height:1.6;color:${B.muted};">You are receiving this email because you have a GidiReads account.<br><a href="${escapeHtml(site)}" target="_blank" rel="noopener" style="color:${B.muted};text-decoration:underline;">${escapeHtml(site.replace(/^https?:\/\//, ''))}</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    heading, '', `Hi ${name},`, '', ...paras.flatMap((p) => [p, '']),
    ...(cta ? [`${cta.text}: ${cta.url}`, ''] : []),
    'Warm regards,', sender, '', '--', B.tagline, site
  ].join('\n');

  return { html, text };
}
