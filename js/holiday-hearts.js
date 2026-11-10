import { supabase } from './supabaseClient.js';
import { HOLIDAY_SLUG, esc, safeImage, fmtDate } from './opportunities-shared.js';

const $ = (id) => document.getElementById(id);
let contest = null, currentUser = null, myStories = [], entryRows = [];

/* ---------- Official content ---------- */
const PROMPTS = [
  { id: 'snowed_in', n: '01', label: 'Snowed In', tagline: 'Two people. One cabin. Zero escape.', img: 'assets/Opportunities/snowed-in.jpg', alt: 'Snowed In: a couple wrapped together by a winter fireplace' },
  { id: 'one_last_christmas', n: '02', label: 'One Last Christmas', tagline: 'An ex, a snowy town, and everything unsaid.', img: 'assets/Opportunities/one-last-christmas.jpg', alt: 'One Last Christmas: a couple dancing by a lit Christmas tree' },
  { id: 'the_royal_holiday', n: '03', label: 'The Royal Holiday', tagline: 'A prince in disguise at a winter festival.', img: 'assets/Opportunities/royal-holiday.jpg', alt: 'The Royal Holiday: a girl in a red dress on a grand staircase facing a silhouetted figure' }
];
const PROMPT_LABEL = Object.fromEntries(PROMPTS.map((p) => [p.id, p.label]));

const DEFAULT_PRIZES = [
  { tag: '1st place', title: 'Winner', text: 'Contract offer, hero and homepage features, social promotion and a winner badge.' },
  { tag: '2nd place', title: 'First runner-up', text: 'Contract offer, homepage feature, social promotion and a winner badge.' },
  { tag: '3rd place', title: 'Second runner-up', text: 'Contract offer, a featured spot in the Holiday Hearts collection and a winner badge.' },
  { tag: 'Readers', title: 'Reader’s Choice', text: 'A Reader’s Choice badge and a newsletter shout-out.' },
  { tag: 'Everyone', title: 'Every eligible participant', text: 'A participant badge and a place in the Holiday Hearts section.' }
];
const DEFAULT_RULES = [
  'Write an original holiday romance based on one of the three official prompts.',
  'One entry per author. You must own or control the rights to the work.',
  'Your story must be between 5,000 and 30,000 words.',
  'Submit before the deadline. Late entries cannot be accepted.',
  'You will confirm the required eligibility, originality and rights declarations when you enter.',
  'Entries are reviewed for eligibility before they appear publicly. Entries that are withdrawn, invalid or disqualified are not shown.',
  'Suspicious or coordinated voting and artificial engagement may be reviewed and excluded. Rule violations can lead to disqualification.',
  'Contract offers are subject to eligibility, editorial review, rights checks and your acceptance of the actual contract terms. The contest does not by itself require exclusivity.'
];

/* ---------- Timeline + stage (all from the contest settings) ---------- */
function times() {
  const s = contest?.settings || {}, d = (v) => (v ? new Date(v) : null);
  return { open: d(s.submission_opens_at), close: d(s.submission_closes_at), voteOpen: d(s.voting_opens_at), voteClose: d(s.voting_closes_at), winners: d(s.winners_announced_at), finalists: d(s.finalists_announced_at) };
}
function stageInfo(now = new Date()) {
  const t = times(), s = contest?.settings || {};
  if (s.results_published) return { key: 'results', label: 'Results published', note: 'See who won.', canEnter: false, canVote: false };
  if (!t.open || !t.close) return { key: 'upcoming', label: 'Coming soon', note: 'Dates will be announced.', canEnter: false, canVote: false };
  if (now < t.open) return { key: 'upcoming', label: 'Opening soon', note: `Submissions open ${fmtDate(t.open)}.`, canEnter: false, canVote: false };
  if (now <= t.close) return { key: 'open', label: 'Accepting entries', note: `Submissions close ${fmtDate(t.close, true)}.`, canEnter: true, canVote: false };
  if (t.voteOpen && t.voteClose && now >= t.voteOpen && now <= t.voteClose) return { key: 'voting', label: 'Voting open', note: `Voting closes ${fmtDate(t.voteClose, true)}.`, canEnter: false, canVote: true };
  if (t.voteClose && now > t.voteClose) return { key: 'voted', label: 'Voting closed', note: 'Results are being checked and confirmed.', canEnter: false, canVote: false };
  if (t.finalists && now >= t.finalists) return { key: 'finalists', label: 'Finalists announced', note: t.voteOpen ? `Voting opens ${fmtDate(t.voteOpen)}.` : '', canEnter: false, canVote: false };
  return { key: 'review', label: 'Entries under review', note: t.voteOpen ? `Voting opens ${fmtDate(t.voteOpen)}.` : 'The team is checking entries.', canEnter: false, canVote: false };
}

