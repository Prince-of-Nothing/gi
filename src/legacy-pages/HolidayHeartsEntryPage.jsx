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
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/holiday-hearts-entry.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/holiday-hearts-entry.js"); } catch (e) { console.error('script load failed', "js/holiday-hearts-entry.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-holiday-hearts-entry');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-holiday-hearts-entry" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
