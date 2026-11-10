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
      <a class="studio-nav-item active" href="authors-studio.html"><span class="nav-mark">01</span><span>Home</span></a>
      <a class="studio-nav-item" href="my-stories.html"><span class="nav-mark">02</span><span>My Stories</span></a>
      <a class="studio-nav-item" href="create-story.html"><span class="nav-mark">03</span><span>Create Story</span></a>
      <a class="studio-nav-item" href="story-bible.html"><span class="nav-mark">04</span><span>Story Bible</span></a>
      <a class="studio-nav-item" href="author-notes.html"><span class="nav-mark">05</span><span>Author Notes</span></a>
      <a class="studio-nav-item" href="story-metadata.html"><span class="nav-mark">06</span><span>Story Metadata</span></a>
      <a class="studio-nav-item" href="contract-center.html"><span class="nav-mark">07</span><span>Contract Centre</span></a>
      <a class="studio-nav-item" href="creator-earnings.html"><span class="nav-mark">08</span><span>Creator Earnings</span></a>
      <a class="studio-nav-item" href="analytics.html"><span class="nav-mark">09</span><span>Analytics Centre</span></a>
      <div class="nav-divider"></div>
      <a class="studio-nav-item" href="opportunities.html"><span class="nav-mark">10</span><span>Opportunities</span></a>
      
      <a class="studio-nav-item" href="ae-apply.html"><span class="nav-mark">12</span><span>Apply to be an AE</span></a>
      <a class="studio-nav-item" href="ae-author-feedback.html"><span class="nav-mark">13</span><span>Review your AE</span></a>
      <a class="studio-nav-item" id="aeWorkspaceLink" href="ae.html" hidden><span class="nav-mark">14</span><span>AE Workspace</span></a>
      <a class="studio-nav-item" href="notifications.html"><span class="nav-mark">15</span><span>Notifications</span></a>
      <a class="studio-nav-item" href="account.html"><span class="nav-mark">16</span><span>Author Profile</span></a>
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
      <div class="topbar-context"><span>GidiReads</span><i>/</i><strong>Authors Studio</strong></div>
      <div class="topbar-actions">
        <a href="notifications.html" class="top-icon" aria-label="Notifications"><span></span></a>
        <button class="theme-toggle" id="themeToggle" type="button" aria-label="Switch to dark theme" aria-pressed="false"><span class="theme-icon" aria-hidden="true">☾</span><span class="theme-label">Dark</span></button>
        <a href="account.html" class="profile-link" id="profileLink">Profile</a>
      </div>
    </header>

    <div class="studio-content">
      <section class="welcome-block reveal">
        <div class="welcome-copy">
          <p class="eyebrow">YOUR WRITING SPACE</p>
          <h1>Welcome back<span id="welcomeName"></span>.</h1>
          <p class="welcome-sub">A place to write, shape, and carry your stories forward.</p>
        </div>
        <div class="welcome-actions">
          <a class="button button-quiet" href="my-stories.html">My Stories</a>
          <a class="button button-dark" id="createStoryButton" href="create-story.html">Create Story <span>+</span></a>
        </div>
        <div class="welcome-rule"><span></span><small>GIDIREADS · AUTHORS STUDIO</small><span></span></div>
      </section>

      <section class="continue-section reveal" id="continueSection">
        <div class="section-kicker"><span>CONTINUE WRITING</span><i></i><small>YOUR CURRENT WORK</small></div>
        <div class="continue-card" id="continueCard">
          <div class="continue-copy">
            <p class="continue-type" id="continueType">YOUR MOST RECENT STORY</p>
            <h2 id="continueTitle">Your writing space is ready.</h2>
            <p class="continue-meta" id="continueMeta">Create a story to begin building your library.</p>
            <div class="continue-details" id="continueDetails" hidden></div>
            <a class="text-action" id="continueButton" href="my-stories.html">Open My Stories <span>→</span></a>
          </div>
          <div class="continue-art editorial-art" aria-label="GidiReads Authors Studio editorial writing artwork">
            <div class="editorial-image-wrap">
              <img src="assets/authors-studio-editorial.png" class="editorial-image" alt="Editorial writing desk with manuscript pages and a pen" />
              <div class="editorial-vignette" aria-hidden="true"></div>
              <div class="editorial-glow" aria-hidden="true"></div>
            </div>
            <div class="editorial-caption" aria-hidden="true">
              <span>GIDIREADS AUTHORS STUDIO</span><i></i><span>WRITE · REVISE · CREATE</span>
            </div>
          </div>
        </div>
      </section>

      <section class="activity-section reveal">
        <div class="section-heading-row">
          <div><p class="eyebrow">YOUR RHYTHM</p><h2>Writing activity</h2><p class="section-intro">A record of the work inside your stories.</p></div>
          <div class="range-switch" role="group" aria-label="Writing activity range"><button class="active" data-range="7">7D</button><button data-range="30">30D</button><button data-range="90">90D</button><button data-range="all">ALL</button></div>
        </div>
        <div class="activity-layout">
          <div class="activity-number"><strong id="wordTotal">0</strong><span>words across your chapters</span></div>
          <div class="activity-chart" id="activityChart"><div class="chart-empty"><span class="chart-line"></span><p>Writing history will appear here once GidiReads has a reliable saved activity record.</p></div></div>
          <div class="activity-facts"><div><strong id="chapterTotal">0</strong><span>chapters</span></div><div><strong id="storyTotal">0</strong><span>stories</span></div></div>
        </div>
      </section>

      <div class="lower-grid reveal">
        <section class="studio-section" id="recentSection">
          <div class="section-heading-row compact"><div><p class="eyebrow">THE PAPER TRAIL</p><h2>Recent activity</h2></div></div>
          <div class="timeline" id="recentActivity"><p class="muted">Your chapter activity will appear here as you write.</p></div>
        </section>
        <section class="studio-section opportunity-section" id="opportunities">
          <div class="section-heading-row compact"><div><p class="eyebrow">OPEN DOORS</p><h2>Opportunities</h2></div><a class="small-link" href="opportunities.html">View all</a></div>
          <div class="opportunity-note"><span class="opportunity-symbol">↗</span><div><h3>Room for what comes next.</h3><p>Publishing programs, contests, and adaptation opportunities will appear here when GidiReads has active programs to show you.</p></div></div>
        </section>
      </div>

      <section class="notices-section reveal" id="notices">
        <div class="section-heading-row compact"><div><p class="eyebrow">KEEP IN SIGHT</p><h2>Studio notices</h2></div></div>
        <div class="notice-list" id="noticeList"><div class="notice quiet"><span>✓</span><div><strong>You're all caught up.</strong><p>No Studio notices need your attention right now.</p></div></div></div>
      </section>

      <section class="quick-section reveal">
        <div class="section-heading-row compact"><div><p class="eyebrow">SHORTCUTS</p><h2>Start here</h2></div></div>
        <div class="quick-actions">
          <a href="my-stories.html" class="quick-action"><span>01</span><div><strong>My Stories</strong><small>Open your bookshelf</small></div><b>→</b></a>
          <a class="quick-action" id="quickCreate" href="create-story.html"><span>02</span><div><strong>New Story</strong><small>Start something new</small></div><b>→</b></a>
          <a href="my-stories.html" class="quick-action"><span>03</span><div><strong>Write Chapter</strong><small>Return to your stories</small></div><b>→</b></a>
          <a href="contract-center.html" class="quick-action"><span>04</span><div><strong>Contract Center</strong><small>Apply for a story contract and track offers</small></div><b>→</b></a>
          <a href="creator-earnings.html" class="quick-action"><span>05</span><div><strong>Creator Earnings</strong><small>Review ledger entries and payout requests</small></div><b>→</b></a>
          <a href="ae-apply.html" class="quick-action"><span>06</span><div><strong>Become an AE</strong><small>Apply to support GidiReads authors</small></div><b>→</b></a>
        </div>
      </section>

      <section class="story-shelf-section reveal">
        <div class="section-heading-row compact"><div><p class="eyebrow">YOUR SHELF</p><h2>Your stories</h2></div><a href="my-stories.html" class="small-link">View all</a></div>
        <div class="story-shelf" id="storyShelf"><p class="muted">Your stories will appear here.</p></div>
      </section>
    </div>
    
  </main>
</div>




`;

export default function AuthorsStudioPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      try { await import("../../js/site-header.js"); } catch (e) { console.error('module load failed', "js/site-header.js", e); }
      try { await import("../../js/authors-studio.js"); } catch (e) { console.error('module load failed', "js/authors-studio.js", e); }
      try { await import("../../js/site-footer.js"); } catch (e) { console.error('module load failed', "js/site-footer.js", e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-authors-studio');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-authors-studio" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
