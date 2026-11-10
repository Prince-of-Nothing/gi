import { supabase } from './supabaseClient.js';
import { showToast, wireWriteSheet, refreshUnreadBadge, coverMarkup } from './ui.js';
import { loadTaxonomyTerms } from './taxonomy.js';

let currentUser = null;
let authMode = 'login';

const $ = (id) => document.getElementById(id);
const loginBtn = $('loginBtn');
const homeProfileAvatar = $('homeProfileAvatar');
const publishHeroBtn = $('publishHeroBtn');
const publishBottomBtn = $('publishBottomBtn');
const authModal = $('authModal');
const authForm = $('authForm');
const authUsername = $('authUsername');
const authEmail = $('authEmail');
const authPassword = $('authPassword');
const authError = $('authError');
const authSubmitBtn = $('authSubmitBtn');
const authSwitchBtn = $('authSwitchBtn');
const authSwitchPrompt = $('authSwitchPrompt');
const authModalTitle = $('authModalTitle');
const authModalSub = $('authModalSub');
const featuredContent = $('featuredContent');
const trendingRow = $('trendingRow');
const updatedRow = $('updatedRow');
const newStoriesRow = $('newStoriesRow');
const continueSection = $('continueSection');
const continueGrid = $('continueGrid');
const homepageGenreList = $('homepageGenreList');
const tropeSection = $('tropesSection');
const homepageTropeList = $('homepageTropeList');
const heroStoryStack = $('heroStoryStack');
let homepageAdminSettings = null;
const HOME_DEFAULTS = { hero:{enabled:true,eyebrow:'GidiReads',title:'Find a story worth staying for.',description:'Discover novels, new voices and worlds you can disappear into.',cta_label:'Explore stories',cta_url:'explore.html',image_url:'',story_id:''}, sections:{featured:{enabled:true,order:1,kicker:'A place to begin',title:'Featured for you'},trending:{enabled:true,order:2,kicker:'What readers are picking up',title:'Trending now'},updated:{enabled:true,order:3,kicker:'New chapters to catch up on',title:'Recently updated'},new:{enabled:true,order:4,kicker:'Fresh on the platform',title:'New releases'},genres:{enabled:true,order:5,kicker:'Find your kind of story',title:'Explore by genre'},tropes:{enabled:true,order:6,kicker:'Looking for a particular dynamic?',title:'Discover by trope'}},explore:{featured_enabled:true,featured_title:'Featured stories',featured_subtitle:'Hand-picked stories from the GidiReads community',featured_max:2}};
function mergeHomeSettings(raw){const out=JSON.parse(JSON.stringify(HOME_DEFAULTS));if(raw?.hero)Object.assign(out.hero,raw.hero);if(raw?.explore)Object.assign(out.explore,raw.explore);if(raw?.sections)Object.keys(out.sections).forEach(k=>{if(raw.sections[k])Object.assign(out.sections[k],raw.sections[k])});out.custom_sections=Array.isArray(raw?.custom_sections)?raw.custom_sections:[];out.featured_story_order=Array.isArray(raw?.featured_story_order)?raw.featured_story_order:[];return out;}
async function loadHomepageAdminSettings(){const {data,error}=await supabase.from('homepage_admin_settings').select('settings').eq('id',true).maybeSingle();homepageAdminSettings=mergeHomeSettings(error?null:data?.settings);applyHomepageAdminSettings();}
function safeHomeUrl(value,fallback='explore.html'){const raw=String(value||'').trim();if(/^https?:\/\//i.test(raw))return raw;if(/^[a-z0-9_./#?=&%-]+$/i.test(raw)&&!raw.startsWith('//')&&!/^(javascript|data|vbscript):/i.test(raw))return raw;return fallback;}
function applyHomepageAdminSettings(){
  const cfg=homepageAdminSettings||mergeHomeSettings();
  const hero=document.querySelector('.home-hero');
  if(hero)hero.hidden=!cfg.hero.enabled;
  const art=document.querySelector('.home-hero-art');
  if(art){const image=String(cfg.hero.image_url||'').trim();art.style.backgroundImage=/^https:\/\/[^\s"'()\\]+$/i.test(image)?`linear-gradient(135deg,rgba(35,18,48,.20),rgba(35,18,48,.56)),url("${image}")`:'';art.style.backgroundSize='cover';art.style.backgroundPosition='center';}
  const eyebrow=document.querySelector('.home-kicker');if(eyebrow)eyebrow.textContent=cfg.hero.eyebrow||'GidiReads';
  const title=$('homeHeroTitle');if(title)title.innerHTML='Find a story<br><em>worth staying for.</em>';
  const desc=document.querySelector('.home-hero-sub');if(desc)desc.textContent=cfg.hero.description||'';
  const cta=document.querySelector('.home-primary-btn');if(cta){cta.textContent=cfg.hero.cta_label||'Explore stories';cta.href=safeHomeUrl(cfg.hero.cta_url,'explore.html');}
  const ids={featured:'featuredSection',trending:'trendingSection',updated:'updatedSection',new:'newSection',genres:'genresSection',tropes:'tropesSection'};
  const blocks=[];
  Object.entries(ids).forEach(([key,id])=>{const el=$(id),v=cfg.sections[key];if(!el||!v)return;el.hidden=!v.enabled;const kicker=el.querySelector('.home-section-kicker');if(kicker)kicker.textContent=v.kicker||'';const h=el.querySelector('.home-section-head h2');if(h)h.textContent=v.title||'';blocks.push({el,order:Number(v.order)||20});});
  (cfg.custom_sections||[]).filter(x=>x&&x.enabled!==false&&String(x.title||'').trim()).forEach((x,index)=>{
    const section=document.createElement('section');section.className=`home-section home-custom-section ${x.layout==='image-right'?'image-right':''} ${x.image_url?'has-image':'text-only'}`;section.dataset.customSection=String(x.id||index);
    const image=String(x.image_url||'').trim();const validImage=/^https:\/\/[^\s"'()\\]+$/i.test(image);const imageMarkup=validImage?`<div class="home-custom-image"><img src="${escapeAttr(image)}" alt="" loading="lazy"></div>`:'';
    const button=String(x.cta_label||'').trim()&&String(x.cta_url||'').trim()?`<a class="home-custom-cta" href="${escapeAttr(safeHomeUrl(x.cta_url,'explore.html'))}">${escapeHtml(x.cta_label)} <span aria-hidden="true">→</span></a>`:'';
    const collectionLink=`<a class="home-custom-cta home-custom-see-all" href="collection.html?type=custom&section=${encodeURIComponent(String(x.id||index))}">See all stories <span aria-hidden="true">→</span></a>`;
    section.innerHTML=`<div class="home-custom-copy">${x.kicker?`<p class="home-section-kicker">${escapeHtml(x.kicker)}</p>`:''}<h2>${escapeHtml(x.title)}</h2><p class="home-custom-body">${escapeHtml(x.body||'').replace(/\n/g,'<br>')}</p>${button}<div class="home-custom-footer">${collectionLink}</div></div>${imageMarkup}<div class="home-custom-stories home-story-grid" aria-live="polite"><div class="home-loading-card">Loading this collection…</div></div>`;
    blocks.push({el:section,order:Number(x.order)||10+index});
  });
  const anchor=document.querySelector('.home-explore-more');
  if(anchor&&anchor.parentElement)blocks.sort((a,b)=>a.order-b.order).forEach(item=>anchor.parentElement.insertBefore(item.el,anchor));
}

function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }

async function updateHomeProfile() {
  if (!homeProfileAvatar) return;
  if (!currentUser) {
    homeProfileAvatar.href = 'account.html';
    homeProfileAvatar.innerHTML = '<span class="home-profile-fallback" aria-hidden="true">G</span>';
    homeProfileAvatar.setAttribute('aria-label', 'Log in or view profile');
    return;
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', currentUser.id)
    .maybeSingle();
  const name = profile?.username || profile?.display_name || currentUser.user_metadata?.username || 'User';
  homeProfileAvatar.href = `author.html?id=${encodeURIComponent(currentUser.id)}`;
  if (profile?.avatar_url) {
    homeProfileAvatar.innerHTML = `<img src="${escapeAttr(profile.avatar_url)}" alt="${escapeAttr(name)}" />`;
  } else {
    homeProfileAvatar.innerHTML = `<span class="home-profile-fallback" aria-hidden="true">${escapeHtml(name.charAt(0).toUpperCase())}</span>`;
  }
  homeProfileAvatar.setAttribute('aria-label', `${name} profile`);
}

function openModal(modal) {
  if (modal?.id === 'authModal') {
    const returnTo = location.pathname + location.search + location.hash;
    const mode = 'login';
    window.location.href = `auth.html?mode=${mode}&returnTo=${encodeURIComponent(returnTo)}`;
    return;
  }
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal(modal) { modal.hidden = true; document.body.style.overflow = ''; }

$('authModal').querySelectorAll('[data-close="auth"]').forEach((btn) => btn.addEventListener('click', () => closeModal(authModal)));
authModal.addEventListener('click', (e) => { if (e.target === authModal) closeModal(authModal); });

function handlePublishRequest() {
  if (currentUser) { window.location.href = 'my-stories.html'; }
  else { window.location.href = 'auth.html?mode=signup&intent=author'; }
}
publishHeroBtn.addEventListener('click', handlePublishRequest);
publishBottomBtn.addEventListener('click', handlePublishRequest);

loginBtn.addEventListener('click', async () => {
  if (currentUser) {
    loginBtn.disabled = true;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = 'auth.html?mode=login';
    } catch (err) {
      showToast(err?.message || 'Could not log out. Please try again.');
      loginBtn.disabled = false;
    }
  } else {
    window.location.href = 'auth.html?mode=login';
  }
});

const forgotPasswordBtn = $('forgotPasswordBtn');
forgotPasswordBtn.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  if (!email) {
    authError.textContent = 'Enter your email above first, then tap "Forgot password?" again.';
    authError.hidden = false;
    return;
  }
  forgotPasswordBtn.disabled = true;
  const resetRedirect = location.origin+'/reset-password.html';
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetRedirect });
  forgotPasswordBtn.disabled = false;
  if (error) {
    authError.textContent = error.message;
    authError.hidden = false;
  } else {
    authModalSub.textContent = 'If that email has an account, a reset link is on its way.';
    authError.hidden = true;
  }
});

authSwitchBtn.addEventListener('click', () => {
  authMode = authMode === 'login' ? 'signup' : 'login';
  updateAuthModeUI();
});

function updateAuthModeUI() {
  authError.hidden = true;
  if (authMode === 'signup') {
    authModalTitle.textContent = 'Create your account';
    authSubmitBtn.textContent = 'Create account';
    authSwitchPrompt.textContent = 'Already have an account?';
    authSwitchBtn.textContent = 'Log in';
    authUsername.parentElement.style.display = 'flex';
  } else {
    authModalTitle.textContent = 'Welcome to GidiReads';
    authSubmitBtn.textContent = 'Log in';
    authSwitchPrompt.textContent = 'New to GidiReads?';
    authSwitchBtn.textContent = 'Create an account';
    authUsername.parentElement.style.display = 'none';
  }
}
updateAuthModeUI();

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.hidden = true;
  authSubmitBtn.disabled = true;
  const email = authEmail.value.trim();
  const password = authPassword.value;
  try {
    if (authMode === 'signup') {
      const username = authUsername.value.trim();
      if (!username) throw new Error('Please choose a username.');
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
      if (error) throw error;
      if (!data.session) {
        authModalSub.textContent = 'Check your email to confirm your account, then log in.';
        authMode = 'login';
        updateAuthModeUI();
        authForm.reset();
        return;
      }
      authForm.reset();
      closeModal(authModal);
      showToast(`Welcome, ${username}!`);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      authForm.reset();
      closeModal(authModal);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, display_name').eq('id', user.id).single();
        showToast(`Welcome back, ${profile?.display_name || profile?.username || ''}!`);
      }
    }
  } catch (err) {
    authError.textContent = err.message || 'Something went wrong. Please try again.';
    authError.hidden = false;
  } finally {
    authSubmitBtn.disabled = false;
  }
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user ?? null;
  loginBtn.textContent = currentUser ? 'Log out' : 'Log in';
  updateHomeProfile();
  refreshUnreadBadge(supabase, currentUser?.id);
  renderPersonalHomeState();
});

