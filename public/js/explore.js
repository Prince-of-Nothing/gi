import { supabase } from './supabaseClient.js';
import { signUpWithUsername } from './auth-guard.js';
import { showToast, wireWriteSheet, refreshUnreadBadge, coverMarkup } from './ui.js';
import { loadStoryTaxonomy, mergeLegacyTaxonomy, taxonomyValues } from './taxonomy.js';

let currentUser=null, authMode='login', allStories=[], publicReadingLists=[], taxonomyMap=new Map(), taxonomyTerms=[];
let exploreAdminSettings={featured_enabled:true,featured_title:'Featured stories',featured_subtitle:'Hand-picked stories from the GidiReads community',featured_max:2};
let exploreFeaturedOrder=[];
const urlParams=new URLSearchParams(location.search);
let discoveryMode='trending', searchTerm=urlParams.get('search')||'', searchType=urlParams.get('type')||'all';
if(!['all','stories','lists'].includes(searchType)) searchType='all';
let appliedFilters={};
['genre','subgenre','trope','tag','setting','region','audience','format','status'].forEach(k=>{const v=urlParams.get(k);if(v)appliedFilters[k]=v});
const taxonomyParam=urlParams.get('taxonomy'), categoryParam=urlParams.get('category');
if(taxonomyParam && categoryParam && ['genre','subgenre','trope','tag','setting','region','audience','format'].includes(categoryParam)) appliedFilters[categoryParam]=taxonomyParam;
let pendingFilters={...appliedFilters};
const $=id=>document.getElementById(id);
const searchInput=$('searchInput'); if(searchTerm) searchInput.value=searchTerm;
const searchTypeInput=$('searchType'); if(searchTypeInput) searchTypeInput.value=searchType;
const loginBtn=$('loginBtn'), authModal=$('authModal'), authForm=$('authForm'), authUsername=$('authUsername'), authEmail=$('authEmail'), authPassword=$('authPassword'), authError=$('authError'), authSubmitBtn=$('authSubmitBtn'), authSwitchBtn=$('authSwitchBtn'), authSwitchPrompt=$('authSwitchPrompt'), authModalTitle=$('authModalTitle'), authModalSub=$('authModalSub');
const escape=s=>{const d=document.createElement('div');d.textContent=s??'';return d.innerHTML};
const num=n=>Number(n||0).toLocaleString();
const authorOf=s=>s.profiles?.display_name||s.profiles?.username||'Unknown author';
const termsBy=c=>taxonomyTerms.filter(t=>t.category===c);

function openModal(){const r=location.pathname.split('/').pop()+location.search+location.hash;location.href='auth.html?mode=login&returnTo='+encodeURIComponent(r)} function closeModal(m){m.hidden=true;document.body.style.overflow=''}

document.querySelectorAll('[data-close="auth"]').forEach(b=>b.onclick=()=>closeModal(authModal)); authModal.onclick=e=>{if(e.target===authModal)closeModal(authModal)};
loginBtn.onclick=()=>{if(currentUser)supabase.auth.signOut();else{authModalSub.textContent='Log in to publish and follow stories.';openModal(authModal)}};
$('forgotPasswordBtn').onclick=async()=>{const email=authEmail.value.trim();if(!email){authError.textContent='Enter your email above first.';authError.hidden=false;return}const {error}=await supabase.auth.resetPasswordForEmail(email);authError.hidden=!error;if(error)authError.textContent=error.message;else authModalSub.textContent='If that email has an account, a reset link is on its way.'};
authSwitchBtn.onclick=()=>{authMode=authMode==='login'?'signup':'login';updateAuthModeUI()};
function updateAuthModeUI(){authError.hidden=true;const signup=authMode==='signup';authModalTitle.textContent=signup?'Create your account':'Welcome to GidiReads';authSubmitBtn.textContent=signup?'Create account':'Log in';authSwitchPrompt.textContent=signup?'Already have an account?':'New to GidiReads?';authSwitchBtn.textContent=signup?'Log in':'Create an account';authUsername.parentElement.style.display=signup?'flex':'none'} updateAuthModeUI();
authForm.onsubmit=async e=>{e.preventDefault();authError.hidden=true;authSubmitBtn.disabled=true;try{const email=authEmail.value.trim(),password=authPassword.value;if(authMode==='signup'){const username=authUsername.value.trim();if(!username)throw Error('Please choose a username.');const data=await signUpWithUsername(supabase,{username,email,password});if(!data.session){authModalSub.textContent='Check your email to confirm your account, then log in.';authMode='login';updateAuthModeUI();authForm.reset();return}showToast(`Welcome, ${username}!`)}else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;showToast('Welcome back!')}authForm.reset();closeModal(authModal)}catch(err){authError.textContent=err.message||'Something went wrong.';authError.hidden=false}finally{authSubmitBtn.disabled=false}};

