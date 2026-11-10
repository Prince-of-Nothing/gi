import React from 'react';

const HTML = `

<div class="studio-shell">
<aside class="studio-sidebar" id="studioSidebar" aria-label="Authors Studio navigation"><div class="studio-brand-block"><a class="studio-brand" href="index.html"><span class="brand-monogram" aria-hidden="true"><span>G</span><span>R</span></span><span class="brand-word">GidiReads</span></a><div class="studio-label">AUTHORS STUDIO</div><button class="sidebar-close" id="sidebarClose">×</button></div><nav class="studio-nav">
<a class="studio-nav-item" href="authors-studio.html"><span class="nav-mark">01</span><span>Home</span></a>
<a class="studio-nav-item active" href="my-stories.html"><span class="nav-mark">02</span><span>My Stories</span></a>
<a class="studio-nav-item" href="create-story.html"><span class="nav-mark">03</span><span>Create Story</span></a>
<a class="studio-nav-item" href="story-bible.html"><span class="nav-mark">04</span><span>Story Bible</span></a>
<a class="studio-nav-item" href="author-notes.html"><span class="nav-mark">05</span><span>Author Notes</span></a>
<a class="studio-nav-item" href="story-metadata.html"><span class="nav-mark">06</span><span>Story Metadata</span></a>
<a class="studio-nav-item" href="contract-center.html"><span class="nav-mark">07</span><span>Contract Centre</span></a>
<a class="studio-nav-item" href="creator-earnings.html"><span class="nav-mark">08</span><span>Creator Earnings</span></a>
<a class="studio-nav-item" href="analytics.html"><span class="nav-mark">09</span><span>Analytics Centre</span></a>
<div class="nav-divider"></div>
<a class="studio-nav-item" href="opportunities.html"><span class="nav-mark">10</span><span>Opportunities</span></a>

<a class="studio-nav-item" href="ae-apply.html"><span class="nav-mark">12</span><span>Apply to be an AE</span></a>
<a class="studio-nav-item" href="ae-author-feedback.html"><span class="nav-mark">13</span><span>Editorial Feedback</span></a>
<a class="studio-nav-item" id="aeWorkspaceLink" href="ae.html" hidden><span class="nav-mark">14</span><span>AE Workspace</span></a>
<a class="studio-nav-item" href="notifications.html"><span class="nav-mark">15</span><span>Notifications</span></a>
<a class="studio-nav-item" href="account.html"><span class="nav-mark">16</span><span>Author Profile</span></a>
</nav><div class="sidebar-bottom"><div class="sidebar-note"><span class="note-line"></span><p>Make room for the story.</p></div><a class="back-to-gidi" href="index.html">← Back to GidiReads</a></div></aside>
<div class="sidebar-backdrop" id="sidebarBackdrop"></div>
<main class="studio-main"><header class="studio-topbar"><button class="menu-button" id="menuButton">☰</button><div class="topbar-context"><span>GidiReads</span><i>/</i><strong>Authors Studio</strong><i>/</i><strong>Story Workspace</strong></div><div class="topbar-actions"><a href="notifications.html" class="top-icon" aria-label="Notifications"><span></span></a><button class="theme-toggle" id="themeToggle" type="button" aria-pressed="false"><span class="theme-icon">☾</span><span class="theme-label">Dark</span></button><a href="account.html" class="profile-link">Profile</a></div></header>
<div class="studio-content workspace-page"><a class="workspace-back" href="my-stories.html">← All My Stories</a><section class="workspace-hero" id="workspaceHero"><div class="workspace-cover" id="workspaceCover"></div><div class="workspace-title"><p class="eyebrow">STORY WORKSPACE</p><h1 id="storyTitle">Loading story…</h1><p id="storyDescription" class="workspace-description"></p><div class="workspace-meta" id="storyMeta"></div><div class="workspace-actions"><button class="button button-dark" id="continueButton">Continue writing <span>→</span></button><button class="button button-quiet" id="editStoryButton">Edit story</button></div></div></section>
<section class="workspace-main"><div class="workspace-main-heading"><div><p class="eyebrow">THE MANUSCRIPT</p><h2>Chapters & sections</h2><p>Everything that belongs to this story, in reading order. Start with a chapter, prologue, interlude or another section whenever the story calls for it.</p></div><div class="workspace-main-actions"><button class="button button-quiet" id="bulkImportToggle" type="button">Import chapters</button><button class="button button-dark" id="newChapterButton">New section <span>+</span></button></div></div><section class="bulk-import-panel" id="bulkChapterImport" hidden aria-labelledby="bulkImportHeading"><div class="bulk-import-heading"><div><p class="eyebrow">BULK CHAPTER IMPORT</p><h3 id="bulkImportHeading">Bring in your manuscript</h3><p id="bulkImportStoryName">Import chapters into this story as drafts. Nothing is published automatically.</p></div><button type="button" class="bulk-import-close" id="bulkImportClear" aria-label="Clear import">Clear</button></div><section class="google-docs-import" aria-labelledby="googleDocsHeading"><div class="google-docs-import-head"><div><p class="eyebrow">GOOGLE DOCS</p><h4 id="googleDocsHeading">Import a Google Doc</h4><p>Choose a Google Doc from your Drive, select the tab or tabs you want, then preview them before saving.</p></div><span class="google-docs-mark" aria-hidden="true">G</span></div><div class="google-docs-controls"><label for="googleDocUrl">Optional tab-specific Google Docs link</label><div><input id="googleDocUrl" type="url" placeholder="Paste a tab link (optional)"><button class="button button-quiet" id="loadGoogleDocTabs" type="button">Choose from Google Drive</button></div></div><div id="googleDocsTabPicker" class="google-docs-tab-picker" hidden><div class="google-docs-tab-picker-head"><strong id="googleDocsTabCount">Document tabs</strong><button type="button" id="googleDocsSelectAll">Select all</button></div><div id="googleDocsTabList"></div><button type="button" class="button button-dark" id="prepareGoogleDocTabs" disabled>Preview selected tabs</button></div><p class="google-docs-note">GidiReads can access only the document you choose in Google Picker. If you paste a tab-specific link, choose that same document and only the linked tab will load. Your original document is never changed.</p></section>
<div class="bulk-import-methods"><label class="bulk-import-upload"><span>Choose files</span><small>PDF, Word (.docx), text (.txt) or Markdown (.md). Up to 10 MB per file. Text-based PDFs only; scanned PDFs need OCR first.</small><input type="file" id="bulkImportFile" accept=".pdf,application/pdf,.docx,.txt,.md,.markdown" multiple></label><div class="bulk-import-paste"><label for="bulkImportPaste">Or paste several chapters</label><textarea id="bulkImportPaste" rows="6" placeholder="Chapter 1&#10;Your chapter text…&#10;&#10;Chapter 2&#10;The next chapter…"></textarea><button type="button" class="button button-quiet" id="bulkImportPasteButton">Prepare pasted chapters</button></div></div><p class="bulk-import-help">Use headings such as “Chapter 1”, “Chapter Two”, “Prologue” or “Epilogue”. You can also separate chapters with a line of three dashes (---). Google Docs users can import named tabs above, or use a Word export when tab import is not configured.</p><div class="bulk-import-message" id="bulkImportMessage" role="status" hidden></div><div class="bulk-import-summary" id="bulkImportSummary"></div><div class="bulk-import-preview" id="bulkImportPreview"><p class="bulk-import-empty">Your chapters will appear here before anything is saved.</p></div><div class="bulk-import-footer"><span>Selected chapters are saved as drafts. Existing chapters are never replaced.</span><button type="button" class="button button-dark" id="bulkImportSave" disabled>Save chapters as drafts</button></div><div class="bulk-import-report" id="bulkImportReport" hidden aria-live="polite"></div></section><div class="chapter-list-editorial" id="chapterList"><div class="workspace-loading">Opening your manuscript…</div></div></section>
<section class="workspace-doors"><div><p class="eyebrow">THE WORKROOM</p><h2>More of the story</h2></div><div class="door-grid"><a class="workspace-door-link" id="storyBibleDoor" href="story-bible.html"><span>01</span><strong>Story Bible</strong><small>Characters, places, world, timeline and plot.</small></a><a class="workspace-door-link" id="authorNotesDoor" href="author-notes.html"><span>02</span><strong>Author Notes</strong><small>Ideas, research, scenes and working thoughts.</small></a><a class="workspace-door-link" id="storyMetadataDoor" href="story-metadata.html"><span>03</span><strong>Story Metadata</strong><small>Genres, tropes, tags and discovery details.</small></a><a class="workspace-door-link" href="story-publishing.html" id="publishingDoor"><span>04</span><strong>Publishing</strong><small>Publication order, drafts and release controls.</small>→</a><a class="workspace-door-link" href="chapter-pricing.html?story=" id="chapterPricingDoor" hidden><span>05</span><strong>Chapter Pricing</strong><small>Choose how this contracted story is priced.</small>→</a><a class="workspace-door-link" href="analytics.html"><span>06</span><strong>Insights</strong><small>Reads, engagement and growth once data exists.</small>→</a><a class="workspace-door-link" href="creator-earnings.html"><span>07</span><strong>Earnings</strong><small>Revenue information when monetization is available.</small>→</a></div></section>
<section class="studio-bridge"><p class="eyebrow">GIDIREADS STUDIO</p><h2>Take the story beyond the page.</h2><p>When adaptation tools are available, your written work can open another creative door.</p><button data-coming="GidiReads Studio">Explore Studio <span>→</span></button></section>
</div></main></div>



`;

export default function StoryWorkspacePage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/story-workspace.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/story-workspace.js"); } catch (e) { console.error('script load failed', "js/story-workspace.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/bulk-chapter-import.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/bulk-chapter-import.js"); } catch (e) { console.error('script load failed', "js/bulk-chapter-import.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-story-workspace');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-story-workspace" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
