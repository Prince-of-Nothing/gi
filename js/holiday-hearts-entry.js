import { supabase } from './supabaseClient.js';
import { HOLIDAY_SLUG, esc, fmtDate } from './opportunities-shared.js';

const $ = (id) => document.getElementById(id);
const PROMPTS = [
  { id: 'snowed_in', label: 'Snowed In', tagline: 'Two people. One cabin. Zero escape.', img: 'assets/Opportunities/snowed-in.jpg' },
  { id: 'one_last_christmas', label: 'One Last Christmas', tagline: 'An ex, a snowy town, and everything unsaid.', img: 'assets/Opportunities/one-last-christmas.jpg' },
  { id: 'the_royal_holiday', label: 'The Royal Holiday', tagline: 'A prince in disguise at a winter festival.', img: 'assets/Opportunities/royal-holiday.jpg' }
];
const PROMPT_LABEL = Object.fromEntries(PROMPTS.map((p) => [p.id, p.label]));
const STATUS_TEXT = {
  pending: ['info', 'Submitted. Your entry is waiting for the GidiReads team to review it.'],
  under_review: ['info', 'Your entry is being reviewed by the GidiReads team.'],
  approved: ['ok', 'Approved. Your story is now in the Holiday Hearts collection.'],
  rejected: ['bad', 'Not approved.'],
  withdrawn: ['warn', 'You withdrew this entry.'],
  disqualified: ['bad', 'This entry was disqualified.']
};

let user = null, contest = null, isAdmin = false, entry = null;
let draftId = null, chapters = [{ title: '', content: '' }], prompt = null, title = '', synopsis = '';
let dirty = false, saving = false, timer = null;

const words = (t) => (String(t || '').trim().match(/\S+/g) || []).length;
const totalWords = () => chapters.reduce((n, c) => n + words(c.content), 0);
const limits = () => ({ min: Number(contest?.settings?.min_words) || 5000, max: Number(contest?.settings?.max_words) || 30000 });
const windowState = () => {
  const s = contest?.settings || {}, now = new Date(), o = s.submission_opens_at && new Date(s.submission_opens_at), c = s.submission_closes_at && new Date(s.submission_closes_at);
  if (!o || !c) return 'closed';
  return now < o ? 'upcoming' : now <= c ? 'open' : 'closed';
};
const body = () => $('heBody');

