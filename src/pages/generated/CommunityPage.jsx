import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<header role="banner" class="gathering-top"><a href="index.html" class="gathering-brand">GidiReads</a><nav role="navigation"><a href="index.html">Home</a><a href="explore.html">Explore</a><a href="rankings.html">Rankings</a><a href="authors-studio.html">Authors Studio</a></nav><a class="gathering-account" href="account.html">My account</a></header>
<main role="main" class="gathering-shell" id="main-content"><section class="gathering-hero"><div class="hero-copy"><span class="eyebrow">THE GIDIREADS COMMUNITY</span><h1>Step into <em>The Gathering</em></h1><p>A place to talk about stories, share ideas, meet readers and writers, and take part in creative challenges.</p><a href="#communitySpaces" class="gathering-cta">Explore the community</a></div><div class="portal-art" role="img" aria-label="The Gathering portal"><div class="portal-ring"></div><div class="portal-core"></div><span class="portal-caption">ENTER THE GATHERING</span></div></section>
<div class="gathering-welcome"><div><span class="eyebrow">WELCOME IN</span><h2>Good stories bring people together.</h2><p>Be kind, stay curious and give everyone room to take part.</p></div><div class="community-stat"><strong id="communityMemberCount">    </strong><span>community members</span><button class="community-button secondary" id="startCommunityTour" type="button">Get started · Take a tour</button><button class="community-tour-link" id="restartCommunityTour" type="button">Show me around again</button></div></div>
<section class="gathering-visual-paths" aria-label="Explore community spaces">
 <a class="gathering-image-tile gathering-image-community" href="community.html?space=discussions"><span>FIND YOUR PEOPLE</span><strong>Community conversations</strong></a>
 <a class="gathering-image-tile gathering-image-circle" href="community.html?space=circles"><span>READ SIDE BY SIDE</span><strong>Reading circles</strong></a>
 <a class="gathering-image-tile gathering-image-portal" href="community.html?space=spotlight"><span>DISCOVER WHAT'S HAPPENING</span><strong>Inside The Gathering</strong></a>
</section>
<section id="communitySpaces" class="community-layout"><aside class="community-sidebar"><h2>Community spaces</h2><button class="community-tab active" data-view="home">Community Home</button><button class="community-tab" data-view="discussions">Discussions</button><button class="community-tab" data-view="circles">Reading Circles</button><button class="community-tab" data-view="prompts">Weekly Prompts</button><button class="community-tab" data-view="authors">Author's Corner</button><button class="community-tab" data-view="spotlight">Community Spotlight</button><button class="community-tab" data-view="profile">My Community Profile</button><button class="community-tab mod-only" data-view="moderation" hidden>Moderation</button></aside><section class="community-content"><div id="communityNotice" class="community-notice" role="status" hidden></div><div id="communityView"><h2>Welcome to The Gathering</h2><p>Choose a space to get started.</p></div></section></section>
</main>




`;

export default function CommunityPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "gathering-page";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      try { await import("../../js/site-header.js"); } catch (e) { console.error('module load failed', "js/site-header.js", e); }
      try { await import("../../js/community.js"); } catch (e) { console.error('module load failed', "js/community.js", e); }
      try { await import("../../js/site-footer.js"); } catch (e) { console.error('module load failed', "js/site-footer.js", e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-community');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-community" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