function updateProfile(){const a=document.querySelector('.explore-profile');if(!a)return;if(!currentUser){a.href='account.html';a.innerHTML='<span class="explore-profile-fallback">G</span>';return}a.href=`author.html?id=${encodeURIComponent(currentUser.id)}`;supabase.from('profiles').select('username,display_name,avatar_url').eq('id',currentUser.id).maybeSingle().then(({data})=>{const name=data?.display_name||data?.username||'G';a.innerHTML=data?.avatar_url?`<img src="${escape(data.avatar_url)}" alt="${escape(name)}">`:`<span>${escape(name.charAt(0).toUpperCase())}</span>`})}
supabase.auth.onAuthStateChange((_e,s)=>{currentUser=s?.user||null;loginBtn.textContent=currentUser?'Log out':'Log in';refreshUnreadBadge(supabase,currentUser?.id);updateProfile()});
async function initAuth(){const {data:{session}}=await supabase.auth.getSession();currentUser=session?.user||null;loginBtn.textContent=currentUser?'Log out':'Log in';refreshUnreadBadge(supabase,currentUser?.id);updateProfile()}

function getLocalResumeChapter(storyId){try{const raw=localStorage.getItem(`gidireads-last-read-${storyId}`);if(!raw)return null;const p=JSON.parse(raw);const n=p&&p.chapterNumber!=null?Number(p.chapterNumber):null;return Number.isFinite(n)&&n>0?n:null}catch{return null}}
function resumeStoryHref(storyId){const ch=getLocalResumeChapter(storyId);return ch?`reader.html?story=${encodeURIComponent(storyId)}&chapter=${encodeURIComponent(ch)}`:`story.html?id=${encodeURIComponent(storyId)}`}
function storyCard(s,badge='') { const genre=s.primary_genre||''; const resumeCh=getLocalResumeChapter(s.id); const href=resumeStoryHref(s.id); const cta=resumeCh?'Continue':'Read'; return `<article class="explore-story-card"><button class="explore-save" data-story-id="${s.id}" aria-label="Save ${escape(s.title)}"><svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1z"/></svg></button><a href="${href}" class="explore-card-cover" aria-label="${cta} ${escape(s.title)}">${coverMarkup(s.cover_url,s.title,'explore-cover')}${resumeCh?'<span class="explore-badge">Continue</span>':(badge?`<span class="explore-badge">${escape(badge)}</span>`:'')}</a><div class="explore-card-copy"><h3><a href="${href}">${escape(s.title)}</a></h3><p>${escape(authorOf(s))}</p><div class="explore-card-meta"><span>${num(s.chapter_count)} chapters</span><span>${escape(genre||'Story')}</span><span>${num(s.reads)} reads</span></div><div class="explore-card-echo"><svg viewBox="0 0 24 24"><path d="M12 3.5 13.9 9l5.6 1.8-5.6 1.9-5.6-1.9L10.1 9 12 3.5Z"/><path d="m18.1 15.4.8 2.2 2.1.8-.8 2.2-.7-2.2-2.2-.7 2.2-.8.7-2.2Z"/></svg>${num(s.echo_count)} echoes</div></div></article>` }
function featuredCard(s){const resumeCh=getLocalResumeChapter(s.id);const href=resumeStoryHref(s.id);return `<article class="explore-featured-card"><a href="${href}" class="featured-art">${coverMarkup(s.cover_url,s.title,'explore-featured-cover')}</a><div class="featured-copy"><span class="explore-badge static">${resumeCh?'Continue reading':'GidiReads Pick'}</span><p class="featured-genre">${escape(s.primary_genre||'Story')}</p><h3><a href="${href}">${escape(s.title)}</a></h3><p class="featured-author">by ${escape(authorOf(s))}</p><p>${escape(s.description||'A story waiting to be discovered.')}</p><div class="featured-stats"><span>${num(s.chapter_count)} chapters</span><span>${num(s.reads)} reads</span><span>${num(s.echo_count)} echoes</span></div><a class="featured-read" href="${href}">${resumeCh?'Continue reading →':'Read story →'}</a></div></article>`}

