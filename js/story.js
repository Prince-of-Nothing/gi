import { supabase } from './supabaseClient.js';
import { signUpWithUsername } from './auth-guard.js';
import { loadStoryTaxonomy, mergeLegacyTaxonomy } from './taxonomy.js';
import { showToast, wireWriteSheet, refreshUnreadBadge, openReportModal } from './ui.js';

const storyId = new URLSearchParams(window.location.search).get('id');
let currentStoryChapterCount = 0;

let currentUser = null;
let authMode = 'login';

const loginBtn = document.getElementById('loginBtn');
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authUsername = document.getElementById('authUsername');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authError = document.getElementById('authError');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authSwitchBtn = document.getElementById('authSwitchBtn');
const authSwitchPrompt = document.getElementById('authSwitchPrompt');
const authModalTitle = document.getElementById('authModalTitle');
const authModalSub = document.getElementById('authModalSub');

const storyCoverWrap = document.getElementById('storyCoverWrap');
const storyDetailTitle = document.getElementById('storyDetailTitle');
const storyDetailAuthor = document.getElementById('storyDetailAuthor');
const storyDetailMeta = document.getElementById('storyDetailMeta');
const storyTaxonomy = document.getElementById('storyTaxonomy');
const storyDetailStats = document.getElementById('storyDetailStats');
const storyDetailDesc = document.getElementById('storyDetailDesc');
const storyChapterList = document.getElementById('storyChapterList');
const chaptersHeading = document.getElementById('chaptersHeading');
const startReadingBtn = document.getElementById('startReadingBtn');
const saveToLibraryBtn = document.getElementById('saveToLibraryBtn');
const storyLikeButton = document.getElementById('storyLikeButton');
let storyLikeTotal = 0;
let storyLikedByMe = false;
const moreByAuthorSection = document.getElementById('moreByAuthorSection');
const moreByAuthorGrid = document.getElementById('moreByAuthorGrid');
const ratingSummary = document.getElementById('ratingSummary');
const reviewFormWrap = document.getElementById('reviewFormWrap');
const reviewsList = document.getElementById('reviewsList');
const storyStatusBadge = document.getElementById('storyStatusBadge');
const storyUpdateLine = document.getElementById('storyUpdateLine');
const storyQuickFacts = document.getElementById('storyQuickFacts');
const storyCoverCaption = document.getElementById('storyCoverCaption');
const chapterListNote = document.getElementById('chapterListNote');
const moreByAuthorLink = document.getElementById('moreByAuthorLink');
const viewAllChaptersBtn = document.getElementById('viewAllChaptersBtn');
const fullChapterList = document.getElementById('fullChapterList');
const similarStoriesSection = document.getElementById('similarStoriesSection');
const similarStoriesGrid = document.getElementById('similarStoriesGrid');
const similarTagsSection = document.getElementById('similarTagsSection');
const similarTagsGrid = document.getElementById('similarTagsGrid');
const similarStoriesSeeMore = document.getElementById('similarStoriesSeeMore');
const similarTagsSeeMore = document.getElementById('similarTagsSeeMore');
const storyAuthorCard = document.getElementById('storyAuthorCard');
const storyEchoCountText = document.getElementById('storyEchoCountText');
const adaptationSection = document.getElementById('adaptationSection');
const adaptationText = document.getElementById('adaptationText');
const topProfileAvatar = document.getElementById('topProfileAvatar');

const RATING_CATEGORIES = [
  { key: 'plot', label: 'Plot' },
  { key: 'characters', label: 'Characters' },
  { key: 'writing', label: 'Writing Style' },
  { key: 'worldbuilding', label: 'World-Building / Setting' },
  { key: 'pacing', label: 'Pacing & Engagement' },
  { key: 'overall', label: 'Overall' },
];

function openModal(){const r=location.pathname.split('/').pop()+location.search+location.hash;location.href='auth.html?mode=login&returnTo='+encodeURIComponent(r)}
function closeModal(modal) { modal.hidden = true; document.body.style.overflow = ''; }
document.querySelectorAll('[data-close="auth"]').forEach((btn) => btn.addEventListener('click', () => closeModal(authModal)));
authModal.addEventListener('click', (e) => { if (e.target === authModal) closeModal(authModal); });

loginBtn.addEventListener('click', () => {
  if (currentUser) {
    supabase.auth.signOut();
  } else {
    authModalSub.textContent = 'Log in to publish and follow stories.';
    openModal(authModal);
  }
});

const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
forgotPasswordBtn.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  if (!email) {
    authError.textContent = 'Enter your email above first, then tap "Forgot password?" again.';
    authError.hidden = false;
    return;
  }
  forgotPasswordBtn.disabled = true;
  const resetRedirect = location.origin+'/reset-password.html';
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: resetRedirect,
        });
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
      const data = await signUpWithUsername(supabase, { username, email, password });
      if (!data.session) {
        authModalSub.textContent = 'Check your email to confirm your account, then log in.';
        authMode = 'login';
        updateAuthModeUI();
        authForm.reset();
        authSubmitBtn.disabled = false;
        return;
      }
      authForm.reset();
      closeModal(authModal);
      showToast(`Welcome, ${username}!`);
      return;
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
      return;
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
  refreshUnreadBadge(supabase, currentUser?.id);
  updateTopProfile();
  if (storyId) loadStoryLikeState();
});