async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user ?? null;
  loginBtn.textContent = currentUser ? 'Log out' : 'Log in';
  await updateHomeProfile();
  await renderPersonalHomeState();
}

$('homeSearchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const term = $('homeSearchInput').value.trim();
  window.location.href = term ? `explore.html?search=${encodeURIComponent(term)}` : 'explore.html';
});

function storyCard(story, options = {}) {
  const author = story.profiles?.display_name || story.profiles?.username || 'Unknown author';
  const cover = coverMarkup(story.cover_url, story.title, 'home-cover');
  const genre = story.primary_genre || '';
  const stats = options.hideStats ? '' : `<div class="home-card-stats"><span class="home-chapter-stat">${formatNumber(story.chapter_count)} chapters</span><span>${formatNumber(story.reads)} reads</span><span class="home-echo-stat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 13.9 9l5.6 1.8-5.6 1.9-1.9 5.8-1.9-5.8-5.6-1.9L10.1 9 12 3.5Z"/><path d="m18.1 15.4.8 2.2 2.1.8-2.1.7-.8 2.2-.7-2.2-2.2-.7 2.2-.8.7-2.2Z"/></svg>${formatNumber(story.echo_count)} echoes</span></div>`;
  const progress = options.progress != null ? `<div class="home-progress"><span style="width:${Math.max(0, Math.min(100, Number(options.progress) || 0))}%"></span></div>` : '';
  const progressText = options.progress != null ? `<span class="home-progress-text">${Math.round(Number(options.progress) || 0)}% read</span>` : '';
  const href = options.readerChapter ? `reader.html?story=${encodeURIComponent(story.id)}&chapter=${encodeURIComponent(options.readerChapter)}` : `story.html?id=${encodeURIComponent(story.id)}`;
  return `<a class="home-story-card ${options.className || ''}" href="${href}">
    <div class="home-cover-wrap">${cover}${options.badge ? `<span class="home-card-badge">${escapeHtml(options.badge)}</span>` : ''}</div>
    <h3>${escapeHtml(story.title || 'Untitled')}</h3>
    <p>${escapeHtml(author)}</p>
    ${genre ? `<span class="home-card-genre">${escapeHtml(genre)}</span>` : ''}
    ${progressText}${progress}
    ${stats}
  </a>`;
}

