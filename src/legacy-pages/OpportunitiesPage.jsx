import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<main role="main" class="oc" id="main-content">
 <section class="oc-hero" id="ocHero" aria-label="Featured opportunities" aria-roledescription="carousel">
  <div class="oc-hero-loading">Loading featured opportunities…</div>
 </section>

 <section class="oc-intro">
  <p class="oc-eyebrow">OPEN DOORS · NEW POSSIBILITIES</p>
  <h1>Opportunities</h1>
  <p>Contests, author programmes and other ways to take your story further. Read the rules and dates before you apply.</p>
 </section>

 <section class="oc-list" aria-labelledby="ocListTitle">
  <div class="oc-list-head"><h2 id="ocListTitle">Current &amp; upcoming</h2><span id="ocCount" class="oc-count"></span></div>
  <div class="oc-filters" id="ocFilters" hidden></div>
  <div id="ocCards" class="oc-cards" aria-live="polite"><p class="oc-state">Loading opportunities…</p></div>
 </section>

 <p class="oc-note"><strong>Good to know:</strong> Opportunities are run by the GidiReads team. Entries may be verified, and eligibility, prizes and contract offers are subject to each opportunity's published terms.</p>
</main>







`;

export default function OpportunitiesPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "oc-body";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/opportunities.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/opportunities.js"); } catch (e) { console.error('script load failed', "js/opportunities.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-opportunities');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-opportunities" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