function renderStage() {
  const st = stageInfo();
  $('hhStage').dataset.stage = st.key;
  $('hhStageLabel').textContent = st.label;
  $('hhStageNote').textContent = st.note ? ` ${st.note}` : '';
  const acts = $('hhHeroActions');
  const btn = (href, text, quiet) => `<a class="oc-btn${quiet ? ' oc-btn-quiet' : ''}" href="${href}">${text} <span aria-hidden="true">→</span></a>`;
  if (st.key === 'open') acts.innerHTML = btn('#prompts', 'Choose your prompt') + btn('#enter', 'Enter now', true);
  else if (st.key === 'voting') acts.innerHTML = btn('#stories', 'Read and vote');
  else if (st.key === 'results') acts.innerHTML = btn('#stories', 'See the stories');
  else acts.innerHTML = btn('#prompts', 'See the prompts') + btn('#prizes', 'View the prizes', true);
}

function renderTimeline() {
  const t = times(), now = new Date();
  const steps = [
    { title: 'Submissions open', when: fmtDate(t.open), at: t.open, until: t.close },
    { title: 'Submissions close', when: fmtDate(t.close, true), at: t.close, until: t.voteOpen },
    { title: 'Eligibility checks and finalists', when: 'After submissions close', at: t.close, until: t.voteOpen },
    { title: 'Reader voting', when: t.voteOpen && t.voteClose ? `${fmtDate(t.voteOpen)} – ${fmtDate(t.voteClose)}` : '', at: t.voteOpen, until: t.voteClose },
    { title: 'Winners announced', when: fmtDate(t.winners), at: t.winners, until: null }
  ].filter((s) => s.when);
  $('hhTimeline').innerHTML = steps.map((s) => {
    const done = s.until ? now > s.until : (s.at && now > s.at);
    const current = !done && s.at && now >= s.at && (!s.until || now <= s.until);
    return `<li class="hh-step ${done ? 'is-done' : current ? 'is-current' : ''}"><span class="hh-step-dot" aria-hidden="true"></span><div><strong>${esc(s.title)}</strong><span>${esc(s.when)}</span></div></li>`;
  }).join('') || '<li class="hh-step"><div><strong>Dates will be announced soon.</strong></div></li>';
}

function renderPrompts() {
  const st = stageInfo();
  $('hhPrompts').innerHTML = PROMPTS.map((p) => `<article class="hh-prompt">
    <div class="hh-prompt-poster"><img src="${esc(p.img)}" alt="${esc(p.alt)}" loading="lazy" decoding="async"></div>
    <div class="hh-prompt-copy"><span class="hh-prompt-n">PROMPT ${p.n}</span><h3>${esc(p.label)}</h3><p>${esc(p.tagline)}</p>
    ${st.canEnter
      ? `<a class="oc-btn" href="holiday-hearts-entry.html?prompt=${p.id}">Write this prompt <span aria-hidden="true">→</span></a>`
      : `<span class="oc-chip oc-chip-${st.key === 'upcoming' ? 'upcoming' : 'closed'}">${st.key === 'upcoming' ? 'Opens ' + esc(fmtDate(times().open)) : 'Entries closed'}</span>`}
    </div></article>`).join('');
}

function renderPrizes() {
  const custom = contest?.settings?.prizes;
  const rows = Array.isArray(custom) && custom.length ? custom.map((p) => ({ tag: '', title: p.title, text: p.text })) : DEFAULT_PRIZES;
  $('hhPrizes').innerHTML = rows.map((p) => `<div class="hh-prize-row">${p.tag ? `<span class="hh-prize-tag">${esc(p.tag)}</span>` : ''}<div><strong>${esc(p.title)}</strong><span>${esc(p.text)}</span></div></div>`).join('');
}

