import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<header role="banner" class="site-nav explore-nav">
 <div class="nav-inner">
  <a class="brand" href="index.html">
   <img class="brand-mark" src="assets/gidireads-logo.png" alt="GidiReads" />
  </a>
  <nav class="explore-main-links" aria-label="Primary">
   <a href="index.html">Home</a>
   <a href="explore.html">Explore</a>
   <a href="rankings.html">Rankings</a>
   <a href="library.html">Library</a>
   <a href="community.html">The Gathering</a>
   <a href="admin.html" id="navAdminLink" hidden>Admin</a>
  </nav>
  <div class="nav-actions">
   <a href="rankings.html" class="rankings-nav-link" aria-label="Check rankings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8l-1 6-3 3-3-3-1-6Z"/><path d="M8 6H4l1 5 4 2M16 6h4l-1 5-4 2M12 13v5M8 21h8M9 18h6"/></svg><span>Rankings</span></a>
   <a href="notifications.html" class="top-icon-btn" aria-label="Notifications"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="nav-badge" id="navUnreadBadge" hidden></span></a>
   <a href="account.html" class="top-profile-btn explore-profile" aria-label="Profile"><span class="explore-profile-fallback">G</span></a>
   <button class="btn btn-ghost" id="loginBtn">Log in</button>
  </div>
 </div>
</header>

<main role="main" class="gr-profile-page" id="main-content">
 <div class="gr-profile-wrap">
  <div class="gr-cover" id="authorCover" aria-label="Profile header artwork"></div>
  <section class="gr-profile-card" aria-labelledby="authorName">
   <div class="gr-profile-top">
    <div class="gr-pfp-ring"><img id="authorPfp" class="gr-pfp" alt="Profile picture" hidden /></div>
    <div class="gr-profile-names"><h1 id="authorName">Loading profile…</h1><div id="authorHandle" class="gr-handle"></div><div id="authorJoined" class="gr-joined"></div></div>
   </div>
   <p id="authorBio" class="gr-bio"></p>
   <div class="gr-stats" id="authorStats"></div>
   <div class="gr-actions" id="authorActions"><button class="gr-btn gr-btn-primary" id="followBtn" type="button">Follow</button><a class="gr-btn" id="editProfileBtn" href="account.html" hidden>Edit profile</a><a class="gr-btn" id="myGidiReadsBtn" href="my-gidireads.html" hidden>My GidiReads</a><a class="gr-btn gr-btn-primary" id="adminDashboardBtn" href="admin.html" hidden>Admin Dashboard</a><button class="gr-btn" id="shareProfileBtn" type="button">Share profile</button><button class="gr-btn" id="reportUserBtn" type="button">Report</button></div>
  </section>
  <section class="gr-section gr-public-badges" id="publicBadgesSection" hidden>
   <p class="gr-section-kicker">Recognition</p><h2 class="gr-section-title">Badges</h2>
   <p class="gr-public-badges-intro">A few accomplishments this member has chosen to share.</p>
   <div class="gr-public-badge-grid" id="publicBadgesGrid"></div>
  </section>
  <section class="gr-section" id="publishedSection">
   <p class="gr-section-kicker">From this storyteller</p><h2 class="gr-section-title">Published stories</h2>
   <div class="gr-story-grid" id="authorStoriesGrid"><div class="gr-empty">Loading published stories…</div></div>
  </section>
 </div>
</main>



<div class="modal-overlay" id="authModal" hidden>
 <div class="modal" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
  <div class="modal-header">
   <button class="modal-close" data-close="auth" aria-label="Close">&times;</button>
   <h2 id="authModalTitle" class="modal-title">Welcome to GidiReads</h2>
   <p class="modal-sub" id="authModalSub">Log in to publish and follow stories.</p>
  </div>
  <div class="modal-body">
   <form id="authForm" class="modal-form">
    <label class="field">
     <span>Username</span>
     <input type="text" id="authUsername" autocomplete="username" placeholder="e.g. amara_writes" required />
    </label>
    <label class="field">
     <span>Email</span>
     <input type="email" id="authEmail" autocomplete="email" required />
    </label>
    <label class="field">
     <span>Password</span>
     <input type="password" id="authPassword" autocomplete="current-password" minlength="6" required />
    </label>
    <button type="button" id="forgotPasswordBtn" class="forgot-password-link">Forgot password?</button>
    <p class="form-error" id="authError" hidden></p>
    <button type="submit" class="btn btn-primary btn-block" id="authSubmitBtn">Log in</button>
   </form>
   <p class="modal-switch">
    <span id="authSwitchPrompt">New to GidiReads?</span>
    <button type="button" id="authSwitchBtn">Create an account</button>
   </p>
  </div>
 </div>
</div>

<nav class="bottom-nav" aria-label="Primary mobile navigation" role="navigation">
 <a href="index.html" class="bottom-nav-item">
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
  <span>Home</span>
 </a>
 <a href="explore.html" class="bottom-nav-item">
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  <span>Explore</span>
 </a>
 <a href="library.html" class="bottom-nav-item">
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  <span>Library</span>
 </a>
 <button type="button" class="bottom-nav-item bottom-nav-write" id="writeNavBtn">
    <span class="write-fab"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span>
    <span>Write</span>
  </button>
 <a href="notifications.html" class="bottom-nav-item">
  <span class="nav-icon-wrap">
   <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
   <span class="nav-badge" id="navUnreadBadge" hidden></span>
  </span>
  <span>Alerts</span>
 </a>
</nav>

<div class="write-sheet-overlay" id="writeSheetOverlay" hidden>
 <div class="write-sheet">
  <button class="write-sheet-close" id="writeSheetClose" aria-label="Close">&times;</button>
  <h3 class="write-sheet-title">What would you like to do?</h3>
  <button class="write-sheet-option" id="writeNewStory">
   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>
   Publish a new story
  </button>
  <button class="write-sheet-option" id="writeManageStories">
   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
   Manage my stories
  </button>
 </div>
</div>







`;

export default function AuthorPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "author-profile-page";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      try { await import("../../js/site-header.js"); } catch (e) { console.error('module load failed', "js/site-header.js", e); }
      try { await import("../../js/author.js"); } catch (e) { console.error('module load failed', "js/author.js", e); }
      try { await import("../../js/profile-nav.js"); } catch (e) { console.error('module load failed', "js/profile-nav.js", e); }
      try { await import("../../js/site-footer.js"); } catch (e) { console.error('module load failed', "js/site-footer.js", e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-author');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-author" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
