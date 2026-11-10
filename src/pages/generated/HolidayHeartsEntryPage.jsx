import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<main role="main" class="he" id="heMain" id="main-content">
 <p class="hh-back"><a href="holiday-hearts.html">    Holiday Hearts</a></p>
 <div id="heBody"><p class="oc-state">Loading your entry…</p></div>
</main>






`;

export default function HolidayHeartsEntryPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "oc-body hh-body";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      try { await import("../../js/site-header.js"); } catch (e) { console.error('module load failed', "js/site-header.js", e); }
      try { await import("../../js/holiday-hearts-entry.js"); } catch (e) { console.error('module load failed', "js/holiday-hearts-entry.js", e); }
      try { await import("../../js/site-footer.js"); } catch (e) { console.error('module load failed', "js/site-footer.js", e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-holiday-hearts-entry');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-holiday-hearts-entry" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