function renderScoring() {
  const s = contest?.settings?.scoring || {};
  const v = Number(s.voting_weight) || 70, e = Number(s.engagement_weight) || 30;
  $('hhScore').innerHTML = `<div class="hh-score-bar" role="img" aria-label="${v} percent public voting, ${e} percent verified story engagement"><span style="flex:${v}"><b>${v}%</b> Public voting</span><span style="flex:${e}"><b>${e}%</b> Story engagement</span></div>
    <div class="hh-score-cols"><div><h3>Public voting</h3><p>Finalists go to a reader vote. Every eligible GidiReads account can vote, once per account.</p></div>
    <div><h3>Verified engagement</h3><p>Real reader activity during the contest, such as reading-list additions, likes, reviews and comments, checked by the system.</p></div></div>`;
  $('hhScoreNote').textContent = 'The exact scoring method is published before entries open. Live vote totals are hidden during voting, and results are published only after the team confirms them.';
}

function renderRules() {
  const s = contest?.settings || {};
  const rules = Number(s.rules_version) >= 2 && Array.isArray(s.terms) && s.terms.length ? s.terms : DEFAULT_RULES;
  $('hhRules').innerHTML = rules.map((r) => `<li>${esc(r)}</li>`).join('');
}

/* ---------- Entry panel: links to the contest editor ---------- */
const ENTRY_TEXT = { pending: 'Submitted — waiting for review', under_review: 'Under review', approved: 'Approved — your story is in the collection', rejected: 'Not approved', withdrawn: 'Withdrawn', disqualified: 'Disqualified' };

async function renderEnter() {
  const st = stageInfo(), section = $('enter'), body = $('hhEnterBody');
  section.hidden = !st.canEnter;
  if (!st.canEnter) return;
  if (!currentUser) { body.innerHTML = `<div class="hh-panel"><p>Log in to write or import your Holiday Hearts story.</p><a class="oc-btn" href="auth.html?mode=login&returnTo=${encodeURIComponent('holiday-hearts-entry.html')}">Log in to enter <span aria-hidden="true">→</span></a></div>`; return; }
  const { data: mine } = await supabase.from('holiday_hearts_entries').select('status,title').eq('opportunity_id', contest.id).eq('author_id', currentUser.id).maybeSingle();
  const { data: draft } = mine ? { data: null } : await supabase.from('holiday_hearts_drafts').select('title,word_count').eq('opportunity_id', contest.id).eq('author_id', currentUser.id).eq('status', 'draft').maybeSingle();
  if (mine) {
    body.innerHTML = `<div class="hh-panel"><p><strong>${esc(mine.title || 'Your entry')}</strong><br>${esc(ENTRY_TEXT[mine.status] || mine.status)}</p><a class="oc-btn" href="holiday-hearts-entry.html">View your entry <span aria-hidden="true">→</span></a></div>`;
  } else if (draft) {
    body.innerHTML = `<div class="hh-panel"><p>You have a draft in progress${draft.title ? `: <strong>${esc(draft.title)}</strong>` : ''} (${(draft.word_count || 0).toLocaleString()} words).</p><a class="oc-btn" href="holiday-hearts-entry.html">Continue your entry <span aria-hidden="true">→</span></a></div>`;
  } else {
    body.innerHTML = `<div class="hh-panel"><p>Pick a prompt, then write your story in the contest editor or import your manuscript. Your draft saves automatically and stays private until the team approves your entry. It is kept separate from your normal stories.</p><a class="oc-btn" href="holiday-hearts-entry.html">Start your entry <span aria-hidden="true">→</span></a></div>`;
  }
}

