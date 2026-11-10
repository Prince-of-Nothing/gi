import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<div id="pageTransition" class="page-transition"></div>

<main role="main" id="main-content">
  <div id="accessDenied" class="section" hidden>
   <div class="section-inner">
    <div class="admin-denied-card"><span class="admin-denied-icon" aria-hidden="true"></span><h1>Administrator access required</h1><p id="accessDeniedMessage">Sign in with an administrator account to open this workspace.</p><div class="admin-denied-actions"><a class="btn btn-primary" href="account.html">Go to account / sign in</a><a class="btn btn-outline" href="index.html">Return to GidiReads</a></div></div>
   </div>
  </div>

  <div id="adminDashboard" hidden>
   <section class="admin-hero">
    <div class="section-inner admin-hero-inner">
     <div class="admin-hero-copy"><p class="hero-eyebrow">GidiReads · Administrator workspace</p><h1 class="admin-hero-title">Admin Dashboard</h1><p class="admin-hero-subtitle">A clear view of your community, stories, and platform health.</p></div>
     <div class="admin-hero-actions"><a class="btn btn-outline" id="adminPublicProfile" href="account.html">View public profile</a><a class="btn btn-primary" href="admin-economy.html">Creator economy <span aria-hidden="true">→</span></a></div>
    </div>
   </section>

   <section class="explore-filters">
    <div class="section-inner">
     <div class="admin-tabs-wrap"><p class="admin-tabs-label">Workspace</p><div class="genre-list" id="adminTabs" role="tablist" aria-label="Admin dashboard sections">
      <button class="genre-chip active" data-tab="overview" role="tab" aria-selected="true">Overview</button>
      <button class="genre-chip" data-tab="reports" role="tab" aria-selected="false">Reports</button>
      <button class="genre-chip" data-tab="users" role="tab" aria-selected="false">Users</button>
      <button class="genre-chip" data-tab="staff" role="tab" aria-selected="false">Roles & permissions</button>
      <button class="genre-chip" data-tab="aeApplications" role="tab" aria-selected="false">AE applications</button>
      <button class="genre-chip" data-tab="stories" role="tab" aria-selected="false">Stories</button>
      <button class="genre-chip" data-tab="homepage" role="tab" aria-selected="false">Homepage</button>
      <button class="genre-chip" data-tab="announcements" role="tab" aria-selected="false">Announcements</button>
      <button class="genre-chip" data-tab="opportunities" role="tab" aria-selected="false">Opportunities</button>
      <button class="genre-chip" data-tab="resources" role="tab" aria-selected="false">Resources</button>
      <button class="genre-chip" data-tab="pricing" role="tab" aria-selected="false">Chapter pricing</button>
      <button class="genre-chip" data-tab="auditlog" role="tab" aria-selected="false">Audit Log</button>
     </div></div>
    </div>
   </section>

   <section class="section">
    <div class="section-inner">
     <div id="adminTabContent"><p class="empty-row">Loading…</p></div>
    </div>
   </section>
  </div>
</main>


<div class="modal-overlay" id="reportDetailModal" hidden>
 <div class="modal modal-wide" role="dialog" aria-modal="true">
  <div class="modal-header">
   <button class="modal-close" data-close="reportDetail" aria-label="Close">&times;</button>
   <h2 class="modal-title">Report</h2>
  </div>
  <div class="modal-body" id="reportDetailBody"></div>
 </div>
</div>

<nav class="bottom-nav" aria-label="Primary mobile navigation" role="navigation">
  <a href="index.html" class="bottom-nav-item ">
   <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
   <span>Home</span>
  </a>
  <a href="explore.html" class="bottom-nav-item ">
   <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
   <span>Explore</span>
  </a>
  <a href="library.html" class="bottom-nav-item ">
   <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
   <span>Library</span>
  </a>
  <button type="button" class="bottom-nav-item bottom-nav-write" id="writeNavBtn">
    <span class="write-fab"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span>
    <span>Write</span>
  </button>
  <a href="notifications.html" class="bottom-nav-item ">
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
   <button class="write-sheet-option" id="writeNewStory"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>Publish a new story</button>
   <button class="write-sheet-option" id="writeManageStories"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>Manage my stories</button>
  </div>
</div>







`;

export default function AdminPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/admin.js?v=admin-collection-form-04"); } catch (_) { try { await import(/* @vite-ignore */ "js/admin.js?v=admin-collection-form-04"); } catch (e) { console.error('script load failed', "js/admin.js?v=admin-collection-form-04", e); } }
      try { await import(/* @vite-ignore */ "../../js/profile-nav.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/profile-nav.js"); } catch (e) { console.error('script load failed', "js/profile-nav.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/admin.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/admin.js"); } catch (e) { console.error('script load failed', "js/admin.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-admin');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-admin" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