function scoreTrending(s){return Number(s.echo_count||0)*3+Number(s.reads||0)*.015+new Date(s.updated_at||s.created_at||0).getTime()/86400000000*.04}
function modeStories(){let arr=[...allStories];if(discoveryMode==='trending')return arr.sort((a,b)=>scoreTrending(b)-scoreTrending(a));if(discoveryMode==='popular')return arr.sort((a,b)=>(b.reads||0)-(a.reads||0));if(discoveryMode==='new')return arr.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));if(discoveryMode==='updated')return arr.sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at));if(discoveryMode==='completed')return arr.filter(s=>s.status==='completed').sort((a,b)=>(b.reads||0)-(a.reads||0));return arr}
function taxonomyMatch(t, f){if(!f)return true;return taxonomyValues(t).some(v=>v.toLowerCase()===f.toLowerCase())}
function activeContentType(){return appliedFilters.contentType&&appliedFilters.contentType!=='all'?appliedFilters.contentType:searchType}
function filteredStories(){if(activeContentType()==='lists')return [];return allStories.filter(s=>{const t=taxonomyMap.get(s.id)||[];const m=mergeLegacyTaxonomy(s,t);if(appliedFilters.genre && ![m.primary_genre,...m.secondary_genres].filter(Boolean).some(v=>v.toLowerCase()===appliedFilters.genre.toLowerCase()))return false;for(const c of ['subgenre','trope','tag','setting','region','audience','format'])if(appliedFilters[c]&&!taxonomyMatch(m,appliedFilters[c]))return false;if(appliedFilters.status&&s.status!==appliedFilters.status)return false;if(searchTerm){const q=searchTerm.toLowerCase();const hay=[s.title,s.description,authorOf(s),...taxonomyValues(m)].filter(Boolean).join(' ').toLowerCase();if(!hay.includes(q))return false}return true})}
function renderMode(){let arr=filteredStories();if(discoveryMode==='completed')arr=arr.filter(s=>s.status==='completed');else{const base=modeStories().map(s=>s.id);arr.sort((a,b)=>base.indexOf(a.id)-base.indexOf(b.id))}const grid=$('discoverGrid');$('modeTitle').textContent={trending:'Trending Now',popular:'Popular on GidiReads',new:'New on GidiReads',updated:'Recently Updated',completed:'Completed Stories'}[discoveryMode];$('modeKicker').textContent={trending:'RIGHT NOW',popular:'READER FAVOURITES',new:'JUST ARRIVED',updated:'FRESH CHAPTERS',completed:'FINISHED WORLDS'}[discoveryMode];grid.innerHTML=arr.slice(0,6).map(s=>storyCard(s,discoveryMode==='completed'?'Completed':discoveryMode==='new'?'New':discoveryMode==='updated'?'Updated':'')).join('')||'<div class="explore-empty">No stories match these filters yet.</div>';$('resultsSection').hidden=!!searchTerm?false:true;}
function readingListCard(list){const profile=list.profile||{};const display=profile.display_name||profile.username||'GidiReads reader';const avatar=profile.avatar_url?`<img src="${escape(profile.avatar_url)}" alt="${escape(display)}" loading="lazy">`:`<span class="public-list-avatar-fallback">${escape(display.charAt(0).toUpperCase())}</span>`;return `<a class="public-reading-list-card" href="reading-list.html?id=${encodeURIComponent(list.id)}"><div class="public-list-owner">${avatar}<span><strong>${escape(display)}</strong><small>@${escape(profile.username||'reader')}</small></span></div><div class="public-list-main"><span class="public-list-icon" aria-hidden="true">☷</span><span><strong>${escape(list.name)}</strong>${list.description?`<small class="public-list-description">${escape(list.description)}</small>`:''}</span></div><div class="public-list-count">${num(list.count)} ${list.count===1?'story':'stories'}</div></a>`}
function matchingPublicLists(){if(activeContentType()==='stories')return [];if(!searchTerm)return publicReadingLists;const q=searchTerm.toLocaleLowerCase();return publicReadingLists.filter(l=>[l.name,l.description,l.profile?.username,l.profile?.display_name].filter(Boolean).join(' ').toLocaleLowerCase().includes(q))}
function renderPublicLists(){const host=$('publicListsGrid');if(!host)return;const rows=publicReadingLists.slice(0,8);host.innerHTML=rows.map(readingListCard).join('')||'<div class="explore-empty">No public reading lists yet. When readers make a list public, it can be discovered here.</div>'}
function renderSearch(){if(!searchTerm){$('resultsSection').hidden=true;return}const contentType=activeContentType(),showStories=contentType!=='lists',showLists=contentType!=='stories';const arr=showStories?filteredStories():[],lists=showLists?matchingPublicLists():[];$('resultsSection').hidden=false;$('resultsTitle').textContent=`Results for “${searchTerm}”`;$('resultsCount').textContent=`${arr.length} ${arr.length===1?'story':'stories'} · ${lists.length} ${lists.length===1?'reading list':'reading lists'}`;const storyMarkup=arr.length?`<section class="search-result-group"><h3>Stories <span>${num(arr.length)}</span></h3><div class="explore-story-grid">${arr.map(s=>storyCard(s)).join('')}</div></section>`:'';const listMarkup=lists.length?`<section class="search-result-group"><h3>Public reading lists <span>${num(lists.length)}</span></h3><div class="public-reading-list-grid">${lists.map(readingListCard).join('')}</div></section>`:'';$('resultsGrid').innerHTML=storyMarkup+listMarkup||'<div class="explore-empty">No matching stories or public reading lists found. Try another search.</div>'}
function renderFeatured(){const arr=allStories.filter(s=>s.is_admin_featured).sort((a,b)=>{const ai=exploreFeaturedOrder.indexOf(a.id),bi=exploreFeaturedOrder.indexOf(b.id);if(ai>=0||bi>=0){if(ai<0)return 1;if(bi<0)return -1;return ai-bi;}return new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at)}).slice(0,Math.max(1,Math.min(4,Number(exploreAdminSettings.featured_max)||2)));$('featuredSection').hidden=!exploreAdminSettings.featured_enabled||!arr.length;$('featuredGrid').innerHTML=arr.map(featuredCard).join('');const title=$('featuredSection')?.querySelector('h2');if(title)title.textContent=exploreAdminSettings.featured_title||'Featured stories';const sub=$('featuredSection')?.querySelector('.explore-featured-subtitle');if(sub)sub.textContent=exploreAdminSettings.featured_subtitle||'Hand-picked stories from the GidiReads community';}
async function loadExploreAdminSettings(){const {data,error}=await supabase.from('homepage_admin_settings').select('settings').eq('id',true).maybeSingle();if(error||!data?.settings)return;const cfg=data.settings.explore||{};exploreAdminSettings={...exploreAdminSettings,...cfg};exploreFeaturedOrder=Array.isArray(data.settings.featured_story_order)?data.settings.featured_story_order:[];}

