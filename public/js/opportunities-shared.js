// Shared helpers for the Opportunities Centre and opportunity detail pages.
export const LAGOS = 'Africa/Lagos';
export const HOLIDAY_SLUG = 'holiday-hearts-2026';

export const TYPE_LABELS = {
  contest: 'Writing contest',
  program: 'Author programme',
  contract: 'Contract opportunity',
  adaptation: 'Adaptation opportunity',
  campaign: 'Special campaign',
  grant: 'Grant',
  announcement: 'Announcement'
};
export const typeLabel = (t) => TYPE_LABELS[t] || 'Opportunity';

export const esc = (value) => {
  const el = document.createElement('span');
  el.textContent = value ?? '';
  return el.innerHTML;
};
// Only our own asset folder or https images are ever used.
export const safeImage = (value) => {
  const v = String(value || '').trim();
  return /^(https:\/\/|assets\/)[^\s"'()\\<>]+$/i.test(v) ? v : '';
};
// Only https links or relative pages on this site are ever used as buttons.
export const safeLink = (value) => {
  const v = String(value || '').trim();
  return /^(https:\/\/[^\s"'<>\\]+|[a-z0-9][a-z0-9._\/?=&#%-]*)$/i.test(v) ? v : '';
};
export const fmtDate = (value, withTime = false) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const opts = { day: 'numeric', month: 'short', year: 'numeric', timeZone: LAGOS };
  if (withTime) Object.assign(opts, { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleString('en-NG', opts);
};

export const DEFAULT_IMAGES = {
  [HOLIDAY_SLUG]: 'assets/Opportunities/holiday-hearts-main.jpg'
};
export const cardImage = (o) =>
  safeImage(o?.settings?.card_image_url) || safeImage(o?.hero_image_url) || DEFAULT_IMAGES[o?.slug] || '';

export const detailUrl = (o) =>
  o.slug === HOLIDAY_SLUG ? 'holiday-hearts.html' : `opportunity.html?slug=${encodeURIComponent(o.slug)}`;

const DAY = 86400000;
const toDate = (v) => (v ? new Date(v) : null);

// Works out the public-facing stage of an opportunity from its status and dates.
// Returns { key, label, note } where key is one of:
// upcoming | open | closing | voting | closed | results
export function stageOf(o, now = new Date()) {
  const s = o.settings || {};
  if (o.status === 'archived') return { key: 'closed', label: 'Closed', note: '' };
  if (o.status === 'closed') return s.results_published
    ? { key: 'results', label: 'Results published', note: '' }
    : { key: 'closed', label: 'Closed', note: o.ends_at ? `Closed ${fmtDate(o.ends_at)}` : '' };
  if (s.results_published) return { key: 'results', label: 'Results published', note: '' };

  const open = toDate(s.submission_opens_at), close = toDate(s.submission_closes_at);
  if (open && close) {
    const vOpen = toDate(s.voting_opens_at), vClose = toDate(s.voting_closes_at);
    if (now < open) return { key: 'upcoming', label: 'Opening soon', note: `Opens ${fmtDate(open)}` };
    if (now <= close) {
      const soon = close - now <= 7 * DAY;
      return { key: soon ? 'closing' : 'open', label: soon ? 'Closing soon' : 'Open for entries', note: `Closes ${fmtDate(close)}` };
    }
    if (vOpen && vClose && now >= vOpen && now <= vClose) return { key: 'voting', label: 'Voting open', note: `Voting ends ${fmtDate(vClose)}` };
    if (vOpen && now < vOpen) return { key: 'closed', label: 'Entries closed', note: `Voting opens ${fmtDate(vOpen)}` };
    return { key: 'closed', label: 'Voting closed', note: 'Results are being confirmed' };
  }
  const start = toDate(o.starts_at), end = toDate(o.ends_at);
  if (start && now < start) return { key: 'upcoming', label: 'Opening soon', note: `Opens ${fmtDate(start)}` };
  if (end && now > end) return { key: 'closed', label: 'Closed', note: `Closed ${fmtDate(end)}` };
  if (end) {
    const soon = end - now <= 7 * DAY;
    return { key: soon ? 'closing' : 'open', label: soon ? 'Closing soon' : 'Open', note: `Closes ${fmtDate(end)}` };
  }
  return { key: 'open', label: 'Open', note: '' };
}

// Filter groups shown to readers
export const STATUS_GROUPS = {
  open: { label: 'Open now', keys: ['open', 'closing', 'voting'] },
  upcoming: { label: 'Opening soon', keys: ['upcoming'] },
  closed: { label: 'Closed & results', keys: ['closed', 'results'] }
};

// One hero slide. Used by the public Centre and by the admin preview.
export function slideMarkup(s, i = 0, total = 1) {
  const img = safeImage(s.image_url), mobile = safeImage(s.mobile_image_url) || img;
  const link = safeLink(s.button_url);
  const picture = img
    ? `<picture class="oc-slide-poster"><source media="(max-width:620px)" srcset="${esc(mobile)}"><img src="${esc(img)}" alt="${esc(s.alt_text || s.headline || '')}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`
    : '';
  return `<article class="oc-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${total}" ${i ? 'aria-hidden="true"' : ''}>
    ${img ? `<div class="oc-slide-bg" style="background-image:url('${esc(img)}')"></div>` : ''}
    <div class="oc-slide-inner">${picture}
      <div class="oc-slide-copy">
        ${s.eyebrow ? `<p class="oc-eyebrow">${esc(s.eyebrow)}</p>` : ''}
        <h2>${esc(s.headline)}</h2>
        ${s.description ? `<p class="oc-slide-text">${esc(s.description)}</p>` : ''}
        ${link && s.button_label ? `<a class="oc-btn" href="${esc(link)}">${esc(s.button_label)} <span aria-hidden="true">→</span></a>` : ''}
      </div>
    </div></article>`;
}
