import React from 'react';

const HTML = `


<!-- header injected by js/site-header.js -->

<main class="library-main">
  <section class="library-hero">
    <div class="library-hero-glow"></div>
    <div class="library-hero-stars" aria-hidden="true"></div>
    <div class="library-hero-inner section-inner">
      <div class="library-hero-copy">
        <div class="shelf-heading"><span class="shelf-icon" aria-hidden="true"><svg viewBox="0 0 72 72"><path d="M14 19c0-3 2-5 5-5h34c3 0 5 2 5 5v39H19c-3 0-5-2-5-5V19z"/><path d="M14 51c0-4 3-7 7-7h37M26 22h20M26 30h20M26 38h14"/></svg></span><span>MY SHELF</span></div>
        <h1>My Shelf</h1>
        <div class="hero-rule"><span></span><i></i><span></span></div>
      </div>
      <div class="library-hero-art" aria-hidden="true">
        <svg class="anime-sketch anime-sketch-one" viewBox="0 0 280 360">
          <path class="sketch-line" d="M111 86c-5-35 8-58 40-67 35-10 65 9 70 43 5 34-13 66-43 73-33 8-62-14-67-49z"/>
          <path class="sketch-line" d="M105 84c-1-45 28-74 68-74 34 0 57 21 61 53-18-14-34-18-49-17-20 2-42 12-80 38z"/>
          <path class="sketch-line" d="M127 81c13-10 24-19 36-31 14 18 31 27 54 32"/>
          <path class="sketch-line thin" d="M145 106c6 4 12 5 18 1M184 106c6 4 12 3 17-1M166 113c-2 8-1 13 6 15"/>
          <path class="sketch-line" d="M137 147c-25 9-42 29-49 57l-16 73c-5 23 10 42 33 45l93 12c22 3 40-13 41-35l3-77c1-30-14-58-42-74z"/>
          <path class="sketch-line" d="M92 213c27 17 55 23 85 19 24-3 45-13 63-30"/>
          <path class="sketch-line" d="M128 245c-18 8-33 20-46 36M211 240c15 10 28 23 37 39"/>
          <path class="sketch-line" d="M102 278c25 16 55 23 89 22"/>
          <path class="sketch-line" d="M116 295l-12 51M208 301l14 47"/>
          <path class="sketch-line" d="M86 346c11-7 24-7 36 0M214 347c11-6 24-5 35 2"/>
          <path class="sketch-line accent" d="M47 225c18-12 35-17 51-14M233 196c18 4 32 13 43 28"/>
        </svg>
        <svg class="anime-sketch anime-sketch-two" viewBox="0 0 230 300">
          <path class="sketch-line" d="M77 74c-7-28 7-52 33-58 31-7 57 10 61 38 4 29-12 54-38 60-28 6-50-12-56-40z"/>
          <path class="sketch-line" d="M73 72C69 37 87 13 115 9c26-4 49 10 58 33-19-10-37-8-54 0-14 6-27 17-46 30z"/>
          <path class="sketch-line thin" d="M95 78c5 4 10 4 15 1M130 79c5 3 10 2 14-1M116 89c-1 7 2 10 7 11"/>
          <path class="sketch-line" d="M91 126c-19 9-30 25-34 48l-10 60c-3 18 8 31 25 35l72 16c19 4 35-9 36-27l4-65c2-26-11-49-34-62z"/>
          <path class="sketch-line" d="M61 183c23 10 47 13 70 8 17-3 33-10 47-21"/>
          <path class="sketch-line" d="M84 215l-24 42M155 220l24 39M77 276l-9 22M161 280l11 20"/>
          <path class="sketch-line accent" d="M30 171c14-7 27-8 40-4M178 132c13 1 25 7 35 18"/>
        </svg>
        <div class="art-spark spark-a">✦</div><div class="art-spark spark-b">✧</div><div class="art-spark spark-c">✦</div>
      </div>
    </div>
  </section>

  <section class="library-content section-inner">
    <div id="loggedOutState" class="library-login-state" hidden>
      <div class="login-state-icon"><svg viewBox="0 0 64 64"><path d="M11 18h42v32H11z"/><path d="M11 26h42M22 18v32M42 18v32"/><path d="M29 8l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg></div>
      <h2>Your shelf is waiting.</h2>
      <button class="btn btn-primary" id="loginShelfBtn">Log in to open it</button>
    </div>

    <div id="libraryApp" hidden>
      <div class="library-bulk-toolbar" id="libraryBulkToolbar" hidden>
        <label><input type="checkbox" id="librarySelectAll"> <span>Select all novels</span></label>
        <span id="librarySelectionCount">0 selected</span>
        <button type="button" id="libraryBulkDelete" disabled>Remove selected</button>
        <button type="button" id="libraryClearSelection">Cancel</button>
      </div>
      <section class="shelf-section continue-section" id="continueSection">
        <div class="shelf-section-head"><div><span class="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Continue Reading</h2></div><button class="see-all" data-see="continue">See all <span>→</span></button></div>
        <div class="story-grid" id="continueGrid"></div>
      </section>

      <section class="shelf-section bookmarks-section" id="bookmarksSection">
        <div class="shelf-section-head"><div><span class="section-kicker">BOOKMARKED STORIES</span><h2>Bookmarked</h2></div><button class="see-all" data-see="bookmarks">See all <span>→</span></button></div>
        <div class="story-grid bookmark-story-grid" id="bookmarkGrid"></div>
      </section>

      <section class="shelf-section" id="savedSection">
        <div class="shelf-section-head"><div><span class="section-kicker">YOUR COLLECTION</span><h2>My Shelf</h2></div><button class="see-all" data-see="saved">See all <span>→</span></button></div>
        <div class="story-grid" id="savedGrid"></div>
      </section>

      <section class="shelf-section rl-section" id="myListsSection" hidden></section>

      <section class="shelf-section" id="completedSection">
        <div class="shelf-section-head"><div><span class="section-kicker">FINISHED WORLDS</span><h2>Completed</h2></div><button class="see-all" data-see="completed">See all <span>→</span></button></div>
        <div class="story-grid" id="completedGrid"></div>
      </section>

      <section class="shelf-empty" id="globalEmpty" hidden>
        <div class="empty-orbit"><span></span><span></span><span></span><svg viewBox="0 0 80 80"><path d="M14 22h52v38H14zM14 31h52M28 22v38M52 22v38"/><path d="M38 10l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg></div>
        <h2>Nothing on your shelf yet.</h2>
        <a href="explore.html" class="btn btn-primary">Explore stories</a>
      </section>
    </div>
  </section>
</main>



<div class="library-menu-overlay" id="menuOverlay" hidden></div>
<div class="story-menu" id="storyMenu" hidden><div class="story-menu-head"><span>Story actions</span><button id="closeStoryMenu" aria-label="Close">×</button></div><div id="storyMenuItems"></div></div>
<div class="toast" id="libraryToast" hidden></div>

<div class="modal-overlay" id="authModal" hidden>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
    <div class="modal-header"><button class="modal-close" data-close="auth" aria-label="Close">&times;</button><h2 id="authModalTitle" class="modal-title">Welcome to GidiReads</h2><p class="modal-sub" id="authModalSub">Log in to see your library.</p></div>
    <div class="modal-body"><form id="authForm" class="modal-form">
      <label class="field" id="authUsernameWrap"><span>Username</span><input type="text" id="authUsername" autocomplete="username" placeholder="e.g. amara_writes" /></label>
      <label class="field"><span>Email</span><input type="email" id="authEmail" autocomplete="email" required /></label>
      <label class="field"><span>Password</span><input type="password" id="authPassword" autocomplete="current-password" minlength="6" required /></label>
      <button type="button" id="forgotPasswordBtn" class="forgot-password-link">Forgot password?</button><p class="form-error" id="authError" hidden></p><button type="submit" class="btn btn-primary btn-block" id="authSubmitBtn">Log in</button>
    </form><p class="modal-switch"><span id="authSwitchPrompt">New to GidiReads?</span><button type="button" id="authSwitchBtn">Create an account</button></p></div>
  </div>
</div>

<nav class="bottom-nav" aria-label="Primary mobile navigation">
  <a href="index.html" class="bottom-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg><span>Home</span></a>
  <a href="explore.html" class="bottom-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span>Explore</span></a>
  <a href="library.html" class="bottom-nav-item active"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><span>Library</span></a>
  <button type="button" class="bottom-nav-item bottom-nav-write" id="writeNavBtn"><span class="write-fab"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span><span>Write</span></button>
  <a href="notifications.html" class="bottom-nav-item"><span class="nav-icon-wrap"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="nav-badge" id="navUnreadBadge" hidden></span></span><span>Alerts</span></a>
</nav>

<div class="write-sheet-overlay" id="writeSheetOverlay" hidden><div class="write-sheet"><button class="write-sheet-close" id="writeSheetClose" aria-label="Close">&times;</button><h3 class="write-sheet-title">What would you like to do?</h3><button class="write-sheet-option" id="writeNewStory">Publish a new story</button><button class="write-sheet-option" id="writeManageStories">Manage my stories</button></div></div>







`;

export default function LibraryPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "library-page";
    const _added = [];
    (async () => {
      // skipped legacy site-header.js
      try { await import("../../js/library.js"); } catch (e) { console.error('module load failed', "js/library.js", e); }
      try { await import("../../js/profile-nav.js"); } catch (e) { console.error('module load failed', "js/profile-nav.js", e); }
      try { const blob=new Blob(["import { supabase } from \"./js/supabaseClient.js\"; import { mountMyLists } from \"./js/reading-lists.js\"; supabase.auth.getSession().then(({ data }) => { if (data.session?.user) mountMyLists(document.getElementById(\"myListsSection\"), supabase, data.session.user); });"],{type:'text/javascript'}); const u=URL.createObjectURL(blob); await import(/* @vite-ignore */ u); URL.revokeObjectURL(u); } catch(e){ console.error('inline module failed', e); }
      try { (0,eval)("\n  if (\"serviceWorker\" in navigator && location.protocol === \"https:\") {\n    window.addEventListener(\"load\", () => navigator.serviceWorker.register(\"/sw.js\", { scope: \"/\" }).catch((error) => console.warn(\"GidiReads offline support could not start:\", error)));\n  }\n"); } catch(e){ console.error('inline script failed', e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-library');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-library" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
