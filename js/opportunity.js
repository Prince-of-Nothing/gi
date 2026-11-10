import { supabase } from './supabaseClient.js';
import { HOLIDAY_SLUG, esc, safeLink, typeLabel, cardImage, stageOf, fmtDate } from './opportunities-shared.js';

const $ = (id) => document.getElementById(id);
const slug = new URLSearchParams(location.search).get('slug') || '';
if (slug === HOLIDAY_SLUG) location.replace('holiday-hearts.html');

const paragraphs = (text) => String(text || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const list = (items) => Array.isArray(items) && items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
const section = (title, inner) => inner ? `<section class="od-section"><h2>${esc(title)}</h2>${inner}</section>` : '';
const prettify = (k) => String(k).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function prizesMarkup(prizes) {
  const rows = Array.isArray(prizes)
    ? prizes.map((p) => [p.title, p.text])
    : prizes && typeof prizes === 'object' ? Object.entries(prizes).map(([k, v]) => [prettify(k), v]) : [];
  const ok = rows.filter(([t, x]) => t && x);
  return ok.length ? `<div class="od-prizes">${ok.map(([t, x]) => `<div class="od-prize"><strong>${esc(t)}</strong><span>${esc(x)}</span></div>`).join('')}</div>` : '';
}
function faqMarkup(faq) {
  const rows = (Array.isArray(faq) ? faq : []).filter((f) => f && f.q && f.a);
  return rows.length ? `<div class="od-faq">${rows.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>` : '';
}

function render(o) {
  const s = o.settings || {}, st = stageOf(o), img = cardImage(o);
  const ctaUrl = safeLink(s.cta_url), closed = st.key === 'closed' || st.key === 'results';
  const cta = ctaUrl && s.cta_label && !closed
    ? `<a class="oc-btn" href="${esc(ctaUrl)}">${esc(s.cta_label)} <span aria-hidden="true">→</span></a>`
    : closed ? `<span class="oc-chip oc-chip-${st.key}">${esc(st.label)}</span>` : '';
  const instructions = Array.isArray(s.instructions) ? list(s.instructions) : paragraphs(s.instructions);
  document.title = `${o.title} — GidiReads`;
  $('odContent').innerHTML = `
    ${o.status !== 'published' ? `<p class="oc-note" style="margin:0 0 14px"><strong>Preview:</strong> this opportunity is ${esc(o.status)} and only administrators can see it.</p>` : ''}
    <section class="od-hero">
      ${img ? `<div class="od-poster"><img src="${esc(img)}" alt="${esc(o.title)} artwork" decoding="async"></div>` : ''}
      <div>
        <div class="oc-card-tags"><span class="oc-type">${esc(typeLabel(o.opportunity_type))}</span><span class="oc-chip oc-chip-${st.key}">${esc(st.label)}</span></div>
        <h1>${esc(o.title)}</h1>
        ${o.summary ? `<p class="od-summary">${esc(o.summary)}</p>` : ''}
        <div class="od-dates">${o.starts_at ? `<div>Opens<strong>${esc(fmtDate(o.starts_at))}</strong></div>` : ''}${o.ends_at ? `<div>Closes<strong>${esc(fmtDate(o.ends_at))}</strong></div>` : ''}${st.note && ['voting','closed','results'].includes(st.key) ? `<div>Status<strong>${esc(st.note)}</strong></div>` : ''}</div>
        <div class="od-cta">${cta}</div>
      </div>
    </section>
    ${section('About this opportunity', paragraphs(o.body))}
    ${section('Who can apply', list(s.eligibility) || paragraphs(s.eligibility_text))}
    ${section('How to apply', instructions)}
    ${section('Prizes and benefits', prizesMarkup(s.prizes))}
    ${section('Rules and terms', list(s.terms))}
    ${section('Frequently asked questions', faqMarkup(s.faq))}
    ${closed ? '' : cta ? `<div class="od-cta">${cta}</div>` : ''}`;
}

async function init() {
  if (!slug) { $('odContent').innerHTML = '<p class="od-state">That opportunity link is incomplete. <a href="opportunities.html">See all opportunities</a>.</p>'; return; }
  const { data, error } = await supabase.from('platform_opportunities').select('*').eq('slug', slug).maybeSingle();
  if (error) { $('odContent').innerHTML = '<p class="od-state">This opportunity could not be loaded. Please check your connection and try again.</p>'; return; }
  if (!data) { $('odContent').innerHTML = '<p class="od-state">We could not find that opportunity. It may have been removed. <a href="opportunities.html">See all opportunities</a>.</p>'; return; }
  render(data);
}
supabase.auth.getSession().then(({ data }) => { $('odAccountLink').textContent = data.session ? 'My account' : 'Log in / account'; });
init();