function featuredCard(story) {
  const author = story.profiles?.display_name || story.profiles?.username || 'Unknown author';
  return `<article class="home-featured-card">
    <a class="home-featured-cover" href="story.html?id=${encodeURIComponent(story.id)}">${coverMarkup(story.cover_url, story.title, 'home-featured-cover-img')}</a>
    <div class="home-featured-copy">
      <span class="home-card-badge">Featured</span>
      <p class="home-featured-genre">${escapeHtml(story.primary_genre || 'Story')}</p>
      <h3><a href="story.html?id=${encodeURIComponent(story.id)}">${escapeHtml(story.title || 'Untitled')}</a></h3>
      <p class="home-featured-author">by ${escapeHtml(author)}</p>
      <p class="home-featured-description">${escapeHtml(story.description || 'Step into a story and see where it takes you.')}</p>
      <div class="home-featured-meta"><span>${formatNumber(story.chapter_count)} chapters</span><span>${formatNumber(story.reads)} reads</span><span class="home-echo-stat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 13.9 9l5.6 1.8-5.6 1.9-1.9 5.8-1.9-5.8-5.6-1.9L10.1 9 12 3.5Z"/><path d="m18.1 15.4.8 2.2 2.1.8-2.1.7-.8-2.2Z"/></svg>${formatNumber(story.echo_count)} echoes</span></div>
      <a class="home-featured-link" href="story.html?id=${encodeURIComponent(story.id)}">Read story →</a>
    </div>
  </article>`;
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

async function loadHomepageData() {
  try { await loadHomepageAdminSettings(); } catch (error) { console.warn('Homepage settings unavailable; using defaults:', error); homepageAdminSettings=mergeHomeSettings(null); applyHomepageAdminSettings(); }
  try {
    await Promise.allSettled([
      loadFeatured(),
      loadTrending(),
      loadRecentlyUpdated(),
      loadNewStories(),
      loadHomepageGenres(),
      loadHomepageTropes(),
      loadHeroStack(),
      loadCustomHomepageCollections(),
    ]);
  } catch (error) {
    console.error('loadHomepageData failed:', error);
  }
}

async function loadCustomHomepageCollections(){
  const sections=(homepageAdminSettings?.custom_sections||[]).filter(x=>x&&x.enabled!==false&&String(x.title||'').trim());
  await Promise.all(sections.map(async cfg=>{
    const section=[...document.querySelectorAll('[data-custom-section]')].find(node=>node.dataset.customSection===String(cfg.id||''));
    const mount=section?.querySelector('.home-custom-stories');
    if(!mount)return;
    const ids=(cfg.story_ids||[]).map(String).filter(Boolean).slice(0,8);
    if(!ids.length){mount.innerHTML=emptyShelf('No stories have been selected for this collection yet.');return;}
    const {data,error}=await supabase.from('stories').select('id,title,primary_genre,echo_count,reads,cover_url,profiles!stories_author_id_fkey(username,display_name)').in('id',ids).neq('status','draft');
    if(error){console.error('Custom homepage collection failed:',error);mount.innerHTML=emptyShelf('This collection could not be loaded. Please refresh.');return;}
    const byId=new Map((data||[]).map(story=>[String(story.id),story]));
    const ordered=await attachPublishedChapterCounts(ids.map(id=>byId.get(id)).filter(Boolean));
    mount.innerHTML=ordered.length?ordered.map(story=>storyCard(story,{hideStats:false})).join(''):emptyShelf('Stories selected for this collection will appear here.');
  }));
}

async function renderPersonalHomeState() {
  if (!currentUser) {
    continueSection.hidden = true;
    return;
  }
  await loadContinueReading();
}

async function loadContinueReading() {
  const { data, error } = await supabase
    .from('library_entries')
    .select('id,status,last_chapter_number,updated_at,stories(id,title,description,primary_genre,echo_count,reads,cover_url,profiles!stories_author_id_fkey(username,display_name))')
    .eq('reader_id', currentUser.id)
    .eq('status', 'reading')
    .order('updated_at', { ascending: false })
    .limit(4);

  if (error || !data?.length) {
    continueSection.hidden = true;
    return;
  }

  continueSection.hidden = false;
  const continueStories = await attachPublishedChapterCounts(data.filter(x => x.stories).map(x => x.stories));
  const continueById = new Map(continueStories.map(story => [String(story.id), story]));
  continueGrid.innerHTML = data.filter(x => x.stories).map((entry) => storyCard(continueById.get(String(entry.stories.id)) || entry.stories, {
    progress: null,
    readerChapter: entry.last_chapter_number || 1,
    badge: 'Continue',
  })).join('');
}

async function loadFeatured() {
  // Stories assigned to an editorial homepage collection belong on that
  // collection's See all stories page, not duplicated in the Featured shelf
  // immediately above the collection banner.
  const curatedIds = new Set((homepageAdminSettings?.custom_sections || [])
    .filter(section => section && section.enabled !== false)
    .flatMap(section => Array.isArray(section.story_ids) ? section.story_ids.map(String) : []));
  let { data, error } = await supabase
    .from('stories')
    .select('id,title,description,primary_genre,echo_count,reads,cover_url,profiles!stories_author_id_fkey(username,display_name)')
    .eq('is_admin_featured', true)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) {
    console.warn('loadFeatured attempt1 failed:', error.message);
    ({ data, error } = await supabase
      .from('stories')
      .select('id,title,description,primary_genre,echo_count,reads,cover_url')
      .eq('is_admin_featured', true)
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(20));
  }
  if (error) {
    console.warn('loadFeatured attempt2 failed:', error.message);
    ({ data, error } = await supabase
      .from('stories')
      .select('id,title,description,primary_genre,echo_count,reads,cover_url')
      .eq('is_admin_featured', true)
      .neq('status', 'draft'));
  }

  let choices = !error && data?.length ? data : await getPopularStories(12);
  choices = (choices || []).filter(story => !curatedIds.has(String(story.id)));
  if (!choices.length) {
    featuredContent.innerHTML = '<div class="home-empty">Open a collection’s “See all stories” link to view its selected novels.</div>';
    const section = document.getElementById('featuredSection');
    if (section) section.hidden = true;
    return;
  }
  const order = homepageAdminSettings?.featured_story_order || [];
  choices.sort((a,b) => { const ai=order.indexOf(a.id), bi=order.indexOf(b.id); if(ai<0&&bi<0)return 0; if(ai<0)return 1; if(bi<0)return -1; return ai-bi; });
  choices = await attachPublishedChapterCounts(choices);
  featuredContent.innerHTML = choices.slice(0,4).map(featuredCard).join('');
}

