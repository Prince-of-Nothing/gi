import React from 'react';

const HTML = `


<main class="rlp" id="rlpMain"><p class="rlp-back"><a href="library.html">← Library</a></p><div id="rlpBody"><div class="rlp-state">Loading…</div></div></main>





`;

export default function ReadingListPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      // skipped legacy site-header.js
      try { await import("../../js/reading-list.js"); } catch (e) { console.error('module load failed', "js/reading-list.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-reading-list');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-reading-list" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
