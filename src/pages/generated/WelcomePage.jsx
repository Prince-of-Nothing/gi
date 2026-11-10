import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<main role="main" class="gr-welcome-shell" id="main-content">
 <header role="banner" class="gr-welcome-header"><a href="index.html" aria-label="GidiReads home"><img src="assets/gidireads-logo.png" alt="GidiReads logo"><span>GidiReads</span></a><span class="gr-welcome-header-note">Stories begin here.</span></header>
 <section class="gr-welcome-intro" aria-labelledby="welcomeTitle"><p class="gr-welcome-eyebrow">A WORLD OF YOUR OWN</p><h1 id="welcomeTitle">Every story opens<br><em>another world.</em></h1><p>Find your next obsession. Follow a new voice. Make room for a story that stays with you.</p><div class="gr-welcome-actions"><a class="gr-welcome-primary" href="index.html" id="enterGidiReads">Enter GidiReads <span aria-hidden="true">→</span></a><a class="gr-welcome-secondary" href="auth.html?mode=signup">Create an account</a></div></section>
 <section class="gr-daily-story" aria-labelledby="dailyStoryHeading"><div class="gr-daily-heading"><div><p class="gr-welcome-eyebrow">THE GIDIREADS HERO</p><h2 id="dailyStoryHeading">A story to step into</h2></div><span class="gr-daily-mark" aria-hidden="true">GR</span></div><div id="dailyStoryCard" class="gr-daily-card"><div class="gr-daily-cover gr-cover-skeleton" aria-hidden="true"></div><div class="gr-daily-copy"><p class="gr-daily-kicker">SELECTED ON GIDIREADS</p><h3>Finding today’s story…</h3><p class="gr-daily-description">Loading the story chosen for the GidiReads homepage.</p></div></div><p class="gr-daily-footnote" id="dailyStoryStatus" role="status" aria-live="polite">Using the story selected in the homepage Hero settings.</p></section>
 

</main>



`;

export default function WelcomePage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "gr-welcome-page";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      // skipped legacy site-header.js
      try { await import("../../js/welcome.js"); } catch (e) { console.error('module load failed', "js/welcome.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-welcome');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-welcome" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