function mapShelfStory(row) {
  return { ...row, profiles: { username: row.author_username || '', display_name: row.author_display_name || '' } };
}

async function loadTrending() {
  // Prefer the verified-activity rankings routine; fall back to a direct query if
  // the ranking RPC is not present in the current database.
  const { data: ranked, error: rankError } = await supabase.rpc('gidireads_novel_rankings', { p_period: 'weekly', p_limit: 6, p_offset: 0 });
  if (!rankError && ranked?.length) {
    const ids = ranked.map((row) => row.story_id);
    const { data: details } = await supabase.from('stories').select('id,reads,echo_count').in('id', ids);
    const detailMap = new Map((details || []).map((row) => [String(row.id), row]));
    const cards = ranked.map((row) => ({
      ...row,
      id: row.story_id,
      reads: Number(detailMap.get(String(row.story_id))?.reads || row.unique_readers || 0),
      echo_count: Number(detailMap.get(String(row.story_id))?.echo_count || 0),
      profiles: { username: row.author_username || '', display_name: row.author_display_name || '' },
    }));
    trendingRow.innerHTML = cards.map((story, index) => storyCard(story, { badge: index < 2 ? `#${index + 1}` : '' })).join('');
    return;
  }
  if (rankError) console.warn('Trending rankings RPC unavailable; falling back to a direct query:', rankError.message);
  const data = await getStories('echo_count', 6);
  const stories = await attachPublishedChapterCounts(data);
  trendingRow.innerHTML = stories.length ? stories.map((s, i) => storyCard(s, { badge: i < 2 ? `#${i + 1}` : '' })).join('') : emptyShelf('No stories to show yet.');
}

