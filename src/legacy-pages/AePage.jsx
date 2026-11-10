import React from 'react';

const HTML = `
<main class="ae-shell"><header class="ae-header"><a href="authors-studio.html">← GidiReads</a><span>ACQUISITIONS & DEVELOPMENTAL EDITOR</span><a href="account.html">My account</a></header><section class="ae-hero ae-hero-art"><div class="ae-hero-copy"><p class="ae-kicker">GIDIREADS · EDITORIAL TEAM</p><h1>AE Workspace</h1><p>Support writers, discover promising voices and help good stories find their readers.</p><div class="ae-hero-tags"><span>Editorial development</span><span>Author scouting</span><span>Story discovery</span></div></div><img src="assets/ae/ae-editor-hero.jpg" alt="Illustration of an editor working thoughtfully at her laptop"></section><div id="aeDashboardNotice" class="ae-notice" role="status"></div><nav class="ae-tabs"><button class="active" data-pane="overview">Overview</button><button data-pane="authors">My Authors</button><button data-pane="editorial">Editorial Desk</button><button data-pane="drafts">Shared drafts</button><button data-pane="scouting">Author Scouting</button><button data-pane="promotions">Promotions</button><button data-pane="performance">Performance</button></nav><section id="aePane" class="ae-pane"><p>Loading your workspace…</p></section></main>


`;

export default function AePage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/ae.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/ae.js"); } catch (e) { console.error('script load failed', "js/ae.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-ae');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-ae" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
