import { supabase } from './supabaseClient.js';
import { HOLIDAY_SLUG, STATUS_GROUPS, esc, safeImage, typeLabel, cardImage, detailUrl, stageOf, slideMarkup } from './opportunities-shared.js';

const $ = (id) => document.getElementById(id);
let opportunities = [];
const filter = { type: 'all', group: 'all' };

/* ---------- Built-in default slides (used only if the slides table is missing) ---------- */
const DEFAULT_SLIDES = [
  { image_url: 'assets/Opportunities/holiday-hearts-main.jpg', alt_text: 'Holiday Hearts poster: a couple dancing at a winter orchestra', eyebrow: 'HOLIDAY HEARTS 2026', headline: 'Pick your prompt', description: 'Three holiday romance prompts. One story that is yours. Choose the one that calls to you.', button_label: 'See the prompts', button_url: 'holiday-hearts.html#prompts' },
  { image_url: 'assets/Opportunities/holiday-hearts-contest.jpg', alt_text: 'Holiday Hearts poster: Win a contract offer', eyebrow: 'THE PRIZE', headline: 'Win a contract offer', description: 'The top three stories receive contract offers, subject to eligibility, editorial review and agreed terms.', button_label: 'View the prizes', button_url: 'holiday-hearts.html#prizes' },
  { image_url: 'assets/Opportunities/snowed-in.jpg', alt_text: 'Holiday Hearts prompt: Snowed In', eyebrow: 'PROMPT 01', headline: 'Snowed In', description: 'Two people. One cabin. Zero escape.', button_label: 'Read the prompt', button_url: 'holiday-hearts.html#prompts' },
  { image_url: 'assets/Opportunities/one-last-christmas.jpg', alt_text: 'Holiday Hearts prompt: One Last Christmas', eyebrow: 'PROMPT 02', headline: 'One Last Christmas', description: 'An ex, a snowy town, and everything unsaid.', button_label: 'Read the prompt', button_url: 'holiday-hearts.html#prompts' },
  { image_url: 'assets/Opportunities/royal-holiday.jpg', alt_text: 'Holiday Hearts prompt: The Royal Holiday', eyebrow: 'PROMPT 03', headline: 'The Royal Holiday', description: 'A prince in disguise at a winter festival.', button_label: 'Read the prompt', button_url: 'holiday-hearts.html#prompts' }
];

/* ---------- Hero slideshow ---------- */
function renderGenericHero() {
  $('ocHero').innerHTML = `<div class="oc-hero-default"><p class="oc-eyebrow">GIDIREADS OPPORTUNITIES</p><h2>Your next chapter starts here</h2><p class="oc-slide-text">Contests, programmes and calls for stories will appear here as they open. Check back soon.</p></div>`;
}

function renderHero(slides) {
  const host = $('ocHero');
  if (!slides.length) return renderGenericHero();
  host.innerHTML = `<div class="oc-track" id="ocTrack">${slides.map((s, i) => slideMarkup(s, i, slides.length)).join('')}</div>
    ${slides.length > 1 ? `<button class="oc-nav oc-prev" type="button" aria-label="Previous slide">‹</button><button class="oc-nav oc-next" type="button" aria-label="Next slide">›</button>
    <div class="oc-dots" role="tablist" aria-label="Choose a slide">${slides.map((_, i) => `<button type="button" role="tab" aria-label="Slide ${i + 1}" aria-selected="${i === 0}" data-dot="${i}"></button>`).join('')}</div>` : ''}`;
  if (slides.length < 2) return;

  const track = $('ocTrack'), items = [...track.children], dots = [...host.querySelectorAll('[data-dot]')];
  let index = 0, timer = null, startX = null, dragging = false;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const go = (n) => {
    index = (n + items.length) % items.length;
    track.style.transform = `translateX(${-index * 100}%)`;
    items.forEach((el, i) => el.setAttribute('aria-hidden', i === index ? 'false' : 'true'));
    dots.forEach((d, i) => d.setAttribute('aria-selected', String(i === index)));
  };
  const stop = () => { clearInterval(timer); timer = null; };
  const play = () => { if (reduce || timer) return; timer = setInterval(() => go(index + 1), 6500); };

  host.querySelector('.oc-prev').addEventListener('click', () => { go(index - 1); stop(); });
  host.querySelector('.oc-next').addEventListener('click', () => { go(index + 1); stop(); });
  dots.forEach((d) => d.addEventListener('click', () => { go(Number(d.dataset.dot)); stop(); }));
  host.addEventListener('mouseenter', stop); host.addEventListener('mouseleave', play);
  host.addEventListener('focusin', stop);
  host.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { go(index - 1); stop(); } if (e.key === 'ArrowRight') { go(index + 1); stop(); } });
  host.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; dragging = true; stop(); }, { passive: true });
  host.addEventListener('touchend', (e) => {
    if (!dragging) return; dragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
  }, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : play()));
  go(0); play();
}

