import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<main role="main" id="main-content"><section class="collection-hero"><div class="section-inner"><p class="collection-kicker" id="collectionKicker">GIDIREADS COLLECTION</p><h1 id="collectionTitle">Discover stories</h1><p id="collectionDescription">Explore stories selected for this collection.</p><div class="collection-meta" id="collectionMeta"></div></div></section><section class="section collection-main"><div class="section-inner"><div class="collection-toolbar"><div><p class="collection-eyebrow" id="collectionEyebrow">THE LIBRARY</p><h2 id="collectionSubheading">Stories to explore</h2></div><label class="collection-sort"><span>Sort by</span><select id="collectionSort"><option value="default">Recommended</option><option value="new">Newest first</option><option value="updated">Recently updated</option><option value="reads">Most read</option><option value="echoes">Most supported</option><option value="title">Title A–Z</option></select></label></div><div class="collection-grid" id="collectionGrid"><p class="collection-empty">Loading stories…</p></div><div class="collection-more-wrap"><button class="btn btn-outline" id="collectionMore" hidden>Load more stories</button></div><div class="collection-empty" id="collectionEmpty" hidden><h3>No stories found just yet</h3><p>There are no published stories in this collection at the moment. Try another collection or explore the full library.</p><a class="btn btn-primary" href="explore.html">Explore all stories</a></div><div class="collection-taxonomy" id="collectionTaxonomy" hidden><h2>Explore related themes</h2><div id="collectionTaxonomyLinks"></div></div></div></section></main>





`;

export default function CollectionPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "collection-page";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      try { await import("../../js/site-header.js"); } catch (e) { console.error('module load failed', "js/site-header.js", e); }
      try { await import("../../js/collection.js"); } catch (e) { console.error('module load failed', "js/collection.js", e); }
      try { await import("../../js/site-footer.js"); } catch (e) { console.error('module load failed', "js/site-footer.js", e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-collection');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-collection" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
