import { supabase } from './supabaseClient.js';
import { showToast, refreshUnreadBadge } from './ui.js';

const $=(s)=>document.querySelector(s);
const esc=(v='')=>{const d=document.createElement('div');d.textContent=v;return d.innerHTML};
const attr=(v='')=>esc(v);
let currentUser=null, editSelectedCoverFile=null, allStories=[], shareStoryId=null

// Theme
const meta=$('#themeColorMeta');
function applyTheme(theme){const dark=theme==='dark';document.documentElement.dataset.theme=dark?'dark':'light';meta?.setAttribute('content',dark?'#17131a':'#f4efe7');const b=$('#themeToggle');if(b){b.setAttribute('aria-pressed',String(dark));b.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');b.querySelector('.theme-icon').textContent=dark?'☀':'☾';b.querySelector('.theme-label').textContent=dark?'Light':'Dark'}}
applyTheme(localStorage.getItem('gidireads-authors-theme')==='dark'?'dark':'light');
$('#themeToggle')?.addEventListener('click',()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('gidireads-authors-theme',n);applyTheme(n)});

// Sidebar
function openSidebar(){$('#studioSidebar')?.classList.add('open');$('#sidebarBackdrop')?.classList.add('show')}
function closeSidebar(){$('#studioSidebar')?.classList.remove('open');$('#sidebarBackdrop')?.classList.remove('show')}
$('#menuButton')?.addEventListener('click',openSidebar);$('#sidebarClose')?.addEventListener('click',closeSidebar);$('#sidebarBackdrop')?.addEventListener('click',closeSidebar);
document.querySelectorAll('.studio-nav-item').forEach(x=>x.addEventListener('click',closeSidebar));
document.querySelectorAll('[data-coming]').forEach(el=>el.addEventListener('click',()=>alert(`${el.dataset.coming} is part of the next Authors Studio room and is not connected yet.`)));

// Edit modal helpers. Quick Create is removed.
function openModal(m){if(!m)return;m.hidden=false;document.body.style.overflow='hidden'}
function closeModal(m){if(!m)return;m.hidden=true;document.body.style.overflow=''}
const editModal=$('#editStoryModal');
document.querySelectorAll('[data-close="editStory"]').forEach(x=>x.addEventListener('click',()=>closeModal(editModal)));
editModal?.addEventListener('click',e=>{if(e.target===editModal)closeModal(editModal)});
let authorSessionPromise=null;
let sessionResolved=false;
let storyLoadVersion=0;
async function resolveCurrentUser(){
  if(currentUser)return currentUser;
  try{
    // Match the Authors Studio home page: read the persisted Supabase session first.
    const {data,error}=await supabase.auth.getSession();
    if(error)throw error;
    if(data?.session?.user){currentUser=data.session.user;sessionResolved=true;refreshUnreadBadge(supabase,currentUser.id);return currentUser;}
  }catch(error){console.warn('[GidiReads] Could not resolve the author session:',error);}
  return null;
}
function sendToGidiReadsLogin(){sessionStorage.setItem('gidireads-auth-return','my-stories.html');window.location.href='index.html?auth=login&return=my-stories.html'}
async function openCreateFlow(){const user=await resolveCurrentUser();if(user)window.location.href='create-story.html';else sendToGidiReadsLogin()}
$('#createStoryButton')?.addEventListener('click',e=>{if(e.currentTarget.tagName==='A')return;e.preventDefault();openCreateFlow()});
$('#loginEmptyButton')?.addEventListener('click',sendToGidiReadsLogin);

function wordCount(text=''){return text.trim()?text.trim().split(/\s+/).length:0}
function coverMarkup(story){if(story.cover_url)return `<img src="${attr(story.cover_url)}" alt="${attr(story.title)} cover" loading="lazy">`;return `<div class="story-cover-fallback">${esc((story.title||'?').trim().charAt(0).toUpperCase())}</div>`}
function statusLabel(s){return (s||'draft').replace(/\b\w/g,c=>c.toUpperCase())}
function renderStories(){const list=$('#storiesList');const filter=document.querySelector('.filter-btn.active')?.dataset.filter||'all';const visible=filter==='all'?allStories:allStories.filter(s=>(s.status||'draft').toLowerCase()===filter);$('#storyCount').textContent=allStories.length;$('#chapterCount').textContent=allStories.reduce((n,s)=>n+(s._chapters?.length||0),0).toLocaleString();$('#wordCount').textContent=allStories.reduce((n,s)=>n+(s._chapters||[]).filter(c=>c.is_published===true).reduce((x,c)=>x+wordCount(c.content),0),0).toLocaleString();if(!visible.length){list.innerHTML=`<div class="studio-empty" style="grid-column:1/-1"><div class="empty-number">—</div><div><p class="eyebrow">NOTHING HERE YET</p><h3>${allStories.length?'No stories in this section.':'Your shelf is waiting.'}</h3><p>${allStories.length?'Try another filter.':'Create your first story and it will appear here as a proper work on your shelf.'}</p>${!allStories.length?'<button class="button button-dark" id="emptyCreate">Create Story <span>+</span></button>':''}</div></div>`;$('#emptyCreate')?.addEventListener('click',openCreateFlow);return}list.innerHTML=visible.map(s=>{const ch=s._chapters||[];const latest=ch.reduce((a,b)=>new Date(b.updated_at||b.created_at||0)>new Date(a?.updated_at||a?.created_at||0)?b:a,null);const words=ch.filter(c=>c.is_published===true).reduce((n,c)=>n+wordCount(c.content),0);return `<article class="story-work-card"><a class="cover-wrap" href="story-workspace.html?story=${encodeURIComponent(s.id)}" aria-label="Open ${attr(s.title)} workspace">${coverMarkup(s)}<span class="story-status">${esc(statusLabel(s.status))}</span></a><div class="story-card-copy"><div class="story-card-kicker"><span>${esc(s.primary_genre||'Unclassified')}</span><i></i><span>${ch.length} ${ch.length===1?'chapter':'chapters'}</span></div><h3 class="story-card-title">${esc(s.title||'Untitled story')}</h3><p class="story-card-meta">${esc(s.content_rating||'General')} · ${esc(s.language||'English')}${latest?` · Last worked ${esc(new Date(latest.updated_at||latest.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}))}`:''}</p><div class="story-card-foot"><div class="story-card-stats"><span>${words.toLocaleString()} words</span></div><div class="story-card-actions">${(String(s.status||'').toLowerCase()==='draft'||ch.some(c=>c.is_published===false))?`<button class="story-edit" data-share-draft="${attr(s.id)}">Share draft with AE</button>`:''}<button class="story-edit" data-edit="${attr(s.id)}">Edit details</button><a class="story-open" href="story-workspace.html?story=${encodeURIComponent(s.id)}">Open workspace →</a></div></div></div></article>`}).join('');}

