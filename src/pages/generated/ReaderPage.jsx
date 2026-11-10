import React from 'react';

const HTML = `

  <header class="reader-top" id="readerTop">
    <a class="icon-btn" href="javascript:history.back()" aria-label="Go back">‹</a>
    <div class="reader-heading">
      <strong id="storyTitle">GidiReads</strong>
      <span id="sectionLabel">Reader</span>
    </div>
    <button class="icon-btn" id="menuBtn" type="button" aria-label="Open reader controls">☰</button>
  </header>

  <div class="progress-track"><i id="progressBar"></i></div>

  <main id="main">
    <section class="state loading-state" id="loadingState" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <p>Opening the manuscript…</p>
    </section>

    <section class="state error-state" id="errorState" hidden>
      <p class="eyebrow">GIDIREADS READER</p>
      <h1 id="errorTitle">We couldn't open this manuscript.</h1>
      <p id="errorText"></p>
      <div class="error-actions">
        <button class="action" id="retryBtn" type="button">Try again</button>
        <a class="action primary" href="index.html">Return to GidiReads</a>
      </div>
    </section>

    <article class="book" id="book" hidden>
      <header class="chapter-intro">
        <p class="eyebrow" id="storyKicker">GIDIREADS</p>
        <h1 id="chapterTitle"></h1>
        <div class="chapter-meta">
          <span id="authorName"></span>
          <span>·</span>
          <span id="readingTime"></span>
        </div>
      </header>

      <div class="manuscript" id="manuscript" tabindex="0"></div>

      <aside class="author-note" id="authorNote" hidden>
        <strong>AUTHOR'S NOTE</strong>
        <p id="authorNoteText"></p>
      </aside>

      <section class="reader-actions" aria-label="Chapter actions">
        <button class="reader-action" id="readerEchoBtn" type="button">
          <span class="reader-action-icon echo-mark" aria-hidden="true">✦</span>
          <span><strong>Echo</strong><small>Leave your mark on this chapter</small></span>
        </button>
        <button class="reader-action" id="bookmarkBtn" type="button">
          <span class="reader-action-icon" aria-hidden="true">♡</span>
          <span><strong id="bookmarkText">Bookmark</strong><small id="bookmarkHint">Save this chapter for later</small></span>
        </button>
        <button class="reader-action" id="shareBtn" type="button">
          <span class="reader-action-icon" aria-hidden="true">↗</span>
          <span><strong>Share chapter</strong><small>Send this chapter to someone</small></span>
        </button>
      </section>
      <p class="reader-privacy-note">For signed-in readers, GidiReads uses a country-level estimate from the hosting platform to create anonymous readership statistics. Your IP address is not stored by this feature. Authors only see grouped country totals, with groups under five readers hidden.</p>

      <footer class="chapter-end">
        <div class="rule"></div>
        <p class="eyebrow">END OF SECTION</p>
        <h2 id="endTitle">Continue reading</h2>
        <div class="chapter-actions">
          <button class="action" id="previousBtn" type="button">Previous</button>
          <button class="action primary" id="nextBtn" type="button">Next</button>
        </div>
      </footer>

      <section class="comments-section" id="commentsSection" aria-labelledby="commentsHeading">
        <div class="comments-head">
          <div>
            <p class="eyebrow">THE READING ROOM</p>
            <h2 id="commentsHeading">Comments</h2>
          </div>
          <span id="commentsCount" class="comments-count">0</span>
        </div>
        <form id="newCommentForm" class="comment-form">
          <textarea id="newCommentInput" rows="3" maxlength="2000" placeholder="Share your thoughts on this chapter…"></textarea>
          <div class="comment-form-actions"><button class="action primary" type="submit">Comment</button></div>
        </form>
        <div id="commentsList" class="comments-list" aria-live="polite"><p class="comment-empty">Loading comments…</p></div>
      </section>
    </article>
  </main>

  <div class="progress-chip" id="progressChip">0%</div>

  <div class="scrim" id="scrim" hidden></div>

  <aside class="drawer right-drawer" id="controlsDrawer" aria-hidden="true">
    <div class="drawer-head">
      <div>
        <p class="eyebrow">READING ROOM</p>
        <h2>Reader controls</h2>
      </div>
      <button class="close-btn" id="closeControls" type="button" aria-label="Close controls">×</button>
    </div>

    <section class="drawer-section">
      <p class="field-label">CHAPTER</p>
      <button class="drawer-row" id="chaptersBtn" type="button">
        <span><strong>Chapters & sections</strong><small>Browse the published manuscript</small></span>
        <span>›</span>
      </button>
    </section>

    <section class="drawer-section">
      <p class="field-label">READING FLOW</p>
      <div class="segmented">
        <button type="button" data-flow="scroll">Scroll</button>
        <button type="button" data-flow="pages">Pages</button>
      </div>
    </section>

    <section class="drawer-section">
      <p class="field-label">APPEARANCE</p>
      <div class="themes">
        <button class="theme-card" type="button" data-theme="light">
          <span class="theme-swatch paper"></span>
          <strong>Light</strong>
          <small>Warm paper</small>
        </button>
        <button class="theme-card" type="button" data-theme="beige">
          <span class="theme-swatch beige"></span>
          <strong>Beige</strong>
          <small>Soft paper</small>
        </button>
        <button class="theme-card" type="button" data-theme="sepia">
          <span class="theme-swatch sepia"></span>
          <strong>Sepia</strong>
          <small>Warm brown</small>
        </button>
        <button class="theme-card" type="button" data-theme="dark">
          <span class="theme-swatch ink"></span>
          <strong>Dark</strong>
          <small>Deep ink</small>
        </button>
        <button class="theme-card" type="button" data-theme="night">
          <span class="theme-swatch night"></span>
          <strong>Night</strong>
          <small>Blue black</small>
        </button>
        <button class="theme-card" type="button" data-theme="darkness">
          <span class="theme-swatch darkness"></span>
          <strong>Darkness</strong>
          <small>Pure black</small>
        </button>
        <button class="theme-card" type="button" data-theme="green">
          <span class="theme-swatch green"></span>
          <strong>Green</strong>
          <small>Sage paper</small>
        </button>
        <button class="theme-card" type="button" data-theme="blue">
          <span class="theme-swatch blue"></span>
          <strong>Blue</strong>
          <small>Cool paper</small>
        </button>
        <button class="theme-card" type="button" data-theme="custom">
          <span class="theme-swatch custom"></span>
          <strong>Custom</strong>
          <small>Your own</small>
        </button>
      </div>
    </section>

    <section class="drawer-section">
      <p class="field-label">CUSTOM APPEARANCE (JSON)</p>
      <textarea id="readerCustomJson" rows="4" style="width:100%;font-family:monospace;font-size:0.78rem;padding:6px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);"></textarea>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button type="button" class="action" id="applyReaderCustom">Apply</button>
        <button type="button" class="action" id="clearReaderCustom">Clear</button>
      </div>
    </section>

    <section class="drawer-section">
      <p class="field-label">TYPE</p>
      <label class="control-label">Font
        <select id="fontSelect" class="select">
          <option value="editorial">Editorial Serif</option>
          <option value="classic">Classic Serif</option>
          <option value="literary">Literary</option>
          <option value="georgia">Georgia</option>
          <option value="modern">Modern Sans</option>
        </select>
      </label>
      <label class="control-label">Size
        <input id="sizeRange" type="range" min=".9" max="1.45" step=".05" value="1.08">
      </label>
      <label class="control-label">Line spacing
        <input id="lineRange" type="range" min="1.45" max="2.25" step=".05" value="1.68">
      </label>
      <label class="control-label">Reading width
        <input id="widthRange" type="range" min="560" max="820" step="10" value="680">
      </label>
    </section>

    <section class="drawer-section">
      <p class="field-label">STORY</p>
      <button class="drawer-row" id="libraryBtn" type="button">
        <span><strong id="libraryText">Add to Library</strong><small>Save this story to your GidiReads Library</small></span>
        <span>+</span>
      </button>
      <button class="drawer-row" id="echoBtn" type="button">
        <span><strong>Leave an Echo</strong><small>Mark this chapter</small></span>
        <span>✦</span>
      </button>
      <a class="drawer-row" id="storyLink" href="#">
        <span><strong>Story page</strong><small>Synopsis, metadata and chapters</small></span>
        <span>›</span>
      </a>
    </section>

    <section class="drawer-section">
      <p class="field-label">OFFLINE</p>
      <button class="drawer-row" id="offlineBtn" type="button">
        <span><strong id="offlineText">Save for offline</strong><small>Keep it inside your GidiReads Library, not as a file</small></span>
        <span>↓</span>
      </button>
    </section>
  </aside>

  <aside class="drawer left-drawer" id="chapterDrawer" aria-hidden="true">
    <div class="drawer-head">
      <div>
        <p class="eyebrow">THIS STORY</p>
        <h2>Chapters & sections</h2>
      </div>
      <button class="close-btn" id="closeChapters" type="button" aria-label="Close chapters">×</button>
    </div>
    <nav id="chapterList"></nav>
  </aside>

  <div class="echo-modal-backdrop" id="echoModal" hidden role="dialog" aria-modal="true" aria-labelledby="echoModalTitle">
    <section class="echo-modal-panel">
      <button class="echo-modal-close" id="echoModalClose" type="button" aria-label="Close Echo panel">×</button>
      <p class="eyebrow">GIDIREADS RITUAL</p><h2 id="echoModalTitle">Leave an Echo</h2>
      <p class="echo-modal-copy">Choose where your appreciation goes and how many Echoes to send.</p>
      <div class="echo-scope-options" role="group" aria-label="Echo destination">
        <label class="echo-scope-card"><input type="radio" name="echoScope" value="chapter" checked><span><strong>This chapter</strong><small id="echoChapterLabel">Current chapter</small></span></label>
        <label class="echo-scope-card"><input type="radio" name="echoScope" value="story"><span><strong>Whole novel</strong><small>Support the story overall</small></span></label>
      </div>
      <label class="echo-amount-label" for="echoAmount">Number of Echoes</label>
      <div class="echo-amount-row"><button type="button" id="echoAmountDown" aria-label="Decrease Echo amount">−</button><input id="echoAmount" type="number" inputmode="numeric" min="1" max="100" value="1"><button type="button" id="echoAmountUp" aria-label="Increase Echo amount">+</button></div>
      <p class="echo-balance-note" id="echoBalanceNote">Your available Echo balance will be checked before sending.</p>
      <button class="action primary echo-submit" id="echoSubmit" type="button">Send Echo</button>
      <p class="echo-modal-status" id="echoModalStatus" role="status" aria-live="polite"></p>
    </section>
  </div>
  <div class="toast" id="toast" aria-live="polite"></div>

  



`;

export default function ReaderPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "reader-body";
    const _added = [];
    (async () => {
      try { await import("../../js/site-header.js"); } catch (e) { console.error('module load failed', "js/site-header.js", e); }
      try { await import("../../js/reader.js"); } catch (e) { console.error('module load failed', "js/reader.js", e); }
      try { (0,eval)("\n  if (\"serviceWorker\" in navigator && location.protocol === \"https:\") {\n    window.addEventListener(\"load\", () => navigator.serviceWorker.register(\"/sw.js\", { scope: \"/\" }).catch((error) => console.warn(\"GidiReads offline support could not start:\", error)));\n  }\n"); } catch(e){ console.error('inline script failed', e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-reader');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-reader" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
