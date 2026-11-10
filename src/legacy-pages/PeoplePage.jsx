import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<main role="main" class="gr-profile-page gr-people-page" id="main-content"><div class="gr-profile-wrap"><header class="gr-editor-head"><p class="gr-section-kicker" id="peopleEyebrow">COMMUNITY</p><h1 id="peopleTitle">Followers</h1><p id="peopleSubtitle">People in this GidiReads community.</p></header><section class="gr-panel"><div id="peopleList" class="gr-people-list" aria-live="polite"><p class="gr-follow-empty">Loading people…</p></div></section></div></main>
<nav class="bottom-nav" aria-label="Primary mobile navigation" role="navigation"><a href="index.html" class="bottom-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg><span>Home</span></a><a href="explore.html" class="bottom-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span>Explore</span></a><a href="library.html" class="bottom-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><span>Library</span></a><a href="notifications.html" class="bottom-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 0-3.46 0"/></svg><span>Alerts</span></a></nav>



`;

export default function PeoplePage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/people.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/people.js"); } catch (e) { console.error('script load failed', "js/people.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/profile-nav.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/profile-nav.js"); } catch (e) { console.error('script load failed', "js/profile-nav.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-people');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-people" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
