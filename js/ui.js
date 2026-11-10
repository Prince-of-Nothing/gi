// Shared small UI helpers used across pages: toast messages + write action sheet.

// Theme preference is owned by the dependency-free js/theme.js so it keeps
// working even when the Supabase module cannot load. These helpers remain for
// older callers and simply delegate to that single source of truth.
export function getSiteTheme() {
  return window.GidiReadsTheme ? window.GidiReadsTheme.get() : 'dark';
}

export function setSiteTheme(themeName) {
  if (window.GidiReadsTheme) window.GidiReadsTheme.set(themeName);
}

export function wireThemePicker(container) {
  container.querySelectorAll('.theme-swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      setSiteTheme(btn.dataset.theme);
      container.querySelectorAll('.theme-swatch').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });
  syncThemePicker(container);
  document.addEventListener('gidireads:themechange', () => syncThemePicker(container));
}

function syncThemePicker(container) {
  const current = getSiteTheme();
  container.querySelectorAll('.theme-swatch').forEach((btn) => {
    btn.classList.toggle('active', window.GidiReadsTheme
      ? window.GidiReadsTheme.normalize(btn.dataset.theme) === current
      : btn.dataset.theme === current);
  });
}

export function getTextScale() {
  return localStorage.getItem('gr-text-scale') || '1';
}

export function setTextScale(scale) {
  document.documentElement.style.setProperty('--text-scale', scale);
  localStorage.setItem('gr-text-scale', scale);
}