async function loadRecentlyUpdated() {
  // The homepage-shelf routine orders by the greatest published-chapter timestamp,
  // so a new chapter surfaces even when the story row itself has not changed.
  const shelf = await supabase.rpc('gidireads_homepage_shelf', { p_shelf: 'recently_updated', p_limit: 6 });
  if (!shelf.error && shelf.data?.length) {
    const stories = shelf.data.map(mapShelfStory);
    updatedRow.innerHTML = stories.length ? stories.map((s) => storyCard(s)).join('') : emptyShelf('Recently updated stories will appear here after authors publish chapters.');
    return;
  }
  if (shelf.error) console.warn('Recently updated shelf RPC unavailable; falling back to a direct query:', shelf.error.message);
  let { data, error } = await supabase
    .from('stories')
    .select('id,title,primary_genre,echo_count,reads,cover_url,updated_at,profiles!stories_author_id_fkey(username,display_name)')
    .neq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(6);
  if (error) {
    console.warn('loadRecentlyUpdated attempt1 failed:', error.message);
    ({ data, error } = await supabase
      .from('stories')
      .select('id,title,primary_genre,echo_count,reads,cover_url,updated_at')
      .neq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(6));
  }
  if (error) {
    console.warn('loadRecentlyUpdated attempt2 failed:', error.message);
    ({ data, error } = await supabase
      .from('stories')
      .select('id,title,primary_genre,echo_count,reads,cover_url,updated_at')
      .neq('status', 'draft'));
    if (!error && data) data = [...data].sort((a, b) => new Date(b?.updated_at || 0) - new Date(a?.updated_at || 0)).slice(0, 6);
  }
  if (error) console.error('loadRecentlyUpdated FAILED:', error.message, error);
  const updatedStories = !error && data?.length ? await attachPublishedChapterCounts(data) : [];
  updatedRow.innerHTML = updatedStories.length ? updatedStories.map((s) => storyCard(s)).join('') : emptyShelf('Recently updated stories will appear here.');
}

