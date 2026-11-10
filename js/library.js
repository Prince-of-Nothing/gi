import { supabase } from './supabaseClient.js';
import { signUpWithUsername } from './auth-guard.js';
import { showToast, wireWriteSheet, refreshUnreadBadge } from './ui.js';

let currentUser=null, authMode='login', entries=[], bookmarks=[], progressMap=new Map(), offlineMap=new Map();
const selectedStoryIds=new Set();
let selectionMode=false, longPressTimer=null, longPressStoryId=null, suppressNextCardClickId=null;
const $=id=>document.getElementById(id);
const loginBtn=$('loginBtn'), authModal=$('authModal'), authForm=$('authForm');
const authUsername=$('authUsername'), authEmail=$('authEmail'), authPassword=$('authPassword'), authError=$('authError');
const authSubmitBtn=$('authSubmitBtn'), authSwitchBtn=$('authSwitchBtn'), authSwitchPrompt=$('authSwitchPrompt'), authModalTitle=$('authModalTitle'), authModalSub=$('authModalSub');
const storyMenu=$('storyMenu'), menuOverlay=$('menuOverlay'), storyMenuItems=$('storyMenuItems');

function esc(v=''){const d=document.createElement('div');d.textContent=v;return d.innerHTML}
function attr(v=''){return esc(v).replace(/"/g,'&quot;')}
function compact(n){n=Number(n||0);if(n>=1000000)return `${(n/1000000).toFixed(n%1000000?1:0).replace('.0','')}m`;if(n>=1000)return `${(n/1000).toFixed(n%1000?1:0).replace('.0','')}k`;return String(n)}
function cover(url,title,cls='card-cover'){return url?`<div class="${cls}"><img src="${attr(url)}" alt="${attr(title)} cover" loading="lazy"></div>`:`<div class="${cls} cover-placeholder">${esc((title||'?')[0].toUpperCase())}</div>`}
function authorName(story){return story?.profiles?.display_name||story?.profiles?.username||'Unknown author'}
function openModal(){const r=location.pathname.split('/').pop()+location.search+location.hash;location.href='auth.html?mode=login&returnTo='+encodeURIComponent(r)}
function closeModal(){authModal.hidden=true;document.body.style.overflow=''}

document.querySelectorAll('[data-close="auth"]').forEach(b=>b.onclick=closeModal);authModal.onclick=e=>{if(e.target===authModal)closeModal()};
loginBtn.onclick=()=>{if(currentUser){supabase.auth.signOut()}else{authModalSub.textContent='Log in to see your library.';openModal()}};
$('loginShelfBtn').onclick=()=>{authModalSub.textContent='Log in to open your shelf.';openModal()};
$('forgotPasswordBtn').onclick=async()=>{const email=authEmail.value.trim();if(!email){authError.textContent='Enter your email first.';authError.hidden=false;return}const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/reset-password.html'});if(error){authError.textContent=error.message;authError.hidden=false}else{authModalSub.textContent='If that email has an account, a reset link is on its way.';authError.hidden=true}};
authSwitchBtn.onclick=()=>{authMode=authMode==='login'?'signup':'login';updateAuthUI()};
function updateAuthUI(){authError.hidden=true;const signup=authMode==='signup';authModalTitle.textContent=signup?'Create your account':'Welcome to GidiReads';authSubmitBtn.textContent=signup?'Create account':'Log in';authSwitchPrompt.textContent=signup?'Already have an account?':'New to GidiReads?';authSwitchBtn.textContent=signup?'Log in':'Create an account';$('authUsernameWrap').style.display=signup?'flex':'none'}updateAuthUI();
authForm.onsubmit=async e=>{e.preventDefault();authSubmitBtn.disabled=true;authError.hidden=true;try{if(authMode==='signup'){const username=authUsername.value.trim();if(!username)throw new Error('Please choose a username.');const data=await signUpWithUsername(supabase,{username,email:authEmail.value,password:authPassword.value});if(!data.session){authModalSub.textContent='Check your email to confirm your account, then log in.';authMode='login';updateAuthUI();authForm.reset();return}showToast(`Welcome, ${username}!`)}else{const {error}=await supabase.auth.signInWithPassword({email:authEmail.value.trim(),password:authPassword.value});if(error)throw error;showToast('Welcome back!')}authForm.reset();closeModal()}catch(err){authError.textContent=err.message||'Something went wrong.';authError.hidden=false}finally{authSubmitBtn.disabled=false}};

supabase.auth.onAuthStateChange((_e,s)=>{currentUser=s?.user||null;loginBtn.textContent=currentUser?'Log out':'Log in';refreshUnreadBadge(supabase,currentUser?.id);updateNavAvatar();loadShelf()});

async function updateNavAvatar(){const a=$('siteProfileAvatar');if(!a)return;if(!currentUser){a.href='account.html';a.innerHTML='<span class="profile-nav-fallback">G</span>';return}a.href=`author.html?id=${encodeURIComponent(currentUser.id)}`;const {data}=await supabase.from('profiles').select('username,display_name,avatar_url').eq('id',currentUser.id).maybeSingle();const name=data?.display_name||data?.username||'G';a.innerHTML=data?.avatar_url?`<img class="profile-nav-image" src="${attr(data.avatar_url)}" alt="${attr(name)}">`:`<span class="profile-nav-fallback">${esc(name.charAt(0).toUpperCase())}</span>`}
async function init(){const {data:{session}}=await supabase.auth.getSession();currentUser=session?.user||null;loginBtn.textContent=currentUser?'Log out':'Log in';await updateNavAvatar();await loadShelf()}
async function loadShelf(){
  $('libraryApp').hidden=!currentUser;$('loggedOutState').hidden=!!currentUser;
  if(!currentUser)return;
  ['continueGrid','bookmarkGrid','savedGrid','completedGrid'].forEach(id=>$(id).innerHTML='<div class="library-loading">Loading…</div>');
  const [entryRes,bookmarkRes,progressRes,offlineRes]=await Promise.all([
    supabase.from('library_entries').select('id,status,last_chapter_number,story_id,updated_at,stories(id,title,description,cover_url,primary_genre,secondary_genre,tags,reads,echo_count,status,profiles!stories_author_id_fkey(username,display_name,avatar_url))').eq('reader_id',currentUser.id).order('updated_at',{ascending:false}),
    supabase.from('reading_bookmarks').select('id,story_id,chapter_id,created_at,stories(id,title,cover_url,profiles!stories_author_id_fkey(username,display_name)),chapters(id,title,chapter_number,content_type,is_published)').eq('reader_id',currentUser.id).order('created_at',{ascending:false}),
    supabase.from('reading_progress').select('story_id,chapter_id,progress_percent,chapter_progress_percent,last_read_at').eq('reader_id',currentUser.id),
    supabase.from('reading_offline_items').select('story_id,downloaded_chapters,last_synced_at').eq('reader_id',currentUser.id)
  ]);
  entries=entryRes.error?[]:(entryRes.data||[]);
  const activeIds=new Set(entries.map(e=>e.story_id)); for(const id of [...selectedStoryIds])if(!activeIds.has(id))selectedStoryIds.delete(id);
  bookmarks=bookmarkRes.error?[]:(bookmarkRes.data||[]);
  progressMap=new Map((progressRes.data||[]).map(x=>[x.story_id,x]));offlineMap=new Map((offlineRes.data||[]).map(x=>[x.story_id,x]));
  renderAll();
}
function statusLabel(s){return s==='completed'?'Completed':s==='reading'?'Reading':'Saved'}
function progressFor(entry){const p=progressMap.get(entry.story_id);return Math.max(0,Math.min(100,Number(p?.progress_percent??p?.chapter_progress_percent??0)))}
function storyCard(entry,mode){const s=entry.stories;if(!s)return '';const p=progressFor(entry), offline=offlineMap.get(s.id), selected=selectedStoryIds.has(s.id);const reading=entry.status==='reading';const completed=entry.status==='completed';const chapter=entry.last_chapter_number||1;return `<article class="story-card${selected?' is-selected':''}${selectionMode?' selection-mode':''}" data-story-id="${attr(s.id)}"><label class="library-select-story"${selectionMode?'':' hidden'}><input type="checkbox" data-select-story="${attr(s.id)}" aria-label="Select ${attr(s.title)} for removal" ${selected?'checked':''}><span></span></label><a href="${reading?`reader.html?story=${encodeURIComponent(s.id)}&chapter=${chapter}`:`story.html?id=${encodeURIComponent(s.id)}`}" aria-label="Open ${attr(s.title)}">${cover(s.cover_url,s.title)}<span class="status-chip">${esc(statusLabel(entry.status))}</span></a><button class="menu-trigger" data-menu-story="${attr(s.id)}" aria-label="More actions for ${attr(s.title)}">⋯</button><div class="card-body"><h3 class="card-title">${esc(s.title)}</h3><p class="card-author">${esc(authorName(s))}</p>${reading?`<div class="progress-track"><div class="progress-fill" style="width:${p}%"></div></div><div class="progress-line"><span>${Math.round(p)}% read</span><span>Ch. ${esc(String(chapter))}</span></div>`:`<div class="card-meta"><span>${esc(compact(s.reads))} reads</span><span class="echo">✦ ${esc(compact(s.echo_count))} echoes</span>${offline?'<span>Offline</span>':''}</div>`}${completed?`<div class="card-meta" style="margin-top:10px"><span>Finished</span></div>`:''}</div></article>`}
function bookmarkStoryCard(item){
  const s=item?.stories;
  if(!s)return '';
  const entry=entries.find(e=>e.story_id===s.id);
  const p=entry?progressFor(entry):0;
  const reading=entry?.status==='reading';
  const completed=entry?.status==='completed';
  const chapter=entry?.last_chapter_number||1;
  const bookmarkCount=bookmarks.filter(b=>b.story_id===s.id).length;
  const href=reading?`reader.html?story=${encodeURIComponent(s.id)}&chapter=${chapter}`:`story.html?id=${encodeURIComponent(s.id)}`;
  return `<article class="story-card bookmarked-story-card" data-story-id="${attr(s.id)}"><a href="${href}" aria-label="Open ${attr(s.title)}">${cover(s.cover_url,s.title)}<span class="status-chip bookmark-status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4z"/></svg>${bookmarkCount>1?`${bookmarkCount} bookmarks`:'Bookmarked'}</span></a><button class="menu-trigger" data-menu-story="${attr(s.id)}" aria-label="More actions for ${attr(s.title)}">⋯</button><div class="card-body"><h3 class="card-title">${esc(s.title)}</h3><p class="card-author">${esc(authorName(s))}</p>${reading?`<div class="progress-track"><div class="progress-fill" style="width:${p}%"></div></div><div class="progress-line"><span>${Math.round(p)}% read</span><span>Ch. ${esc(String(chapter))}</span></div>`:`<div class="card-meta"><span>${esc(compact(s.reads))} reads</span><span class="echo">✦ ${esc(compact(s.echo_count))} echoes</span>${completed?'<span>Finished</span>':''}</div>`}</div></article>`
}
function renderSection(section,items,grid,empty){$(section).hidden=!items.length;$(grid).innerHTML=items.slice(0,6).map(x=>storyCard(x)).join('');}
function updateBulkToolbar(){
  const toolbar=$('libraryBulkToolbar'); if(!toolbar)return;
  const count=selectedStoryIds.size;
  toolbar.hidden=!selectionMode||entries.filter(e=>e.stories).length===0;
  $('librarySelectionCount').textContent=`${count} selected`;
  $('libraryBulkDelete').disabled=count===0;
  const available=entries.filter(e=>e.stories).map(e=>e.story_id);
  $('librarySelectAll').checked=available.length>0&&available.every(id=>selectedStoryIds.has(id));
  $('librarySelectAll').indeterminate=available.some(id=>selectedStoryIds.has(id))&&!$('librarySelectAll').checked;
}
function clearStorySelection(){selectionMode=false;selectedStoryIds.clear();document.querySelectorAll('[data-select-story]').forEach(c=>c.checked=false);document.querySelectorAll('.library-select-story').forEach(label=>label.hidden=true);document.querySelectorAll('.story-card.is-selected').forEach(c=>c.classList.remove('is-selected'));document.querySelectorAll('.story-card.selection-mode').forEach(c=>c.classList.remove('selection-mode'));updateBulkToolbar()}
function enterSelectionMode(preselectedId=null){selectionMode=true;if(preselectedId)selectedStoryIds.add(preselectedId);document.querySelectorAll('.story-card[data-story-id]:not(.bookmarked-story-card)').forEach(card=>{card.classList.add('selection-mode');const label=card.querySelector('.library-select-story');if(label)label.hidden=false;const input=card.querySelector('[data-select-story]');if(input)input.checked=selectedStoryIds.has(card.dataset.storyId);card.classList.toggle('is-selected',selectedStoryIds.has(card.dataset.storyId));});updateBulkToolbar()}
function toggleStorySelection(id){const input=document.querySelector(`[data-select-story="${CSS.escape(id)}"]`);if(!input)return;input.checked=!input.checked;if(input.checked)selectedStoryIds.add(id);else selectedStoryIds.delete(id);input.closest('.story-card')?.classList.toggle('is-selected',input.checked);updateBulkToolbar()}
async function removeSelectedStories(){
  const ids=[...selectedStoryIds]; if(!ids.length||!currentUser)return;
  if(!confirm(`Remove ${ids.length} selected ${ids.length===1?'novel':'novels'} from your library? The original published stories will remain on GidiReads.`))return;
  const ownedEntries=entries.filter(e=>ids.includes(e.story_id));
  if(!ownedEntries.length){clearStorySelection();return;}
  const {error}=await supabase.from('library_entries').delete().eq('reader_id',currentUser.id).in('story_id',ownedEntries.map(e=>e.story_id));
  if(error){showToast('Could not remove the selected novels. Please try again.');return;}
  const removed=new Set(ownedEntries.map(e=>e.story_id));
  entries=entries.filter(e=>!removed.has(e.story_id));
  clearStorySelection(); renderAll(); showToast(`${removed.size} ${removed.size===1?'novel':'novels'} removed from your library.`);
}
$('librarySelectAll')?.addEventListener('change',e=>{
  const ids=entries.filter(x=>x.stories).map(x=>x.story_id);
  if(e.target.checked)ids.forEach(id=>selectedStoryIds.add(id));else ids.forEach(id=>selectedStoryIds.delete(id));
  renderAll();
});
$('libraryBulkDelete')?.addEventListener('click',removeSelectedStories);
$('libraryClearSelection')?.addEventListener('click',clearStorySelection);
document.addEventListener('change',e=>{
  const input=e.target.closest('[data-select-story]'); if(!input)return;
  const id=input.dataset.selectStory; if(input.checked)selectedStoryIds.add(id);else selectedStoryIds.delete(id);
  input.closest('.story-card')?.classList.toggle('is-selected',input.checked); updateBulkToolbar();
});
// Long-press a novel to enter selection mode. A normal tap keeps opening the story.
document.addEventListener('pointerdown',e=>{
  const card=e.target.closest('.story-card[data-story-id]:not(.bookmarked-story-card)');
  if(!card||!entries.some(entry=>entry.story_id===card.dataset.storyId)||e.target.closest('[data-menu-story],.library-select-story,input,button'))return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  clearTimeout(longPressTimer);longPressStoryId=card.dataset.storyId;
  longPressTimer=setTimeout(()=>{
    if(!longPressStoryId)return;
    suppressNextCardClickId=longPressStoryId;
    enterSelectionMode(longPressStoryId);
    longPressTimer=null;
  },550);
});
['pointerup','pointercancel','pointerleave'].forEach(type=>document.addEventListener(type,()=>{if(longPressTimer){clearTimeout(longPressTimer);longPressTimer=null;}longPressStoryId=null;},true));
document.addEventListener('contextmenu',e=>{if(e.target.closest('.story-card[data-story-id]'))e.preventDefault()});
document.addEventListener('click',e=>{
  const card=e.target.closest('.story-card[data-story-id]:not(.bookmarked-story-card)');if(!card)return;
  const id=card.dataset.storyId;
  if(!entries.some(entry=>entry.story_id===id))return;
  if(suppressNextCardClickId===id){suppressNextCardClickId=null;e.preventDefault();e.stopPropagation();return;}
  if(!selectionMode||e.target.closest('[data-menu-story],.library-select-story,button'))return;
  e.preventDefault();e.stopPropagation();toggleStorySelection(id);
},true);
function renderAll(){
  const reading=entries.filter(e=>e.status==='reading').sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
  const bookmarkedStories=[];
  const seen=new Set();
  bookmarks.forEach(b=>{if(b.stories&&!seen.has(b.story_id)){seen.add(b.story_id);bookmarkedStories.push(b)}});
  const saved=entries.filter(e=>e.status==='saved' && !seen.has(e.story_id));
  const completed=entries.filter(e=>e.status==='completed' && !seen.has(e.story_id));
  renderSection('continueSection',reading,'continueGrid');
  $('bookmarkGrid').innerHTML=bookmarkedStories.slice(0,6).map(bookmarkStoryCard).join('');
  $('bookmarksSection').hidden=!bookmarkedStories.length;
  renderSection('savedSection',saved,'savedGrid');
  renderSection('completedSection',completed,'completedGrid');
  $('globalEmpty').hidden=entries.length||bookmarks.length;
  updateBulkToolbar();
  if(!entries.length&&!bookmarks.length)return;
  document.querySelectorAll('.see-all').forEach(b=>b.hidden=(b.dataset.see==='continue'?reading.length:b.dataset.see==='saved'?saved.length:b.dataset.see==='completed'?completed.length:bookmarkedStories.length)<=6);
}

let activeStoryId=null;
function icon(name){const paths={play:'<path d="M8 5v14l11-7z"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',share:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 12v7h14v-7"/>',offline:'<path d="M4 5h16v14H4z"/><path d="M8 19v2h8v-2M9 9l3 3 3-3"/>',remove:'<path d="M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 14h8l1-14"/>',bookmark:'<path d="M6 4h12v17l-6-4-6 4z"/>',select:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/>'};return `<svg viewBox="0 0 24 24">${paths[name]||paths.info}</svg>`}
function openMenu(storyId,anchor){activeStoryId=storyId;const entry=entries.find(e=>e.story_id===storyId),s=entry?.stories;if(!s)return;const reading=entry.status==='reading';const offline=offlineMap.has(storyId);storyMenuItems.innerHTML=`${reading?`<a class="story-menu-item" href="reader.html?story=${encodeURIComponent(storyId)}&chapter=${entry.last_chapter_number||1}">${icon('play')}Continue Reading</a>`:''}<a class="story-menu-item" href="story.html?id=${encodeURIComponent(storyId)}">${icon('info')}Story Info</a><button class="story-menu-item" data-action="share">${icon('share')}Share Story</button><button class="story-menu-item" data-action="offline">${icon('offline')}${offline?'Saved Offline':'Download Offline'}</button><button class="story-menu-item danger" data-action="remove">${icon('remove')}Remove from Library</button><button class="story-menu-item" data-action="select-remove">${icon('select')}Select to Remove from Library</button>`;const r=anchor.getBoundingClientRect();storyMenu.hidden=false;menuOverlay.hidden=false;const left=Math.min(window.innerWidth-276,Math.max(12,r.right-260));const top=Math.min(window.innerHeight-250,r.bottom+8);storyMenu.style.left=`${left}px`;storyMenu.style.top=`${top}px`; }
function closeMenu(){storyMenu.hidden=true;menuOverlay.hidden=true;activeStoryId=null}
menuOverlay.onclick=closeMenu;$('closeStoryMenu').onclick=closeMenu;
document.addEventListener('click',e=>{const b=e.target.closest('[data-menu-story]');if(b){e.preventDefault();e.stopPropagation();openMenu(b.dataset.menuStory,b);return}const action=e.target.closest('[data-action]');if(action&&activeStoryId){handleStoryAction(action.dataset.action,activeStoryId);return}const rb=e.target.closest('[data-remove-bookmark]');if(rb)removeBookmark(rb.dataset.removeBookmark)});
async function handleStoryAction(action,id){const entry=entries.find(e=>e.story_id===id),s=entry?.stories;if(!s)return;if(action==='select-remove'){closeMenu();enterSelectionMode();return}if(action==='share'){const url=`${location.origin}${location.pathname.replace('library.html','story.html')}?id=${encodeURIComponent(id)}`;try{if(navigator.share)await navigator.share({title:s.title,text:`Read ${s.title} on GidiReads.`,url});else{await navigator.clipboard.writeText(url);showToast('Story link copied.')}}catch(e){if(e?.name!=='AbortError')showToast('Could not share this story.')}closeMenu();return}if(action==='offline'){closeMenu();location.href=`reader.html?story=${encodeURIComponent(id)}&download=1`;return}if(action==='remove'){const {error}=await supabase.from('library_entries').delete().eq('id',entry.id).eq('reader_id',currentUser.id);if(error)showToast('Could not remove this story.');else{entries=entries.filter(e=>e.id!==entry.id);showToast('Removed from your shelf.');closeMenu();renderAll()} }}
async function removeBookmark(id){const {error}=await supabase.from('reading_bookmarks').delete().eq('id',id).eq('reader_id',currentUser.id);if(error)showToast('Could not remove bookmark.');else{bookmarks=bookmarks.filter(x=>x.id!==id);showToast('Bookmark removed.');renderAll()}}

document.querySelectorAll('.see-all').forEach(b=>b.onclick=()=>{const section=b.dataset.see;const grid=$(section==='continue'?'continueGrid':section==='saved'?'savedGrid':section==='completed'?'completedGrid':'bookmarkGrid');grid?.scrollIntoView({behavior:'smooth',block:'center'});showToast('Your shelf keeps your collection here.')});
wireWriteSheet(()=>currentUser,()=>{authModalSub.textContent='Log in or create an account to publish a story.';openModal()});
init();
