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
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      // skipped legacy site-header.js
      try { await import("../../js/ae-review.js"); } catch (e) { console.error('module load failed', "js/ae-review.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-ae-review');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-ae-review" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
