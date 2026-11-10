import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<div class="studio-shell">
<aside class="studio-sidebar" id="studioSidebar" aria-label="Authors Studio navigation">
 <div class="studio-brand-block"><a class="studio-brand" href="index.html"><span class="brand-monogram" aria-hidden="true"><span>G</span><span>R</span></span><span class="brand-word">GidiReads</span></a><div class="studio-label">AUTHORS STUDIO</div><button class="sidebar-close" id="sidebarClose" type="button">×</button></div>
 <nav class="studio-nav" role="navigation">
  <a class="studio-nav-item" href="authors-studio.html"><span class="nav-mark">01</span><span>Home</span></a>
  <a class="studio-nav-item active" href="my-stories.html"><span class="nav-mark">02</span><span>My Stories</span></a>
  <a class="studio-nav-item" href="my-stories.html"><span class="nav-mark">03</span><span>Create Story</span></a>
  <button class="studio-nav-item" data-coming="Contract Center" type="button"><span class="nav-mark">04</span><span>Contract Center</span></button>
  <button class="studio-nav-item" data-coming="Earnings" type="button"><span class="nav-mark">05</span><span>Earnings</span></button>
  <button class="studio-nav-item" data-coming="Insights" type="button"><span class="nav-mark">06</span><span>Insights</span></button>
  <div class="nav-divider"></div>
  <a class="studio-nav-item" href="opportunities.html"><span class="nav-mark">07</span><span>Opportunities</span></a>
  <button class="studio-nav-item" data-coming="Resources" type="button"><span class="nav-mark">08</span><span>Resources</span></button>
  <a class="studio-nav-item" href="notifications.html"><span class="nav-mark">09</span><span>Notifications</span></a>
  <a class="studio-nav-item" href="account.html"><span class="nav-mark">10</span><span>Author Profile</span></a>
 </nav>
 <div class="sidebar-bottom"><div class="sidebar-note"><span class="note-line"></span><p>Make room for the story.</p></div><a class="back-to-gidi" href="index.html">    Back to GidiReads</a></div>
</aside>
<div class="sidebar-backdrop" id="sidebarBackdrop"></div>
<main role="main" class="studio-main" id="main-content">
<header role="banner" class="studio-topbar">
 <button class="menu-button" id="menuButton" type="button" aria-label="Open Authors Studio menu"></button>
 <div class="topbar-context"><span>GidiReads</span><i>/</i><strong>Authors Studio</strong><i>/</i><strong>Chapter Editor</strong></div>
 <div class="topbar-actions"><a href="notifications.html" class="top-icon" aria-label="Notifications"><span></span></a><button class="theme-toggle" id="themeToggle" type="button"><span class="theme-icon" aria-hidden="true"></span><span class="theme-label">Beige</span></button><a href="account.html" class="profile-link">Profile</a></div>
</header>

