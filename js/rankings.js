import { supabase } from './supabaseClient.js';

const $ = id => document.getElementById(id);
const state = { board: 'novels', period: 'weekly', cap: 100, loaded: 0, rows: [], busy: false, exhausted: false };
const PAGE_SIZE = 50;
const list = $('rankingsList');
const status = $('rankingsStatus');
const more = $('loadMoreRankings');
const explainer = $('rankingsExplainer');

function esc(value) {
  const el = document.createElement('span');
  el.textContent = String(value ?? '');
  return el.innerHTML;
}
function fmt(value) { return new Intl.NumberFormat().format(Number(value) || 0); }
function crown(rank) {
  if (rank > 3) return '';
  const color = rank === 1 ? '#e7c77c' : rank === 2 ? '#d5d9e2' : '#c99570';
  return `<svg class="ranking-crown" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-label="Top three"><path d="m3 8 5 4 4-7 4 7 5-4-2 11H5L3 8Z"/><path d="M5 21h14"/></svg>`;
}
function rankClass(rank) { return rank === 1 ? 'rank-first' : rank === 2 ? 'rank-second' : rank === 3 ? 'rank-third' : ''; }
function novelRow(row) {
  const title = row.title || 'Untitled novel';
  const author = row.author_display_name || row.author_username || 'GidiReads author';
  const cover = row.cover_url
    ? `<img src="${esc(row.cover_url)}" alt="Cover of ${esc(title)}" loading="lazy">`
    : `<div class="ranking-cover-fallback">${esc(title.charAt(0).toUpperCase())}</div>`;
  const storyStatus = String(row.story_status || '').toLowerCase() === 'completed' ? 'Completed' : 'Ongoing';
  return `<article class="ranking-row ${rankClass(Number(row.rank))}">
    <div class="ranking-position"><span class="ranking-number">#${fmt(row.rank)}</span>${crown(Number(row.rank))}</div>
    <a class="ranking-cover" href="story.html?id=${encodeURIComponent(row.story_id)}" aria-label="Open ${esc(title)}">${cover}</a>
    <div class="ranking-copy">
      <h3><a href="story.html?id=${encodeURIComponent(row.story_id)}">${esc(title)}</a></h3>
      <p class="ranking-byline">By ${esc(author)}</p>
      <div class="ranking-tags"><span class="ranking-status-tag ${storyStatus.toLowerCase()}">${storyStatus}</span><span class="ranking-genre">${esc(row.primary_genre || 'General')}</span></div>
      <div class="ranking-metrics"><span><strong>${fmt(row.chapter_count)}</strong> Chapters</span><span><strong>${fmt(row.lifetime_reads)}</strong> Reads</span><span><strong>${fmt(row.lifetime_echoes)}</strong> Echoes</span><span><strong>${fmt(row.lifetime_collections)}</strong> Collections</span><span><strong>${fmt(row.lifetime_reviews)}</strong> Reviews</span><span class="ranking-score"><strong>${Number(row.rank_score || 0).toFixed(1)}</strong> Score</span></div>
    </div>
  </article>`;
}
function readerRow(row) {
  const name = row.display_name || row.username || 'GidiReads reader';
  const avatar = row.avatar_url
    ? `<img src="${esc(row.avatar_url)}" alt="${esc(name)}" loading="lazy">`
    : esc(name.trim().charAt(0).toUpperCase() || 'G');
  return `<article class="ranking-row reader-ranking-row ${rankClass(Number(row.rank))}">
    <div class="ranking-position"><span class="ranking-number">#${fmt(row.rank)}</span>${crown(Number(row.rank))}</div>
    <a class="reader-avatar" href="author.html?id=${encodeURIComponent(row.user_id)}" aria-label="View ${esc(name)} profile">${avatar}</a>
    <div class="ranking-copy"><h3><a href="author.html?id=${encodeURIComponent(row.user_id)}">${esc(name)}</a></h3><p class="ranking-byline">@${esc(row.username || 'reader')}</p></div>
    <div class="ranking-metrics reader-metrics"><span><strong>${fmt(row.chapters_read)}</strong> chapters read</span><span><strong>${fmt(row.active_days)}</strong> active days</span><span><strong>${fmt(row.current_streak)}</strong> day streak</span><span><strong>${fmt(row.completed_novels)}</strong> novels completed</span></div>
  </article>`;
}
function reset() {
  state.loaded = 0;
  state.rows = [];
  state.exhausted = false;
  list.innerHTML = '';
  more.hidden = true;
  status.hidden = false;
  status.textContent = 'Loading rankings…';
}
async function loadNext() {
  if (state.busy || state.exhausted || state.loaded >= state.cap) return;
  state.busy = true;
  more.disabled = true;
  more.textContent = 'Loading…';
  try {
    const take = Math.min(PAGE_SIZE, state.cap - state.loaded);
    const rpc = state.board === 'novels' ? 'gidireads_novel_rankings_engagement' : 'gidireads_readerboard';
    const { data, error } = await supabase.rpc(rpc, {
      p_period: state.period,
      p_limit: take,
      p_offset: state.loaded
    });
    if (error) throw error;
    let rows = data || [];
    state.rows.push(...rows);
    state.loaded += rows.length;
    state.exhausted = rows.length < take || state.loaded >= state.cap;
    const html = rows.map(state.board === 'novels' ? novelRow : readerRow).join('');
    if (html) list.insertAdjacentHTML('beforeend', html);
    status.hidden = true;
    if (!state.rows.length) {
      status.hidden = false;
      status.innerHTML = state.board === 'novels'
        ? '<div class="rankings-empty">There is not enough reader activity for this leaderboard yet. Reads, Echoes, collections and reviews all contribute to novel rankings.</div>'
        : '<div class="rankings-empty">There is not enough verified reading activity for the Readerboard yet.</div>';
    }
    more.hidden = state.exhausted || !state.rows.length;
    more.textContent = `Load next ${Math.min(PAGE_SIZE, state.cap - state.loaded)} positions`;
  } catch (error) {
    console.error('[GidiReads Rankings]', error);
    status.hidden = false;
    status.textContent = 'Rankings could not be loaded right now. Please refresh and try again.';
    more.hidden = true;
  } finally {
    state.busy = false;
    more.disabled = false;
  }
}
function setBoard(board) {
  if (!['novels', 'readers'].includes(board) || state.board === board) return;
  state.board = board;
  if (explainer) explainer.hidden = board !== 'novels';
  document.querySelectorAll('[data-board]').forEach(button => {
    const active = button.dataset.board === board;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  reset();
  loadNext();
}
function setPeriod(period) {
  if (state.period === period) return;
  state.period = period;
  document.querySelectorAll('[data-period]').forEach(button => button.classList.toggle('active', button.dataset.period === period));
  reset();
  loadNext();
}
document.querySelectorAll('[data-board]').forEach(button => button.addEventListener('click', () => setBoard(button.dataset.board)));
document.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => setPeriod(button.dataset.period)));
$('rankingLimit').addEventListener('change', event => {
  state.cap = Math.min(500, Math.max(100, Number(event.target.value) || 100));
  reset();
  loadNext();
});
more.addEventListener('click', loadNext);
reset();
loadNext();
