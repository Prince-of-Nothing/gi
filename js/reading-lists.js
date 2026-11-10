// Reading lists: create private or public lists, add stories, show lists on profiles.
const esc = (v) => { const e = document.createElement('span'); e.textContent = v ?? ''; return e.innerHTML; };
const safeImg = (v) => (/^(https:\/\/|assets\/)[^\s"'()\\<>]+$/i.test(String(v || '')) ? v : '');
export { esc };

export async function myLists(supabase, userId) {
  const { data, error } = await supabase.from('reading_lists').select('id,name,description,is_public,cover_url,created_at,reading_list_items(count)').eq('owner_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((l) => ({ ...l, count: l.reading_list_items?.[0]?.count || 0 }));
}
export async function publicLists(supabase, ownerId) {
  const { data, error } = await supabase.from('reading_lists').select('id,name,description,is_public,cover_url,reading_list_items(count)').eq('owner_id', ownerId).eq('is_public', true).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((l) => ({ ...l, count: l.reading_list_items?.[0]?.count || 0 }));
}
const friendly = (e) => String(e?.message || '').replace(/^.*?(You can have up to 50.*|A reading list can hold up to 200.*)$/s, '$1') || 'Something went wrong. Please try again.';

function openModal(inner, label) {
  const wrap = document.createElement('div');
  wrap.className = 'rl-backdrop';
  wrap.innerHTML = `<div class="rl-modal" role="dialog" aria-modal="true" aria-label="${esc(label)}"><button class="rl-x" type="button" aria-label="Close">×</button>${inner}</div>`;
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  wrap.querySelector('.rl-x').addEventListener('click', close);
  document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden';
  document.body.appendChild(wrap);
  return { el: wrap, close };
}

const privacyFields = (isPublic) => `<fieldset class="rl-privacy"><legend>Who can see this list?</legend>
  <label><input type="radio" name="privacy" value="private" ${isPublic ? '' : 'checked'}><span><strong>Private</strong><small>Only you</small></span></label>
  <label><input type="radio" name="privacy" value="public" ${isPublic ? 'checked' : ''}><span><strong>Public</strong><small>Shown on your profile</small></span></label></fieldset>`;

/** Create or edit a list. onDone(list) is called after saving. */
export function openListEditor(supabase, user, { list = null, onDone = () => {} } = {}) {
  const m = openModal(`<h2>${list ? 'Edit list' : 'New reading list'}</h2>
    <form class="rl-form" novalidate>
      <label class="rl-field"><span>Name</span><input name="name" maxlength="80" required value="${esc(list?.name || '')}" placeholder="e.g. Cosy winter reads"></label>
      <label class="rl-field"><span>Description (optional)</span><textarea name="description" rows="3" maxlength="300" placeholder="What is this list about?">${esc(list?.description || '')}</textarea></label>
      <div class="rl-cover-editor"><span class="rl-cover-label">List cover (optional)</span><div class="rl-cover-preview" data-cover-preview>${list?.cover_url ? `<img src="${esc(safeImg(list.cover_url))}" alt="Current list cover">` : '<span>No cover selected</span>'}</div><label class="rl-btn rl-btn-quiet rl-cover-pick">Choose image<input type="file" name="cover" accept="image/jpeg,image/png,image/webp,image/avif" hidden></label><small>JPG, PNG, WebP or AVIF · up to 5 MB</small></div>
      ${privacyFields(!!list?.is_public)}
      <p class="rl-error" role="alert" hidden></p>
      <button class="rl-btn" type="submit">${list ? 'Save changes' : 'Create list'}</button>
    </form>`, list ? 'Edit list' : 'New reading list');
  const form = m.el.querySelector('form'), err = m.el.querySelector('.rl-error');
  let coverFile=null, coverUrl=list?.cover_url||null;
  const coverInput=form.querySelector('[name=cover]'), coverPreview=form.querySelector('[data-cover-preview]');
  coverInput.addEventListener('change',()=>{const file=coverInput.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)){err.textContent='Choose a JPG, PNG, WebP or AVIF image.';err.hidden=false;coverInput.value='';return;}if(file.size>5*1024*1024){err.textContent='The cover image must be 5 MB or smaller.';err.hidden=false;coverInput.value='';return;}coverFile=file;coverUrl=null;coverPreview.innerHTML='';const img=document.createElement('img');img.alt='Selected list cover';img.src=URL.createObjectURL(file);coverPreview.append(img);});
  form.name.focus();
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault(); err.hidden = true;
    const fd = new FormData(form), name = String(fd.get('name') || '').trim();
    if (!name) { err.textContent = 'Give your list a name.'; err.hidden = false; return; }
    const row = { name, description: String(fd.get('description') || '').trim(), is_public: fd.get('privacy') === 'public' };
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      if(coverFile){const ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif' })[coverFile.type]||'jpg';const path=`${user.id}/reading-lists/${Date.now()}.${ext}`;const up=await supabase.storage.from('covers').upload(path,coverFile,{upsert:false,contentType:coverFile.type,cacheControl:'3600'});if(up.error)throw up.error;coverUrl=supabase.storage.from('covers').getPublicUrl(path).data.publicUrl;}
      if(coverUrl)row.cover_url=coverUrl;else if(list?.cover_url)row.cover_url=null;
      const res = list ? await supabase.from('reading_lists').update(row).eq('id', list.id).select().single()
                     : await supabase.from('reading_lists').insert({ ...row, owner_id: user.id }).select().single();
    if (res.error) { err.textContent = friendly(res.error); err.hidden = false; return; }
      m.close(); onDone(res.data);
    } catch(uploadError){err.textContent=friendly(uploadError);err.hidden=false;} finally {btn.disabled=false;}
  });
}

