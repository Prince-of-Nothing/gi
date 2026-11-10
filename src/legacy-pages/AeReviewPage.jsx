import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<main role="main" class="ae-shell" id="main-content"><header role="banner" class="ae-header"><a href="ae.html">    AE Workspace</a><span>PRIVATE EDITORIAL REVIEW</span><a href="account.html">My account</a></header><section class="ae-hero"><p class="ae-kicker">ASSIGNED STORY</p><h1 id="reviewTitle">Loading story…</h1><p id="reviewAuthor"></p></section><div id="reviewNotice" class="ae-notice" role="status" hidden></div><section id="reviewContent" class="ae-pane"><p>Loading published chapters…</p></section></main>




`;

export default function AeReviewPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/ae-review.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/ae-review.js"); } catch (e) { console.error('script load failed', "js/ae-review.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-ae-review');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-ae-review" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
