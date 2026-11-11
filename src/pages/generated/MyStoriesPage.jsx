import React from 'react';

const HTML = `

<div class="studio-shell">
  <aside class="studio-sidebar" id="studioSidebar" aria-label="Authors Studio navigation">
    <div class="studio-brand-block">
      <a class="studio-brand" href="index.html" aria-label="Back to GidiReads">
        <span class="brand-monogram" aria-hidden="true"><span>G</span><span>R</span></span>
        <span class="brand-word">GidiReads</span>
      </a>
      <div class="studio-label">AUTHORS STUDIO</div>
      <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">×</button>
    </div>
    <nav class="studio-nav">
      <a class="studio-nav-item" href="authors-studio.html"><span class="nav-mark">01</span><span>Home</span></a>
      <a class="studio-nav-item active" href="my-stories.html"><span class="nav-mark">02</span><span>My Stories</span></a>
      <a class="studio-nav-item" href="create-story.html"><span class="nav-mark">03</span><span>Create Story</span></a>
      <a class="studio-nav-item" href="contract-center.html"><span class="nav-mark">04</span><span>Contract Center</span></a>
      <a class="studio-nav-item" href="creator-earnings.html"><span class="nav-mark">05</span><span>Earnings</span></a>
      <a class="studio-nav-item" href="analytics.html"><span class="nav-mark">06</span><span>Insights</span></a>
      <div class="nav-divider"></div>
      <a class="studio-nav-item" href="opportunities.html"><span class="nav-mark">07</span><span>Opportunities</span></a>
      
      <a class="studio-nav-item" href="notifications.html"><span class="nav-mark">09</span><span>Notifications</span></a>
      <a class="studio-nav-item" href="account.html"><span class="nav-mark">10</span><span>Author Profile</span></a>
    </nav>
    <div class="sidebar-bottom">
      <div class="sidebar-note"><span class="note-line"></span><p>Make room for the story.</p></div>
      <a class="back-to-gidi" href="index.html"><span>←</span> Back to GidiReads</a>
    </div>
  </aside>
  <div class="sidebar-backdrop" id="sidebarBackdrop"></div>

  <main class="studio-main">
    <header class="studio-topbar">
      <button class="menu-button" id="menuButton" aria-label="Open Authors Studio menu">☰</button>
      <div class="topbar-context"><span>GidiReads</span><i>/</i><strong>Authors Studio</strong><i>/</i><strong>My Stories</strong></div>
      <div class="topbar-actions">
        <a href="notifications.html" class="top-icon" aria-label="Notifications"><span></span></a>
        <button class="theme-toggle" id="themeToggle" type="button" aria-label="Switch to dark theme" aria-pressed="false"><span class="theme-icon">☾</span><span class="theme-label">Dark</span></button>
        <a href="account.html" class="profile-link">Profile</a>
      </div>
    </header>

    <div class="studio-content stories-page">
      <section class="stories-intro reveal">
        <div>
          <p class="eyebrow">THE LIBRARY OF YOUR WORK</p>
          <h1>My Stories</h1>
          <p class="stories-lead">Every story you create, in one place. Open a story to enter its workspace.</p>
        </div>
        <a class="button button-dark" id="createStoryButton" href="create-story.html">Create Story <span>+</span></a>
      </section>

      <section class="stories-overview reveal" aria-label="Story overview">
        <div><span class="overview-label">STORIES</span><strong id="storyCount">0</strong></div>
        <div><span class="overview-label">CHAPTERS</span><strong id="chapterCount">0</strong></div>
        <div><span class="overview-label">WORDS</span><strong id="wordCount">0</strong></div>
        <div class="overview-note"><span class="overview-rule"></span><p>Your numbers come from the stories and chapters saved to GidiReads.</p></div>
      </section>

      <section class="stories-library reveal">
        <div class="library-heading">
          <div><p class="eyebrow">YOUR SHELF</p><h2>All stories</h2></div>
          <div class="library-tools" role="group" aria-label="Filter stories">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="ongoing">Ongoing</button>
            <button class="filter-btn" data-filter="completed">Completed</button>
            <button class="filter-btn" data-filter="draft">Drafts</button>
          </div>
        </div>
        <div id="loggedOutState" class="studio-empty" hidden>
          <div class="empty-number">01</div><div><p class="eyebrow">YOUR SHELF IS PRIVATE</p><h3>Your GidiReads account is not available here.</h3><p>Use the main GidiReads sign-in so your Authors Studio session stays connected.</p><button class="button button-dark" id="loginEmptyButton">Open GidiReads login</button></div>
        </div>
        <div id="loadingState" class="studio-empty"><div class="empty-number">—</div><div><p class="eyebrow">OPENING YOUR SHELF</p><h3>Loading your stories.</h3><p>Fetching the work saved to your author account.</p></div></div>
        <div id="storiesList" class="story-library-grid" hidden></div>
      </section>
    </div>
    
  </main>
</div>


<div class="modal-overlay" id="aeDraftShareModal" hidden><div class="modal" role="dialog" aria-modal="true" aria-labelledby="aeDraftShareTitle"><div class="modal-header"><button class="modal-close" type="button" data-close="aeDraftShare" aria-label="Close">×</button><h2 class="modal-title" id="aeDraftShareTitle">Share a draft</h2><p class="modal-sub">Your assigned Acquisition Editor can read this draft privately.</p></div><div class="modal-body"><form id="aeDraftShareForm" class="modal-form"><label class="field"><span>Assigned editor</span><select id="aeDraftShareEditor" required><option value="">Loading…</option></select></label><p id="aeDraftShareStatus" class="form-error" role="status" aria-live="polite"></p><button type="submit" class="btn btn-primary btn-block" id="aeDraftShareSubmit" disabled>Share draft</button></form></div></div></div>




`;

export default function MyStoriesPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      // skipped legacy site-header.js
      try { await import("../../js/my-stories.js"); } catch (e) { console.error('module load failed', "js/my-stories.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-my-stories');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-my-stories" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
