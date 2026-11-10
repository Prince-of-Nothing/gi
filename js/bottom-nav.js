/**
 * Shared bottom navigation component
 * Inserts the standard bottom nav into any page with a <nav class="bottom-nav" data-auto="true"> element
 * or injects it at the end of body if no such element exists.
 */

const BOTTOM_NAV_HTML = `
<nav class="bottom-nav" aria-label="Primary mobile navigation" role="navigation">
  <a href="index.html" class="bottom-nav-item" data-page="index">
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>
    </svg>
    <span>Home</span>
  </a>
  <a href="explore.html" class="bottom-nav-item" data-page="explore">
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <span>Explore</span>
  </a>
  <a href="library.html" class="bottom-nav-item" data-page="library">
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
    <span>Library</span>
  </a>
  <button type="button" class="bottom-nav-item bottom-nav-write" id="writeNavBtn">
    <span class="write-fab">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    </span>
    <span>Write</span>
  </button>
  <a href="notifications.html" class="bottom-nav-item" data-page="notifications">
    <span class="nav-icon-wrap">
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span class="nav-badge" id="navUnreadBadge" hidden></span>
    </span>
    <span>Alerts</span>
  </a>
</nav>
`;

function setActiveNavItem() {
  const path = window.location.pathname;
  const page = path.split('/').pop().replace('.html', '') || 'index';
  document.querySelectorAll('.bottom-nav-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
}

function injectBottomNav() {
  const existing = document.querySelector('nav.bottom-nav');
  if (existing) existing.remove();
  let container = document.querySelector('nav.bottom-nav[data-auto="true"]');
  if (!container) {
    container = document.createElement('nav');
    container.setAttribute('data-auto', 'true');
    container.className = 'bottom-nav';
    document.body.appendChild(container);
  }
  container.innerHTML = BOTTOM_NAV_HTML;
  setActiveNavItem();
  initWriteSheet();
}

function initWriteSheet() {
  const writeBtn = document.getElementById('writeNavBtn');
  const overlay = document.getElementById('writeSheetOverlay');
  const closeBtn = document.getElementById('writeSheetClose');
  const writeNewStory = document.getElementById('writeNewStory');
  const writeManageStories = document.getElementById('writeManageStories');

  if (!writeBtn || !overlay) return;

  writeBtn.addEventListener('click', () => {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  });

  closeBtn?.addEventListener('click', closeWriteSheet);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeWriteSheet();
  });

  function closeWriteSheet() {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  writeNewStory?.addEventListener('click', () => {
    closeWriteSheet();
    window.location.href = 'create-story.html';
  });

  writeManageStories?.addEventListener('click', () => {
    closeWriteSheet();
    window.location.href = 'my-stories.html';
  });
}

// Auto-inject on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectBottomNav);
} else {
  injectBottomNav();
}

// Export for manual use
export { injectBottomNav, setActiveNavItem, BOTTOM_NAV_HTML };