<div class="editor-page">
 <div class="editor-backbar"><a id="workspaceLink" href="my-stories.html">    Story Workspace</a><span id="saveState" aria-live="polite">New draft</span></div>

 <section class="editor-heading">
  <div>
   <p class="eyebrow" id="editorKicker">NEW MANUSCRIPT SECTION</p>
   <h1 id="pageTitle">Chapter Editor</h1>
   <p id="storyContext" class="story-context">Opening your story…</p>
  </div>
  <div class="editor-top-actions">
   <button class="button button-quiet" id="previewButton" type="button">Preview <span>↗</span></button>
   <button class="button button-dark" id="saveDraftTop" type="button">Save draft</button>
  </div>
 </section>

 <div class="editor-layout">
  <section class="manuscript-panel" aria-label="Chapter manuscript">
   <div class="manuscript-header">
    <div class="type-row">
     <label><span>SECTION TYPE</span><select id="contentType"><option value="chapter">Chapter</option><option value="prologue">Prologue</option><option value="epilogue">Epilogue</option><option value="interlude">Interlude</option><option value="preface">Preface</option><option value="introduction">Introduction</option><option value="bonus">Bonus</option><option value="other">Other</option></select></label>
     <label id="chapterNumberField"><span>CHAPTER NUMBER</span><input id="chapterNumber" type="number" min="1" step="1" inputmode="numeric" placeholder="1"/></label>
    </div>
    <label class="title-field"><span>TITLE</span><input id="chapterTitle" type="text" maxlength="160" placeholder="Give this section a title" autocomplete="off"/></label>
   </div>

   <div class="toolbar" role="toolbar" aria-label="Formatting tools">
    <button type="button" data-command="bold" title="Bold"><strong>B</strong></button>
    <button type="button" data-command="italic" title="Italic"><em>I</em></button>
    <button type="button" data-command="underline" title="Underline"><u>U</u></button>
    <span class="toolbar-divider"></span>
    <label class="font-control"><span>FONT</span><select id="fontFamily"><option value="Fraunces">Editorial</option><option value="DM Serif Display">Classic Serif</option><option value="Cormorant Garamond">Literary</option><option value="Inter">Modern Sans</option></select></label>
    <label class="size-control"><span>SIZE</span><select id="fontSize"><option value="3">16</option><option value="4" selected>18</option><option value="5">20</option><option value="6">22</option></select></label>
    <span class="toolbar-divider"></span>
    <button type="button" data-command="justifyLeft" title="Align left">L</button>
    <button type="button" data-command="justifyCenter" title="Center">C</button>
    <button type="button" data-command="justifyRight" title="Align right">R</button>
    <button type="button" data-command="removeFormat" title="Clear formatting">Clear</button>
   </div>

   <div id="editor" class="rich-editor" contenteditable="true" spellcheck="true" data-placeholder="Begin writing here…"></div>
   <div class="manuscript-footer"><span id="wordCount">0 words</span><span id="characterCount">0 characters</span><span id="readingTime">0 min read</span></div>

   <section class="author-note-panel" aria-labelledby="authorNoteHeading">
    <div class="author-note-heading">
     <div>
      <p class="eyebrow">AUTHOR'S NOTE</p>
      <h2 id="authorNoteHeading">A note for your readers</h2>
     </div>
     <span class="author-note-optional">OPTIONAL</span>
    </div>
    <p class="author-note-copy">Add a short message that readers will see after this chapter. Keep the chapter itself in the manuscript above.</p>
    <textarea id="authorNote" rows="5" maxlength="2000" placeholder="Write a note for your readers…" aria-label="Author's note"></textarea>
    <div class="author-note-footer"><span>Shown at the end of the chapter</span><span id="authorNoteCount">0 / 2000</span></div>
   </section>
  </section>

  <aside class="editor-sidebar" aria-label="Chapter tools">
   <div class="sidebar-section">
    <p class="eyebrow">MANUSCRIPT</p>
    <h2 id="sideSectionTitle">New section</h2>
    <p class="side-copy">Your work is saved as a draft until you choose to publish it.</p>
   </div>
   <div class="sidebar-rule"></div>
   <div class="sidebar-section">
    <p class="eyebrow">TYPE</p><p id="typeSummary">Chapter · Numbered</p>
   </div>
   <div class="sidebar-section">
    <p class="eyebrow">WORD COUNT</p><p class="side-stat" id="sideWordCount">0</p>
   </div>
   <div class="sidebar-section">
    <p class="eyebrow">EDITOR FONT</p><p id="fontSummary">Fraunces · 18 px</p>
   </div>
   <div class="sidebar-note-box"><strong>Draft first.</strong><p>Save your manuscript while you work. Publishing controls belong to the story's Publishing room.</p></div>
   <button class="button button-dark full" id="saveDraftSide" type="button">Save draft</button>
   <button class="button button-quiet full" id="saveReturnButton" type="button">Save & return</button>
  </aside>
 </div>
</div>


</main></div>

<div class="preview-overlay" id="previewOverlay" hidden>
 <div class="preview-shell" role="dialog" aria-modal="true" aria-labelledby="previewTitle">
  <header class="preview-header"><div><p class="eyebrow">READER PREVIEW</p><h2 id="previewTitle">Untitled</h2></div><button id="closePreview" class="preview-close" type="button" aria-label="Close preview">×</button></header>
  <div class="preview-meta" id="previewMeta"></div>
  <article id="previewContent" class="preview-content"></article>
 </div>
</div>





`;

export default function ChapterEditorPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      // skipped legacy site-header.js
      try { await import("../../js/chapter-editor.js"); } catch (e) { console.error('module load failed', "js/chapter-editor.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-chapter-editor');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-chapter-editor" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
