import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<main role="main" id="main-content">
 <section class="notifications-hero">
  <div class="section-inner notifications-head">
   <div>
    <p class="hero-eyebrow">YOUR GIDIREADS ACTIVITY</p>
    <h1 class="explore-title">Notifications</h1>
    <p class="notifications-subtitle">A quiet place for the people, stories and updates that matter to you.</p>
   </div>
   <button class="notifications-mark-all" id="markAllReadBtn" type="button">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 9.5 17 19 7.5"/></svg>
    <span>Mark all as read</span>
   </button>
  </div>
 </section>

 <section class="section notifications-section">
  <div class="section-inner">
   <div id="loggedOutState" class="empty-row" hidden>Log in to see your notifications.</div>
   <div class="notification-toolbar">
    <div>
     <p class="notification-toolbar-label">ACTIVITY</p>
     <h2>Recent notifications</h2>
    </div>
    <p class="notification-toolbar-note">Unread activity glows until you open it.</p>
   </div>
   <section class="announcement-feed-panel" id="announcementFeedPanel" hidden aria-labelledby="announcementFeedTitle"><div class="announcement-feed-head"><div><p class="notification-toolbar-label">FROM GIDIREADS</p><h2 id="announcementFeedTitle">Platform announcements</h2></div><span class="announcement-feed-count" id="announcementFeedCount"></span></div><div id="announcementFeed"></div></section>
   <section class="push-optin-panel" id="pushOptinPanel" hidden aria-label="Browser push notification settings"><div class="push-optin-copy"><p class="notification-toolbar-label">STAY IN THE LOOP</p><h2>Browser push alerts</h2><p>Get important GidiReads announcements even when this page is closed. You can turn them off any time.</p><span id="pushOptinStatus" role="status" aria-live="polite">Checking browser support…</span></div><button class="btn btn-primary" id="pushOptinButton" type="button">Enable push notifications</button></section>
   <div class="notification-tabs" id="notificationTabs" role="tablist" aria-label="Notification categories"></div>
   <div id="notificationsList"></div>
  </div>
 </section>
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
 <a href="notifications.html" class="bottom-nav-item active">
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

export default function NotificationsPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      // skipped legacy site-header.js
      try { await import("../../js/notifications.js"); } catch (e) { console.error('module load failed', "js/notifications.js", e); }
      try { await import("../../js/profile-nav.js"); } catch (e) { console.error('module load failed', "js/profile-nav.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-notifications');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-notifications" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