export function wireTextSizePicker(container) {
  const current = getTextScale();
  container.querySelectorAll('.text-size-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.scale === current);
    btn.addEventListener('click', () => {
      setTextScale(btn.dataset.scale);
      container.querySelectorAll('.text-size-btn').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });
}

export function coverMarkup(cover_url, title, sizeClass) {
  if (cover_url) {
    return `<img class="${sizeClass}" src="${escapeHtmlLocal(cover_url)}" alt="${escapeHtmlLocal(title)} cover" />`;
  }
  const initial = (title || '?').trim().charAt(0).toUpperCase();
  return `<div class="${sizeClass} cover-placeholder">${escapeHtmlLocal(initial)}</div>`;
}

export function storyCardCompact(story, extraClass) {
  const authorName = story.profiles?.display_name || story.profiles?.username || 'Unknown author';
  return `
    <a class="gr-story-card-compact ${extraClass || ''}" href="story.html?id=${story.id}">
      ${coverMarkup(story.cover_url, story.title, 'cover-md')}
      <h3 class="gr-card-title">${escapeHtmlLocal(story.title)}</h3>
      <p class="gr-card-author">${escapeHtmlLocal(authorName)}</p>
      ${story.primary_genre ? `<span class="gr-card-genre-chip">${escapeHtmlLocal(story.primary_genre)}</span>` : ''}
      <div class="gr-card-stats">
        <span>◇ ${story.reads || 0}</span>
        <span>✦ ${story.echo_count || 0}</span>
      </div>
    </a>
  `;
}

export function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'gr-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

let unreadBadgeChannel = null;
let unreadBadgeUserId = null;
let unreadBadgePoll = null;
let unreadBadgeRefreshBusy = false;
export async function refreshUnreadBadge(supabase, userId) {
  const badges = [document.getElementById('navUnreadBadge'), document.getElementById('homeDesktopUnreadBadge')].filter(Boolean);
  if (!badges.length) return;
  const badge = badges[0];
  const setBadge = (el, total) => { if (!el) return; el.textContent = total > 9 ? '9+' : String(total); el.hidden = total === 0; };
  if (!userId) {
    badges.forEach(el => { el.hidden = true; el.textContent = ''; });
    if (unreadBadgeChannel) { try { await supabase.removeChannel(unreadBadgeChannel); } catch (_) {} unreadBadgeChannel = null; }
    unreadBadgeUserId = null;
    if (unreadBadgePoll) { clearInterval(unreadBadgePoll); unreadBadgePoll = null; }
    return;
  }
  if (unreadBadgeUserId !== userId) {
    if (unreadBadgeChannel) { try { await supabase.removeChannel(unreadBadgeChannel); } catch (_) {} }
    if (unreadBadgePoll) clearInterval(unreadBadgePoll);
    unreadBadgeUserId = userId;
    try {
      unreadBadgeChannel = supabase.channel(`gidireads-unread-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => refreshUnreadBadge(supabase, userId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_announcement_reads', filter: `user_id=eq.${userId}` }, () => refreshUnreadBadge(supabase, userId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_announcements' }, () => refreshUnreadBadge(supabase, userId))
        .subscribe();
    } catch (_) { unreadBadgeChannel = null; }
    unreadBadgePoll = setInterval(() => {
      if (document.visibilityState !== 'hidden' && unreadBadgeUserId === userId) refreshUnreadBadge(supabase, userId);
    }, 45000);
  }
  if (unreadBadgeRefreshBusy) return;
  unreadBadgeRefreshBusy = true;
  try {
    const { count: notificationCount, error: notificationError } = await supabase
      .from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
    let announcementCount = 0;
    try {
      const now = new Date().toISOString();
      const [{ data: profile }, { count: authoredStories }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
        supabase.from('stories').select('id', { count: 'exact', head: true }).eq('author_id', userId)
      ]);
      const audience = profile?.role === 'admin' ? ['all','readers','authors'] : ((authoredStories || 0) > 0 ? ['all','authors'] : ['all','readers']);
      const [{ data: announcements, error: announcementError }, { data: reads, error: readsError }] = await Promise.all([
        supabase.from('platform_announcements').select('id').eq('status', 'published').in('audience', audience).lte('publish_at', now).or(`expires_at.is.null,expires_at.gt.${now}`).order('publish_at', { ascending: false }).limit(200),
        supabase.from('platform_announcement_reads').select('announcement_id').eq('user_id', userId)
      ]);
      if (!announcementError && !readsError) {
        const readIds = new Set((reads || []).map(row => row.announcement_id));
        announcementCount = (announcements || []).filter(row => !readIds.has(row.id)).length;
      }
    } catch (_) { /* announcement migration may not be deployed yet; activity counts still work */ }
    const total = Math.max(0, Number(notificationError ? 0 : notificationCount || 0) + announcementCount);
    badges.forEach(el => setBadge(el, total));
  } catch (_) {
    badges.forEach(el => { el.hidden = true; });
  } finally { unreadBadgeRefreshBusy = false; }
}

const REPORT_REASONS = {
  plagiarism: 'Plagiarism', copyright: 'Copyright concern', harassment: 'Harassment',
  hate_discrimination: 'Hate/discriminatory content', sexual_content: 'Sexual/inappropriate content',
  spam: 'Spam', scam_fraud: 'Scam/fraud', violence: 'Violence/graphic content',
  impersonation: 'Impersonation', other: 'Other',
};

export function openReportModal(supabase, currentUser, { type, id, openAuthModalFn }) {
  if (!currentUser) {
    openAuthModalFn();
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">&times;</button>
        <h2 class="modal-title">Report ${escapeHtmlLocal(type)}</h2>
        <p class="modal-sub">Let us know what's wrong. Our team will review it.</p>
      </div>
      <div class="modal-body">
        <form class="modal-form">
          <label class="field">
            <span>Reason</span>
            <select required>
              <option value="">Select a reason</option>
              ${Object.entries(REPORT_REASONS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Details (optional)</span>
            <textarea rows="3" placeholder="Anything else we should know?"></textarea>
          </label>
          <p class="form-error" hidden></p>
          <button type="submit" class="btn btn-primary btn-block">Submit report</button>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  function close() {
    overlay.remove();
    document.body.style.overflow = '';
  }
  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  const form = overlay.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = overlay.querySelector('.form-error');
    errorEl.hidden = true;
    const reason = overlay.querySelector('select').value;
    const description = overlay.querySelector('textarea').value.trim() || null;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const { error } = await supabase.from('reports').insert({
      reporter_id: currentUser.id, reported_type: type, reported_id: id, reason, description,
    });
    submitBtn.disabled = false;

    if (error) {
      errorEl.textContent = error.message || 'Could not submit report.';
      errorEl.hidden = false;
      return;
    }
    close();
    showToast('Report submitted — thank you.');
  });
}

function escapeHtmlLocal(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function wireWriteSheet(currentUserGetter, openAuthModalFn) {
  const writeBtn = document.getElementById('writeNavBtn');
  const overlay = document.getElementById('writeSheetOverlay');
  const closeBtn = document.getElementById('writeSheetClose');
  const newStoryBtn = document.getElementById('writeNewStory');
  const manageBtn = document.getElementById('writeManageStories');
  if (!writeBtn || !overlay) return;

  function open() {
    if (!currentUserGetter()) {
      openAuthModalFn();
      return;
    }
    overlay.hidden = false;
  }
  function close() { overlay.hidden = true; }

  writeBtn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  newStoryBtn?.addEventListener('click', () => { window.location.href = 'authors-studio.html'; });
  manageBtn?.addEventListener('click', () => { window.location.href = 'authors-studio.html'; });
}