async function loadSlides(holidayPublished) {
  const now = Date.now();
  const { data, error } = await supabase.from('platform_opportunity_slides').select('*')
    .eq('is_active', true).order('sort_order', { ascending: true });
  if (error) return holidayPublished ? DEFAULT_SLIDES : [];          // table not created yet
  return (data || []).filter((s) => (!s.starts_at || new Date(s.starts_at) <= now) && (!s.ends_at || new Date(s.ends_at) > now));
}

/* ---------- Opportunity list ---------- */
function statusChipClass(key) { return `oc-chip-${key}`; }

function cardMarkup(o) {
  const st = stageOf(o), img = cardImage(o), href = detailUrl(o);
  const closed = st.key === 'closed' || st.key === 'results';
  const action = st.key === 'results' ? 'View results' : closed ? 'View details' : st.key === 'upcoming' ? 'See what’s coming' : st.key === 'voting' ? 'See the finalists' : 'View opportunity';
  return `<article class="oc-card" data-stage="${st.key}">
    <a class="oc-card-media" href="${esc(href)}" tabindex="-1" aria-hidden="true">${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async">` : '<span class="oc-card-noimg">GR</span>'}</a>
    <div class="oc-card-body">
      <div class="oc-card-tags"><span class="oc-type">${esc(typeLabel(o.opportunity_type))}</span><span class="oc-chip ${statusChipClass(st.key)}">${esc(st.label)}</span></div>
      <h3><a href="${esc(href)}">${esc(o.title)}</a></h3>
      <p class="oc-card-text">${esc(o.summary || 'More details are coming soon.')}</p>
      ${st.note ? `<p class="oc-card-date">${esc(st.note)}</p>` : ''}
      <a class="oc-btn ${closed ? 'oc-btn-quiet' : ''}" href="${esc(href)}">${action} <span aria-hidden="true">→</span></a>
    </div></article>`;
}

function renderFilters() {
  const box = $('ocFilters');
  const types = [...new Set(opportunities.map((o) => o.opportunity_type))];
  const groups = Object.entries(STATUS_GROUPS).filter(([, g]) => opportunities.some((o) => g.keys.includes(stageOf(o).key)));
  if (opportunities.length < 2 || (types.length < 2 && groups.length < 2)) { box.hidden = true; return; }
  const chip = (kind, value, label, active) => `<button type="button" class="oc-filter${active ? ' is-active' : ''}" data-kind="${kind}" data-value="${value}" aria-pressed="${active}">${esc(label)}</button>`;
  box.hidden = false;
  box.innerHTML = `<div class="oc-filter-row" aria-label="Filter by type">${chip('type', 'all', 'All types', filter.type === 'all')}${types.map((t) => chip('type', t, typeLabel(t), filter.type === t)).join('')}</div>
    <div class="oc-filter-row" aria-label="Filter by status">${chip('group', 'all', 'Any status', filter.group === 'all')}${groups.map(([k, g]) => chip('group', k, g.label, filter.group === k)).join('')}</div>`;
  box.querySelectorAll('.oc-filter').forEach((b) => b.addEventListener('click', () => { filter[b.dataset.kind] = b.dataset.value; renderList(); }));
}

function renderList() {
  renderFilters();
  const shown = opportunities.filter((o) =>
    (filter.type === 'all' || o.opportunity_type === filter.type) &&
    (filter.group === 'all' || STATUS_GROUPS[filter.group].keys.includes(stageOf(o).key)));
  $('ocCount').textContent = opportunities.length ? `${shown.length} ${shown.length === 1 ? 'opportunity' : 'opportunities'}` : '';
  $('ocCards').innerHTML = shown.length
    ? shown.map(cardMarkup).join('')
    : `<p class="oc-state">${opportunities.length ? 'Nothing matches those filters.' : 'No opportunities are open right now. New contests and programmes will appear here.'}</p>`;
}

function sortOpportunities(rows) {
  const rank = { open: 0, closing: 0, voting: 0, upcoming: 1, results: 2, closed: 3 };
  return [...rows].sort((a, b) => {
    const fa = Number(a.settings?.featured_order ?? 999), fb = Number(b.settings?.featured_order ?? 999);
    if (fa !== fb) return fa - fb;
    const ra = rank[stageOf(a).key], rb = rank[stageOf(b).key];
    return ra - rb || new Date(a.starts_at || 0) - new Date(b.starts_at || 0);
  });
}

async function init() {
  const { data, error } = await supabase.from('platform_opportunities').select('*').eq('status', 'published');
  if (error) {
    $('ocCards').innerHTML = '<p class="oc-state">Opportunities could not be loaded right now. Please check your connection and try again.</p>';
    renderGenericHero();
    return;
  }
  opportunities = sortOpportunities(data || []);
  const holidayPublished = opportunities.some((o) => o.slug === HOLIDAY_SLUG);
  renderList();
  try { renderHero(await loadSlides(holidayPublished)); } catch { renderGenericHero(); }
}

supabase.auth.getSession().then(({ data }) => { $('ocAccountLink').textContent = data.session ? 'My account' : 'Log in / account'; });
supabase.auth.onAuthStateChange((_e, session) => { $('ocAccountLink').textContent = session ? 'My account' : 'Log in / account'; });
init();
