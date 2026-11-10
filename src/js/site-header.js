// site-header.js — injects the canonical site header where missing.
(function(){
  'use strict';
  function ensureCss(href){
    if (document.querySelector('link[rel="stylesheet"][href*="'+href+'"]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }

  async function syncHeaderAuth(){
    try {
      const mod = await import('./supabaseClient.js');
      const supabase = mod && mod.supabase;
      if (!supabase || !supabase.auth) return;
      const loginBtn = document.getElementById('loginBtn');
      const adminLink = document.getElementById('navAdminLink');
      async function apply(session){
        const user = session && session.user ? session.user : null;
        if (loginBtn && !loginBtn.dataset.authManaged) {
          loginBtn.textContent = user ? 'Log out' : 'Log in';
        }
        if (adminLink) {
          if (!user) { adminLink.hidden = true; return; }
          try {
            const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
            adminLink.hidden = !(data && data.role === 'admin');
          } catch (_) {
            adminLink.hidden = true;
          }
        }
      }
      const { data } = await supabase.auth.getSession();
      await apply(data && data.session ? data.session : null);
      supabase.auth.onAuthStateChange((_event, session) => { apply(session); });
    } catch (_) { /* non-fatal */ }
  }

  function inject(){
    const hasCustomHeader = document.querySelector('header.reader-top, header.gathering-top, header.ae-header, header.an-top, header.studio-topbar, header.ws-topbar, header.gr-welcome-header, header.gr-auth-shell');
    if (hasCustomHeader) return;

    if (document.querySelector('header.site-nav')) {
      ensureCss('css/style.css');
      ensureCss('css/theme.css');
      ensureCss('css/theme-light-fixes.css');
      ensureCss('css/rankings.css');
      document.body.classList.add('has-site-nav');
      syncHeaderAuth();
      return;
    }

    ensureCss('css/style.css');
    ensureCss('css/theme.css');
    ensureCss('css/theme-light-fixes.css');
    ensureCss('css/rankings.css');
    document.body.classList.add('has-site-nav');
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const active = (p) => path === p ? ' class="active"' : '';
    const rankingsLink = `<a href="rankings.html" class="rankings-nav-link${path === 'rankings.html' ? ' active' : ''}" aria-label="Check rankings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8l-1 6-3 3-3-3-1-6Z"></path><path d="M8 6H4l1 5 4 2M16 6h4l-1 5-4 2M12 13v5M8 21h8M9 18h6"></path></svg><span>Rankings</span></a>`;
    const header = `<header class="site-nav home-nav">
  <div class="nav-inner">
    <a class="brand" href="index.html" aria-label="GidiReads home">
      <img class="brand-mark" src="assets/gidireads-logo.png" alt="GidiReads" />
    </a>

    <nav class="nav-links" aria-label="Primary navigation">
      <a${active('community.html')} href="community.html">The Gathering</a>
    </nav>

    <div class="nav-actions">
      ${rankingsLink}
      <a href="explore.html" class="home-nav-search" aria-label="Search stories">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <span>Search</span>
      </a>
      <a href="account.html" class="top-profile-btn home-profile-avatar" id="homeProfileAvatar" aria-label="Profile"><span class="home-profile-fallback" aria-hidden="true">G</span></a>
      <a class="btn btn-ghost" id="navAdminLink" href="admin.html" hidden>Admin Dashboard</a>
      <button class="btn btn-ghost" id="loginBtn">Log in</button>
    </div>
  </div>
</header>`;
    const div = document.createElement('div');
    div.innerHTML = header;
    const el = div.firstElementChild;
    if (el) {
      const target = document.getElementById('pageTransition') || document.body.firstChild;
      document.body.insertBefore(el, target);
    }
    syncHeaderAuth();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }
})();