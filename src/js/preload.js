/* GidiReads — Site preloader.
   Prefetches every page and critical asset into the browser cache
   so navigation is instant and nothing re-requests from the network
   while the site is open. */
(function preloadSite() {
  try {
    var pages = [
      'index.html','explore.html','library.html','community.html',
      'my-gidireads.html','settings.html','account.html','auth.html',
      'author.html','story.html','collection.html','notifications.html',
      'my-stories.html','admin.html','moderator.html','opportunities.html',
      'creator-earnings.html','contract-center.html','store.html',
      'people.html','reset-password.html','welcome.html',
      'chapter-editor.html','authors-studio.html','author-notes.html',
      'story-publishing.html','story-workspace.html','story-bible.html',
      'story-metadata.html','holiday-hearts.html','holiday-hearts-entry.html',
      'ae.html','ae-apply.html','ae-review.html','ae-author-feedback.html',
      'admin-economy.html','create-story.html','opportunity.html','reader.html'
    ];
    var assets = [
      'css/style.css','css/fonts.css','css/theme.css','css/homepage-collections.css',
      'css/taxonomy.css','css/home-redesign.css','css/community.css','css/holiday-rail.css',
      'css/profile-redesign.css','css/my-gidireads.css','css/economy-design-system.css',
      'css/theme-light-fixes.css','css/theme-light-fixes-studio.css','css/theme-amoled-fixes.css','js/theme.js',
      'js/app.js','js/my-gidireads.js','js/ui.js','js/supabaseClient.js','js/explore.js',
      'js/library.js','js/collection.js','js/notifications.js','js/my-stories.js',
      'js/admin.js','js/moderator.js','js/author.js','js/story.js','js/chapter-editor.js',
      'js/authors-studio.js','js/holiday-hearts.js','js/holiday-hearts-entry.js',
      'js/ae.js','js/ae-apply.js','js/ae-review.js','js/ae-author-feedback.js',
      'js/taxonomy.js','js/onboarding-tour.js','js/profile-nav.js'
    ];

    function prefetch(url) {
      try {
        if (typeof fetch === 'undefined') return;
        var req = new Request(url, { method: 'GET', mode: 'same-origin', credentials: 'same-origin' });
        fetch(req, { cache: 'force-cache' }).catch(function () { /* ignore failures */ });
      } catch (e) { /* ignore */ }
    }

    // Prefetch assets first (small, critical), then pages.
    assets.forEach(prefetch);
    pages.forEach(prefetch);
  } catch (e) { /* ignore — preloader is best-effort only */ }
})();