function renderBecause(){if(!currentUser){$('becauseSection').hidden=true;return}supabase.from('library_entries').select('story_id,stories(id,title,description,primary_genre,reads,echo_count,status,cover_url,created_at,updated_at,profiles!stories_author_id_fkey(username,display_name))').eq('reader_id',currentUser.id).order('updated_at',{ascending:false}).limit(3).then(({data})=>{if(!data?.length){$('becauseSection').hidden=true;return}const ids=data.map(x=>x.story_id);const picks=allStories.filter(s=>!ids.includes(s.id)).sort((a,b)=>scoreTrending(b)-scoreTrending(a)).slice(0,3);$('becauseSection').hidden=!picks.length;$('becauseGrid').innerHTML=picks.map(s=>storyCard(s)).join('')})}

function renderTaxonomy(category='genre'){const items=termsBy(category).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||a.name.localeCompare(b.name)).slice(0,8);$('taxonomyShowcaseTitle').textContent=category[0].toUpperCase()+category.slice(1)+'s';$('taxonomyShowcaseGrid').innerHTML=items.map((t,i)=>`<a class="explore-taxonomy-card" href="collection.html?type=taxonomy&category=${encodeURIComponent(category)}&term=${encodeURIComponent(t.name)}"><span class="tax-number">0${i+1}</span><strong>${escape(t.name)}</strong><small>Explore stories →</small></a>`).join('')||'<div class="explore-empty">No active terms here yet.</div>';const see=$('taxonomySeeAll');if(see){see.onclick=()=>{location.href=`collection.html?type=taxonomy&category=${encodeURIComponent(category)}&browse=1`;};}}
function applySingleFilter(category,name){location.href=`collection.html?type=taxonomy&category=${encodeURIComponent(category)}&term=${encodeURIComponent(name)}`}