async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user ?? null;
  loginBtn.textContent = currentUser ? 'Log out' : 'Log in';
  await updateTopProfile();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatCompactNumber(value) {
  const n = Number(value) || 0;
  if (n < 1000) return String(Math.round(n));
  if (n < 1000000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  if (n < 1000000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace(/\.0$/, '')}m`;
  return `${(n / 1000000000).toFixed(1).replace(/\.0$/, '')}b`;
}

function stripMarkup(value) {
  const div = document.createElement('div');
  div.innerHTML = value || '';
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function countWords(value) {
  const text = stripMarkup(value);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

function formatStoryDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

function coverMarkup(cover_url, title, sizeClass) {
  if (cover_url) {
    return `<img class="${sizeClass}" src="${escapeHtml(cover_url)}" alt="${escapeHtml(title)} cover" />`;
  }
  const initial = (title || '?').trim().charAt(0).toUpperCase();
  return `<div class="${sizeClass} cover-placeholder">${escapeHtml(initial)}</div>`;
}

function taxonomyChip(name, category) {
  return `<a class="taxonomy-chip${category === 'primary_genre' ? ' primary' : ''}" href="collection.html?type=taxonomy&category=${encodeURIComponent(category === 'primary_genre' ? 'genre' : category)}&term=${encodeURIComponent(name)}">${escapeHtml(name)}</a>`;
}

function renderStoryTaxonomy(story, relations) {
  if (!storyTaxonomy) return;
  const t = mergeLegacyTaxonomy(story, relations);
  const groups = [
    ['Genres', [t.primary_genre, ...t.secondary_genres, ...t.subgenres], 'genre'],
    ['Tropes', t.tropes, 'trope'],
    ['Tags', t.tags, 'tag'],
    ['Setting', t.settings, 'setting'],
    ['Region', t.regions, 'region'],
    ['Audience', t.audience, 'audience'],
    ['Format', t.formats, 'format'],
  ].filter(([, values]) => values.length);

  if (!groups.length) {
    storyTaxonomy.innerHTML = '<p class="taxonomy-empty">No classification details have been added yet.</p>';
    return;
  }

  storyTaxonomy.innerHTML = groups.map(([label, values, category]) => `
    <div class="taxonomy-group-v2">
      <p class="taxonomy-label-v2">${label}</p>
      <div class="taxonomy-list-v2">
        ${values.map((name) => `<a class="taxonomy-chip-v2" href="collection.html?type=taxonomy&category=${encodeURIComponent(category === 'primary_genre' ? 'genre' : category)}&term=${encodeURIComponent(name)}">${escapeHtml(name)}</a>`).join('')}
      </div>
    </div>
  `).join('');
}


function profileAvatarMarkup(profile, sizeClass = '') {
  const name = profile?.display_name || profile?.username || 'Reader';
  if (profile?.avatar_url) return `<img class="${sizeClass}" src="${escapeHtml(profile.avatar_url)}" alt="${escapeHtml(name)}" loading="lazy">`;
  return `<span class="${sizeClass} profile-fallback-v2">${escapeHtml(name.trim().charAt(0).toUpperCase() || '?')}</span>`;
}

async function updateTopProfile() {
  if (!topProfileAvatar) return;
  if (!currentUser) {
    topProfileAvatar.innerHTML = '<span class="profile-fallback-v2">G</span>';
    return;
  }
  const { data: profile } = await supabase.from('profiles').select('username, display_name, avatar_url').eq('id', currentUser.id).maybeSingle();
  topProfileAvatar.innerHTML = profileAvatarMarkup(profile, 'top-profile-img');
}

function recommendationCardMarkup(story) {
  const author = story.profiles?.display_name || story.profiles?.username || '';
  const meta = [story.primary_genre, author].filter(Boolean).join(' · ');
  return `<a class="story-recommend-card" href="story.html?id=${story.id}">
    <div class="story-recommend-cover">${coverMarkup(story.cover_url, story.title, 'story-recommend-cover-img')}</div>
    <div class="story-recommend-title">${escapeHtml(story.title)}</div>
    <div class="story-recommend-meta">${escapeHtml(meta)}${story.reads != null ? ` · ${formatCompactNumber(story.reads)} reads` : ''}</div>
  </a>`;
}

async function loadRecommendations(story, relations) {
  const { data: allStories, error } = await supabase
    .from('stories')
    .select('id,title,cover_url,primary_genre,secondary_genre,tags,reads,echo_count,status,author_id,updated_at')
    .neq('status', 'draft');
  if (error) { console.warn('Story recommendations are temporarily unavailable:', error); return; }
  if (!allStories?.length) return;

  // Author cards are optional metadata. Fetch them separately so a missing
  // PostgREST relationship never disables genre/trope recommendations.
  const authorIds = [...new Set(allStories.map((item) => item.author_id).filter(Boolean))];
  const authorProfiles = new Map();
  if (authorIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles').select('id,username,display_name,avatar_url')
      .in('id', authorIds);
    if (profileError) console.warn('Recommendation author details unavailable:', profileError);
    (profiles || []).forEach((profile) => authorProfiles.set(profile.id, profile));
  }
  allStories.forEach((item) => { item.profiles = authorProfiles.get(item.author_id) || {}; });

  let allRelations = new Map();
  try {
    allRelations = await loadStoryTaxonomy(allStories.map((s) => s.id));
  } catch (err) {
    console.warn('Recommendation taxonomy could not be loaded:', err);
  }

  const current = mergeLegacyTaxonomy(story, relations || []);
  const normalize = (value) => String(value || '').trim().toLowerCase();
  const unique = (values) => [...new Set((values || []).filter(Boolean).map(normalize))];
  const currentGenres = unique([current.primary_genre, ...(current.secondary_genres || []), ...(current.subgenres || [])]);
  const currentTropes = unique(current.tropes);
  const currentTags = unique(current.tags);
  const currentThemes = unique([...currentTropes, ...currentTags]);

  const scoreStory = (candidate) => {
    const tax = mergeLegacyTaxonomy(candidate, allRelations.get(candidate.id) || []);
    const genres = unique([tax.primary_genre, ...(tax.secondary_genres || []), ...(tax.subgenres || [])]);
    const tropes = unique(tax.tropes);
    const tags = unique(tax.tags);
    const themes = unique([...tropes, ...tags]);
    const genreOverlap = genres.filter((x) => currentGenres.includes(x));
    const tropeOverlap = tropes.filter((x) => currentTropes.includes(x));
    const tagOverlap = tags.filter((x) => currentTags.includes(x));
    const themeOverlap = themes.filter((x) => currentThemes.includes(x));
    return {
      candidate,
      tax,
      genreOverlap,
      tropeOverlap,
      tagOverlap,
      themeOverlap,
      genreScore: genreOverlap.length,
      themeScore: themeOverlap.length,
      total: genreOverlap.length * 6 + tropeOverlap.length * 5 + tagOverlap.length * 3,
    };
  };

  const scored = allStories
    .filter((candidate) => candidate.id !== story.id)
    .map(scoreStory)
    .filter((x) => x.total > 0);

  const byQuality = (a, b) => b.total - a.total || Number(b.candidate.echo_count || 0) - Number(a.candidate.echo_count || 0) || Number(b.candidate.reads || 0) - Number(a.candidate.reads || 0);

  // More from the author remains an independent recommendation lane.
  if (story.author_id) {
    const more = allStories
      .filter((candidate) => candidate.author_id === story.author_id && candidate.id !== story.id)
      .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
      .slice(0, 4);
    if (more.length) {
      moreByAuthorSection.hidden = false;
      moreByAuthorLink.href = `author.html?id=${story.author_id}`;
      moreByAuthorGrid.innerHTML = more.map(recommendationCardMarkup).join('');
    }
  }

  const genreMatches = scored.filter((x) => x.genreScore > 0).sort(byQuality);
  const themeMatches = scored.filter((x) => x.themeScore > 0).sort(byQuality);

  const topGenre = genreMatches.slice(0, 4).map((x) => x.candidate);
  const topTheme = themeMatches.slice(0, 4).map((x) => x.candidate);

  if (topGenre.length) {
    similarStoriesSection.hidden = false;
    similarStoriesGrid.innerHTML = topGenre.map(recommendationCardMarkup).join('');
    const term = currentGenres[0];
    similarStoriesSeeMore.href = term ? `collection.html?type=taxonomy&category=genre&term=${encodeURIComponent(term)}` : 'collection.html?type=trending';
    similarStoriesSeeMore.hidden = false;
  }

  if (topTheme.length) {
    similarTagsSection.hidden = false;
    similarTagsGrid.innerHTML = topTheme.map(recommendationCardMarkup).join('');
    const term = currentTropes[0] || currentTags[0];
    similarTagsSeeMore.href = term ? `collection.html?type=taxonomy&category=${encodeURIComponent(currentTropes.includes(term) ? 'trope' : 'tag')}&term=${encodeURIComponent(term)}` : 'collection.html?type=trending';
    similarTagsSeeMore.hidden = false;
  }
}

function renderLatestChapters(chapters) {
  if (!chapters?.length) {
    storyChapterList.innerHTML = '<div class="story-empty">No chapters published yet.</div>';
    return;
  }
  const preview = chapters.slice(-2).reverse();
  storyChapterList.innerHTML = preview.map((c, index) => {
    const words = countWords(c.content_html || c.content || '');
    const isLatest = index === 0;
    return `<a class="story-latest-chapter" href="reader.html?story=${storyId}&chapter=${c.chapter_number}">
      <span class="story-chapter-number-v2">CH ${escapeHtml(String(c.chapter_number).padStart(2,'0'))}</span>
      <span><span class="story-chapter-title-v2">${escapeHtml(c.title || 'Untitled')}${isLatest ? '<span class="story-new-badge">Latest</span>' : ''}</span><small class="story-chapter-meta-v2">${formatCompactNumber(words)} words${c.updated_at ? ` · ${escapeHtml(formatStoryDate(c.updated_at))}` : ''}</small></span>
      <span class="story-chapter-arrow-v2">→</span>
    </a>`;
  }).join('');
}

function renderFullChapterList(chapters) {
  fullChapterList.innerHTML = (chapters || []).map((c) => `<div class="story-full-chapter-row"><span class="story-chapter-number-v2">${escapeHtml(String(c.chapter_number).padStart(2,'0'))}</span><a href="reader.html?story=${storyId}&chapter=${c.chapter_number}">${escapeHtml(c.title || 'Untitled')}</a><small>${formatCompactNumber(countWords(c.content_html || c.content || ''))} words</small></div>`).join('') || '<div class="story-empty">No chapters published yet.</div>';
}

async function loadStoryLikeState() {
  if (!storyLikeButton || !storyId) return;
  const [{ count, error: countError }, mine] = await Promise.all([
    supabase.from('story_likes').select('story_id', { count: 'exact', head: true }).eq('story_id', storyId),
    currentUser ? supabase.from('story_likes').select('reader_id').eq('story_id', storyId).eq('reader_id', currentUser.id).maybeSingle() : Promise.resolve({ data: null, error: null })
  ]);
  if (countError) { console.error('Could not load story likes:', countError); storyLikeButton.disabled = true; return; }
  storyLikeTotal = Number(count || 0);
  storyLikedByMe = !!mine?.data;
  const countNode = storyLikeButton.querySelector('#storyLikeCount');
  if (countNode) countNode.textContent = formatCompactNumber(storyLikeTotal);
  storyLikeButton.disabled = false;
  storyLikeButton.setAttribute('aria-pressed', String(storyLikedByMe));
  storyLikeButton.classList.toggle('is-liked', storyLikedByMe);
  storyLikeButton.innerHTML = `${storyLikedByMe ? '♥' : '♡'} <span id="storyLikeCount">${formatCompactNumber(storyLikeTotal)}</span> Likes`;
}

storyLikeButton?.addEventListener('click', async () => {
  if (!currentUser) { authModalSub.textContent = 'Log in to like this story.'; openModal(authModal); return; }
  storyLikeButton.disabled = true;
  const result = storyLikedByMe
    ? await supabase.from('story_likes').delete().eq('story_id', storyId).eq('reader_id', currentUser.id)
    : await supabase.from('story_likes').insert({ story_id: storyId, reader_id: currentUser.id });
  if (result.error) { console.error('Story like error:', result.error); showToast('Could not update your story like.'); storyLikeButton.disabled = false; return; }
  storyLikedByMe = !storyLikedByMe;
  storyLikeTotal = Math.max(0, storyLikeTotal + (storyLikedByMe ? 1 : -1));
  storyLikeButton.innerHTML = `${storyLikedByMe ? '♥' : '♡'} <span id="storyLikeCount">${formatCompactNumber(storyLikeTotal)}</span> Likes`;
  storyLikeButton.setAttribute('aria-pressed', String(storyLikedByMe));
  storyLikeButton.classList.toggle('is-liked', storyLikedByMe);
  storyLikeButton.disabled = false;
});

function renderAuthorCard(story) {
  const profile = story.profiles || {};
  const name = profile.display_name || profile.username || 'Unknown author';
  const bio = profile.bio || '';
  storyAuthorCard.innerHTML = `<img class="author-pfp-v2" src="${profile.avatar_url ? escapeHtml(profile.avatar_url) : 'assets/gidireads-logo.png'}" alt="${escapeHtml(name)}" onerror="this.src='assets/gidireads-logo.png'">
    <div class="story-author-copy-v2"><h3>${escapeHtml(name)}</h3><p>${escapeHtml(profile.username ? '@'+profile.username : '')}${bio ? ` · ${escapeHtml(bio)}` : ''}</p></div>
    <div class="story-author-actions-v2"><a href="author.html?id=${story.author_id}">View Profile</a></div>`;
}

async function loadStory() {
  if (!storyId) {
    storyDetailTitle.textContent = 'No story specified';
    return;
  }

  // Fetch the story's own fields first. A nested profile relationship can fail
  // independently (for example after a schema/cache change) and must not make
  // an otherwise valid story disappear from its public page.
  let storyResult = await supabase
    .from('stories')
    .select('id,title,description,primary_genre,secondary_genre,status,cover_url,echo_count,reads,tags,content_rating,language,adaptation_availability,rights_confirmed,author_id,updated_at')
    .eq('id', storyId)
    .maybeSingle();

  if (storyResult.error) {
    console.error('[GidiReads] Story record query failed:', storyResult.error);
    storyDetailTitle.textContent = 'Could not load this story';
    storyDetailDesc.textContent = 'We could not retrieve this story right now. Please try again.';
    return;
  }
  const story = storyResult.data;
  if (!story) {
    storyDetailTitle.textContent = 'Story not found';
    storyDetailDesc.textContent = 'This story may have been moved or is no longer available.';
    return;
  }

  // Load author details separately so a missing PostgREST relationship cache
  // never blocks the story itself.
  const { data: authorProfile, error: authorProfileError } = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url,bio')
    .eq('id', story.author_id)
    .maybeSingle();
  if (authorProfileError) console.warn('[GidiReads] Author details unavailable:', authorProfileError);
  story.profiles = authorProfile || {};

  document.title = `${story.title} — GidiReads`;
  storyCoverWrap.innerHTML = coverMarkup(story.cover_url, story.title, 'cover-lg story-cover-image');
  storyDetailTitle.textContent = story.title;
  await loadStoryLikeState();

  const authorName = story.profiles?.display_name || story.profiles?.username || 'Unknown author';
  const authorInitial = authorName.trim().charAt(0).toUpperCase() || '?';
  const authorAvatar = story.profiles?.avatar_url
    ? `<img class="story-author-avatar" src="${escapeHtml(story.profiles.avatar_url)}" alt="${escapeHtml(authorName)}" />`
    : `<span class="story-author-avatar story-author-avatar-fallback">${escapeHtml(authorInitial)}</span>`;
  storyDetailAuthor.innerHTML = `${authorAvatar}<span>By <a href="author.html?id=${story.profiles?.id}" class="story-link">${escapeHtml(authorName)}</a></span>`;

  const genreLabel = [story.primary_genre, story.secondary_genre].filter(Boolean).join(' · ');
  storyDetailMeta.textContent = `${genreLabel || 'Story'} · ${story.content_rating || 'General'} · ${story.language || 'English'}`;
  storyStatusBadge.textContent = story.status ? story.status.charAt(0).toUpperCase() + story.status.slice(1) : 'Published';
  if (storyCoverCaption) storyCoverCaption.textContent = story.content_rating ? `${story.content_rating} · ${story.status || 'published'}` : (story.status || 'published');

  let storyRelations = [];
  try {
    const taxonomyMap = await loadStoryTaxonomy([story.id]);
    storyRelations = taxonomyMap.get(story.id) || [];
    renderStoryTaxonomy(story, storyRelations);
  } catch (taxonomyError) {
    console.warn('Story taxonomy could not be loaded:', taxonomyError);
    renderStoryTaxonomy(story, []);
  }

  // Chapters
  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, chapter_number, title, content, content_html, created_at, published_at, updated_at')
    .eq('story_id', storyId)
    .eq('is_published', true)
    .is('archived_at', null)
    .order('chapter_number', { ascending: true });

  if (chaptersError) {
    console.error('[GidiReads] Published chapter query failed:', chaptersError);
    chaptersHeading.textContent = 'Chapters unavailable';
    chapterListNote.textContent = 'We could not load the chapter list. Please refresh and try again.';
  }
  const publishedChapters = chapters || [];
  const chapterCount = publishedChapters.length;
  currentStoryChapterCount = chapterCount;
  const wordCount = publishedChapters.reduce((sum, chapter) => sum + countWords(chapter.content_html || chapter.content || ''), 0);
  const latestChapterEvent = publishedChapters.reduce((latest, chapter) => {
    const publishedAt = chapter.published_at || chapter.created_at || null;
    const updatedAt = chapter.updated_at || null;
    const event = updatedAt && (!publishedAt || new Date(updatedAt) > new Date(publishedAt))
      ? { timestamp: updatedAt, label: 'Latest chapter updated' }
      : (publishedAt ? { timestamp: publishedAt, label: 'Latest chapter published' } : null);
    return event && (!latest || new Date(event.timestamp) > new Date(latest.timestamp)) ? event : latest;
  }, null);

  chaptersHeading.textContent = `Chapters (${formatCompactNumber(chapterCount)})`;
  chapterListNote.textContent = chapterCount ? `${formatCompactNumber(wordCount)} words` : 'No published chapters yet';
  storyUpdateLine.innerHTML = latestChapterEvent ? `${latestChapterEvent.label} <strong>${escapeHtml(formatStoryDate(latestChapterEvent.timestamp))}</strong>` : ''; 

  storyDetailStats.innerHTML = `
    <span class="story-stat-v2 story-stat-reads-v2">◉ <strong>${formatCompactNumber(story.reads)}</strong> Reads</span>
    <span class="story-stat-v2 story-stat-echo-v2">✦ <strong>${formatCompactNumber(story.echo_count)}</strong> Echoes</span>
    <span class="story-stat-v2">${formatCompactNumber(chapterCount)} chapters</span>
    <span class="story-stat-v2">${formatCompactNumber(wordCount)} words</span>
  `;
  if (storyEchoCountText) storyEchoCountText.textContent = formatCompactNumber(story.echo_count);

  storyQuickFacts.innerHTML = `
    <div><span>Status</span><strong>${escapeHtml(story.status ? story.status.charAt(0).toUpperCase()+story.status.slice(1) : 'Published')}</strong></div>
    <div><span>Chapters</span><strong>${formatCompactNumber(chapterCount)}</strong></div>
    <div><span>Word count</span><strong>${formatCompactNumber(wordCount)}</strong></div>
    <div><span>Language</span><strong>${escapeHtml(story.language || 'English')}</strong></div>
    <div><span>Content rating</span><strong>${escapeHtml(story.content_rating || 'General')}</strong></div>
    <div><span>Last updated</span><strong>${escapeHtml(formatStoryDate(story.updated_at || latestChapterEvent?.timestamp) || '—')}</strong></div>
    ${story.adaptation_availability ? `<div><span>Adaptation rights</span><strong>${escapeHtml(story.adaptation_availability)}</strong></div>` : ''}
  `;

  const desc = story.description || 'No synopsis yet.';
  storyDetailDesc.textContent = desc;
  const readMoreBtn = document.getElementById('storyDescReadMore');
  if (desc.length >= 160) {
    readMoreBtn.hidden = false;
    readMoreBtn.addEventListener('click', () => {
      const expanded = storyDetailDesc.classList.toggle('expanded');
      storyDetailDesc.classList.toggle('clamp-2', !expanded);
      readMoreBtn.textContent = expanded ? 'Show less' : 'Read more';
    });
  }

  renderLatestChapters(publishedChapters);
  renderFullChapterList(publishedChapters);
  if (viewAllChaptersBtn) {
    viewAllChaptersBtn.hidden = publishedChapters.length === 0;
    viewAllChaptersBtn.onclick = () => {
      fullChapterList.hidden = !fullChapterList.hidden;
      viewAllChaptersBtn.innerHTML = fullChapterList.hidden ? 'View all chapters <span>→</span>' : 'Hide chapter list <span>↑</span>';
    };
  }
  if (!chapters || chapters.length === 0) {
    startReadingBtn.textContent = 'No chapters yet';
    startReadingBtn.classList.add('btn-disabled');
    startReadingBtn.removeAttribute('href');
  } else {
    let resumeChapter = chapters[0].chapter_number;
    let hasResume = false;
    const chapterNumbers = new Set(publishedChapters.map((c) => Number(c.chapter_number)));

    try {
      const raw = localStorage.getItem(`gidireads-last-read-${storyId}`);
      if (raw) {
        const localLast = JSON.parse(raw);
        const localNum = localLast && localLast.chapterNumber != null ? Number(localLast.chapterNumber) : null;
        if (localNum != null && chapterNumbers.has(localNum)) {
          resumeChapter = localNum;
          hasResume = true;
        }
      }
    } catch (_) {}

    if (currentUser) {
      try {
        const { data: entry } = await supabase.from('library_entries').select('last_chapter_number, status').eq('reader_id', currentUser.id).eq('story_id', storyId).maybeSingle();
        if (entry?.last_chapter_number != null && chapterNumbers.has(Number(entry.last_chapter_number))) {
          resumeChapter = Number(entry.last_chapter_number);
          hasResume = true;
          startReadingBtn.textContent = entry.status === 'completed' ? 'Read Again' : 'Continue Reading';
        }
      } catch (_) {}
    }

    if (hasResume && !startReadingBtn.textContent.includes('Read Again') && !startReadingBtn.textContent.includes('Continue Reading')) {
      startReadingBtn.textContent = 'Continue Reading';
    }
    if (!hasResume) {
      startReadingBtn.textContent = 'Start Reading';
    }
    startReadingBtn.classList.remove('btn-disabled');
    startReadingBtn.href = `reader.html?story=${storyId}&chapter=${resumeChapter}`;
  }
  // Reflect existing library status on the button
  if (currentUser) {
    const { data: existing } = await supabase
      .from('library_entries')
      .select('status')
      .eq('reader_id', currentUser.id)
      .eq('story_id', storyId)
      .maybeSingle();
    if (existing) {
      saveToLibraryBtn.textContent = 'Added to Library';
      saveToLibraryBtn.disabled = true;
    }
  }

  saveToLibraryBtn.addEventListener('click', async () => {
    if (!currentUser) {
      authModalSub.textContent = 'Log in to save stories to your library.';
      openModal(authModal);
      return;
    }
    saveToLibraryBtn.disabled = true;
    const { error: saveError } = await supabase.from('library_entries').upsert(
      { reader_id: currentUser.id, story_id: storyId, status: 'saved' },
      { onConflict: 'reader_id,story_id', ignoreDuplicates: true }
    );
    if (saveError) {
      showToast(`Could not save: ${saveError.message}`);
      saveToLibraryBtn.disabled = false;
    } else {
      showToast('Added to your library');
      saveToLibraryBtn.textContent = 'Added to Library';
      supabase.from('notifications').insert({
        user_id: currentUser.id,
        message: `You saved "${story.title}" to your library.`,
        link: `story.html?id=${storyId}`,
      });
    }
  });

  // Share
  document.getElementById('shareBtn').addEventListener('click', async () => {
    const shareText = `${story.title} — ${(story.description || '').slice(0, 180)}${(story.description || '').length > 180 ? '…' : ''}`;
    const shareUrl = window.location.href;
    let sharedViaFile = false;

    // Attempt 1: share with the cover image attached, if supported
    if (navigator.canShare && story.cover_url) {
      try {
        const resp = await fetch(story.cover_url);
        const blob = await resp.blob();
        const file = new File([blob], 'cover.jpg', { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: story.title, text: shareText, url: shareUrl, files: [file] });
          sharedViaFile = true;
        }
      } catch (err) {
        if (err.name === 'AbortError') { sharedViaFile = true; } // user cancelled — don't fall through
      }
    }
    if (sharedViaFile) return;

    // Attempt 2: plain native share sheet (title + text + link)
    if (navigator.share) {
      try {
        await navigator.share({ title: story.title, text: shareText, url: shareUrl });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // user cancelled
      }
    }

    // Attempt 3: clipboard fallback
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      showToast('Link copied to clipboard');
    } catch {
      showToast('Could not share — please copy the link manually.');
    }
  });

  document.getElementById('reportStoryBtn').addEventListener('click', () => {
    openReportModal(supabase, currentUser, {
      type: 'story',
      id: storyId,
      openAuthModalFn: () => {
        authModalSub.textContent = 'Log in to report content.';
        openModal(authModal);
      },
    });
  });

  renderAuthorCard(story);
  if (story.adaptation_availability) {
    adaptationSection.hidden = false;
    adaptationText.textContent = story.adaptation_availability;
  }
  await loadRecommendations(story, storyRelations);

  loadReviews(chapterCount);
}

function starPickerHtml(key, label) {
  return `
    <div class="star-picker" data-key="${key}">
      <div class="star-picker-head">
        <span class="star-picker-label">${label}</span>
        <span class="star-picker-value" data-rating-value="${key}">Not rated</span>
      </div>
      <div class="star-row" data-key="${key}" role="radiogroup" aria-label="Rate ${escapeHtml(label)} from 1 to 5 stars">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star-btn" data-value="${n}" role="radio" aria-label="${n} out of 5 stars">★</button>`).join('')}
      </div>
    </div>
  `;
}

function updateStarPicker(row, value) {
  const numeric = Number(value) || 0;
  row.querySelectorAll('.star-btn').forEach((b) => {
    const n = Number(b.dataset.value);
    b.classList.toggle('filled', n <= numeric);
    b.setAttribute('aria-checked', String(n === numeric));
  });
  const valueEl = row.closest('.star-picker')?.querySelector('[data-rating-value]');
  if (valueEl) valueEl.textContent = numeric ? `${numeric}/5` : 'Not rated';
}

function wireStarPicker(container, selections) {
  container.querySelectorAll('.star-row').forEach((row) => {
    const key = row.dataset.key;
    row.querySelectorAll('.star-btn').forEach((btn) => {
      btn.addEventListener('mouseenter', () => updateStarPicker(row, btn.dataset.value));
      btn.addEventListener('focus', () => updateStarPicker(row, btn.dataset.value));
      btn.addEventListener('click', () => {
        selections[key] = parseInt(btn.dataset.value, 10);
        updateStarPicker(row, selections[key]);
      });
    });
    row.addEventListener('mouseleave', () => updateStarPicker(row, selections[key] || 0));
    updateStarPicker(row, selections[key] || 0);
  });
}

function starsMarkup(value, extraClass = '') {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return `<span class="review-stars ${extraClass}" aria-label="${rating.toFixed(1)} out of 5 stars">${[1,2,3,4,5].map((n) => `<span class="review-star ${n <= Math.round(rating) ? 'filled' : ''}">★</span>`).join('')}</span>`;
}

async function loadReviews(chapterCount) {
  // Keep the base review query simple. The old nested profiles query could fail
  // even though the reviews themselves were readable, which made the whole
  // Reviews section show "Could not load reviews." Fetch profiles separately.
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, reader_id, plot_rating, characters_rating, writing_rating, worldbuilding_rating, pacing_rating, overall_rating, review_text, created_at, updated_at')
    .eq('story_id', storyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Could not load reviews:', error);
    reviewsList.innerHTML = `<p class="empty-row">Reviews are temporarily unavailable. Please try again later.</p>`;
    return;
  }

  const reviewRows = reviews || [];
  const reviewReaderIds = [...new Set(reviewRows.map((r) => r.reader_id).filter(Boolean))];
  let profileMap = new Map();

  if (reviewReaderIds.length) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_verified')
      .in('id', reviewReaderIds);
    if (profilesError) console.error('Could not load review profiles:', profilesError);
    (profiles || []).forEach((profile) => profileMap.set(profile.id, profile));
  }

  reviewRows.forEach((review) => {
    review.profiles = profileMap.get(review.reader_id) || null;
  });

  const reviewIds = reviewRows.map((r) => r.id);
  let reviewLikes = [];
  let replyRows = [];

  if (reviewIds.length) {
    const [{ data: likes, error: likesError }, { data: replies, error: repliesError }] = await Promise.all([
      supabase.from('review_likes').select('review_id, reader_id').in('review_id', reviewIds),
      supabase
        .from('review_replies')
        .select('id, review_id, reader_id, parent_reply_id, reply_text, created_at, updated_at')
        .in('review_id', reviewIds)
        .order('created_at', { ascending: true }),
    ]);

    if (likesError) console.error('Could not load review likes:', likesError);
    if (repliesError) console.error('Could not load review replies:', repliesError);
    reviewLikes = likes || [];
    replyRows = replies || [];
  }

  const replyReaderIds = [...new Set(replyRows.map((r) => r.reader_id).filter(Boolean))];
  if (replyReaderIds.length) {
    const { data: replyProfiles, error: replyProfilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_verified')
      .in('id', replyReaderIds);
    if (replyProfilesError) console.error('Could not load review reply profiles:', replyProfilesError);
    (replyProfiles || []).forEach((profile) => profileMap.set(profile.id, profile));
  }

  replyRows.forEach((reply) => {
    reply.profiles = profileMap.get(reply.reader_id) || null;
  });

  const replyIds = replyRows.map((r) => r.id);
  let replyLikes = [];
  if (replyIds.length) {
    const { data: likes, error: likesError } = await supabase
      .from('review_reply_likes')
      .select('reply_id, reader_id')
      .in('reply_id', replyIds);
    if (likesError) console.error('Could not load review reply likes:', likesError);
    replyLikes = likes || [];
  }

  const likeMap = new Map();
  reviewLikes.forEach((like) => {
    if (!likeMap.has(like.review_id)) likeMap.set(like.review_id, []);
    likeMap.get(like.review_id).push(like.reader_id);
  });

  const replyLikeMap = new Map();
  replyLikes.forEach((like) => {
    if (!replyLikeMap.has(like.reply_id)) replyLikeMap.set(like.reply_id, []);
    replyLikeMap.get(like.reply_id).push(like.reader_id);
  });

  reviewRows.forEach((review) => {
    review.likeCount = likeMap.get(review.id)?.length || 0;
    review.likedByMe = !!currentUser && (likeMap.get(review.id) || []).includes(currentUser.id);
    review.replies = replyRows
      .filter((reply) => reply.review_id === review.id)
      .map((reply) => ({
        ...reply,
        likeCount: replyLikeMap.get(reply.id)?.length || 0,
        likedByMe: !!currentUser && (replyLikeMap.get(reply.id) || []).includes(currentUser.id),
      }));
  });

  renderRatingSummary(reviewRows);
  renderReviewsList(reviewRows);
  await renderReviewForm(chapterCount, reviewRows);
}
function formatReviewDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function reviewProfileMarkup(profile) {
  const name = profile?.display_name || profile?.username || 'A reader';
  const username = profile?.username ? `@${profile.username}` : '';
  const avatar = profile?.avatar_url
    ? `<img class="review-avatar" src="${escapeHtml(profile.avatar_url)}" alt="${escapeHtml(name)}" loading="lazy">`
    : `<span class="review-avatar review-avatar-fallback">${escapeHtml(name.charAt(0).toUpperCase())}</span>`;
  return `
    <div class="review-profile">
      ${avatar}
      <div class="review-profile-copy">
        <strong>${escapeHtml(name)}${profile?.is_verified ? ' <span class="verified-tick" title="Verified">✔</span>' : ''}</strong>
        ${username ? `<span>${escapeHtml(username)}</span>` : ''}
      </div>
    </div>
  `;
}

function renderReviewsList(reviews) {
  if (reviews.length === 0) {
    reviewsList.innerHTML = `<p class="empty-row">No reviews yet.</p>`;
    return;
  }

  reviewsList.innerHTML = reviews.map((r) => {
    const replies = r.replies || [];
    const topReplies = replies.filter((reply) => !reply.parent_reply_id);
    const replyCount = replies.length;
    const isMine = currentUser?.id === r.reader_id;

    return `
      <article class="review-row review-card" id="review-${r.id}" data-review-id="${r.id}" tabindex="0" role="button" aria-expanded="false">
        <div class="review-card-main">
          ${reviewProfileMarkup(r.profiles)}
          <div class="review-card-meta">
            ${starsMarkup(r.overall_rating, 'review-stars-card')}
            <strong class="review-overall-number">${Number(r.overall_rating).toFixed(1)}/5</strong>
            <time datetime="${escapeHtml(r.created_at || '')}">${formatReviewDate(r.created_at)}</time>
          </div>
          ${r.review_text ? `<p class="review-text">${escapeHtml(r.review_text)}</p>` : '<p class="review-text review-no-text">Rated this story without a written review.</p>'}
        </div>
        <div class="review-actions" data-review-actions>
          <button type="button" class="review-action-btn review-like-btn ${r.likedByMe ? 'is-active' : ''}" data-review-like="${r.id}" aria-pressed="${r.likedByMe}">♡ <span>${formatCompactNumber(r.likeCount)}</span> Like</button>
          <button type="button" class="review-action-btn review-reply-toggle" data-review-reply="${r.id}">↩ <span>${formatCompactNumber(replyCount)}</span> ${replyCount === 1 ? 'Reply' : 'Replies'}</button>
          ${isMine ? `<button type="button" class="review-action-btn review-edit-btn" data-review-edit="${r.id}">Edit</button><button type="button" class="review-action-btn review-delete-btn" data-review-delete="${r.id}">Delete</button>` : ''}
        </div>
        <div class="review-thread" data-review-thread="${r.id}" hidden>
          <div class="review-reply-composer" data-reply-composer="${r.id}" hidden>
            <textarea rows="2" data-review-reply-input="${r.id}" placeholder="Write a reply…"></textarea>
            <div class="review-reply-composer-actions">
              <button type="button" class="btn btn-outline review-cancel-reply" data-review-cancel="${r.id}">Cancel</button>
              <button type="button" class="btn btn-primary review-submit-reply" data-review-submit="${r.id}">Reply</button>
            </div>
          </div>
          <div class="review-replies" data-review-replies="${r.id}">
            ${renderReviewReplies(topReplies, replies)}
          </div>
        </div>
      </article>
    `;
  }).join('');

  wireReviewInteractions(reviews);
}

function renderReviewReplies(topReplies, allReplies) {
  if (!allReplies.length) return `<p class="empty-row review-empty-replies">No replies yet.</p>`;

  const renderOne = (reply, depth = 0) => {
    const children = allReplies.filter((child) => child.parent_reply_id === reply.id);
    const isMine = currentUser?.id === reply.reader_id;
    return `
      <div class="review-reply" id="review-reply-${reply.id}" data-reply-id="${reply.id}" style="--reply-depth:${Math.min(depth, 3)}">
        ${reviewProfileMarkup(reply.profiles)}
        <div class="review-reply-body">
          <div class="review-reply-meta"><span>${formatReviewDate(reply.created_at)}</span>${reply.updated_at !== reply.created_at ? '<span>edited</span>' : ''}</div>
          <p class="review-text">${escapeHtml(reply.reply_text)}</p>
          <div class="review-actions review-reply-actions">
            <button type="button" class="review-action-btn review-reply-like-btn ${reply.likedByMe ? 'is-active' : ''}" data-reply-like="${reply.id}" aria-pressed="${reply.likedByMe}">♡ <span>${reply.likeCount}</span> Like</button>
            <button type="button" class="review-action-btn review-reply-to-btn" data-reply-to="${reply.id}" data-review-id="${reply.review_id}">↩ Reply</button>
            ${isMine ? `<button type="button" class="review-action-btn review-reply-edit-btn" data-reply-edit="${reply.id}">Edit</button><button type="button" class="review-action-btn review-reply-delete-btn" data-reply-delete="${reply.id}">Delete</button>` : ''}
          </div>
          <div class="review-inline-editor" data-reply-editor="${reply.id}" hidden>
            <textarea rows="2">${escapeHtml(reply.reply_text)}</textarea>
            <div class="review-reply-composer-actions"><button type="button" class="btn btn-outline review-reply-edit-cancel">Cancel</button><button type="button" class="btn btn-primary review-reply-edit-save">Save</button></div>
          </div>
        </div>
      </div>
      ${children.map((child) => renderOne(child, depth + 1)).join('')}
    `;
  };

  return topReplies.map((reply) => renderOne(reply)).join('');
}

function requireReviewLogin() {
  if (currentUser) return true;
  authModalSub.textContent = 'Log in to like, reply to, or manage reviews.';
  openModal(authModal);
  return false;
}

function wireReviewInteractions(reviews) {
  reviewsList.querySelectorAll('.review-card').forEach((card) => {
    const reviewId = card.dataset.reviewId;
    card.addEventListener('click', (event) => {
      if (event.target.closest('[data-review-actions], .review-thread, button, textarea, input')) return;
      const thread = card.querySelector(`[data-review-thread="${reviewId}"]`);
      const opening = thread.hidden;
      thread.hidden = !opening;
      card.setAttribute('aria-expanded', String(opening));
      if (opening) thread.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.target.closest('button, textarea, input')) return;
      event.preventDefault();
      card.click();
    });
  });

  reviewsList.querySelectorAll('[data-review-like]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (!requireReviewLogin()) return;
      const reviewId = button.dataset.reviewLike;
      const active = button.getAttribute('aria-pressed') === 'true';
      button.disabled = true;
      const result = active
        ? await supabase.from('review_likes').delete().eq('review_id', reviewId).eq('reader_id', currentUser.id)
        : await supabase.from('review_likes').insert({ review_id: reviewId, reader_id: currentUser.id });
      button.disabled = false;
      if (result.error) { console.error('Review like error:', result.error); showToast('Could not update the review like.'); return; }
      const review = reviews.find((r) => r.id === reviewId);
      if (review) { review.likedByMe = !active; review.likeCount += active ? -1 : 1; }
      button.classList.toggle('is-active', !active);
      button.setAttribute('aria-pressed', String(!active));
      button.querySelector('span').textContent = String(review?.likeCount || 0);
    });
  });

  reviewsList.querySelectorAll('[data-review-reply]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!requireReviewLogin()) return;
      const reviewId = button.dataset.reviewReply;
      const card = document.querySelector(`[data-review-id="${reviewId}"]`);
      const thread = card.querySelector(`[data-review-thread="${reviewId}"]`);
      const composer = card.querySelector(`[data-reply-composer="${reviewId}"]`);
      thread.hidden = false;
      composer.hidden = false;
      card.setAttribute('aria-expanded', 'true');
      card.querySelector(`[data-review-reply-input="${reviewId}"]`)?.focus();
    });
  });

  reviewsList.querySelectorAll('[data-review-submit]').forEach((button) => {
    button.addEventListener('click', () => submitReviewReply(button.dataset.reviewSubmit, null));
  });
  reviewsList.querySelectorAll('[data-review-cancel]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.reviewCancel;
      reviewsList.querySelector(`[data-reply-composer="${id}"]`).hidden = true;
      reviewsList.querySelector(`[data-review-reply-input="${id}"]`).value = '';
    });
  });

  reviewsList.querySelectorAll('[data-reply-like]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (!requireReviewLogin()) return;
      const replyId = button.dataset.replyLike;
      const active = button.getAttribute('aria-pressed') === 'true';
      button.disabled = true;
      const result = active
        ? await supabase.from('review_reply_likes').delete().eq('reply_id', replyId).eq('reader_id', currentUser.id)
        : await supabase.from('review_reply_likes').insert({ reply_id: replyId, reader_id: currentUser.id });
      button.disabled = false;
      if (result.error) { console.error('Review like error:', result.error); showToast('Could not update the review like.'); return; }
      button.classList.toggle('is-active', !active);
      button.setAttribute('aria-pressed', String(!active));
      const count = Math.max(0, Number(button.querySelector('span').textContent || 0) + (active ? -1 : 1));
      button.querySelector('span').textContent = String(count);
    });
  });

  reviewsList.querySelectorAll('[data-reply-to]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!requireReviewLogin()) return;
      const reviewId = button.dataset.reviewId;
      const replyId = button.dataset.replyTo;
      const card = document.querySelector(`[data-review-id="${reviewId}"]`);
      const thread = card.querySelector(`[data-review-thread="${reviewId}"]`);
      thread.hidden = false;
      let composer = card.querySelector('[data-review-reply-input]');
      if (!composer) return;
      composer.value = `@${button.closest('.review-reply').querySelector('.review-profile-copy strong')?.textContent?.replace('✔','').trim() || 'reader'} `;
      composer.dataset.parentReplyId = replyId;
      composer.focus();
    });
  });

  reviewsList.querySelectorAll('[data-reply-edit]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const editor = reviewsList.querySelector(`[data-reply-editor="${button.dataset.replyEdit}"]`);
      editor.hidden = false;
      editor.querySelector('textarea').focus();
    });
  });
  reviewsList.querySelectorAll('.review-reply-edit-cancel').forEach((button) => {
    button.addEventListener('click', (event) => { event.stopPropagation(); button.closest('.review-inline-editor').hidden = true; });
  });
  reviewsList.querySelectorAll('.review-reply-edit-save').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const editor = button.closest('.review-inline-editor');
      const replyId = editor.dataset.replyEditor;
      const text = editor.querySelector('textarea').value.trim();
      if (!text) return showToast('Reply cannot be empty.');
      button.disabled = true;
      const { error } = await supabase.from('review_replies').update({ reply_text: text }).eq('id', replyId).eq('reader_id', currentUser.id);
      button.disabled = false;
      if (error) return showToast('Could not update the reply.');
      showToast('Reply updated');
      loadReviews(currentStoryChapterCount);
    });
  });

  reviewsList.querySelectorAll('[data-reply-delete]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (!confirm('Delete this reply?')) return;
      const { error } = await supabase.from('review_replies').delete().eq('id', button.dataset.replyDelete).eq('reader_id', currentUser.id);
      if (error) return showToast('Could not delete the reply.');
      showToast('Reply deleted');
      loadReviews(currentStoryChapterCount);
    });
  });

  reviewsList.querySelectorAll('[data-review-edit]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      reviewFormWrap.dataset.editing = 'true';
      const review = reviews.find((r) => r.id === button.dataset.reviewEdit);
      if (review) renderReviewForm(currentStoryChapterCount, reviews);
      reviewFormWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  reviewsList.querySelectorAll('[data-review-delete]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (!confirm('Delete your review?')) return;
      const { error } = await supabase.rpc('delete_review', { p_review_id: button.dataset.reviewDelete });
      if (error) return showToast('Could not delete the review.');
      showToast('Review deleted');
      loadReviews(currentStoryChapterCount);
    });
  });
}

async function submitReviewReply(reviewId, parentReplyId) {
  if (!requireReviewLogin()) return;
  const input = reviewsList.querySelector(`[data-review-reply-input="${reviewId}"]`);
  const text = input?.value.trim();
  if (!text) return showToast('Write a reply first.');
  const button = reviewsList.querySelector(`[data-review-submit="${reviewId}"]`);
  if (button) button.disabled = true;
  const { error } = await supabase.from('review_replies').insert({
    review_id: reviewId,
    reader_id: currentUser.id,
    parent_reply_id: parentReplyId || input.dataset.parentReplyId || null,
    reply_text: text,
  });
  if (button) button.disabled = false;
  if (error) { console.error('Review reply error:', error); return showToast('Could not post your reply.'); }
  showToast('Reply posted');
  loadReviews(currentStoryChapterCount);
}

function renderRatingSummary(reviews) {
  if (reviews.length === 0) {
    ratingSummary.innerHTML = `<p class="empty-row">No ratings yet. Be the first to review this story.</p>`;
    return;
  }

  const avg = (field) => reviews.reduce((sum, r) => sum + r[field], 0) / reviews.length;
  const overall = avg('overall_rating');

  ratingSummary.innerHTML = `
    <div class="rating-overall-block">
      <div class="rating-overall">${overall.toFixed(1)}</div>
      ${starsMarkup(overall, 'rating-stars-large')}
      <span class="rating-count">${formatCompactNumber(reviews.length)} ${reviews.length === 1 ? 'rating' : 'ratings'}</span>
    </div>
    <div class="rating-breakdown">
      <div><span>Plot</span>${starsMarkup(avg('plot_rating'))}<strong>${avg('plot_rating').toFixed(1)}</strong></div>
      <div><span>Characters</span>${starsMarkup(avg('characters_rating'))}<strong>${avg('characters_rating').toFixed(1)}</strong></div>
      <div><span>Writing Style</span>${starsMarkup(avg('writing_rating'))}<strong>${avg('writing_rating').toFixed(1)}</strong></div>
      <div><span>World-Building</span>${starsMarkup(avg('worldbuilding_rating'))}<strong>${avg('worldbuilding_rating').toFixed(1)}</strong></div>
      <div><span>Pacing &amp; Engagement</span>${starsMarkup(avg('pacing_rating'))}<strong>${avg('pacing_rating').toFixed(1)}</strong></div>
    </div>
  `;
}

async function renderReviewForm(chapterCount, reviews) {
  if (!currentUser) {
    reviewFormWrap.innerHTML = `<p class="empty-row">Log in to leave a review.</p>`;
    return;
  }

  const myReview = reviews.find((r) => r.reader_id === currentUser.id);

  if (myReview && !reviewFormWrap.dataset.editing) {
    reviewFormWrap.innerHTML = `
      <div class="review-form-box review-submitted-box">
        <p class="empty-body">You rated this story ★ ${myReview.overall_rating}/5. Thanks for your review!</p>
        <div class="review-form-actions"><button class="btn btn-outline" id="editMyReviewBtn">Update review</button><button class="btn btn-ghost" id="deleteMyReviewBtn">Delete review</button></div>
      </div>
    `;
    document.getElementById('editMyReviewBtn').addEventListener('click', () => {
      reviewFormWrap.dataset.editing = 'true';
      renderReviewForm(chapterCount, reviews);
    });
    document.getElementById('deleteMyReviewBtn').addEventListener('click', async () => {
      if (!confirm('Delete your review?')) return;
      const { error } = await supabase.rpc('delete_review', { p_review_id: myReview.id });
      if (error) return showToast('Could not delete the review.');
      showToast('Review deleted');
      loadReviews(chapterCount);
    });
    return;
  }
  delete reviewFormWrap.dataset.editing;

  const selections = {};
  if (myReview) {
    selections.plot = myReview.plot_rating;
    selections.characters = myReview.characters_rating;
    selections.writing = myReview.writing_rating;
    selections.worldbuilding = myReview.worldbuilding_rating;
    selections.pacing = myReview.pacing_rating;
    selections.overall = myReview.overall_rating;
  }

  reviewFormWrap.innerHTML = `
    <div class="review-form-box">
      <div class="review-form-heading"><div><span class="review-form-kicker">Your rating</span><h3 class="reviews-subheading">${myReview ? 'Update your review' : 'Rate this story'}</h3></div><span class="review-form-instruction">Tap the stars for each category</span></div>
      ${RATING_CATEGORIES.map((c) => starPickerHtml(c.key, c.label)).join('')}
      <textarea id="reviewTextInput" rows="3" placeholder="Write a review (optional)">${myReview?.review_text ? escapeHtml(myReview.review_text) : ''}</textarea>
      <p class="form-error" id="reviewError" hidden></p>
      <div class="review-form-actions"><button class="btn btn-primary" id="submitReviewBtn">${myReview ? 'Update review' : 'Submit review'}</button>${myReview ? '<button class="btn btn-outline" id="cancelReviewEditBtn">Cancel</button>' : ''}</div>
    </div>
  `;

  wireStarPicker(reviewFormWrap, selections);
  Object.entries(selections).forEach(([key, val]) => {
    reviewFormWrap.querySelectorAll(`.star-row[data-key="${key}"] .star-btn`).forEach((b) => {
      b.classList.toggle('filled', parseInt(b.dataset.value, 10) <= val);
    });
  });

  document.getElementById('cancelReviewEditBtn')?.addEventListener('click', () => {
    delete reviewFormWrap.dataset.editing;
    renderReviewForm(chapterCount, reviews);
  });

  document.getElementById('submitReviewBtn').addEventListener('click', async () => {
    const errorEl = document.getElementById('reviewError');
    errorEl.hidden = true;
    const missing = RATING_CATEGORIES.filter((c) => !selections[c.key]);
    if (missing.length > 0) {
      errorEl.textContent = `Please rate: ${missing.map((c) => c.label).join(', ')}`;
      errorEl.hidden = false;
      return;
    }

    const btn = document.getElementById('submitReviewBtn');
    btn.disabled = true;
    const { data, error } = await supabase.rpc('submit_review', {
      p_story_id: storyId,
      p_plot: selections.plot,
      p_characters: selections.characters,
      p_writing: selections.writing,
      p_worldbuilding: selections.worldbuilding,
      p_pacing: selections.pacing,
      p_overall: selections.overall,
      p_review_text: document.getElementById('reviewTextInput').value.trim() || null,
    });
    btn.disabled = false;

    if (error || !data?.success) {
      console.error('Review submit error:', error || data);
      errorEl.textContent = data?.reason === 'not_enough_progress' ? 'Your review could not be submitted yet. Please try again.' : 'Could not update review — please try again.';
      errorEl.hidden = false;
      return;
    }

    showToast(myReview ? 'Review updated' : 'Review submitted');
    delete reviewFormWrap.dataset.editing;
    loadReviews(chapterCount);
  });
}

wireWriteSheet(() => currentUser, () => {
  authModalSub.textContent = 'Log in or create an account to publish a story.';
  openModal(authModal);
});

(async () => {
  try {
    await initAuth();
    await loadStory();
  } catch (error) {
    console.error('[GidiReads] Story page initialisation failed:', error);
    storyDetailTitle.textContent = 'Story unavailable';
    storyDetailDesc.textContent = 'We could not open this story right now. Please refresh and try again.';
    if (storyCoverWrap) storyCoverWrap.innerHTML = '';
    if (storyChapterList) storyChapterList.innerHTML = '<p class="story-empty">The chapter list is temporarily unavailable.</p>';
  }
})();