async function loadStories(){
  const loadVersion=++storyLoadVersion;
  if(!currentUser){
    $('#loadingState').hidden=true;
    $('#storiesList').hidden=true;
    $('#loggedOutState').hidden=false;
    return;
  }
  $('#loggedOutState').hidden=true;
  $('#loadingState').hidden=false;
  $('#storiesList').hidden=true;

  const {data,error}=await supabase
    .from('stories')
    .select('id,title,description,status,primary_genre,secondary_genre,cover_url,tags,content_rating,language,created_at')
    .eq('author_id',currentUser.id)
    .order('created_at',{ascending:false});

  if(loadVersion!==storyLoadVersion)return;
  if(error){
    $('#loadingState').innerHTML=`<div class="empty-number">!</div><div><p class="eyebrow">COULDN'T OPEN THE SHELF</p><h3>We couldn't load your stories.</h3><p>Please check your connection and try again. Your saved stories have not been changed.</p><button class="button button-dark" id="retryStoriesButton" type="button">Try again</button></div>`;
    $('#retryStoriesButton')?.addEventListener('click',loadStories);
    console.error('[GidiReads] My Stories query failed:',error);
    return;
  }

  const rows=await Promise.all((data||[]).map(async s=>{
    const {data:ch,error:chapterError}=await supabase
      .from('chapters')
      .select('id,chapter_number,title,content,is_published,created_at,updated_at,archived_at')
      .eq('story_id',s.id)
      .is('archived_at',null)
      .order('chapter_number',{ascending:true});
    if(chapterError)console.warn('[GidiReads] Could not load chapters for story:',s.id,chapterError);
    return {...s,_chapters:ch||[]};
  }));
  if(loadVersion!==storyLoadVersion)return;
  allStories=rows;
  $('#loadingState').hidden=true;
  $('#storiesList').hidden=false;
  renderStories();
}