function fillSelect(id,category){const el=$(id);el.innerHTML='<option value="">Any '+category+'</option>'+termsBy(category).sort((a,b)=>a.name.localeCompare(b.name)).map(t=>`<option value="${escape(t.name)}">${escape(t.name)}</option>`).join('')}
function syncPending(){pendingFilters.contentType=$('filterContentType').value;for(const c of ['genre','subgenre','trope','tag','setting','region','audience','format'])pendingFilters[c]=$(c==='genre'?'filterGenre':'filter'+c[0].toUpperCase()+c.slice(1)).value;pendingFilters.status=$('filterStatus').value}
function loadFilterValues(){fillSelect('filterGenre','genre');fillSelect('filterSubgenre','subgenre');fillSelect('filterTrope','trope');fillSelect('filterTag','tag');fillSelect('filterSetting','setting');fillSelect('filterRegion','region');fillSelect('filterAudience','audience');fillSelect('filterFormat','format')}
function openFilters(){pendingFilters={...appliedFilters};$('filterContentType').value=pendingFilters.contentType||'all';for(const c of ['genre','subgenre','trope','tag','setting','region','audience','format'])$(c==='genre'?'filterGenre':'filter'+c[0].toUpperCase()+c.slice(1)).value=pendingFilters[c]||'';$('filterStatus').value=pendingFilters.status||'';$('filterOverlay').hidden=false;document.body.style.overflow='hidden'}
function closeFilters(){ $('filterOverlay').hidden=true;document.body.style.overflow=''}
function updateFilterCount(){const n=Object.entries(appliedFilters).filter(([k,v])=>v&&v!=='all'&&k!=='contentType').length+(appliedFilters.contentType&&appliedFilters.contentType!=='all'?1:0);$('filterCount').hidden=!n;$('filterCount').textContent=n}

