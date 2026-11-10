import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<main role="main" class="story-page" id="main-content">
 <section class="story-hero-v2">
  <div class="story-hero-atmosphere" aria-hidden="true"></div>
  <div class="story-hero-particles" aria-hidden="true"></div>
  
  <div class="section-inner story-hero-inner-v2">
   <div class="story-cover-stage">
    <div class="story-cover-glow" aria-hidden="true"></div>
    <div id="storyCoverWrap" class="story-cover-frame-v2"></div>
   </div>
   <div class="story-hero-content">
    <div class="story-hero-topline"><span class="story-eyebrow">Story</span><span id="storyStatusBadge" class="story-status-badge"></span></div>
    <h1 id="storyDetailTitle" class="story-detail-title-v2">Loading…</h1>
    <div id="storyDetailAuthor" class="story-detail-author-wrap-v2"></div>
    <p id="storyDetailMeta" class="story-detail-meta-v2"></p>
    <div id="storyDetailStats" class="story-detail-stats-v2"></div>
    <div id="storyUpdateLine" class="story-update-line-v2"></div>
    <div class="story-detail-actions-v2">
     <a href="#" id="startReadingBtn" class="story-read-btn">Start Reading</a>
     <button id="saveToLibraryBtn" class="story-secondary-btn">+ Library</button>
     <button id="shareBtn" class="story-icon-btn" aria-label="Share story">↗</button>
    </div>
    <button id="reportStoryBtn" class="story-report-btn">Report story</button>
   </div>
  </div>
 </section>

 <section class="story-intro-section">
  <div class="section-inner story-intro-grid">
   <article class="story-intro-main">
    <span class="story-kicker">About this story</span>
    <h2>Step into the story</h2>
    <p id="storyDetailDesc" class="story-synopsis-text-v2 clamp-2"></p>
    <button class="story-text-link" id="storyDescReadMore" hidden>Read more</button>
   </article>
   <aside class="story-at-a-glance">
    <span class="story-kicker">Story details</span>
    <div id="storyQuickFacts" class="story-quick-facts-v2"></div>
   </aside>
  </div>
 </section>

 <section class="story-taxonomy-section-v2">
  <div class="section-inner">
   <div class="story-section-title-v2"><span class="story-kicker">What you'll find</span><h2>Genres, tropes &amp; tags</h2></div>
   <div id="storyTaxonomy" class="taxonomy-block-v2"></div>
  </div>
 </section>

 <section class="story-chapters-section-v2">
  <div class="section-inner">
   <div class="story-section-title-row-v2">
    <div><span class="story-kicker">Keep reading</span><h2 id="chaptersHeading">Latest chapters</h2></div>
    <span class="story-section-note-v2" id="chapterListNote"></span>
   </div>
   <div id="storyChapterList" class="story-latest-chapters"></div>
   <button id="viewAllChaptersBtn" class="story-view-all-btn" type="button">View all chapters <span>→</span></button>
   <div id="fullChapterList" class="story-full-chapter-list" hidden></div>
  </div>
 </section>

 <section class="story-reviews-section-v2">
  <div class="section-inner">
   <div class="story-section-title-v2"><span class="story-kicker">Community</span><h2>Reader Reviews</h2></div>
   <div id="ratingSummary" class="rating-summary-v2"></div>
   <div id="reviewFormWrap"></div>
   <div id="reviewsListWrap" class="reviews-wrap-v2">
    <div class="reviews-subheading-row"><h3 class="reviews-subheading">What readers are saying</h3><p class="reviews-hint">Open a review to see its conversation.</p></div>
    <div id="reviewsList"><p class="empty-row">Loading reviews…</p></div>
   </div>
  </div>
 </section>

 <section class="story-echo-section-v2">
  <div class="section-inner story-echo-inner-v2">
   <div><span class="story-kicker">GidiReads ritual</span><h2>Echoes</h2><p><strong id="storyEchoCountText">0</strong> readers have left an Echo for this story.</p></div>
   <div class="echo-mark-large" aria-hidden="true"> </div>
  </div>
 </section>

 <section class="story-author-section-v2" id="storyAuthorSection">
  <div class="section-inner">
   <div class="story-section-title-v2"><span class="story-kicker">Meet the writer</span><h2>About the author</h2></div>
   <div id="storyAuthorCard" class="story-author-card-v2"></div>
  </div>
 </section>

 <section class="section story-related-section-v2" id="moreByAuthorSection" hidden>
  <div class="section-inner">
   <div class="story-section-title-row-v2"><div><span class="story-kicker">More from the same writer</span><h2>More from this author</h2></div><a id="moreByAuthorLink" class="story-see-all-v2" href="#">View author →</a></div>
   <div class="story-recommend-grid" id="moreByAuthorGrid"></div>
  </div>
 </section>

 <section class="section story-related-section-v2" id="similarStoriesSection" hidden>
  <div class="section-inner">
   <div class="story-section-title-row-v2 story-recommend-heading"><div><span class="story-kicker">Keep exploring</span><h2>Similar stories</h2><p>Stories that share this novel’s genres and subgenres.</p></div><a id="similarStoriesSeeMore" class="story-see-all-v2" href="explore.html">See more →</a></div>
   <div class="story-recommend-grid" id="similarStoriesGrid"></div>
  </div>
 </section>

 <section class="section story-related-section-v2" id="similarTagsSection" hidden>
  <div class="section-inner">
   <div class="story-section-title-row-v2 story-recommend-heading"><div><span class="story-kicker">Same story DNA</span><h2>Similar tropes &amp; tags</h2><p>Discover stories sharing this novel’s tropes and tags.</p></div><a id="similarTagsSeeMore" class="story-see-all-v2" href="explore.html">See more →</a></div>
   <div class="story-recommend-grid" id="similarTagsGrid"></div>
  </div>
 </section>

 <section class="story-adaptation-section-v2" id="adaptationSection" hidden>
  <div class="section-inner"><div><span class="story-kicker">Future possibilities</span><h2>Adaptation rights</h2><p id="adaptationText"></p></div></div>
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

export default function StoryPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      // skipped legacy site-header.js
      try { await import("../../js/story.js?v=07-story-redesign"); } catch (e) { console.error('module load failed', "js/story.js?v=07-story-redesign", e); }
      try { await import("../../js/profile-nav.js"); } catch (e) { console.error('module load failed', "js/profile-nav.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-story');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-story" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
