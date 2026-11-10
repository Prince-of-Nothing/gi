import { supabase } from './supabaseClient.js';
import { esc, openListEditor } from './reading-lists.js';

const $ = (id) => document.getElementById(id);
const id = new URLSearchParams(location.search).get('id');
const body = $('rlpBody');
let user = null;
const safe = (v) => (/^(https:\/\/|assets\/)[^\s"'()\\<>]+$/i.test(String(v || '')) ? v : '');

async function load() {
  if (!id) { body.innerHTML = '<div class="rlp-state">That list link is incomplete. <a href="library.html">Go to your library</a>.</div>'; return; }
  const { data: sess } = await supabase.auth.getSession(); user = sess.session?.user || null;
  const { data: list, error } = await supabase.from('reading_lists').select('id,owner_id,name,description,is_public,created_at').eq('id', id).maybeSingle();
  if (error) { body.innerHTML = '<div class="rlp-state">This list could not be loaded. Please try again.</div>'; return; }
  if (!list) { body.innerHTML = `<div class="rlp-state">${user ? 'This list is private or does not exist.' : 'This list is private or does not exist. <a href="auth.html?mode=login&returnTo=' + encodeURIComponent('reading-list.html?id=' + id) + '">Log in</a> if it is yours.'}</div>`; return; }
  const mine = user?.id === list.owner_id;
  const [{ data: owner }, { data: items }] = await Promise.all([
    supabase.from('profiles').select('id,username,display_name').eq('id', list.owner_id).maybeSingle(),
    supabase.from('reading_list_items').select('story_id,added_at,stories(id,title,cover_url,status,profiles!stories_author_id_fkey(username,display_name))').eq('list_id', id).order('added_at', { ascending: false })
  ]);
  const stories = (items || []).filter((i) => i.stories && ['ongoing', 'completed'].includes(i.stories.status));
  document.title = `${list.name} — GidiReads`;
  const by = owner?.display_name || owner?.username || 'a GidiReads reader';
  body.innerHTML = `<h1>${esc(list.name)}</h1>
    <div class="rlp-meta"><span class="rlp-chip">${list.is_public ? 'Public' : 'Private'}</span><span>${stories.length} ${stories.length === 1 ? 'story' : 'stories'}</span><span>by <a href="author.html?id=${esc(list.owner_id)}" style="color:#cda5f1">${esc(by)}</a></span></div>
    ${list.description ? `<p class="rlp-desc">${esc(list.description)}</p>` : ''}
    <div class="rlp-actions">${mine ? '<button class="rl-btn rl-btn-quiet" id="rlpEdit" type="button">Edit list</button><button class="rl-btn rl-btn-danger" id="rlpDelete" type="button">Delete list</button>' : ''}${list.is_public ? '<button class="rl-btn rl-btn-quiet" id="rlpShare" type="button">Copy link</button>' : ''}</div>
    ${stories.length ? `<label class="rlp-search"><span>Search stories in this list</span><input type="search" id="rlpSearch" placeholder="Search by story or author" autocomplete="off"></label><div class="rlp-grid" id="rlpGrid">${stories.map((i) => { const s = i.stories, c = safe(s.cover_url), a = s.profiles?.display_name || s.profiles?.username || ''; return `<div class="rlp-item" data-search="${esc(`${s.title || ''} ${a}`).replace(/"/g, '&quot;').toLocaleLowerCase()}"><a href="story.html?id=${esc(s.id)}" style="color:inherit;text-decoration:none"><div class="rlp-cover">${c ? `<img src="${esc(c)}" alt="" loading="lazy">` : 'GR'}</div><h3>${esc(s.title)}</h3><p>${esc(a)}</p></a>${mine ? `<button class="rlp-remove" type="button" data-remove="${esc(s.id)}" aria-label="Remove ${esc(s.title)} from this list">×</button>` : ''}</div>`; }).join('')}<p class="rlp-search-empty" id="rlpSearchEmpty" hidden>No stories match that search.</p></div>`
      : `<div class="rlp-state">${mine ? 'This list is empty. Open a story and choose “+ List” to add it here.' : 'This list has no stories yet.'}</div>`}`;
  const listSearch = $('rlpSearch');
  listSearch?.addEventListener('input', () => {
    const term = listSearch.value.trim().toLocaleLowerCase();
    let visible = 0;
    body.querySelectorAll('.rlp-item').forEach((item) => { const match = !term || item.dataset.search.includes(term); item.hidden = !match; if (match) visible++; });
    $('rlpSearchEmpty').hidden = visible > 0;
  });
  $('rlpEdit')?.addEventListener('click', () => openListEditor(supabase, user, { list, onDone: load }));
  $('rlpDelete')?.addEventListener('click', async () => {
    if (!confirm(`Delete “${list.name}”? The stories stay in GidiReads; only the list is removed.`)) return;
    const { error: e } = await supabase.from('reading_lists').delete().eq('id', id);
    if (e) { alert('The list could not be deleted. Please try again.'); return; }
    location.href = 'library.html';
  });
  $('rlpShare')?.addEventListener('click', async (ev) => { try { await navigator.clipboard.writeText(location.href); ev.target.textContent = 'Link copied'; } catch { prompt('Copy this link', location.href); } });
  body.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', async () => {
    const { error: e } = await supabase.from('reading_list_items').delete().eq('list_id', id).eq('story_id', b.dataset.remove);
    if (e) { alert('Could not remove that story.'); return; } load();
  }));
}
load();