/** "Add to list" sheet for a story page. */
export async function openAddToListSheet(supabase, user, storyId, toast = () => {}) {
  const m = openModal(`<h2>Add to a list</h2><div class="rl-sheet-body"><p class="rl-muted">Loading your lists…</p></div>`, 'Add to a list');
  const body = m.el.querySelector('.rl-sheet-body');
  const load = async () => {
    try {
      const lists = await myLists(supabase, user.id);
      const { data: items } = await supabase.from('reading_list_items').select('list_id').eq('story_id', storyId).in('list_id', lists.map((l) => l.id).concat(['00000000-0000-0000-0000-000000000000']));
      const has = new Set((items || []).map((i) => i.list_id));
      body.innerHTML = `${lists.length ? `<ul class="rl-pick">${lists.map((l) => `<li><label><input type="checkbox" data-list="${esc(l.id)}" ${has.has(l.id) ? 'checked' : ''}><span><strong>${esc(l.name)}</strong><small>${l.count} ${l.count === 1 ? 'story' : 'stories'} · ${l.is_public ? 'Public' : 'Private'}</small></span></label></li>`).join('')}</ul>` : '<p class="rl-muted">You have no lists yet. Create your first one below.</p>'}
        <button class="rl-btn rl-btn-quiet" type="button" data-new>+ New list</button>`;
      body.querySelectorAll('[data-list]').forEach((c) => c.addEventListener('change', async () => {
        c.disabled = true;
        const res = c.checked ? await supabase.from('reading_list_items').insert({ list_id: c.dataset.list, story_id: storyId })
                              : await supabase.from('reading_list_items').delete().eq('list_id', c.dataset.list).eq('story_id', storyId);
        c.disabled = false;
        if (res.error) { c.checked = !c.checked; toast(friendly(res.error)); } else toast(c.checked ? 'Added to your list.' : 'Removed from the list.');
      }));
      body.querySelector('[data-new]').addEventListener('click', () => openListEditor(supabase, user, { onDone: async (list) => {
        const r = await supabase.from('reading_list_items').insert({ list_id: list.id, story_id: storyId });
        toast(r.error ? friendly(r.error) : 'List created and story added.'); load();
      } }));
    } catch (e) { body.innerHTML = `<p class="rl-error">${esc(friendly(e))}</p>`; }
  };
  load();
}

