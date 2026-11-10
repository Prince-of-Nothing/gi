import React from 'react';

const HTML = `
<main class="ae-shell"><header class="ae-header"><a href="ae.html?pane=drafts">← Shared drafts</a><span>PRIVATE EDITORIAL REVIEW</span><a href="account.html">My account</a></header><section class="ae-hero"><p class="ae-kicker">AUTHOR-SHARED MANUSCRIPT</p><h1 id="draftTitle">Loading shared draft…</h1><p id="draftAuthor"></p></section><div id="draftNotice" class="ae-notice" role="status" aria-live="polite">Checking your access…</div><section id="draftChapters" class="ae-pane"><p>Loading the manuscript…</p></section></main>


`;

export default function AeDraftReviewPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/ae-draft-review.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/ae-draft-review.js"); } catch (e) { console.error('script load failed', "js/ae-draft-review.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-ae-draft-review');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-ae-draft-review" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
