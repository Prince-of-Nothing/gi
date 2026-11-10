// Build 04 — Opportunity Center and Holiday Hearts administration.
// Uses the existing Supabase client and admin authorization enforced by database RLS.
import { safeImage, safeLink, slideMarkup } from './opportunities-shared.js';
const $ = (id) => document.getElementById(id);
const dateInput = (value) => { if(!value)return ''; const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)); const p=Object.fromEntries(parts.map(x=>[x.type,x.value])); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; };
const dateToIso = (value) => value ? new Date(`${value}:00+01:00`).toISOString() : null;
const dateLabel = (value) => value ? new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}) : 'Not set';
const escapeValue = (value, escapeHtml) => escapeHtml(String(value ?? ''));
const DEFAULT_CONTEST_SETTINGS = {
  timezone:'Africa/Lagos', submission_opens_at:'2026-11-15T00:00:00+01:00', submission_closes_at:'2026-12-15T23:59:00+01:00',
  voting_opens_at:'2026-12-16T00:00:00+01:00', voting_closes_at:'2026-12-22T23:59:00+01:00', winners_announced_at:'2026-12-24T12:00:00+01:00',
  min_words:5000,max_words:30000,completion_percent:70,voting_weight:50,judging_weight:50,
  judging_criteria:{prompt_fit:30,storytelling:30,writing_quality:25,completeness:15}
};

