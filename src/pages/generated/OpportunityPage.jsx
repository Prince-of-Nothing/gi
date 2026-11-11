import React from 'react';

const HTML = `

<main role="main" class="od" id="odMain" id="main-content"><p class="od-back"><a href="opportunities.html">← All opportunities</a></p><div id="odContent"><p class="od-state">Loading…</p></div></main>






`;

export default function OpportunityPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "oc-body";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      // skipped legacy site-header.js
      try { await import("../../js/opportunity.js"); } catch (e) { console.error('module load failed', "js/opportunity.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-opportunity');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-opportunity" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
