import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<div class="ws-shell"><aside class="ws-sidebar"><a class="ws-brand" href="authors-studio.html"><span class="ws-mark">G<span>R</span></span><span>GidiReads<small>AUTHORS STUDIO</small></span></a><nav role="navigation"><a href="authors-studio.html"><span class="ws-mark">01</span><span>Studio Home</span></a><a href="my-stories.html"><span class="ws-mark">02</span><span>My Stories</span></a><a href="create-story.html"><span class="ws-mark">03</span><span>Create Story</span></a><a class="" href="story-bible.html"><span class="ws-mark">04</span><span>Story Bible</span></a><a class="active" href="author-notes.html"><span class="ws-mark">05</span><span>Author Notes</span></a><a class="" href="story-metadata.html"><span class="ws-mark">06</span><span>Story Metadata</span></a><a href="account.html"><span class="ws-mark">07</span><span>Author Profile</span></a></nav><div class="ws-sidebar-bottom"><img src="assets/author-studio-characters/cat-profile-companion.jpg" alt="Black-and-purple cat anime profile companion"><p>Small ideas can grow into entire worlds.</p><a href="index.html">← Back to GidiReads</a></div></aside><main role="main" class="ws-main" id="main-content"><header role="banner" class="ws-topbar"><a class="ws-mobile-brand" href="authors-studio.html">‹ <span>GidiReads Studio</span></a><div class="ws-top-actions"><button class="theme-toggle" id="themeToggle" type="button" aria-label="Switch to Beige theme"><span class="theme-icon" aria-hidden="true">☀</span><span class="theme-label">Beige</span></button><a href="account.html" class="ws-profile-link">Profile →</a></div></header><div class="ws-content"><div class="ws-hero"><img class="ws-hero-art" src="assets/author-studio-characters/author-notes-character.jpg" alt="Anime writer wearing headphones at a laptop by a night window" loading="eager"><span class="ws-character-glow"></span><span class="ws-float-spark" style="right:25%;top:30%"></span><span class="ws-float-spark" style="right:14%;top:53%;animation-delay:2s"></span><div class="ws-hero-copy"><p class="ws-eyebrow">THE WRITER'S QUIET CORNER</p><h1>Author Notes</h1><p>Catch the thought before it disappears. Save plot ideas, future scenes, research, reminders, and the little details that help a story become itself.</p></div></div><div class="ws-storybar"><label for="storySelect">Notes for</label><select id="storySelect"><option value="">Choose one of your stories…</option></select><span class="ws-status" id="pageStatus" aria-live="polite"></span></div><div class="ws-layout"><section class="ws-card"><div class="ws-card-head"><div><p class="ws-eyebrow">IDEAS, SAFELY KEPT</p><h2>Your notebook</h2><p class="ws-muted">Search, organise, edit, or remove your notes.</p></div><button class="ws-button" id="addNote">    New note</button></div><input class="ws-input ws-note-search" id="noteSearch" type="search" placeholder="Search your notes…" aria-label="Search notes"><div class="ws-note-toolbar" id="noteFilters"><button type="button" class="ws-tabs-filter active" data-filter="All Notes">All Notes</button><button type="button" class="ws-tabs-filter " data-filter="Plot Idea">Plot Idea</button><button type="button" class="ws-tabs-filter " data-filter="Future Scene">Future Scene</button><button type="button" class="ws-tabs-filter " data-filter="Research">Research</button><button type="button" class="ws-tabs-filter " data-filter="Reminder">Reminder</button><button type="button" class="ws-tabs-filter " data-filter="Character">Character</button><button type="button" class="ws-tabs-filter " data-filter="Worldbuilding">Worldbuilding</button><button type="button" class="ws-tabs-filter " data-filter="General">General</button></div><div class="ws-entry-list" id="noteList"><div class="ws-empty">Choose a story to open its notebook.</div></div><div class="ws-hidden" id="noteEditor"><hr style="border:0;border-top:1px solid var(--ws-line);margin:18px 0"><form id="noteForm"><div class="ws-form-grid"><div class="ws-field"><label for="noteTitle">Note title</label><input class="ws-input" id="noteTitle" maxlength="140" required placeholder="A thought worth keeping"></div><div class="ws-field"><label for="noteType">Category</label><select class="ws-select" id="noteType"><option>Plot Idea</option><option>Future Scene</option><option>Research</option><option>Reminder</option><option>Character</option><option>Worldbuilding</option><option>General</option></select></div><div class="ws-field full"><label for="noteBody">Your note</label><textarea class="ws-textarea" id="noteBody" maxlength="12000" required placeholder="Write freely. This space is for you…" style="min-height:180px"></textarea></div></div><div class="ws-save-row"><button class="ws-button" type="submit">Save note</button><button class="ws-button secondary" type="button" id="cancelNote">Cancel</button><span class="ws-status" id="noteStatus"></span></div></form></div></section><aside class="ws-card ws-companion-card"><img src="assets/author-studio-characters/writing-companion.jpg" alt="Red-haired anime writer at a desk" loading="lazy"><div class="ws-companion-copy"><p class="ws-eyebrow">A LITTLE ROOM TO THINK</p><h3>Your ideas don't need to be perfect.</h3><p class="ws-muted">Collect rough thoughts now and refine them when you're ready. Your notes are saved to your GidiReads account and stay private to your workspace.</p><div class="ws-helper" style="margin-top:14px">Private notebook: these notes are not published with your story. Avoid storing sensitive passwords or account information here.</div></div></aside></div></div></main></div>



`;

export default function AuthorNotesPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/author-notes.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/author-notes.js"); } catch (e) { console.error('script load failed', "js/author-notes.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-author-notes');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-author-notes" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