async function loadNewStories() {
  // New releases are ordered by first publication timestamp (the shelf routine),
  // not by the story row's created_at.
  const shelf = await supabase.rpc('gidireads_homepage_shelf', { p_shelf: 'new_releases', p_limit: 6 });
  if (!shelf.error && shelf.data?.length) {
    const stories = shelf.data.map(mapShelfStory);
    newStoriesRow.innerHTML = stories.length ? stories.map((s) => storyCard(s, { badge: 'New' })).join('') : emptyShelf('New stories will appear here as authors publish.');
    return;
  }
  if (shelf.error) console.warn('New releases shelf RPC unavailable; falling back to a direct query:', shelf.error.message);
  let { data, error } = await supabase
    .from('stories')
    .select('id,title,primary_genre,echo_count,reads,cover_url,created_at,profiles!stories_author_id_fkey(username,display_name)')
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(6);
  if (error) {
    console.warn('loadNewStories attempt1 failed:', error.message);
    ({ data, error } = await supabase
      .from('stories')
      .select('id,title,primary_genre,echo_count,reads,cover_url,created_at')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(6));
  }
  if (error) {
    console.warn('loadNewStories attempt2 failed:', error.message);
    ({ data, error } = await supabase
      .from('stories')
      .select('id,title,primary_genre,echo_count,reads,cover_url,created_at')
      .neq('status', 'draft'));
    if (!error && data) data = [...data].sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0)).slice(0, 6);
  }
  if (error) console.error('loadNewStories FAILED:', error.message, error);
  const newStories = !error && data?.length ? await attachPublishedChapterCounts(data) : [];
  newStoriesRow.innerHTML = newStories.length ? newStories.map((s) => storyCard(s, { badge: 'New' })).join('') : emptyShelf('New stories will appear here as authors publish.');
}