/* ---------- Splitting an imported manuscript into chapters ---------- */
function splitChapters(text) {
  const clean = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!clean) return [];
  const head = /^\s*(?:#{1,3}\s+(.+)|((?:chapter|part)\s+[\w-]+[^\n]{0,80})|(prologue|epilogue))\s*$/i;
  const out = []; let cur = null;
  clean.split('\n').forEach((line) => {
    const m = line.match(head);
    if (m && line.trim().length <= 100) { cur = { title: (m[1] || m[2] || m[3]).trim(), content: '' }; out.push(cur); }
    else { if (!cur) { cur = { title: '', content: '' }; out.push(cur); } cur.content += line + '\n'; }
  });
  return out.map((c) => ({ title: c.title, content: c.content.trim() })).filter((c) => c.content || c.title);
}
async function readManuscriptFile(file) {
  const name = file.name.toLowerCase();
  if (/\.(txt|md|markdown|html?)$/.test(name)) {
    const text = await file.text();
    return /\.html?$/.test(name) ? text.replace(/<\/(p|div|h[1-6])>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') : text;
  }
  if (name.endsWith('.docx')) {
    if (!window.mammoth) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'; s.onload = res; s.onerror = () => rej(new Error('Could not load the Word reader. Paste your text instead.')); document.head.appendChild(s); });
    return (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }
  throw new Error('Use a .docx, .txt or .md file, or paste your text.');
}

/* ---------- Saving ---------- */
function setSave(text, cls = '') { const el = $('heSave'); if (el) { el.textContent = text; el.className = 'he-save ' + cls; } }
async function saveDraft(manual = false) {
  if (saving || !contest) return true;
  clearTimeout(timer); saving = true; setSave('Saving…');
  const { data, error } = await supabase.rpc('hh_save_draft', { p_opportunity_id: contest.id, p_prompt: prompt, p_title: title, p_synopsis: synopsis, p_chapters: chapters.map((c) => ({ title: c.title || '', content: c.content || '' })) });
  saving = false;
  if (error || !data?.success) { setSave(`Not saved: ${error?.message || data?.reason || 'please try again'}`, 'is-bad'); return false; }
  draftId = data.draft_id; dirty = false;
  setSave(`Saved ${new Date().toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}`, 'is-ok');
  if (manual) refreshChecklist();
  return true;
}
function touch() { dirty = true; setSave('Unsaved changes…'); clearTimeout(timer); timer = setTimeout(() => saveDraft(), 2200); refreshMeter(); refreshChecklist(); }
window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- Editor rendering ---------- */
function meterMarkup() {
  const { min, max } = limits(), n = totalWords(), pct = Math.min(100, Math.round((n / max) * 100));
  const cls = n > max ? 'is-over' : n >= min ? 'is-ok' : '';
  const hint = n > max ? `${(n - max).toLocaleString()} words over the limit` : n >= min ? 'Within the allowed range' : `${(min - n).toLocaleString()} more words to reach the minimum`;
  return `<div class="he-meter-top"><span><strong>${n.toLocaleString()}</strong> words · ${hint}</span><span class="he-save" id="heSave"></span></div><div class="he-bar ${cls}" role="img" aria-label="${n} of ${max} words"><i style="width:${pct}%"></i></div><div class="he-meter-top" style="margin-top:4px"><span>0</span><span>Min ${min.toLocaleString()} · Max ${max.toLocaleString()}</span></div>`;
}
function refreshMeter() { const m = $('heMeter'); if (!m) return; const save = $('heSave')?.textContent || '', cls = $('heSave')?.className || ''; m.innerHTML = meterMarkup(); setSave(save, cls.replace('he-save ', '')); chapters.forEach((c, i) => { const el = $(`heCw${i}`); if (el) el.textContent = `${words(c.content).toLocaleString()} words`; }); }
function checklist() {
  const { min, max } = limits(), n = totalWords();
  return [
    [!!prompt, 'You chose one of the three official prompts.'],
    [title.trim().length > 0, 'Your story has a title.'],
    [synopsis.trim().length >= 30, 'You added a synopsis (at least 30 characters).'],
    [n >= min && n <= max, `Your story is between ${min.toLocaleString()} and ${max.toLocaleString()} words (now ${n.toLocaleString()}).`],
    [chapters.length > 0 && chapters.every((c) => c.content.trim()), 'Every chapter has text.']
  ];
}
function refreshChecklist() { const ul = $('heChecklist'); if (ul) ul.innerHTML = checklist().map(([ok, t]) => `<li class="${ok ? 'is-ok' : ''}">${esc(t)}</li>`).join(''); }

function chapterMarkup(c, i) {
  return `<div class="he-chapter" data-i="${i}"><div class="he-chapter-head"><span class="he-chapter-n">CH ${i + 1}</span><input type="text" data-title="${i}" maxlength="120" placeholder="Chapter title (optional)" value="${esc(c.title)}" aria-label="Chapter ${i + 1} title"><button type="button" class="he-link" data-remove="${i}" ${chapters.length < 2 ? 'hidden' : ''}>Remove</button></div>
    <textarea data-content="${i}" placeholder="Write or paste this chapter here…" aria-label="Chapter ${i + 1} text">${esc(c.content)}</textarea><div class="he-chapter-foot"><span id="heCw${i}">${words(c.content).toLocaleString()} words</span></div></div>`;
}
function renderChapters() {
  $('heChapters').innerHTML = chapters.map(chapterMarkup).join('');
  $('heChapters').querySelectorAll('[data-title]').forEach((el) => el.addEventListener('input', () => { chapters[+el.dataset.title].title = el.value; touch(); }));
  $('heChapters').querySelectorAll('[data-content]').forEach((el) => el.addEventListener('input', () => { chapters[+el.dataset.content].content = el.value; touch(); }));
  $('heChapters').querySelectorAll('[data-remove]').forEach((el) => el.addEventListener('click', () => { if (confirm('Remove this chapter and its text?')) { chapters.splice(+el.dataset.remove, 1); renderChapters(); touch(); } }));
}

function renderEditor() {
  const ws = windowState(), adminPreview = isAdmin && ws !== 'open';
  body().innerHTML = `
    <h1>Your Holiday Hearts entry</h1>
    <p class="he-lead">Write or import your story here. Your draft saves automatically and stays private until the team approves your entry. This is separate from your normal stories.</p>
    ${adminPreview ? '<p class="he-banner warn">Administrator preview: you can draft now, but submission only works while entries are open.</p>' : ''}
    <div class="he-meter" id="heMeter">${meterMarkup()}</div>

    <section class="he-card"><h2><span class="he-step">1</span>Choose your prompt</h2><p class="hh-sub">One prompt per entry.</p>
      <div class="he-prompts" role="radiogroup" aria-label="Prompt">${PROMPTS.map((p) => `<label class="he-prompt"><input type="radio" name="prompt" value="${p.id}" ${prompt === p.id ? 'checked' : ''}><div class="he-prompt-box"><img src="${p.img}" alt="" loading="lazy"><span>${esc(p.label)}<small>${esc(p.tagline)}</small></span></div></label>`).join('')}</div></section>

    <section class="he-card"><h2><span class="he-step">2</span>Story details</h2>
      <label class="he-field"><span>Title</span><input id="heTitle" maxlength="120" value="${esc(title)}" placeholder="Your story’s title"></label>
      <label class="he-field"><span>Synopsis</span><textarea id="heSynopsis" rows="4" maxlength="1500" placeholder="A short teaser readers will see on the collection page.">${esc(synopsis)}</textarea><span class="he-count" id="heSynCount"></span></label></section>

    <section class="he-card"><h2><span class="he-step">3</span>Your story</h2><p class="hh-sub">Add chapters one by one, or import your manuscript.</p>
      <div id="heChapters"></div>
      <div class="he-actions"><button type="button" class="oc-btn oc-btn-quiet" id="heAdd">+ Add chapter</button><button type="button" class="oc-btn oc-btn-quiet" id="heImportToggle">Import manuscript</button></div>
      <div class="he-import" id="heImport" hidden><strong>Import a manuscript</strong><br>Upload a Word (.docx), .txt or .md file, or paste your text below. Lines like “Chapter 1” or “# Title” start new chapters. This replaces what is in the chapters above.
        <input type="file" id="heFile" accept=".docx,.txt,.md,.markdown,.html,.htm"><textarea id="hePaste" placeholder="…or paste your whole manuscript here"></textarea>
        <div class="he-actions" style="margin-top:10px"><button type="button" class="oc-btn" id="hePasteGo">Use pasted text</button></div><p class="hh-error" id="heImportError" hidden></p></div></section>

    <section class="he-card"><h2><span class="he-step">4</span>Review and submit</h2><p class="hh-sub">Check each point, then confirm and submit. You cannot edit an entry after submitting, but you can withdraw it.</p>
      <ul class="he-check" id="heChecklist"></ul>
      <label class="he-decl"><input type="checkbox" id="heElig"><span>I confirm I meet the Holiday Hearts eligibility rules.</span></label>
      <label class="he-decl"><input type="checkbox" id="heRights"><span>I confirm this is my original work and I hold the rights needed to submit it.</span></label>
      <label class="he-decl"><input type="checkbox" id="heAck"><span>I understand eligible participants may be publicly acknowledged.</span></label>
      <ul class="he-errors" id="heErrors" role="alert"></ul>
      <div class="he-actions"><button class="oc-btn oc-btn-quiet" type="button" id="heSaveBtn">Save draft</button><button class="oc-btn" type="button" id="heSubmit" ${ws === 'open' ? '' : 'disabled aria-disabled="true"'}>Submit entry</button></div>
      ${ws !== 'open' ? '<p class="hh-fine">Submission is only possible while entries are open.</p>' : ''}</section>`;
  renderChapters(); refreshChecklist(); updateSynCount();
  body().querySelectorAll('input[name="prompt"]').forEach((r) => r.addEventListener('change', () => { prompt = r.value; touch(); }));
  $('heTitle').addEventListener('input', (e) => { title = e.target.value; touch(); });
  $('heSynopsis').addEventListener('input', (e) => { synopsis = e.target.value; updateSynCount(); touch(); });
  $('heAdd').addEventListener('click', () => { if (chapters.length >= 60) return alert('A story can have up to 60 chapters.'); chapters.push({ title: '', content: '' }); renderChapters(); touch(); $('heChapters').lastElementChild.querySelector('textarea').focus(); });
  $('heImportToggle').addEventListener('click', () => { $('heImport').hidden = !$('heImport').hidden; });
  $('heFile').addEventListener('change', (e) => importText(e.target.files[0], null));
  $('hePasteGo').addEventListener('click', () => importText(null, $('hePaste').value));
  $('heSaveBtn').addEventListener('click', () => saveDraft(true));
  $('heSubmit').addEventListener('click', submit);
  setSave(draftId ? 'Draft loaded' : 'Not saved yet');
}
function updateSynCount() { const el = $('heSynCount'); if (el) el.textContent = `${synopsis.length} / 1500`; }

async function importText(file, pasted) {
  const err = $('heImportError'); err.hidden = true;
  try {
    const text = file ? await readManuscriptFile(file) : pasted;
    const parts = splitChapters(text);
    if (!parts.length) throw new Error('We could not find any text to import.');
    if (parts.length > 60) throw new Error(`That file has ${parts.length} chapters. The limit is 60.`);
    if (totalWords() > 0 && !confirm('Importing replaces the chapters you have now. Continue?')) return;
    chapters = parts; renderChapters(); touch(); $('heImport').hidden = true; $('hePaste').value = '';
  } catch (e) { err.textContent = e.message || 'Could not import that file.'; err.hidden = false; }
}

async function submit() {
  const list = $('heErrors'), btn = $('heSubmit'); list.innerHTML = '';
  const local = checklist().filter(([ok]) => !ok).map(([, t]) => t);
  if (!$('heElig').checked || !$('heRights').checked || !$('heAck').checked) local.push('Tick all three confirmations.');
  if (local.length) { list.innerHTML = local.map((t) => `<li>${esc(t)}</li>`).join(''); list.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  if (!confirm('Submit your Holiday Hearts entry? You cannot edit it after submitting.')) return;
  btn.disabled = true; btn.textContent = 'Submitting…';
  const saved = await saveDraft(); 
  if (!saved) { btn.disabled = false; btn.textContent = 'Submit entry'; list.innerHTML = '<li>Your draft could not be saved, so it was not submitted. Please try again.</li>'; return; }
  const { data, error } = await supabase.rpc('hh_submit_entry', { p_draft_id: draftId, p_eligibility_confirmed: true, p_rights_confirmed: true, p_acknowledged: true });
  btn.disabled = false; btn.textContent = 'Submit entry';
  if (error || !data?.success) { const errs = data?.errors || [error?.message || 'Your entry could not be submitted.']; list.innerHTML = errs.map((t) => `<li>${esc(t)}</li>`).join(''); list.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  dirty = false; await load(true);
}

/* ---------- Status page for an existing entry ---------- */
function renderStatus() {
  const [cls, text] = STATUS_TEXT[entry.status] || ['info', entry.status];
  const canWithdraw = ['pending', 'under_review', 'approved'].includes(entry.status);
  const canRetry = ['rejected', 'withdrawn'].includes(entry.status) && !entry.story_id && windowState() === 'open';
  body().innerHTML = `<h1>Your Holiday Hearts entry</h1><p class="he-lead">${esc(entry.title || 'Untitled')}</p>
    <p class="he-banner ${cls}"><strong>${esc(text)}</strong>${entry.decision_message ? `<br>${esc(entry.decision_message)}` : ''}</p>
    <div class="he-status"><div>Prompt<strong>${esc(PROMPT_LABEL[entry.prompt] || entry.prompt || '')}</strong></div><div>Words<strong>${(entry.word_count || 0).toLocaleString()}</strong></div><div>Submitted<strong>${esc(fmtDate(entry.submitted_at, true))}</strong></div></div>
    ${entry.status === 'approved' && entry.story_id ? `<div class="he-actions" style="margin-bottom:14px"><a class="oc-btn" href="story.html?id=${esc(entry.story_id)}">Read your story →</a></div>` : ''}
    <p class="he-note">Entries are checked for eligibility before they appear publicly. Voting and results follow the contest timeline on the <a href="holiday-hearts.html#stories">contest page</a>.</p>
    <div class="he-actions" style="margin-top:16px">${canRetry ? '<button class="oc-btn" id="heRetry" type="button">Start a new draft</button>' : ''}${canWithdraw ? '<button class="oc-btn oc-btn-quiet" id="heWithdraw" type="button">Withdraw entry</button>' : ''}</div>`;
  $('heWithdraw')?.addEventListener('click', async () => {
    if (!confirm('Withdraw your entry? It will be removed from the contest' + (entry.status === 'approved' ? ' and your story will be hidden' : '') + '.')) return;
    const { data, error } = await supabase.rpc('hh_withdraw_entry', { p_entry_id: entry.id });
    if (error || !data?.success) return alert(error?.message || data?.reason || 'Could not withdraw the entry.');
    await load(true);
  });
  $('heRetry')?.addEventListener('click', () => { entry = null; renderGate(); });
}

function renderGate() {
  const ws = windowState();
  if (ws === 'open' || isAdmin) return renderEditor();
  const s = contest.settings || {};
  body().innerHTML = `<h1>Your Holiday Hearts entry</h1><p class="he-banner info">${ws === 'upcoming' ? `Entries open ${esc(fmtDate(s.submission_opens_at))}. Come back then to write or import your story.` : 'The submission window has closed. Late entries cannot be accepted.'}</p><a class="oc-btn oc-btn-quiet" href="holiday-hearts.html">Back to the contest page</a>`;
}

/* ---------- Boot ---------- */
async function load(reload = false) {
  const { data: sess } = await supabase.auth.getSession();
  user = sess.session?.user || null;
  if (!user) { location.replace(`auth.html?mode=login&returnTo=${encodeURIComponent('holiday-hearts-entry.html' + location.search)}`); return; }
  const [{ data: opp, error: e1 }, { data: prof }] = await Promise.all([
    supabase.from('platform_opportunities').select('*').eq('slug', HOLIDAY_SLUG).maybeSingle(),
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  ]);
  isAdmin = prof?.role === 'admin';
  if (e1 || !opp || opp.status !== 'published') { body().innerHTML = '<p class="he-banner info">Holiday Hearts is not open for entries right now.</p><a class="oc-btn oc-btn-quiet" href="opportunities.html">See all opportunities</a>'; return; }
  contest = opp;
  const { data: entries } = await supabase.from('holiday_hearts_entries').select('id,story_id,prompt,title,word_count,status,decision_message,submitted_at').eq('opportunity_id', opp.id).eq('author_id', user.id).maybeSingle();
  entry = entries || null;
  if (entry) return renderStatus();
  const { data: draft } = await supabase.from('holiday_hearts_drafts').select('*').eq('opportunity_id', opp.id).eq('author_id', user.id).eq('status', 'draft').maybeSingle();
  const qp = new URLSearchParams(location.search).get('prompt');
  if (draft) { draftId = draft.id; prompt = draft.prompt; title = draft.title; synopsis = draft.synopsis; chapters = Array.isArray(draft.chapters) && draft.chapters.length ? draft.chapters.map((c) => ({ title: c.title || '', content: c.content || '' })) : [{ title: '', content: '' }]; }
  if (!prompt && PROMPT_LABEL[qp]) prompt = qp;
  renderGate();
}
load().catch(() => { body().innerHTML = '<p class="he-banner bad">This page could not be loaded. Please check your connection and try again.</p>'; });
