import React from 'react';

const HTML = `


<main class="rlp" id="rlpMain"><p class="rlp-back"><a href="library.html">← Library</a></p><div id="rlpBody"><div class="rlp-state">Loading…</div></div></main>





`;

export default function ReadingListPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/reading-list.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/reading-list.js"); } catch (e) { console.error('script load failed', "js/reading-list.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-reading-list');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-reading-list" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
