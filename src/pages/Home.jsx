import React from 'react';

const HOME_HTML = `
<main role="main" id="top" class="home-main" id="main-content">

 <section class="home-hero" aria-labelledby="homeHeroTitle">
  <div class="section-inner home-hero-inner">
   <div class="home-hero-copy">
    <p class="home-kicker">GidiReads</p>
    <h1 id="homeHeroTitle">Find a story<br /><em>worth staying for.</em></h1>
    <p class="home-hero-sub">Discover novels, new voices and worlds you can disappear into.</p>

    <form class="home-search" id="homeSearchForm">
     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
     <input id="homeSearchInput" type="search" placeholder="Search stories, authors, or worlds…" autocomplete="off" />
     <button type="submit">Search</button>
    </form>

    <div class="home-hero-actions">
     <a class="home-primary-btn" href="explore.html">Explore stories</a>
     <button class="home-secondary-btn" type="button" id="publishHeroBtn">Publish a story</button>
    </div>
   </div>

   <div class="home-hero-art" aria-label="Featured story">
    <div class="home-galaxy" aria-hidden="true"></div>
    <div class="home-art-orbit home-art-orbit-one"></div>
    <div class="home-art-orbit home-art-orbit-two"></div>
    <div class="home-hero-petals" aria-hidden="true">
     <span class="home-petal petal-1"></span><span class="home-petal petal-2"></span><span class="home-petal petal-3"></span>
     <span class="home-petal petal-4"></span><span class="home-petal petal-5"></span><span class="home-petal petal-6"></span>
     <span class="home-petal petal-7"></span><span class="home-petal petal-8"></span>
    </div>
    <div class="home-art-note">
     <span class="home-art-note-label">ON GIDIREADS</span>
     <strong>There is always another world to enter.</strong>
    </div>
    <div id="heroStoryStack" class="home-story-stack">
     <div class="home-stack-card home-stack-card-front">
      <div class="home-stack-placeholder">Stories are loading…</div>
     </div>
    </div>
   </div>
  </div>
 </section>

 <section class="home-section hhr-section" id="hhHomeMount" hidden></section>

 <section class="home-section gathering-home-entry" aria-labelledby="gatheringHomeTitle">
  <div class="section-inner">
   <div class="home-section-head"><div><p class="home-section-kicker">READ · CONNECT · CREATE</p><h2 id="gatheringHomeTitle">Step into The Gathering</h2><p>Find your people, share your thoughts and read together.</p></div><a href="community.html">Explore community →</a></div>
   <div class="gathering-home-shortcuts">
    <a href="community.html?space=discussions"><span class="gathering-shortcut-icon">✧</span><strong>Discussions</strong><small>Join conversations about stories and ideas.</small></a>
    <a href="community.html?space=circles"><span class="gathering-shortcut-icon">◉</span><strong>Reading Circles</strong><small>Find a group and read together.</small></a>
    <a href="community.html?space=prompts"><span class="gathering-shortcut-icon">⌁</span><strong>Weekly Prompts</strong><small>Try a creative challenge.</small></a>
   </div>
  </div>
 </section>

 <section class="home-section home-continue" id="continueSection" hidden>
  <div class="section-inner">
   <div class="home-section-head">
    <div>
     <p class="home-section-kicker">Pick up where you left off</p>
     <h2>Continue reading</h2>
    </div>
    <a href="library.html">View library <span>→</span></a>
   </div>
   <div id="continueGrid" class="home-story-grid home-story-grid-continue"></div>
  </div>
 </section>

 <section class="home-section home-featured" id="featuredSection">
  <div class="section-inner">
   <div class="home-section-head">
    <div>
     <p class="home-section-kicker">A place to begin</p>
     <h2>Featured on GidiReads</h2>
    </div>
    <a href="collection.html?type=featured">See all <span>→</span></a>
   </div>
   <div id="featuredContent" class="home-featured-grid">
    <div class="home-loading-card">Loading stories…</div>
   </div>
  </div>
 </section>

 <section class="home-section home-shelf-section" id="trendingSection">
  <div class="section-inner">
   <div class="home-section-head">
    <div>
     <p class="home-section-kicker">What readers are picking up</p>
     <h2>Trending now</h2>
    </div>
    <a href="collection.html?type=trending">See all <span>→</span></a>
   </div>
   <div id="trendingRow" class="home-story-grid"></div>
  </div>
 </section>

 <section class="home-section home-shelf-section home-soft-section" id="updatedSection">
  <div class="section-inner">
   <div class="home-section-head">
    <div>
     <p class="home-section-kicker">New chapters to catch up on</p>
     <h2>Recently updated</h2>
    </div>
    <a href="collection.html?type=updated">See all <span>→</span></a>
   </div>
   <div id="updatedRow" class="home-story-grid"></div>
  </div>
 </section>

 <section class="home-section home-shelf-section" id="newSection">
  <div class="section-inner">
   <div class="home-section-head">
    <div>
     <p class="home-section-kicker">Fresh on the platform</p>
     <h2>New on GidiReads</h2>
    </div>
    <a href="collection.html?type=new">See all <span>→</span></a>
   </div>
   <div id="newStoriesRow" class="home-story-grid"></div>
  </div>
 </section>

 <section class="home-section home-taxonomy-section" id="genresSection">
  <div class="section-inner">
   <div class="home-section-head">
    <div>
     <p class="home-section-kicker">Find your kind of story</p>
     <h2>Browse by genre</h2>
    </div>
    <a href="collection.html?type=taxonomy&category=genre&browse=1">All genres <span>→</span></a>
   </div>
   <div id="homepageGenreList" class="home-taxonomy-grid"></div>
  </div>
 </section>

 <section class="home-section home-shelf-section home-soft-section" id="tropesSection" hidden>
  <div class="section-inner">
   <div class="home-section-head">
    <div>
     <p class="home-section-kicker">Looking for a particular dynamic?</p>
     <h2>Popular tropes</h2>
    </div>
    <a href="collection.html?type=taxonomy&category=trope&browse=1">All tropes <span>→</span></a>
   </div>
   <div id="homepageTropeList" class="home-trope-grid"></div>
  </div>
 </section>

 <section class="home-section home-explore-more">
  <div class="section-inner">
   <div class="home-section-head">
    <div>
     <p class="home-section-kicker">Go a little deeper</p>
     <h2>More ways to explore</h2>
    </div>
    <a href="explore.html">Explore everything <span>→</span></a>
   </div>
   <div class="home-discovery-grid">
    <a href="explore.html#settings" class="home-discovery-card"><span>Settings</span><strong>Choose the world.</strong><small>Kingdoms, cities, academies, magical worlds and more.</small><b>Explore →</b></a>
    <a href="explore.html#regions" class="home-discovery-card"><span>Regions</span><strong>Find stories by place.</strong><small>Discover stories connected to different regions and cultures.</small><b>Explore →</b></a>
    <a href="explore.html#formats" class="home-discovery-card"><span>Formats</span><strong>Choose your reading experience.</strong><small>Explore the formats authors use on GidiReads.</small><b>Explore →</b></a>
    <a href="explore.html#tags" class="home-discovery-card"><span>Tags</span><strong>Follow the details.</strong><small>Search deeper through the smaller ideas that shape a story.</small><b>Explore →</b></a>
   </div>
  </div>
 </section>

 <section class="home-echo-section">
  <div class="section-inner home-echo-inner">
   <div class="home-echo-mark" aria-hidden="true">
    <svg viewBox="0 0 48 48" role="img"><path d="M24 5c8.8 0 16 6.1 16 13.7 0 6.2-4.8 11.5-11.5 13.1L24 43l-3.3-8.1C14 33.5 8 28.3 8 21.7 8 12.5 15.2 5 24 5Z"/><path d="M16 22c2.1 2.8 4.8 4.2 8 4.2s5.9-1.4 8-4.2"/></svg>
   </div>
   <div>
    <p class="home-section-kicker">The GidiReads Echo</p>
    <h2>Leave an Echo behind.</h2>
    <p>An Echo is more than a like. It is a small mark that a chapter was read and felt — one reader, one moment, left behind for the author.</p>
    <a href="explore.html">Discover stories worth echoing →</a>
   </div>
  </div>
 </section>

 <section class="home-author-cta">
  <div class="section-inner home-author-cta-inner">
   <div>
    <p class="home-section-kicker">For writers</p>
    <h2>Your story deserves somewhere to grow.</h2>
    <p>Publish, build an audience and keep your stories in one place.</p>
   </div>
   <button class="home-primary-btn" type="button" id="publishBottomBtn">Start publishing</button>
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
    <label class="field"><span>Username</span><input type="text" id="authUsername" autocomplete="username" placeholder="e.g. amara_writes" required /></label>
    <label class="field"><span>Email</span><input type="email" id="authEmail" autocomplete="email" required /></label>
    <label class="field"><span>Password</span><input type="password" id="authPassword" autocomplete="current-password" minlength="6" required /></label>
    <button type="button" id="forgotPasswordBtn" class="forgot-password-link">Forgot password?</button>
    <p class="form-error" id="authError" hidden></p>
    <button type="submit" class="btn btn-primary btn-block" id="authSubmitBtn">Log in</button>
   </form>
   <p class="modal-switch"><span id="authSwitchPrompt">New to GidiReads?</span><button type="button" id="authSwitchBtn">Create an account</button></p>
  </div>
 </div>
</div>

<nav class="bottom-nav" aria-label="Primary mobile navigation" role="navigation">
 <a href="/" class="bottom-nav-item active"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg><span>Home</span></a>
 <a href="explore.html" class="bottom-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span>Explore</span></a>
 <a href="library.html" class="bottom-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2z"/></svg><span>Library</span></a>
 <button type="button" class="bottom-nav-item bottom-nav-write" id="writeNavBtn"><span class="write-fab"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span><span>Write</span></button>
 <a href="notifications.html" class="bottom-nav-item"><span class="nav-icon-wrap"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="nav-badge" id="navUnreadBadge" hidden></span></span><span>Alerts</span></a>
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

export default function Home() {
  React.useEffect(() => {
    document.body.classList.add('home-page');
    (async () => {
      // Load legacy page behavior after markup is in DOM
      try { await import('../../js/app.js?v=story-fix-01'); } catch (e) { console.error('home app load failed', e); }
      try { await import('../../js/onboarding-tour.js?v=role-tour-01'); } catch (_) {}
      try { const mod = await import('../../js/holiday-rail.js'); mod.mountHolidayRail?.(document.getElementById('hhHomeMount')); } catch (_) {}
      try { await import('../../js/index.js'); } catch (_) {}
      try { await import('../../js/profile-nav.js'); } catch (_) {}
      try { await import('../../js/theme-sync.js'); } catch (_) {}
    })();
    return () => {
      document.body.classList.remove('home-page');
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: HOME_HTML }} />;
}
