import React from 'react';

const EXPLORE_HTML = `
<main>
  <section class="explore-hero">
    <div class="explore-hero-stars" aria-hidden="true"></div>
    <div class="explore-hero-glow" aria-hidden="true"></div>
    <div class="explore-character-scene" aria-hidden="true">
      <div class="explore-character-aura"></div>
      <div class="explore-character-shadow"></div>
      <svg class="explore-character" viewBox="0 0 420 560" role="presentation">
        <defs>
          <linearGradient id="charHair" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eadbff"/><stop offset=".55" stop-color="#a98bcf"/><stop offset="1" stop-color="#5b3c77"/></linearGradient>
          <linearGradient id="charCoat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#302038"/><stop offset="1" stop-color="#120d18"/></linearGradient>
          <radialGradient id="charSkin"><stop offset="0" stop-color="#f7d9d3"/><stop offset="1" stop-color="#d9a9ae"/></radialGradient>
          <filter id="softGlow"><feGaussianBlur stdDeviation="9"/></filter>
        </defs>
        <ellipse cx="210" cy="522" rx="118" ry="18" fill="#050307" opacity=".65"/>
        <path d="M116 490 Q136 382 175 346 L246 346 Q289 391 307 490Z" fill="url(#charCoat)" stroke="#8e6cae" stroke-opacity=".38" stroke-width="2"/>
        <path d="M177 350 L210 425 L244 350" fill="#17101f" stroke="#b99bda" stroke-opacity=".3"/>
        <path d="M191 401 L210 426 L229 401 L222 474 L198 474Z" fill="#b99bda" opacity=".18"/>
        <path d="M151 370 Q118 399 105 460 L130 470 L171 407Z" fill="#24172d" stroke="#8e6cae" stroke-opacity=".3"/>
        <path d="M269 370 Q304 397 316 457 L290 469 L251 407Z" fill="#24172d" stroke="#8e6cae" stroke-opacity=".3"/>
        <rect x="194" y="329" width="32" height="43" rx="13" fill="url(#charSkin)"/>
        <ellipse cx="210" cy="270" rx="83" ry="92" fill="url(#charSkin)"/>
        <path d="M128 274 Q112 176 173 137 Q229 101 286 150 Q318 178 298 273 Q280 229 258 216 Q223 198 190 214 Q154 229 128 274Z" fill="url(#charHair)"/>
        <path d="M139 258 Q119 306 150 352 Q164 323 176 294 L166 248Z" fill="url(#charHair)"/>
        <path d="M280 245 Q305 300 270 355 Q254 318 246 286 L256 245Z" fill="url(#charHair)"/>
        <path d="M152 242 Q172 217 193 222" stroke="#3b244b" stroke-width="7" stroke-linecap="round"/><path d="M227 222 Q250 216 270 241" stroke="#3b244b" stroke-width="7" stroke-linecap="round"/>
        <ellipse cx="178" cy="264" rx="17" ry="11" fill="#f5edf9"/><ellipse cx="242" cy="264" rx="17" ry="11" fill="#f5edf9"/>
        <ellipse cx="181" cy="265" rx="6" ry="8" fill="#6c4b9a"/><ellipse cx="239" cy="265" rx="6" ry="8" fill="#6c4b9a"/>
        <circle cx="183" cy="262" r="2.2" fill="#fff"/><circle cx="241" cy="262" r="2.2" fill="#fff"/>
        <path d="M200 304 Q210 310 220 304" fill="none" stroke="#9d5e78" stroke-width="3" stroke-linecap="round"/>
        <path d="M151 315 Q210 343 269 315" fill="none" stroke="#c28ccf" stroke-opacity=".28" stroke-width="2"/>
        <path d="M103 185 Q78 233 91 291" fill="none" stroke="#d7b8f2" stroke-opacity=".22" stroke-width="3"/>
        <path d="M316 181 Q341 228 329 292" fill="none" stroke="#d7b8f2" stroke-opacity=".22" stroke-width="3"/>
        <circle cx="88" cy="330" r="4" fill="#ffd0e5"/><circle cx="326" cy="342" r="3" fill="#b99bda"/><circle cx="106" cy="150" r="3" fill="#ffd0e5"/>
      </svg>
    </div>
    <div class="section-inner explore-hero-inner">
      <div class="explore-hero-copy">
        <p class="explore-kicker">DISCOVER STORIES</p>
        <h1>Find the story<br><em>you didn't know</em> you needed.</h1>
        <p>Wander through worlds, genres, tropes and voices — then choose where to begin.</p>
        <form class="explore-search" id="searchForm">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" id="searchInput" placeholder="Search stories, authors, genres, or public reading lists…" autocomplete="off" />
          <select id="searchType" aria-label="Search content type"><option value="all">Everything</option><option value="stories">Stories</option><option value="lists">Reading lists</option></select>
          <button type="submit">Search</button>
        </form>
      </div>
      <div class="explore-hero-caption"><span>GIDIREADS</span><span>Stories begin here.</span></div>
    </div>
  </section>

  <section class="explore-discovery-bar section">
    <div class="section-inner">
      <div class="explore-tabs" id="discoveryTabs" role="tablist" aria-label="Discover stories">
        <button class="explore-tab active" data-mode="trending">Trending</button><button class="explore-tab" data-mode="popular">Popular</button><button class="explore-tab" data-mode="new">New</button><button class="explore-tab" data-mode="updated">Recently Updated</button><button class="explore-tab" data-mode="completed">Completed</button>
      </div>
      <button class="explore-filter-btn" id="openFilterBtn"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M7 12h10M10 18h4"/></svg><span>Filter</span><b id="filterCount" hidden>0</b></button>
    </div>
  </section>

  <section class="explore-section hhr-section" id="hhExploreMount" hidden></section>

  <section class="explore-section explore-featured-section" id="featuredSection">
    <div class="section-inner">
      <div class="explore-section-heading"><div><p class="explore-section-kicker">CURATED FOR YOU</p><h2>Featured on GidiReads</h2><p class="explore-featured-subtitle">Hand-picked stories from the GidiReads community</p></div></div>
      <div id="featuredGrid" class="explore-featured-grid"><div class="explore-loading">Loading featured stories…</div></div>
    </div>
  </section>

  <section class="explore-section" id="discoverSection">
    <div class="section-inner">
      <div class="explore-section-heading"><div><p class="explore-section-kicker" id="modeKicker">RIGHT NOW</p><h2 id="modeTitle">Trending Now</h2></div><button class="explore-see-all" id="seeAllBtn">See all →</button></div>
      <div id="discoverGrid" class="explore-story-grid"><div class="explore-loading">Loading stories…</div></div>
    </div>
  </section>

  <section class="explore-section public-lists-section" id="publicListsSection">
    <div class="section-inner">
      <div class="explore-section-heading"><div><p class="explore-section-kicker">CURATED BY READERS</p><h2>Public Reading Lists</h2><p class="explore-featured-subtitle">Discover collections created by readers across GidiReads.</p></div><a class="explore-see-all" href="explore.html?search=&amp;type=lists">Find a reading list →</a></div>
      <div id="publicListsGrid" class="public-reading-list-grid"><div class="explore-loading">Loading public reading lists…</div></div>
    </div>
  </section>

  <section class="explore-section compact-section">
    <div class="section-inner">
      <div class="explore-section-heading"><div><p class="explore-section-kicker">KEEP EXPLORING</p><h2>More ways to find a story</h2></div></div>
      <div class="explore-discovery-grid" id="discoveryLinks">
        <button data-category="genre"><span>Genres</span><small>Start broad</small><i>→</i></button>
        <button data-category="subgenre"><span>Subgenres</span><small>Go deeper</small><i>→</i></button>
        <button data-category="trope"><span>Tropes</span><small>Story dynamics</small><i>→</i></button>
        <button data-category="tag"><span>Tags</span><small>Specific ideas</small><i>→</i></button>
        <button data-category="setting"><span>Settings</span><small>Where stories happen</small><i>→</i></button>
        <button data-category="region"><span>Regions</span><small>Place and context</small><i>→</i></button>
        <button data-category="format"><span>Formats</span><small>Reading experience</small><i>→</i></button>
        <button data-category="audience"><span>Audiences</span><small>Made for you</small><i>→</i></button>
        <a href="#publicListsSection" class="explore-list-discovery-link"><span>Reading Lists</span><small>Explore reader-curated collections</small><i>→</i></a>
      </div>
    </div>
  </section>

  <section class="explore-section taxonomy-showcase" id="taxonomyShowcase">
    <div class="section-inner">
      <div class="explore-section-heading"><div><p class="explore-section-kicker">BROWSE A LITTLE DEEPER</p><h2 id="taxonomyShowcaseTitle">Genres</h2></div><button class="explore-see-all" id="taxonomySeeAll">See all →</button></div>
      <div class="explore-taxonomy-cards" id="taxonomyShowcaseGrid"><div class="explore-loading">Loading discovery options…</div></div>
    </div>
  </section>

  <section class="explore-section because-section" id="becauseSection" hidden>
    <div class="section-inner"><div class="explore-section-heading"><div><p class="explore-section-kicker">FROM YOUR READING</p><h2>Because you read…</h2></div></div><div id="becauseGrid" class="explore-story-grid"></div></div>
  </section>

  <section class="explore-results-section" id="resultsSection" hidden>
    <div class="section-inner">
      <div class="explore-section-heading"><div><p class="explore-section-kicker">SEARCH RESULTS</p><h2 id="resultsTitle">Stories</h2></div><span class="results-count" id="resultsCount"></span></div>
      <div id="resultsGrid" class="explore-story-grid"></div>
    </div>
  </section>
</main>

<div class="explore-filter-overlay" id="filterOverlay" hidden><aside class="explore-filter-panel" role="dialog" aria-modal="true" aria-labelledby="filterTitle"><div class="filter-panel-head"><div><p class="explore-section-kicker">REFINE</p><h2 id="filterTitle">Find exactly what you want</h2></div><button id="closeFilterBtn" aria-label="Close filters">×</button></div><div class="filter-panel-body"><label>Content type<select id="filterContentType"><option value="all">Stories and reading lists</option><option value="stories">Stories only</option><option value="lists">Public reading lists only</option></select></label><label>Genre<select id="filterGenre"><option value="">Any genre</option></select></label><label>Subgenre<select id="filterSubgenre"><option value="">Any subgenre</option></select></label><label>Trope<select id="filterTrope"><option value="">Any trope</option></select></label><label>Tag<select id="filterTag"><option value="">Any tag</option></select></label><label>Setting<select id="filterSetting"><option value="">Any setting</option></select></label><label>Region<select id="filterRegion"><option value="">Any region</option></select></label><label>Audience<select id="filterAudience"><option value="">Any audience</option></select></label><label>Format<select id="filterFormat"><option value="">Any format</option></select></label><label>Status<select id="filterStatus"><option value="">Any status</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option></select></label></div><div class="filter-panel-foot"><button class="filter-clear" id="clearFilters">Clear all</button><button class="btn btn-primary" id="applyFilters">Apply filters</button></div></aside></div>

<div class="modal-overlay" id="authModal" hidden><div class="modal" role="dialog" aria-modal="true" aria-labelledby="authModalTitle"><div class="modal-header"><button class="modal-close" data-close="auth" aria-label="Close">&times;</button><h2 id="authModalTitle" class="modal-title">Welcome to GidiReads</h2><p class="modal-sub" id="authModalSub">Log in to publish and follow stories.</p></div><div class="modal-body"><form id="authForm" class="modal-form"><label class="field"><span>Username</span><input type="text" id="authUsername" autocomplete="username" placeholder="e.g. amara_writes" required /></label><label class="field"><span>Email</span><input type="email" id="authEmail" autocomplete="email" required /></label><label class="field"><span>Password</span><input type="password" id="authPassword" autocomplete="current-password" minlength="6" required /></label><button type="button" id="forgotPasswordBtn" class="forgot-password-link">Forgot password?</button><p class="form-error" id="authError" hidden></p><button type="submit" class="btn btn-primary btn-block" id="authSubmitBtn">Log in</button></form><p class="modal-switch"><span id="authSwitchPrompt">New to GidiReads?</span><button type="button" id="authSwitchBtn">Create an account</button></p></div></div></div>

<nav class="bottom-nav" aria-label="Primary mobile navigation"><a href="index.html" class="bottom-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg><span>Home</span></a><a href="explore.html" class="bottom-nav-item active"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span>Explore</span></a><a href="library.html" class="bottom-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><span>Library</span></a><button type="button" class="bottom-nav-item bottom-nav-write" id="writeNavBtn"><span class="write-fab"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span><span>Write</span></button><a href="notifications.html" class="bottom-nav-item"><span class="nav-icon-wrap"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 0-3.46 0"/></svg><span id="navUnreadBadge" class="nav-badge" hidden></span></span><span>Alerts</span></a></nav>
`;

export default function Explore() {
  React.useEffect(() => {
    document.body.classList.add('explore-page');
    (async () => {
      try { await import('../../js/explore.js?v=12-public-reading-list-discovery'); } catch (e) { console.error('explore page load failed', e); }
      try { await import('../../js/profile-nav.js'); } catch (_) {}
      try { const mod = await import('../../js/holiday-rail.js'); mod.mountHolidayRail?.(document.getElementById('hhExploreMount'), { compact: true }); } catch (_) {}
      try { await import('../../js/theme-sync.js'); } catch (_) {}
    })();
    return () => {
      document.body.classList.remove('explore-page');
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: EXPLORE_HTML }} />;
}