$('discoveryTabs').onclick=e=>{const b=e.target.closest('.explore-tab');if(!b)return;document.querySelectorAll('.explore-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');discoveryMode=b.dataset.mode;renderMode()};
$('searchForm').onsubmit=e=>{e.preventDefault();searchTerm=searchInput.value.trim();searchType=searchTypeInput.value;renderSearch();renderMode();history.replaceState(null,'',`explore.html?search=${encodeURIComponent(searchTerm)}&type=${encodeURIComponent(searchType)}`)};
searchTypeInput.onchange=()=>{$('searchForm').requestSubmit()};
searchInput.oninput=()=>{clearTimeout(window.__grSearch);window.__grSearch=setTimeout(()=>{$('searchForm').requestSubmit()},320)};
$('openFilterBtn').onclick=openFilters;$('closeFilterBtn').onclick=closeFilters;$('filterOverlay').onclick=e=>{if(e.target===$('filterOverlay'))closeFilters()};$('clearFilters').onclick=()=>{appliedFilters={};searchType='all';searchTypeInput.value='all';$('filterContentType').value='all';updateFilterCount();['filterGenre','filterSubgenre','filterTrope','filterTag','filterSetting','filterRegion','filterAudience','filterFormat','filterStatus'].forEach(id=>$(id).value='');renderMode();closeFilters()};$('applyFilters').onclick=()=>{syncPending();appliedFilters={...pendingFilters};searchType=appliedFilters.contentType||'all';searchTypeInput.value=searchType;updateFilterCount();renderMode();renderSearch();closeFilters()};
$('discoveryLinks').onclick=e=>{const b=e.target.closest('[data-category]');if(!b)return;renderTaxonomy(b.dataset.category);document.getElementById('taxonomyShowcase').scrollIntoView({behavior:'smooth',block:'start'})};$('taxonomyShowcaseGrid').onclick=e=>{const b=e.target.closest('[data-taxonomy]');if(b)applySingleFilter(b.dataset.category,b.dataset.taxonomy)};
$('seeAllBtn').onclick=()=>{if(searchTerm){location.href=`explore.html?search=${encodeURIComponent(searchTerm)}#results`;return}location.href=`collection.html?type=${encodeURIComponent(discoveryMode)}`};
$('resultsGrid').onclick=wireSaveButtons;$('discoverGrid').onclick=wireSaveButtons;
async function wireSaveButtons(e){const b=e.target.closest('.explore-save');if(!b)return;e.preventDefault();e.stopPropagation();if(!currentUser){authModalSub.textContent='Log in to save stories to your library.';openModal(authModal);return}b.disabled=true;const {error}=await supabase.from('library_entries').upsert({reader_id:currentUser.id,story_id:b.dataset.storyId,status:'saved'},{onConflict:'reader_id,story_id',ignoreDuplicates:true});if(error)showToast('Could not save story.');else{b.classList.add('saved');showToast('Saved to your library')}b.disabled=false}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms/1000)} seconds.`)), ms);
    Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

async function queryExploreStories() {
  let result = await supabase.from('stories')
    .select('id,title,description,primary_genre,secondary_genre,tags,echo_count,reads,status,cover_url,is_admin_featured,created_at,updated_at,content_rating,profiles!stories_author_id_fkey(username,display_name)')
    .neq('status','draft');
  if (!result.error) return result;
  console.warn('Explore story query with profile metadata failed; retrying without the profile join:', result.error.message);
  result = await supabase.from('stories')
    .select('id,title,description,primary_genre,secondary_genre,tags,echo_count,reads,status,cover_url,is_admin_featured,created_at,updated_at,content_rating')
    .neq('status','draft');
  if (!result.error) return result;
  console.warn('Explore story query with extended metadata failed; retrying with core fields:', result.error.message);
  return await supabase.from('stories')
    .select('id,title,description,primary_genre,echo_count,reads,status,cover_url,created_at,updated_at')
    .neq('status','draft');
}

async function attachPublishedChapterCounts(stories) {
  const rows = (stories || []).filter(Boolean);
  const ids = [...new Set(rows.map(story => String(story.id)).filter(Boolean))];
  if (!ids.length) return rows;
  const { data, error } = await supabase.from('chapters')
    .select('story_id')
    .in('story_id', ids)
    .eq('is_published', true)
    .is('archived_at', null);
  if (error) {
    console.warn('Published chapter counts unavailable:', error.message);
    return rows.map(story => ({ ...story, chapter_count: Number(story.chapter_count || 0) }));
  }
  const counts = new Map();
  (data || []).forEach(row => counts.set(String(row.story_id), (counts.get(String(row.story_id)) || 0) + 1));
  return rows.map(story => ({ ...story, chapter_count: Number(story.chapter_count ?? counts.get(String(story.id)) ?? 0) }));
}

async function loadPublicReadingLists(){
  const host=$('publicListsGrid');
  try{
    const {data,error}=await withTimeout(supabase.from('reading_lists').select('id,owner_id,name,description,created_at,reading_list_items(count)').eq('is_public',true).order('created_at',{ascending:false}).limit(100),10000,'Public reading lists');
    if(error)throw error;
    const rows=data||[],ownerIds=[...new Set(rows.map(x=>x.owner_id).filter(Boolean))];
    let profiles=[];
    if(ownerIds.length){const result=await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id',ownerIds);if(result.error)throw result.error;profiles=result.data||[];}
    const byId=new Map(profiles.map(p=>[p.id,p]));
    publicReadingLists=rows.map(l=>({...l,profile:byId.get(l.owner_id)||{},count:l.reading_list_items?.[0]?.count||0}));
    renderPublicLists();if(searchTerm)renderSearch();
  }catch(error){console.warn('Public reading lists unavailable:',error);if(host)host.innerHTML='<div class="explore-empty">Public reading lists could not be loaded right now.</div>';}
}

async function boot(){
  const showFailure = (message) => {
    const html = `<div class="explore-empty" role="status">${escape(message)}</div>`;
    ['featuredGrid','discoverGrid','resultsGrid','taxonomyShowcaseGrid'].forEach(id=>{const el=$(id);if(el && (el.innerHTML.includes('Loading') || !el.innerHTML.trim())) el.innerHTML=html;});
    const featured=$('featuredSection'); if(featured && $('featuredGrid')?.textContent.includes(message)) featured.hidden=false;
  };
  // Auth and editorial settings are optional. Start them in the background so
  // neither can hold the entire Explore page at its loading placeholders.
  const authTask = initAuth().catch(err => console.warn('Explore auth initialisation failed:', err));
  const settingsTask = loadExploreAdminSettings().catch(err => console.warn('Explore settings unavailable; using defaults:', err));
  const termsTask = (async()=>{
    try {
      const {data,error}=await withTimeout(
        supabase.from('gidireads_taxonomy_terms').select('name,slug,category,sort_order').eq('is_active',true).order('sort_order',{ascending:true}).order('name',{ascending:true}),
        8000, 'Taxonomy loading');
      taxonomyTerms=error?[]:(data||[]);
      loadFilterValues();
      renderTaxonomy('genre');
    } catch(err) { console.warn('Explore taxonomy unavailable:',err); taxonomyTerms=[]; loadFilterValues(); renderTaxonomy('genre'); }
  })();

  try {
    loadFilterValues(); updateFilterCount();$('filterContentType').value=searchType;
    Object.entries(appliedFilters).forEach(([k,v])=>{const id=k==='genre'?'filterGenre':k==='status'?'filterStatus':'filter'+k[0].toUpperCase()+k.slice(1); if($(id)) $(id).value=v});
    const result = await withTimeout(queryExploreStories(), 15000, 'Story loading');
    if(result.error){
      const message='Stories are temporarily unavailable. Please refresh and try again.';
      ['featuredGrid','discoverGrid','taxonomyShowcaseGrid'].forEach(id=>{const el=$(id);if(el)el.innerHTML=`<div class="explore-empty" role="status">${escape(message)}</div>`;});
      console.error('Explore story query failed:',result.error); return;
    }
    allStories=await attachPublishedChapterCounts(result.data||[]);
    // Taxonomy metadata enriches filtering, but should never prevent the core
    // story list from appearing if that optional relation is unavailable.
    try { taxonomyMap=await withTimeout(loadStoryTaxonomy(allStories.map(s=>s.id)), 8000, 'Story taxonomy loading'); }
    catch(err) { console.warn('Story taxonomy unavailable; using legacy story fields:',err); taxonomyMap=new Map(); }
    // Let settings finish briefly, but never hold the story cards indefinitely.
    await Promise.race([settingsTask, new Promise(resolve=>setTimeout(resolve,1800))]);
    await Promise.race([termsTask, new Promise(resolve=>setTimeout(resolve,1800))]);
    loadFilterValues();
    renderFeatured(); renderMode(); renderSearch(); renderTaxonomy('genre');
    loadPublicReadingLists();
    // Personalised recommendations are non-essential and must not delay Explore.
    authTask.then(()=>renderBecause()).catch(err=>console.warn('Personalised shelf unavailable:',err));
    termsTask.catch(()=>{});
  } catch(err) {
    console.error('Explore could not initialise:',err);
    showFailure('Explore could not finish loading. Please refresh and try again.');
  }
}

wireWriteSheet(()=>currentUser,()=>{authModalSub.textContent='Log in or create an account to publish a story.';openModal(authModal)});
boot();