async function initAuthorSession(){
  $('#loadingState').hidden=false;
  $('#loggedOutState').hidden=true;
  $('#storiesList').hidden=true;
  try{
    // Use the same persisted-session path as authors-studio.js. getUser() makes
    // an extra auth request and was causing this page to disagree with the dashboard.
    const {data,error}=await supabase.auth.getSession();
    if(error)throw error;
    currentUser=data?.session?.user||null;
    sessionResolved=true;
    refreshUnreadBadge(supabase,currentUser?.id);
    await loadStories();
  }catch(error){
    console.error('[GidiReads] Author session initialisation failed:',error);
    // A transient session-read failure is not proof that the user is signed out.
    $('#loadingState').innerHTML=`<div class="empty-number">!</div><div><p class="eyebrow">YOUR SHELF IS TEMPORARILY UNAVAILABLE</p><h3>We couldn't confirm your session.</h3><p>Please try loading your shelf again. Your account and stories have not been changed.</p><button class="button button-dark" id="retrySessionButton" type="button">Try again</button></div>`;
    $('#retrySessionButton')?.addEventListener('click',()=>{authorSessionPromise=initAuthorSession()});
  }
}

authorSessionPromise=initAuthorSession();

// Supabase auth callbacks should stay synchronous. Defer data requests until
// after the callback returns to avoid auth-lock contention in supabase-js.
supabase.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT'){
    currentUser=null;
    sessionResolved=true;
    storyLoadVersion++;
    $('#loadingState').hidden=true;
    $('#storiesList').hidden=true;
    $('#loggedOutState').hidden=false;
    queueMicrotask(()=>refreshUnreadBadge(supabase,null));
    return;
  }
  if(session?.user){
    currentUser=session.user;
    sessionResolved=true;
    queueMicrotask(()=>{
      refreshUnreadBadge(supabase,currentUser?.id);
      loadStories();
    });
  }else if(event!=='INITIAL_SESSION' || sessionResolved){
    // Ignore an early empty INITIAL_SESSION event while persisted auth is resolving.
    currentUser=null;
    queueMicrotask(()=>loadStories());
  }
});