export function listCard(l, { owner = true } = {}) {
  const image=safeImg(l.cover_url);
  return `<a class="rl-card" href="reading-list.html?id=${encodeURIComponent(l.id)}">${image?`<span class="rl-card-cover"><img src="${esc(image)}" alt="${esc(l.name)} cover" loading="lazy"></span>`:'<span class="rl-card-icon" aria-hidden="true">☰</span>'}
    <span class="rl-card-body"><strong>${esc(l.name)}</strong><small>${l.count} ${l.count === 1 ? 'story' : 'stories'}${owner ? ` · ${l.is_public ? 'Public' : 'Private'}` : ''}</small>${l.description ? `<em>${esc(l.description)}</em>` : ''}</span></a>`;
}

/** Library page: "My lists" section. */
export async function mountMyLists(host, supabase, user) {
  if (!host || !user) return;
  host.hidden = false;
  host.innerHTML = `<div class="rl-head"><div><span class="rl-kicker">YOUR COLLECTIONS</span><h2>My Lists</h2></div><button class="rl-btn" type="button" data-new>+ New list</button></div><label class="rl-search"><span class="rl-search-label">Search your lists</span><input type="search" data-list-search placeholder="Search by list name or description" autocomplete="off" aria-label="Search your reading lists"></label><div class="rl-bulk-toolbar" data-list-bulk hidden><label><input type="checkbox" data-list-select-all> Select all lists</label><span data-list-selected-count>0 selected</span><button type="button" class="rl-btn rl-btn-danger" data-list-delete disabled>Delete selected</button><button type="button" class="rl-btn rl-btn-quiet" data-list-clear>Cancel</button></div><div class="rl-grid" aria-live="polite"><p class="rl-muted">Loading…</p></div>`;
  const grid = host.querySelector('.rl-grid');
  const search = host.querySelector('[data-list-search]');
  let allLists = [], selectionMode = false, longPressTimer = null, longPressId = null, suppressClickId = null;
  const selected = new Set();
  const toolbar=host.querySelector('[data-list-bulk]');
  const updateBulk=()=>{toolbar.hidden=!selectionMode;host.querySelector('[data-list-selected-count]').textContent=`${selected.size} selected`;host.querySelector('[data-list-delete]').disabled=!selected.size;const all=allLists.length>0&&allLists.every(l=>selected.has(l.id));const some=allLists.some(l=>selected.has(l.id));const box=host.querySelector('[data-list-select-all]');box.checked=all;box.indeterminate=some&&!all;grid.classList.toggle('rl-selection-mode',selectionMode);grid.querySelectorAll('[data-list-check-wrap]').forEach(el=>el.hidden=!selectionMode);grid.querySelectorAll('[data-list-menu-trigger]').forEach(el=>el.hidden=selectionMode);};
  const enterSelection=(id=null)=>{selectionMode=true;if(id)selected.add(id);render();};
  const cancelSelection=()=>{selectionMode=false;selected.clear();render();};
  const render = () => {
    const term = search.value.trim().toLocaleLowerCase();
    const filtered = allLists.filter((list) => !term || `${list.name || ''} ${list.description || ''}`.toLocaleLowerCase().includes(term));
    grid.innerHTML = filtered.length
      ? filtered.map((list) => `<article class="rl-selectable-card" data-list-card="${esc(list.id)}"><label class="rl-list-check" data-list-check-wrap hidden><input type="checkbox" data-list-check="${esc(list.id)}" ${selected.has(list.id)?'checked':''} aria-label="Select ${esc(list.name)}"><span></span></label><button class="rl-list-menu-trigger" type="button" data-list-menu-trigger="${esc(list.id)}" aria-label="Options for ${esc(list.name)}" aria-expanded="false">⋯</button><div class="rl-list-menu" data-list-menu hidden><button type="button" data-list-action="select">Select to Delete</button></div>${listCard(list)}</article>`).join('')
      : `<p class="rl-muted">${term ? 'No reading lists match that search.' : 'Create a list to organise stories your way. Keep it private, or make it public to show it on your profile.'}</p>`;
    updateBulk();
  };
  const draw = async () => {
    try { allLists = await myLists(supabase, user.id); render(); }
    catch { grid.innerHTML = '<p class="rl-muted">Your lists could not be loaded. Please try again.</p>'; }
  };
  search.addEventListener('input', render);
  host.querySelector('[data-new]').addEventListener('click', () => openListEditor(supabase, user, { onDone: draw }));
  host.querySelector('[data-list-select-all]').addEventListener('change',e=>{allLists.forEach(l=>e.target.checked?selected.add(l.id):selected.delete(l.id));render();});
  host.querySelector('[data-list-clear]').addEventListener('click',cancelSelection);
  grid.addEventListener('click',e=>{
    const trigger=e.target.closest('[data-list-menu-trigger]');
    if(trigger){e.preventDefault();e.stopPropagation();const card=trigger.closest('[data-list-card]');const menu=card.querySelector('[data-list-menu]');grid.querySelectorAll('[data-list-menu]').forEach(m=>{if(m!==menu)m.hidden=true});menu.hidden=!menu.hidden;trigger.setAttribute('aria-expanded',String(!menu.hidden));return;}
    const action=e.target.closest('[data-list-action="select"]');
    if(action){const card=action.closest('[data-list-card]');card.querySelector('[data-list-menu]').hidden=true;enterSelection(card.dataset.listCard);return;}
    const card=e.target.closest('[data-list-card]');
    if(selectionMode&&card&&!e.target.closest('button,input,label')){e.preventDefault();const id=card.dataset.listCard;selected.has(id)?selected.delete(id):selected.add(id);render();}
  });
  grid.addEventListener('change',e=>{const c=e.target.closest('[data-list-check]');if(!c)return;c.checked?selected.add(c.dataset.listCheck):selected.delete(c.dataset.listCheck);updateBulk();});
  grid.addEventListener('pointerdown',e=>{const card=e.target.closest('[data-list-card]');if(!card||e.target.closest('button,input,label,a'))return;if(e.pointerType==='mouse'&&e.button!==0)return;longPressId=card.dataset.listCard;longPressTimer=setTimeout(()=>{suppressClickId=longPressId;enterSelection(longPressId);longPressTimer=null;},550);});
  ['pointerup','pointercancel','pointerleave'].forEach(type=>grid.addEventListener(type,()=>{if(longPressTimer)clearTimeout(longPressTimer);longPressTimer=null;longPressId=null;} ,true));
  grid.addEventListener('click',e=>{const card=e.target.closest('[data-list-card]');if(!card||!suppressClickId||suppressClickId!==card.dataset.listCard)return;suppressClickId=null;e.preventDefault();e.stopPropagation();},true);
  document.addEventListener('click',e=>{if(!host.contains(e.target))grid.querySelectorAll('[data-list-menu]').forEach(m=>m.hidden=true)});
  host.querySelector('[data-list-delete]').addEventListener('click',async()=>{const ids=[...selected];if(!ids.length)return;if(!confirm(`Delete ${ids.length} selected reading ${ids.length===1?'list':'lists'}? The novels themselves will remain on GidiReads.`))return;const {error}=await supabase.from('reading_lists').delete().eq('owner_id',user.id).in('id',ids);if(error){grid.insertAdjacentHTML('afterbegin','<p class="rl-error">The selected lists could not be deleted. Please try again.</p>');return;}selectionMode=false;selected.clear();await draw();});
  draw();
}

/** Public profile: a person's public lists. */
export async function mountPublicLists(host, supabase, ownerId) {
  if (!host) return;
  try {
    const lists = await publicLists(supabase, ownerId);
    if (!lists.length) return;
    host.hidden = false;
    host.querySelector('.rl-grid').innerHTML = lists.map((l) => listCard(l, { owner: false })).join('');
  } catch { /* profile must still load */ }
}
export { safeImg };