/* ---------- Stories (approved entries) + voting ---------- */
async function loadEntries() {
  const grid = $('hhStories'), st = stageInfo();
  const { data, error } = await supabase.from('holiday_hearts_entries').select('id,story_id,author_id,prompt,title,synopsis,word_count,status,award,readers_choice,submitted_at,stories(title,cover_url,profiles!stories_author_id_fkey(username,display_name))').eq('opportunity_id', contest.id).eq('status', 'approved').order('submitted_at', { ascending: true });
  if (error) { grid.innerHTML = '<p class="oc-state">Approved entries will appear here once the contest is under way.</p>'; return; }
  entryRows = data || [];
  $('hhStoriesSub').textContent = entryRows.length ? `${entryRows.length} approved ${entryRows.length === 1 ? 'entry' : 'entries'}. Eligible participants may be publicly acknowledged.` : 'Approved entries appear here. Eligible participants may be publicly acknowledged.';
  grid.innerHTML = entryRows.length ? entryRows.map((e) => {
    const story = e.stories || {}, profile = story.profiles || {}, name = profile.display_name || profile.username || 'GidiReads author', cover = safeImage(story.cover_url);
    const award = e.award && e.award !== 'none' && e.award !== 'participant' ? e.award.replaceAll('_', ' ') : '';
    const storyTitle = e.title || story.title || 'Untitled story';
    return `<article class="hh-story"><div class="hh-story-cover">${cover ? `<img src="${esc(cover)}" alt="Cover of ${esc(storyTitle)}" loading="lazy">` : '<span>GR</span>'}</div>
      <div class="hh-story-copy"><h3>${esc(storyTitle)}</h3><p class="hh-story-by">by ${esc(name)}${e.word_count ? ` · ${e.word_count.toLocaleString()} words` : ''}</p>
      <p class="hh-story-note">${esc(e.synopsis || 'A Holiday Hearts entry.')}</p>
      <div class="hh-story-tags"><span>${esc(PROMPT_LABEL[e.prompt] || e.prompt)}</span>${award ? `<span class="is-award">${esc(award)}</span>` : ''}${e.readers_choice ? '<span class="is-award">Reader’s Choice</span>' : ''}</div>
      <div class="hh-story-actions">${e.story_id ? `<a class="oc-btn oc-btn-quiet" href="story.html?id=${esc(e.story_id)}">Read story</a>` : ''}${st.canVote ? `<button class="oc-btn" data-vote="${esc(e.id)}" type="button">Vote</button>` : ''}</div></div></article>`;
  }).join('') : '<p class="oc-state">Approved entries will appear here after the GidiReads team reviews submissions.</p>';
  grid.querySelectorAll('[data-vote]').forEach((b) => b.addEventListener('click', () => castVote(b)));
}
async function castVote(btn) {
  if (!currentUser) { location.href = `auth.html?mode=login&returnTo=${encodeURIComponent('holiday-hearts.html#stories')}`; return; }
  if (!confirm('Cast your one Holiday Hearts reader vote for this story? You cannot change your vote afterwards.')) return;
  btn.disabled = true; btn.textContent = 'Submitting vote…';
  const { data, error } = await supabase.rpc('cast_holiday_hearts_vote', { p_entry_id: btn.dataset.vote });
  if (error || !data?.success) { btn.disabled = false; btn.textContent = 'Vote for this story'; alert(error ? `Could not submit your vote: ${error.message}` : (data?.reason || 'Your vote could not be recorded.')); return; }
  btn.textContent = 'Vote recorded'; alert('Your reader vote has been recorded. Thank you.');
}

/* ---------- Boot ---------- */
function renderAll() { renderStage(); renderTimeline(); renderPrompts(); renderPrizes(); renderScoring(); renderRules(); renderEnter(); }

async function init() {
  const { data, error } = await supabase.from('platform_opportunities').select('*').eq('slug', HOLIDAY_SLUG).maybeSingle();
  if (error || !data || (data.status !== 'published' && data.status !== 'closed')) {
    $('hhStageLabel').textContent = error ? 'Could not load the contest' : 'Not published yet';
    $('hhStageNote').textContent = error ? ' Please check your connection and try again.' : ' Please check back soon.';
    $('hhHeroActions').innerHTML = '<a class="oc-btn oc-btn-quiet" href="opportunities.html">See all opportunities</a>';
    $('hhStories').innerHTML = '';
    return;
  }
  contest = data;
  renderAll();
  await loadEntries();
}
supabase.auth.getSession().then(({ data }) => { currentUser = data.session?.user || null; const accountLink = $('hhAccountLink') || $('homeProfileAvatar'); const loginBtn = $('loginBtn'); if (accountLink && accountLink.id === 'hhAccountLink') accountLink.textContent = currentUser ? 'My account' : 'Log in / account'; if (loginBtn) loginBtn.textContent = currentUser ? 'Log out' : 'Log in'; if (contest) { renderEnter(); } });
supabase.auth.onAuthStateChange((_e, session) => { currentUser = session?.user || null; const accountLink = $('hhAccountLink') || $('homeProfileAvatar'); const loginBtn = $('loginBtn'); if (accountLink && accountLink.id === 'hhAccountLink') accountLink.textContent = currentUser ? 'My account' : 'Log in / account'; if (loginBtn) loginBtn.textContent = currentUser ? 'Log out' : 'Log in'; if (contest) renderEnter(); });
init();
