import React from 'react';

const HTML = `

<header class="gathering-top"><a href="index.html" class="gathering-brand">GidiReads</a><nav><a href="index.html">Home</a><a href="explore.html">Explore</a><a href="rankings.html">Rankings</a><a href="authors-studio.html">Authors Studio</a></nav><a class="gathering-account" href="account.html">My account</a></header>
<main class="gathering-shell gathering-space-page"><div class="gathering-space-heading"><span class="eyebrow">THE GIDIREADS COMMUNITY</span><h1>Inside The Gathering</h1><p>Conversations, reading circles, creative prompts and people who love stories.</p><div class="community-stat"><strong id="communityMemberCount">    </strong><span>community members</span><button class="community-button secondary" id="startCommunityTour" type="button">Get started · Take a tour</button><button class="community-tour-link" id="restartCommunityTour" type="button">Show me around again</button></div></div>
<section id="communitySpaces" class="community-layout"><aside class="community-sidebar"><h2>Community spaces</h2><button class="community-tab active" data-view="home">Community Home</button><button class="community-tab" data-view="discussions">Discussions</button><button class="community-tab" data-view="circles">Reading Circles</button><button class="community-tab" data-view="prompts">Weekly Prompts</button><button class="community-tab" data-view="authors">Author's Corner</button><button class="community-tab" data-view="spotlight">Community Spotlight</button><button class="community-tab" data-view="profile">My Community Profile</button><button class="community-tab mod-only" data-view="moderation" hidden>Moderation</button></aside><section class="community-content"><div id="communityNotice" class="community-notice" role="status" hidden></div><div id="communityView"><h2>Welcome to The Gathering</h2><p>Choose a space to get started.</p></div></section></section>
</main>


`;

export default function CommunitySpacePage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "gathering-page";
    const _added = [];
    (async () => {
      try { await import("../../js/site-header.js"); } catch (e) { console.error('module load failed', "js/site-header.js", e); }
      try { await import("../../js/community.js"); } catch (e) { console.error('module load failed', "js/community.js", e); }
      try { await import("../../js/site-footer.js"); } catch (e) { console.error('module load failed', "js/site-footer.js", e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-community-space');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-community-space" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
