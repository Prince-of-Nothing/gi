import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<main role="main" class="od" id="odMain" id="main-content"><p class="od-back"><a href="opportunities.html">← All opportunities</a></p><div id="odContent"><p class="od-state">Loading…</p></div></main>






`;

export default function OpportunityPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "oc-body";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/opportunity.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/opportunity.js"); } catch (e) { console.error('script load failed', "js/opportunity.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-opportunity');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-opportunity" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
