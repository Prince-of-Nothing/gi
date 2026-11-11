import React from 'react';

const HTML = `

<div class="ws-shell"><aside class="ws-sidebar"><a class="ws-brand" href="authors-studio.html"><span class="ws-mark">G<span>R</span></span><span>GidiReads<small>AUTHORS STUDIO</small></span></a><nav role="navigation"><a href="authors-studio.html"><span class="ws-mark">01</span><span>Studio Home</span></a><a href="my-stories.html"><span class="ws-mark">02</span><span>My Stories</span></a><a href="create-story.html"><span class="ws-mark">03</span><span>Create Story</span></a><a class="active" href="story-bible.html"><span class="ws-mark">04</span><span>Story Bible</span></a><a class="" href="author-notes.html"><span class="ws-mark">05</span><span>Author Notes</span></a><a class="" href="story-metadata.html"><span class="ws-mark">06</span><span>Story Metadata</span></a><a href="account.html"><span class="ws-mark">07</span><span>Author Profile</span></a></nav><div class="ws-sidebar-bottom"><img src="assets/author-studio-characters/ice-profile-companion.jpg" alt="Ice-themed anime profile companion"><p>Small ideas can grow into entire worlds.</p><a href="index.html">← Back to GidiReads</a></div></aside><main role="main" class="ws-main" id="main-content"><header role="banner" class="ws-topbar"><a class="ws-mobile-brand" href="authors-studio.html">‹ <span>GidiReads Studio</span></a><div class="ws-top-actions"><button class="theme-toggle" id="themeToggle" type="button" aria-label="Switch to Beige theme"><span class="theme-icon" aria-hidden="true"> ☀  </span><span class="theme-label">Beige</span></button><a href="account.html" class="ws-profile-link">Profile →</a></div></header><div class="ws-content"><div class="ws-hero"><img class="ws-hero-art" src="assets/author-studio-characters/story-bible-character.jpg" alt="White-haired fantasy anime character surrounded by glowing magic" loading="eager"><span class="ws-character-glow"></span><span class="ws-float-spark" style="right:28%;top:25%"></span><span class="ws-float-spark" style="right:17%;top:60%;animation-delay:1.8s"></span><div class="ws-hero-copy"><p class="ws-eyebrow">YOUR STORY'S INNER WORLD</p><h1>Story Bible</h1><p>Build a world your story can live in. Keep characters, places, lore, and the details you never want to lose in one quiet, magical workspace.</p></div></div><div class="ws-storybar"><label for="storySelect">Working on</label><select id="storySelect"><option value="">Choose one of your stories…</option></select><span class="ws-status" id="pageStatus" aria-live="polite"></span></div><div class="ws-layout"><section class="ws-card"><div class="ws-card-head"><div><p class="ws-eyebrow">THE ARCHIVE</p><h2 id="categoryTitle">Characters</h2><p class="ws-muted">Your private reference notes for this story.</p></div><button class="ws-button" id="addEntry">    Add entry</button></div><div class="ws-tabs" id="categoryTabs" role="tablist"><button type="button" role="tab" data-category="Characters" class="active">Characters</button><button type="button" role="tab" data-category="Locations" class="">Locations</button><button type="button" role="tab" data-category="Worldbuilding" class="">Worldbuilding</button><button type="button" role="tab" data-category="Magic Systems" class="">Magic Systems</button><button type="button" role="tab" data-category="Timelines" class="">Timelines</button><button type="button" role="tab" data-category="Relationships" class="">Relationships</button></div><div id="entryList" class="ws-entry-list"><div class="ws-empty">Choose a story to begin building its world.</div></div><div class="ws-hidden" id="entryEditor"><hr style="border:0;border-top:1px solid var(--ws-line);margin:18px 0"><form id="entryForm"><div class="ws-form-grid"><div class="ws-field full"><label for="entryTitle">Name or heading</label><input class="ws-input" id="entryTitle" maxlength="120" required placeholder="e.g. Elara Veyne"></div><div class="ws-field full"><label for="entryDetails">Details</label><textarea class="ws-textarea" id="entryDetails" maxlength="8000" required placeholder="Appearance, history, rules, motivations, details to remember…"></textarea></div></div><div class="ws-save-row"><button class="ws-button" type="submit">Save entry</button><button class="ws-button secondary" id="cancelEntry" type="button">Cancel</button><span class="ws-status" id="entryStatus"></span></div></form></div></section><aside class="ws-card ws-companion-card"><img src="assets/author-studio-characters/story-bible-character.jpg" alt="Story Bible fantasy companion" loading="lazy"><div class="ws-companion-copy"><p class="ws-eyebrow">YOUR WORLDKEEPER</p><h3>Every detail belongs somewhere.</h3><p class="ws-muted">Keep your canon close as your story grows. Your Story Bible is saved to your GidiReads account, so you can continue working across devices.</p><div class="ws-helper" style="margin-top:14px">Tip: use one entry per character, location, spell, historical event, or relationship. You can edit or delete entries at any time.</div></div></aside></div></div></main></div>



`;

export default function StoryBiblePage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      // skipped legacy site-header.js
      try { await import("../../js/story-bible.js"); } catch (e) { console.error('module load failed', "js/story-bible.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-story-bible');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-story-bible" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