export async function renderOpportunitiesAdmin({supabase,currentUser,adminTabContent,escapeHtml,logAdminAction,showToast}) {
  const esc = (v) => escapeValue(v,escapeHtml);
  let activeOpportunityId = '';
  let cachedOpportunities = [];
  let cachedEntries = [];

  async function loadOpportunities() {
    const {data,error}=await supabase.from('platform_opportunities').select('*').order('created_at',{ascending:false});
    if(error) throw error;
    cachedOpportunities=data||[];
    return cachedOpportunities;
  }

  function prizeLines(p){const t=k=>String(k).replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());return Array.isArray(p)?p.map(x=>`${x.title}: ${x.text}`).join('\n'):(p&&typeof p==='object'?Object.entries(p).map(([k,v])=>`${t(k)}: ${v}`).join('\n'):'');}
  function contentFields(item,settings){
    const lines=a=>Array.isArray(a)?a.join('\n'):'';
    const faq=(Array.isArray(settings.faq)?settings.faq:[]).map(f=>`${f.q} | ${f.a}`).join('\n');
    const instr=Array.isArray(settings.instructions)?settings.instructions.join('\n'):(settings.instructions||'');
    const prizes=prizeLines(settings.prizes);
    return `<div class="adm-subheading"><span class="adm-step">01</span><div><h3>Opportunity page content</h3><p>Shown on the opportunity's own page. Leave a box empty to hide that section. No code changes are needed.</p></div></div>
    <div class="adm-field-grid">
      <label class="adm-field adm-field-wide"><span>Who can apply (one point per line)</span><textarea name="eligibility" rows="4">${esc(lines(settings.eligibility))}</textarea></label>
      <label class="adm-field adm-field-wide"><span>How to apply (one step per line)</span><textarea name="instructions" rows="4">${esc(instr)}</textarea></label>
      <label class="adm-field adm-field-wide"><span>Prizes and benefits (one per line, as “Title: description”)</span><textarea name="prizes" rows="4" data-initial="${esc(prizes)}">${esc(prizes)}</textarea></label>
      <label class="adm-field adm-field-wide"><span>Rules and terms (one rule per line)</span><textarea name="terms" rows="5">${esc(lines(settings.terms))}</textarea></label>
      <label class="adm-field adm-field-wide"><span>FAQ (one per line, as “Question | Answer”)</span><textarea name="faq" rows="4">${esc(faq)}</textarea></label>
      <label class="adm-field"><span>Action button label</span><input name="cta_label" maxlength="40" value="${esc(settings.cta_label||'')}" placeholder="Apply now"></label>
      <label class="adm-field"><span>Action button link (https or a page on this site)</span><input name="cta_url" maxlength="400" value="${esc(settings.cta_url||'')}" placeholder="https://… or apply.html"></label>
      <label class="adm-field"><span>Featured order (1 = first; empty = automatic)</span><input name="featured_order" type="number" min="1" max="99" value="${esc(settings.featured_order||'')}"></label>
      <label class="adm-field"><span>Results</span><select name="results_published"><option value="">Not published</option><option value="1" ${settings.results_published?'selected':''}>Results published</option></select></label>
    </div>`;
  }
  function formMarkup(item={}) {
    const settings=item.settings&&typeof item.settings==='object'?item.settings:{};
    const isContest=item.slug==='holiday-hearts-2026';
    const dates=isContest?{open:settings.submission_opens_at||DEFAULT_CONTEST_SETTINGS.submission_opens_at,close:settings.submission_closes_at||DEFAULT_CONTEST_SETTINGS.submission_closes_at,voteOpen:settings.voting_opens_at||DEFAULT_CONTEST_SETTINGS.voting_opens_at,voteClose:settings.voting_closes_at||DEFAULT_CONTEST_SETTINGS.voting_closes_at,winners:settings.winners_announced_at||DEFAULT_CONTEST_SETTINGS.winners_announced_at}:{};
    return `<section class="adm-manager-panel opp-admin-panel"><div class="adm-panel-heading"><div><p class="adm-kicker">OPPORTUNITY MANAGEMENT</p><h2>${item.id?'Edit opportunity':'Create opportunity'}</h2><p>Publish opportunities to the reader-facing Opportunity Center.</p></div><span class="adm-live-chip"><i></i> Admin controls</span></div>
      <form id="oppAdminForm" class="adm-form"><input type="hidden" name="id" value="${esc(item.id||'')}">
        <div class="adm-field-grid">
          <label class="adm-field"><span>URL slug</span><input name="slug" required maxlength="90" pattern="[a-z0-9]+(-[a-z0-9]+)*" value="${esc(item.slug||'')}" placeholder="holiday-hearts-2026"></label>
          <label class="adm-field"><span>Type</span><select name="opportunity_type"><option value="contest" ${item.opportunity_type==='contest'?'selected':''}>Writing contest</option><option value="program" ${item.opportunity_type==='program'?'selected':''}>Author programme</option><option value="contract" ${item.opportunity_type==='contract'?'selected':''}>Contract opportunity</option><option value="adaptation" ${item.opportunity_type==='adaptation'?'selected':''}>Adaptation opportunity</option><option value="campaign" ${item.opportunity_type==='campaign'?'selected':''}>Special campaign</option><option value="grant" ${item.opportunity_type==='grant'?'selected':''}>Grant</option><option value="announcement" ${item.opportunity_type==='announcement'?'selected':''}>Announcement</option></select></label>
          <label class="adm-field adm-field-wide"><span>Title</span><input name="title" required maxlength="160" value="${esc(item.title||'')}"></label>
          <label class="adm-field adm-field-wide"><span>Short summary</span><textarea name="summary" rows="2" maxlength="500">${esc(item.summary||'')}</textarea></label>
          <label class="adm-field adm-field-wide"><span>Full details and rules</span><textarea name="body" rows="6" maxlength="12000">${esc(item.body||'')}</textarea></label>
          <label class="adm-field"><span>Status</span><select name="status"><option value="draft" ${!item.status||item.status==='draft'?'selected':''}>Draft</option><option value="published" ${item.status==='published'?'selected':''}>Published</option><option value="closed" ${item.status==='closed'?'selected':''}>Closed</option><option value="archived" ${item.status==='archived'?'selected':''}>Archived</option></select></label>
          <label class="adm-field"><span>Card / hero image URL (optional)</span><input name="hero_image_url" maxlength="1000" value="${esc(item.hero_image_url||'')}" placeholder="https://…"></label>
          <label class="adm-field"><span>Opportunity start</span><input name="starts_at" type="datetime-local" value="${dateInput(item.starts_at)}"></label>
          <label class="adm-field"><span>Opportunity end</span><input name="ends_at" type="datetime-local" value="${dateInput(item.ends_at)}"></label>
        </div>
        ${contentFields(item,settings)}
        ${isContest?`<div class="adm-subheading"><span class="adm-step">02</span><div><h3>Holiday Hearts schedule</h3><p>Times are displayed in Africa/Lagos (WAT). Saving these fields updates the contest's authoritative schedule.</p></div></div>
        <div class="adm-field-grid"><label class="adm-field"><span>Submissions open</span><input name="contest_open" type="datetime-local" value="${dateInput(dates.open)}" required></label><label class="adm-field"><span>Submissions close</span><input name="contest_close" type="datetime-local" value="${dateInput(dates.close)}" required></label><label class="adm-field"><span>Reader voting opens</span><input name="contest_vote_open" type="datetime-local" value="${dateInput(dates.voteOpen)}" required></label><label class="adm-field"><span>Reader voting closes</span><input name="contest_vote_close" type="datetime-local" value="${dateInput(dates.voteClose)}" required></label><label class="adm-field"><span>Winners announced</span><input name="contest_winners" type="datetime-local" value="${dateInput(dates.winners)}" required></label><label class="adm-field"><span>Minimum published words</span><input name="min_words" type="number" min="1" max="100000" value="${Number(settings.min_words)||5000}"></label><label class="adm-field"><span>Maximum published words</span><input name="max_words" type="number" min="1" max="100000" value="${Number(settings.max_words)||30000}"></label><label class="adm-field"><span>Completion required (%)</span><input name="completion_percent" type="number" min="1" max="100" value="${Number(settings.completion_percent)||70}"></label></div><p class="adm-muted">One entry per author; original work and Holiday Hearts tag required. The team must verify the “new or newly published” condition and 70% completion at deadline before approving an entry.</p>`:''}
        <div class="adm-form-actions"><p class="adm-muted">Changes are saved to the live opportunity catalogue. Double-check dates and status before publishing.</p><div class="adm-button-row"><button type="button" class="btn btn-outline" id="oppCancelEdit">${item.id?'Cancel edit':'Clear form'}</button><button class="btn btn-primary" id="oppSaveBtn" type="submit">Save opportunity</button></div></div>
      </form></section>`;
  }

  /* ---------------- Hero slideshow manager ---------------- */
  let cachedSlides = [];
  let activeSlideId = '';
  const PRESET_IMAGES = [
    ['assets/Opportunities/holiday-hearts-main.jpg', 'Holiday Hearts — Pick your prompt'],
    ['assets/Opportunities/holiday-hearts-contest.jpg', 'Holiday Hearts — Win a contract offer'],
    ['assets/Opportunities/snowed-in.jpg', 'Prompt — Snowed In'],
    ['assets/Opportunities/one-last-christmas.jpg', 'Prompt — One Last Christmas'],
    ['assets/Opportunities/royal-holiday.jpg', 'Prompt — The Royal Holiday']
  ];
  async function uploadSlideImage(file) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.type)) throw new Error('Choose a JPG, PNG, WEBP or AVIF image.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.');
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(-80) || 'slide-image';
    const path = `${currentUser.id}/opportunities-${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('homepage-media').upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
    if (error) throw error;
    return supabase.storage.from('homepage-media').getPublicUrl(path).data.publicUrl;
  }
  function slideState(sl) {
    const now = Date.now();
    if (!sl.is_active) return ['Off', 'draft'];
    if (sl.starts_at && new Date(sl.starts_at) > now) return ['Scheduled', 'draft'];
    if (sl.ends_at && new Date(sl.ends_at) <= now) return ['Ended', 'closed'];
    return ['Live', 'published'];
  }
  function previewDoc(sl) {
    const base = new URL('.', location.href).href;
    return `<!doctype html><html><head><base href="${base}"><link rel="stylesheet" href="css/opportunities-centre.css"><style>body{margin:0;padding:10px;background:#100a16}</style></head><body class="oc-body"><div class="oc-hero"><div class="oc-track">${slideMarkup(sl, 0, 1)}</div></div></body></html>`;
  }
  function slideFormMarkup(sl = {}) {
    const published = cachedOpportunities.filter((o) => o.status === 'published');
    const preset = PRESET_IMAGES.some(([v]) => v === sl.image_url) ? sl.image_url : '';
    return `<form id="slideForm" class="adm-form"><input type="hidden" name="id" value="${esc(sl.id || '')}">
      <div class="adm-field-grid">
        <label class="adm-field adm-field-wide"><span>Choose a Holiday Hearts image</span><select name="preset"><option value="">— none (use a link or upload below) —</option>${PRESET_IMAGES.map(([v, l]) => `<option value="${esc(v)}" ${preset === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <label class="adm-field adm-field-wide"><span>…or upload a new image (JPG, PNG, WEBP · up to 5 MB)</span><input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif"></label>
        <label class="adm-field adm-field-wide"><span>…or image link (https or assets/…)</span><input name="image_url" maxlength="1000" value="${esc(preset ? '' : (sl.image_url || ''))}" placeholder="https://…"></label>
        <label class="adm-field adm-field-wide"><span>Separate phone image (optional)</span><input name="mobile_image_url" maxlength="1000" value="${esc(sl.mobile_image_url || '')}" placeholder="https://… (leave empty to use the same image)"></label>
        <label class="adm-field adm-field-wide"><span>Image description for screen readers</span><input name="alt_text" maxlength="200" value="${esc(sl.alt_text || '')}"></label>
        <label class="adm-field"><span>Small label above the headline</span><input name="eyebrow" maxlength="60" value="${esc(sl.eyebrow || '')}" placeholder="HOLIDAY HEARTS 2026"></label>
        <label class="adm-field"><span>Headline</span><input name="headline" required maxlength="120" value="${esc(sl.headline || '')}"></label>
        <label class="adm-field adm-field-wide"><span>Description</span><textarea name="description" rows="2" maxlength="400">${esc(sl.description || '')}</textarea></label>
        <label class="adm-field"><span>Button label</span><input name="button_label" maxlength="40" value="${esc(sl.button_label || '')}"></label>
        <label class="adm-field"><span>Button destination</span><input name="button_url" maxlength="400" value="${esc(sl.button_url || '')}" placeholder="holiday-hearts.html or https://…"></label>
        <label class="adm-field adm-field-wide"><span>Featured opportunity (optional)</span><select name="opportunity_id"><option value="">— none —</option>${published.map((o) => `<option value="${esc(o.id)}" ${sl.opportunity_id === o.id ? 'selected' : ''}>${esc(o.title)}</option>`).join('')}</select></label>
        <label class="adm-field"><span>Show from (optional)</span><input name="starts_at" type="datetime-local" value="${dateInput(sl.starts_at)}"></label>
        <label class="adm-field"><span>Hide after (optional)</span><input name="ends_at" type="datetime-local" value="${dateInput(sl.ends_at)}"></label>
        <label class="adm-field"><span>Status</span><select name="is_active"><option value="1" ${sl.is_active === false ? '' : 'selected'}>On</option><option value="0" ${sl.is_active === false ? 'selected' : ''}>Off</option></select></label>
      </div>
      <div class="adm-subheading"><span class="adm-step">P</span><div><h3>Preview</h3><p>Updates as you type. Phone and desktop layouts.</p></div></div>
      <div class="opp-preview-row"><div><small>Phone</small><iframe id="slidePreviewMobile" title="Phone preview" style="width:100%;max-width:360px;height:520px;border:1px solid rgba(216,184,240,.25);border-radius:14px;background:#100a16"></iframe></div><div><small>Desktop</small><iframe id="slidePreviewDesktop" title="Desktop preview" style="width:100%;height:520px;border:1px solid rgba(216,184,240,.25);border-radius:14px;background:#100a16"></iframe></div></div>
      <div class="adm-form-actions"><p class="adm-muted">Slides appear on the Opportunities page in this order. Turn a slide off to hide it without deleting it.</p><div class="adm-button-row"><button type="button" class="btn btn-outline" id="slideCancel">${sl.id ? 'Cancel edit' : 'Clear form'}</button><button class="btn btn-primary" id="slideSave" type="submit">Save slide</button></div></div></form>`;
  }
  async function renderSlidesPanel() {
    const host = $('oppSlidesPanel');
    if (!host) return;
    host.innerHTML = '<section class="adm-manager-panel"><p class="empty-row">Loading slideshow…</p></section>';
    const { data, error } = await supabase.from('platform_opportunity_slides').select('*').order('sort_order', { ascending: true });
    if (error) {
      host.innerHTML = `<section class="adm-manager-panel opp-admin-panel"><div class="adm-notice adm-notice-warning"><strong>Slideshow database setup is incomplete.</strong><p>The slideshow table has not been created yet. Review <code>REVIEW-ONLY-BATCH-1-OPPORTUNITY-SLIDES-MIGRATION.sql</code> and apply it when you approve it. Until then, the Opportunities page shows its built-in Holiday Hearts slides.</p></div></section>`;
      return;
    }
    cachedSlides = data || [];
    const current = cachedSlides.find((x) => x.id === activeSlideId) || {};
    const rows = cachedSlides.map((sl, i) => {
      const [label, cls] = slideState(sl);
      const img = safeImage(sl.image_url);
      return `<article class="adm-history-item"><div class="adm-history-main" style="display:flex;gap:12px;align-items:center">${img ? `<img src="${esc(img)}" alt="" style="width:54px;height:68px;object-fit:cover;border-radius:8px;flex:none">` : ''}<div><div class="adm-history-title-row"><h3>${esc(sl.headline)}</h3><span class="adm-status adm-status-${cls}">${label}</span></div><p>${esc(sl.eyebrow || '')}${sl.button_url ? ` · → ${esc(sl.button_url)}` : ''}</p></div></div>
        <div class="adm-button-row"><button class="btn btn-outline" type="button" data-slide-up="${esc(sl.id)}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn btn-outline" type="button" data-slide-down="${esc(sl.id)}" ${i === cachedSlides.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button><button class="btn btn-outline" type="button" data-slide-toggle="${esc(sl.id)}">${sl.is_active ? 'Turn off' : 'Turn on'}</button><button class="btn btn-outline" type="button" data-slide-edit="${esc(sl.id)}">Edit</button><button class="btn btn-outline" type="button" data-slide-delete="${esc(sl.id)}">Delete</button></div></article>`;
    }).join('');
    host.innerHTML = `<section class="adm-manager-panel opp-admin-panel"><div class="adm-panel-heading"><div><p class="adm-kicker">OPPORTUNITIES PAGE</p><h2>Hero slideshow</h2><p>Controls the banner at the top of the Opportunities page. When a new contest launches, replace or reorder the slides here. If every slide is off, a calm default banner is shown.</p></div><span class="adm-live-chip">${cachedSlides.filter((x) => slideState(x)[1] === 'published').length} live</span></div>
      <div class="adm-history-list">${rows || '<p class="empty-row">No slides yet. Add one below.</p>'}</div></section>
      <section class="adm-manager-panel opp-admin-panel"><div class="adm-panel-heading"><div><p class="adm-kicker">${current.id ? 'EDIT SLIDE' : 'NEW SLIDE'}</p><h2>${current.id ? 'Edit slide' : 'Add a slide'}</h2></div></div>${slideFormMarkup(current)}</section>`;

    const form = $('slideForm');
    const gather = () => {
      const fd = new FormData(form);
      const url = String(fd.get('preset') || '') || String(fd.get('image_url') || '').trim();
      return { image_url: url, mobile_image_url: String(fd.get('mobile_image_url') || '').trim() || null, alt_text: String(fd.get('alt_text') || '').trim() || null, eyebrow: String(fd.get('eyebrow') || '').trim() || null, headline: String(fd.get('headline') || '').trim(), description: String(fd.get('description') || '').trim() || null, button_label: String(fd.get('button_label') || '').trim() || null, button_url: String(fd.get('button_url') || '').trim() || null };
    };
    const refresh = () => { const d = previewDoc(gather()); $('slidePreviewMobile').srcdoc = d; $('slidePreviewDesktop').srcdoc = d; };
    form.addEventListener('input', refresh); refresh();
    $('slideCancel').addEventListener('click', () => { activeSlideId = ''; renderSlidesPanel(); });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const btn = $('slideSave'); btn.disabled = true; btn.textContent = 'Saving…';
      const reset = () => { btn.disabled = false; btn.textContent = 'Save slide'; };
      try {
        const fd = new FormData(form), file = fd.get('file');
        const f = gather();
        if (file && file.size) f.image_url = await uploadSlideImage(file);
        if (!f.headline) { showToast('Add a headline.'); return reset(); }
        if (!safeImage(f.image_url)) { showToast('Choose an image, upload one, or paste an https image link.'); return reset(); }
        if (f.mobile_image_url && !safeImage(f.mobile_image_url)) { showToast('The phone image must be an https link or start with assets/.'); return reset(); }
        if (f.button_url && !safeLink(f.button_url)) { showToast('The button destination must start with https:// or be a page on this site.'); return reset(); }
        if (f.button_url && !f.button_label) { showToast('Add a button label, or clear the destination.'); return reset(); }
        const starts = dateToIso(fd.get('starts_at')), ends = dateToIso(fd.get('ends_at'));
        if (starts && ends && new Date(ends) <= new Date(starts)) { showToast('The end time must be after the start time.'); return reset(); }
        const id = String(fd.get('id') || '');
        const payload = { ...f, opportunity_id: String(fd.get('opportunity_id') || '') || null, is_active: fd.get('is_active') === '1', starts_at: starts, ends_at: ends, updated_by: currentUser.id };
        const maxOrder = cachedSlides.reduce((m, x) => Math.max(m, x.sort_order || 0), 0);
        const result = id
          ? await supabase.from('platform_opportunity_slides').update(payload).eq('id', id).select('id').single()
          : await supabase.from('platform_opportunity_slides').insert({ ...payload, sort_order: maxOrder + 10, created_by: currentUser.id }).select('id').single();
        if (result.error) { showToast(`Could not save slide: ${result.error.message}`); return reset(); }
        await logAdminAction(id ? 'updated_opportunity_slide' : 'created_opportunity_slide', 'platform_opportunity_slides', result.data.id, payload.headline);
        showToast('Slide saved.'); activeSlideId = ''; await renderSlidesPanel();
      } catch (err) { showToast(err.message || 'Could not save the slide.'); reset(); }
    });

    const swap = async (id, dir) => {
      const list = [...cachedSlides], i = list.findIndex((x) => x.id === id), j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      let failed = false;
      for (let k = 0; k < list.length; k++) {
        const { error: e } = await supabase.from('platform_opportunity_slides').update({ sort_order: (k + 1) * 10, updated_by: currentUser.id }).eq('id', list[k].id);
        if (e) failed = true;
      }
      if (failed) showToast('Some slides could not be reordered. Please try again.');
      else await logAdminAction('reordered_opportunity_slides', 'platform_opportunity_slides', id, dir < 0 ? 'moved up' : 'moved down');
      await renderSlidesPanel();
    };
    host.querySelectorAll('[data-slide-up]').forEach((b) => b.addEventListener('click', () => swap(b.dataset.slideUp, -1)));
    host.querySelectorAll('[data-slide-down]').forEach((b) => b.addEventListener('click', () => swap(b.dataset.slideDown, 1)));
    host.querySelectorAll('[data-slide-edit]').forEach((b) => b.addEventListener('click', () => { activeSlideId = b.dataset.slideEdit; renderSlidesPanel().then(() => $('slideForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }));
    host.querySelectorAll('[data-slide-toggle]').forEach((b) => b.addEventListener('click', async () => {
      const sl = cachedSlides.find((x) => x.id === b.dataset.slideToggle);
      const { error: e } = await supabase.from('platform_opportunity_slides').update({ is_active: !sl.is_active, updated_by: currentUser.id }).eq('id', sl.id);
      if (e) { showToast(`Could not update the slide: ${e.message}`); return; }
      await logAdminAction(sl.is_active ? 'disabled_opportunity_slide' : 'enabled_opportunity_slide', 'platform_opportunity_slides', sl.id, sl.headline);
      await renderSlidesPanel();
    }));
    host.querySelectorAll('[data-slide-delete]').forEach((b) => b.addEventListener('click', async () => {
      const sl = cachedSlides.find((x) => x.id === b.dataset.slideDelete);
      if (!confirm(`Delete the slide “${sl.headline}”? This cannot be undone. (Turn it off instead if you may need it again.)`)) return;
      const { error: e } = await supabase.from('platform_opportunity_slides').delete().eq('id', sl.id);
      if (e) { showToast(`Could not delete the slide: ${e.message}`); return; }
      await logAdminAction('deleted_opportunity_slide', 'platform_opportunity_slides', sl.id, sl.headline);
      if (activeSlideId === sl.id) activeSlideId = '';
      await renderSlidesPanel();
    }));
  }

  async function render() {
    adminTabContent.innerHTML='<p class="empty-row">Loading opportunities…</p>';
    try { await loadOpportunities(); } catch(error) { adminTabContent.innerHTML=`<div class="adm-notice adm-notice-warning"><strong>Opportunity Center database setup is incomplete.</strong><p>${esc(error.message)}</p><p>Review and apply <code>GIDIREADS-BUILD-04-MIGRATION.sql</code> only after checking the migration and the current production schema.</p></div>`; return; }
    const list=cachedOpportunities.map(o=>`<article class="adm-history-item"><div class="adm-history-main"><div class="adm-history-title-row"><h3>${esc(o.title)}</h3><span class="adm-status adm-status-${esc(o.status)}">${esc(o.status)}</span></div><p>${esc(o.summary||'No summary')}</p><div class="adm-history-meta"><span>${esc(o.opportunity_type)} · ${esc(o.slug)}</span><span>${o.starts_at?dateLabel(o.starts_at):'No start date'}${o.ends_at?' – '+dateLabel(o.ends_at):''}</span></div></div><div class="adm-button-row"><button class="btn btn-outline" type="button" data-edit-opp="${esc(o.id)}">Edit</button>${o.slug==='holiday-hearts-2026'?`<button class="btn btn-primary" type="button" data-review-contest="${esc(o.id)}">Review entries</button>`:''}</div></article>`).join('');
    adminTabContent.innerHTML=formMarkup(cachedOpportunities.find(o=>o.id===activeOpportunityId)||{})+`<section class="adm-manager-panel opp-admin-panel"><div class="adm-panel-heading"><div><p class="adm-kicker">PUBLISHED PROGRAMMES & CONTESTS</p><h2>Opportunity catalogue</h2><p>Drafts are visible to admins only; publish only after reviewing all rules.</p></div><span class="adm-live-chip">${cachedOpportunities.length} total</span></div><div class="adm-history-list">${list||'<p class="empty-row">No opportunities yet. Create one above.</p>'}</div></section><div id="oppSlidesPanel"></div><div id="holidayReviewPanel"></div>`;
    const form=$('oppAdminForm');
    renderSlidesPanel();
    $('oppCancelEdit').addEventListener('click',()=>{activeOpportunityId='';render();});
    form.addEventListener('submit',async ev=>{
      ev.preventDefault();const btn=$('oppSaveBtn');btn.disabled=true;btn.textContent='Saving…';
      const fd=new FormData(form),id=String(fd.get('id')||''),slug=String(fd.get('slug')||'').trim();
      const starts=dateToIso(fd.get('starts_at')),ends=dateToIso(fd.get('ends_at'));
      if(starts&&ends&&new Date(ends)<=new Date(starts)){showToast('The end date must be after the start date.');btn.disabled=false;btn.textContent='Save opportunity';return;}
      const previous=cachedOpportunities.find(o=>o.id===id),settings={...(previous?.settings||{})};
      const linesOf=k=>String(fd.get(k)||'').split('\n').map(x=>x.trim()).filter(Boolean);
      const setList=(key,formKey)=>{const v=linesOf(formKey);if(v.length)settings[key]=v;else delete settings[key];};
      setList('eligibility','eligibility');setList('instructions','instructions');setList('terms','terms');
      if(settings.terms&&settings.terms.length)settings.rules_version=Math.max(2,Number(settings.rules_version)||0);
      const faqRows=linesOf('faq').map(l=>{const i=l.indexOf('|');return i>0?{q:l.slice(0,i).trim(),a:l.slice(i+1).trim()}:null;}).filter(f=>f&&f.q&&f.a);
      if(faqRows.length)settings.faq=faqRows;else delete settings.faq;
      const prizeBox=form.querySelector('[name="prizes"]');
      if(prizeBox&&prizeBox.value.trim()!==(prizeBox.dataset.initial||'').trim()){
        const rows=linesOf('prizes').map(l=>{const i=l.indexOf(':');return i>0?{title:l.slice(0,i).trim(),text:l.slice(i+1).trim()}:null;}).filter(Boolean);
        if(rows.length)settings.prizes=rows;else delete settings.prizes;
      }
      const ctaLabel=String(fd.get('cta_label')||'').trim(),ctaUrl=String(fd.get('cta_url')||'').trim();
      if(ctaUrl&&!safeLink(ctaUrl)){showToast('The action button link must start with https:// or be a page on this site.');btn.disabled=false;btn.textContent='Save opportunity';return;}
      if(ctaLabel&&ctaUrl){settings.cta_label=ctaLabel;settings.cta_url=ctaUrl;}else{delete settings.cta_label;delete settings.cta_url;}
      const fo=Math.floor(Number(fd.get('featured_order')));if(fo>=1&&fo<=99)settings.featured_order=fo;else delete settings.featured_order;
      if(fd.get('results_published')==='1')settings.results_published=true;else delete settings.results_published;
      if(slug==='holiday-hearts-2026'){
        const toIso=k=>dateToIso(fd.get(k));
        const open=toIso('contest_open'),close=toIso('contest_close'),vo=toIso('contest_vote_open'),vc=toIso('contest_vote_close'),win=toIso('contest_winners');
        if(!open||!close||!vo||!vc||!win||new Date(close)<=new Date(open)||new Date(vo)<=new Date(close)||new Date(vc)<new Date(vo)||new Date(win)<new Date(vc)){showToast('Check the contest schedule: submission, voting and winner dates must be in the correct order.');btn.disabled=false;btn.textContent='Save opportunity';return;}
        Object.assign(settings,{timezone:'Africa/Lagos',submission_opens_at:open,submission_closes_at:close,voting_opens_at:vo,voting_closes_at:vc,winners_announced_at:win,min_words:Math.max(1,Number(fd.get('min_words'))||5000),max_words:Math.max(1,Number(fd.get('max_words'))||30000),completion_percent:Math.min(100,Math.max(1,Number(fd.get('completion_percent'))||70))});
        if(settings.max_words<settings.min_words){showToast('Maximum word count must be greater than or equal to minimum word count.');btn.disabled=false;btn.textContent='Save opportunity';return;}
      }
      if(String(fd.get('hero_image_url')||'').trim()&&!safeImage(String(fd.get('hero_image_url')).trim())){showToast('The image must be an https link or start with assets/.');btn.disabled=false;btn.textContent='Save opportunity';return;}
      const payload={slug,title:String(fd.get('title')||'').trim(),summary:String(fd.get('summary')||'').trim(),body:String(fd.get('body')||'').trim(),opportunity_type:String(fd.get('opportunity_type')),status:String(fd.get('status')),hero_image_url:String(fd.get('hero_image_url')||'').trim()||null,starts_at:starts,ends_at:ends,settings,updated_by:currentUser.id,updated_at:new Date().toISOString()};
      let result=id?await supabase.from('platform_opportunities').update(payload).eq('id',id).select('id').single():await supabase.from('platform_opportunities').insert({...payload,created_by:currentUser.id}).select('id').single();
      btn.disabled=false;btn.textContent='Save opportunity';if(result.error){showToast(`Could not save opportunity: ${result.error.message}`);return;}
      await logAdminAction(id?'updated_opportunity':'created_opportunity','platform_opportunities',result.data.id,payload.status);showToast('Opportunity saved.');activeOpportunityId='';await render();
    });
    adminTabContent.querySelectorAll('[data-edit-opp]').forEach(btn=>btn.addEventListener('click',()=>{activeOpportunityId=btn.dataset.editOpp;render();}));
    adminTabContent.querySelectorAll('[data-review-contest]').forEach(btn=>btn.addEventListener('click',()=>renderEntries(btn.dataset.reviewContest)));
  }
  async function renderEntries(opportunityId) {
    const panel = $('holidayReviewPanel');
    panel.innerHTML = '<section class="adm-manager-panel"><p>Loading contest entries…</p></section>';
    const { data: opp, error: oppError } = await supabase.from('platform_opportunities').select('id,title,settings').eq('id', opportunityId).single();
    const { data: entries, error: entryError } = await supabase.from('holiday_hearts_entries')
      .select('id,story_id,author_id,prompt,title,synopsis,word_count,status,decision_message,submitted_at,reviewed_at,source').eq('opportunity_id', opportunityId).order('submitted_at', { ascending: true });
    if (oppError || entryError) { panel.innerHTML = `<section class="adm-manager-panel"><h2>Could not load contest entries</h2><p>${esc((oppError || entryError).message)}</p></section>`; return; }
    cachedEntries = entries || [];
    const ids = cachedEntries.map((x) => x.id), authorIds = [...new Set(cachedEntries.map((x) => x.author_id))];
    const [{ data: authors }, { data: notes }, { data: votes }] = await Promise.all([
      authorIds.length ? supabase.from('profiles').select('id,username,display_name').in('id', authorIds) : { data: [] },
      ids.length ? supabase.from('holiday_hearts_entry_reviews').select('entry_id,internal_notes').in('entry_id', ids) : { data: [] },
      supabase.from('holiday_hearts_votes').select('entry_id').eq('opportunity_id', opportunityId)
    ]);
    const nameOf = (id) => { const p = (authors || []).find((x) => x.id === id) || {}; return p.display_name || p.username || 'Unknown author'; };
    const noteOf = (id) => (notes || []).find((x) => x.entry_id === id)?.internal_notes || '';
    const votesOf = (id) => (votes || []).filter((v) => v.entry_id === id).length;
    const min = Number(opp.settings?.min_words) || 5000, max = Number(opp.settings?.max_words) || 30000;
    const labels = { snowed_in: 'Snowed In', one_last_christmas: 'One Last Christmas', the_royal_holiday: 'The Royal Holiday' };
    let filter = 'all';

    const card = (x) => {
      const okWords = x.word_count >= min && x.word_count <= max, open = ['pending', 'under_review'].includes(x.status);
      return `<article class="opp-judge-card" data-entry-card="${esc(x.id)}"><div class="opp-judge-title"><div><h3>${esc(x.title || 'Untitled entry')}</h3>
        <p>by ${esc(nameOf(x.author_id))} · ${esc(labels[x.prompt] || x.prompt)}</p>
        <small>Submitted ${dateLabel(x.submitted_at)} · <b style="color:${okWords ? '#98e8bd' : '#ffb0b8'}">${(x.word_count || 0).toLocaleString()} words ${okWords ? '(in range)' : `(outside ${min.toLocaleString()}–${max.toLocaleString()})`}</b> · ${votesOf(x.id)} vote(s)${x.source === 'story' ? ' · legacy story entry' : ''}</small></div>
        <span class="adm-status adm-status-${esc(x.status)}">${esc(x.status.replace('_', ' '))}</span></div>
        ${x.synopsis ? `<p class="opp-judge-note">${esc(x.synopsis)}</p>` : ''}
        ${x.decision_message ? `<p class="opp-judge-note"><b>Message to author:</b> ${esc(x.decision_message)}</p>` : ''}
        <div class="adm-button-row" style="margin:8px 0"><button class="btn btn-outline" type="button" data-read="${esc(x.id)}">Read manuscript</button>${x.story_id ? `<a class="btn btn-outline" href="story.html?id=${esc(x.story_id)}" target="_blank" rel="noopener">Open public story</a>` : ''}</div>
        <div data-ms style="display:none;max-height:340px;overflow:auto;margin:8px 0;padding:12px;border-radius:12px;background:#110a18;border:1px solid rgba(216,184,240,.18);white-space:pre-wrap;line-height:1.6"></div>
        ${['withdrawn'].includes(x.status) ? '<p class="empty-row">Withdrawn by the author. No action available.</p>' : `
        <div class="adm-field-grid"><label class="adm-field adm-field-wide"><span>Message to the author (required to reject or disqualify)</span><textarea data-msg rows="2" maxlength="500" placeholder="Explain the decision clearly. The author will see this."></textarea></label>
        <label class="adm-field adm-field-wide"><span>Internal notes (never shown to the author)</span><textarea data-notes rows="2" maxlength="4000">${esc(noteOf(x.id))}</textarea></label></div>
        <div class="adm-button-row">
          ${x.status !== 'approved' ? '<button class="btn btn-primary" type="button" data-decide="approve">Approve and publish</button>' : ''}
          ${open || x.status === 'rejected' ? '' : ''}
          ${x.status === 'pending' ? '<button class="btn btn-outline" type="button" data-decide="under_review">Mark under review</button>' : ''}
          ${x.status !== 'rejected' && x.status !== 'disqualified' ? '<button class="btn btn-outline" type="button" data-decide="reject">Reject</button>' : ''}
          ${x.status !== 'disqualified' ? '<button class="btn btn-outline" type="button" data-decide="disqualify">Disqualify</button>' : ''}
        </div>`}</article>`;
    };
    const draw = () => {
      const shown = cachedEntries.filter((x) => filter === 'all' || x.status === filter);
      const counts = cachedEntries.reduce((m, x) => ({ ...m, [x.status]: (m[x.status] || 0) + 1 }), {});
      panel.innerHTML = `<section class="adm-manager-panel opp-admin-panel"><div class="adm-panel-heading"><div><p class="adm-kicker">HOLIDAY HEARTS · ENTRY REVIEW</p><h2>${esc(opp.title)} entries</h2><p>Check eligibility and approve entries. Approval publishes the story into the Holiday Hearts collection with the system tag. There is no judging panel: winners come from reader voting and verified engagement.</p></div><div class="adm-button-row"><button class="btn btn-outline" type="button" id="closeContestReview">Close review</button></div></div>
        <div class="adm-field-grid"><label class="adm-field"><span>Show</span><select id="entryFilter"><option value="all">All entries (${cachedEntries.length})</option>${['pending', 'under_review', 'approved', 'rejected', 'disqualified', 'withdrawn'].map((s) => `<option value="${s}" ${filter === s ? 'selected' : ''}>${s.replace('_', ' ')} (${counts[s] || 0})</option>`).join('')}</select></label></div>
        ${shown.length ? shown.map(card).join('') : '<p class="empty-row">No entries match this filter yet.</p>'}</section>`;
      $('closeContestReview').addEventListener('click', () => { panel.innerHTML = ''; });
      $('entryFilter').addEventListener('change', (ev) => { filter = ev.target.value; draw(); });
      panel.querySelectorAll('[data-entry-card]').forEach((el) => {
        const id = el.dataset.entryCard;
        el.querySelector('[data-read]')?.addEventListener('click', async (ev) => {
          const box = el.querySelector('[data-ms]'); if (box.style.display === 'block') { box.style.display = 'none'; return; }
          box.style.display = 'block'; box.textContent = 'Loading manuscript…';
          const { data, error } = await supabase.from('holiday_hearts_entry_manuscripts').select('chapters').eq('entry_id', id).maybeSingle();
          if (error || !data) { box.textContent = 'No manuscript snapshot found for this entry.'; return; }
          box.textContent = (data.chapters || []).map((c, i) => `${c.title || 'Chapter ' + (i + 1)}\n\n${c.content}`).join('\n\n— — —\n\n');
        });
        el.querySelectorAll('[data-decide]').forEach((b) => b.addEventListener('click', async () => {
          const decision = b.dataset.decide, msg = el.querySelector('[data-msg]').value.trim(), notes = el.querySelector('[data-notes]').value;
          if (['reject', 'disqualify'].includes(decision) && msg.length < 10) { showToast('Write a clear message to the author (at least 10 characters).'); return; }
          const warn = { approve: 'Approve this entry and publish the story in the Holiday Hearts collection?', reject: 'Reject this entry? The author is told why.', disqualify: 'Disqualify this entry? Its story is hidden and the author is told why.', under_review: 'Mark this entry as under review?' }[decision];
          if (!confirm(warn)) return;
          b.disabled = true;
          const { data, error } = await supabase.rpc('hh_admin_review_entry', { p_entry_id: id, p_decision: decision, p_message: msg, p_internal_notes: notes });
          if (error || !data?.success) { b.disabled = false; showToast(`Could not save the decision: ${error?.message || data?.reason || 'unknown error'}`); return; }
          showToast(decision === 'approve' ? 'Entry approved and published.' : 'Decision saved.');
          await renderEntries(opportunityId);
        }));
      });
    };
    draw();
  }
  await render();
}