async function getStories(orderColumn, limit) {
  const baseSelect = 'id,title,primary_genre,echo_count,reads,cover_url,profiles!stories_author_id_fkey(username,display_name)';
  const fallbackSelect = 'id,title,primary_genre,echo_count,reads,cover_url';
  let data = null, error = null;
  // Attempt 1: full select with profile join + server-side order + limit
  ({ data, error } = await supabase.from('stories').select(baseSelect).neq('status', 'draft').order(orderColumn, { ascending: false }).limit(limit));
  if (error) {
    console.warn('getStories attempt1 failed:', error.message);
    // Attempt 2: drop the profile join
    ({ data, error } = await supabase.from('stories').select(fallbackSelect).neq('status', 'draft').order(orderColumn, { ascending: false }).limit(limit));
  }
  if (error) {
    console.warn('getStories attempt2 failed:', error.message);
    // Attempt 3: drop order + limit, fetch published stories, sort in JS
    ({ data, error } = await supabase.from('stories').select(fallbackSelect).neq('status', 'draft'));
    if (!error && data) {
      data = [...data].sort((a, b) => Number(b?.[orderColumn] || 0) - Number(a?.[orderColumn] || 0)).slice(0, limit);
    }
  }
  if (error) {
    console.error('getStories FAILED all attempts:', error.message, error);
  }
  return error ? [] : (data || []);
}