// Filters
document.querySelectorAll('.filter-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderStories()}));

// Edit story
document.querySelectorAll('[data-close="editStory"]').forEach(b=>b.addEventListener('click',()=>closeModal(editModal)));
$('#editStoryCover').addEventListener('change',()=>{editSelectedCoverFile=$('#editStoryCover').files[0]||null;if(editSelectedCoverFile){$('#editCoverPreview').src=URL.createObjectURL(editSelectedCoverFile);$('#editCoverPreview').hidden=false}});
$('#storiesList').addEventListener('click',async e=>{const share=e.target.closest('[data-share-draft]');if(share){e.preventDefault();await openDraftShare(share.dataset.shareDraft);return;}const b=e.target.closest('[data-edit]');if(!b)return;e.preventDefault();const {data,error}=await supabase.from('stories').select('id,title,description,primary_genre,secondary_genre,content_rating,language,status,cover_url').eq('id',b.dataset.edit).single();if(error||!data){showToast('Could not load story.');return}$('#editStoryId').value=data.id;$('#editStoryTitle').value=data.title||'';$('#editStoryDescription').value=data.description||'';$('#editStoryPrimaryGenre').value=data.primary_genre||'';$('#editStorySecondaryGenre').value=data.secondary_genre||'';$('#editStoryRating').value=data.content_rating||'General';$('#editStoryLanguage').value=data.language||'English';$('#editStoryStatus').value=data.status||'ongoing';editSelectedCoverFile=null;$('#editCoverPreview').hidden=!data.cover_url;if(data.cover_url)$('#editCoverPreview').src=data.cover_url;openModal(editModal)});
async function openDraftShare(storyId){shareStoryId=storyId;const modal=$('#aeDraftShareModal'),select=$('#aeDraftShareEditor'),note=$('#aeDraftShareStatus'),submit=$('#aeDraftShareSubmit');select.innerHTML='<option value="">Loading assigned editors…</option>';note.textContent='Only an editor already assigned to your account can receive this draft.';submit.disabled=true;openModal(modal);const {data,error}=await supabase.rpc('author_get_assigned_aes');if(error){select.innerHTML='<option value="">Could not load your assigned editor</option>';note.textContent='The draft-sharing update may not be installed yet. Your draft has not been shared.';return;}const rows=data||[];select.innerHTML=rows.length?rows.map(a=>`<option value="${attr(a.ae_user_id)}">${esc(a.display_name||a.username||'Assigned editor')}</option>`).join(''):'<option value="">No assigned editor yet</option>';submit.disabled=!rows.length;note.textContent=rows.length?'Choose your assigned editor, then share this draft.':'You do not have an active assigned editor yet.';}
$('#aeDraftShareForm')?.addEventListener('submit',async e=>{e.preventDefault();if(!shareStoryId)return;const btn=$('#aeDraftShareSubmit');btn.disabled=true;btn.textContent='Sharing…';const {error}=await supabase.rpc('author_share_draft_with_ae',{p_story_id:shareStoryId,p_ae_user_id:$('#aeDraftShareEditor').value});if(error){$('#aeDraftShareStatus').textContent='We could not share this draft. Please check your editor assignment and try again.';btn.disabled=false;btn.textContent='Share draft';return;}$('#aeDraftShareStatus').textContent='Draft shared with your assigned editor.';btn.textContent='Shared';showToast('Draft shared with your editor.');setTimeout(()=>closeModal($('#aeDraftShareModal')),900);});
$('#aeDraftShareModal')?.querySelectorAll('[data-close="aeDraftShare"]').forEach(b=>b.addEventListener('click',()=>closeModal($('#aeDraftShareModal'))));
$('#editStoryForm').addEventListener('submit',async e=>{e.preventDefault();const btn=$('#editStorySubmitBtn'),err=$('#editStoryError');err.hidden=true;btn.disabled=true;btn.textContent='Saving…';try{let cover_url;if(editSelectedCoverFile){const ext=editSelectedCoverFile.name.split('.').pop();const path=`${currentUser.id}/${Date.now()}.${ext}`;const up=await supabase.storage.from('covers').upload(path,editSelectedCoverFile);if(up.error)throw up.error;cover_url=supabase.storage.from('covers').getPublicUrl(path).data.publicUrl}const updates={title:$('#editStoryTitle').value.trim(),description:$('#editStoryDescription').value.trim(),primary_genre:$('#editStoryPrimaryGenre').value,secondary_genre:$('#editStorySecondaryGenre').value||null,content_rating:$('#editStoryRating').value,language:$('#editStoryLanguage').value,status:$('#editStoryStatus').value};if(cover_url)updates.cover_url=cover_url;const {error}=await supabase.from('stories').update(updates).eq('id',$('#editStoryId').value);if(error)throw error;closeModal(editModal);showToast('Story updated');loadStories()}catch(e){err.textContent=e.message||'Could not save changes.';err.hidden=false}finally{btn.disabled=false;btn.textContent='Save changes'}});