async function getPopularStories(limit) {
  return getStories('reads', limit);
}

async function loadHeroStack() {
  let stories = [];
  const heroId = homepageAdminSettings?.hero?.story_id;
  if (heroId) { const { data } = await supabase.from('stories').select('id,title,cover_url').eq('id',heroId).neq('status','draft').maybeSingle(); if (data) stories = [data]; }
  if (!stories.length) stories = await getPopularStories(1);
  if (!stories.length) return;
  heroStoryStack.innerHTML = `<a class="home-stack-card home-stack-card-front" href="story.html?id=${encodeURIComponent(stories[0].id)}">${coverMarkup(stories[0].cover_url, stories[0].title, 'home-stack-cover')}<span>${escapeHtml(stories[0].title)}</span></a>`;
}

async function loadHomepageGenres() {
  try {
    const terms = await loadTaxonomyTerms(['genre']);
    const visible = terms.slice(0, 10);
    homepageGenreList.innerHTML = visible.map((term) => `<a href="collection.html?type=taxonomy&category=genre&term=${encodeURIComponent(term.name)}" class="home-taxonomy-card"><span>${escapeHtml(term.name)}</span><b>→</b></a>`).join('');
  } catch (error) {
    homepageGenreList.innerHTML = '<a class="home-empty" href="explore.html#genres">Browse all genres →</a>';
  }
}

async function loadHomepageTropes() {
  if (homepageAdminSettings?.sections?.tropes?.enabled === false) { tropeSection.hidden = true; return; }
  try {
    const terms = await loadTaxonomyTerms(['trope']);
    const { data: relations, error } = await supabase.from('story_taxonomy').select('term_id').eq('relationship_type', 'trope');
    if (error || !relations?.length) return;
    const counts = new Map();
    relations.forEach((row) => counts.set(row.term_id, (counts.get(row.term_id) || 0) + 1));
    const visible = terms.filter((term) => counts.has(term.id)).sort((a, b) => (counts.get(b.id) - counts.get(a.id)) || (a.sort_order - b.sort_order)).slice(0, 8);
    if (!visible.length) return;
    tropeSection.hidden = false;
    homepageTropeList.innerHTML = visible.map((term) => `<a href="collection.html?type=taxonomy&category=trope&term=${encodeURIComponent(term.name)}" class="home-trope-pill"><span>${escapeHtml(term.name)}</span><small>${counts.get(term.id)} ${counts.get(term.id) === 1 ? 'story' : 'stories'}</small></a>`).join('');
  } catch (error) {
    tropeSection.hidden = true;
  }
}

function emptyShelf(message) {
  return `<div class="home-empty">${escapeHtml(message)}</div>`;
}

function formatNumber(value) {
  const n = Number(value || 0);
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '')}k` : String(n);
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

wireWriteSheet(() => currentUser, () => {
  authModalSub.textContent = 'Log in or create an account to publish a story.';
  openModal(authModal);
});

initAuth();
loadHomepageData();
