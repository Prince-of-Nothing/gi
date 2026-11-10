import React from 'react';

const HTML = `

<header>
  <h1>Page Inspector</h1>
  <div class="sub">Select pages to inspect, or choose all. Nothing loads until you ask for it.</div>
  <div class="toolbar">
    <input type="search" id="search" placeholder="Filter pages…" aria-label="Filter pages" />
    <button class="secondary" id="selectAllBtn" type="button">Select all</button>
    <button class="secondary" id="selectNoneBtn" type="button">Select none</button>
    <button class="secondary" id="selectFilteredBtn" type="button">Select filtered</button>
    <button id="loadGridBtn" type="button">Load selected in grid</button>
    <button class="secondary" id="openTabsBtn" type="button">Open selected in tabs</button>
    <button class="secondary" id="clearGridBtn" type="button">Clear grid</button>
  </div>
  <div class="toolbar" style="margin-top:8px">
    <span class="meta">Viewport:</span>
    <select id="viewportPreset" aria-label="Viewport preset">
      <option value="responsive">Responsive (grid)</option>
      <option value="360x800">360 × 800 (small phone)</option>
      <option value="390x844">390 × 844 (phone)</option>
      <option value="768x1024">768 × 1024 (tablet)</option>
      <option value="1024x768">1024 × 768 (laptop)</option>
      <option value="1280x800">1280 × 800 (desktop)</option>
      <option value="1440x900">1440 × 900 (wide)</option>
      <option value="custom">Custom</option>
    </select>
    <label class="meta">W <input type="number" id="viewportWidth" min="240" max="2400" step="10" value="360" style="width:90px;background:var(--panel);color:var(--text);border:1px solid var(--border);padding:6px 8px;border-radius:8px" /></label>
    <label class="meta">H <input type="number" id="viewportHeight" min="240" max="2400" step="10" value="800" style="width:90px;background:var(--panel);color:var(--text);border:1px solid var(--border);padding:6px 8px;border-radius:8px" /></label>
    <button class="secondary" id="applyViewportBtn" type="button">Apply size</button>
  </div>
</header>
<div id="status">Ready.</div>
<main>
  <section class="panel">
    <div class="panel-head">
      <h2>Pages</h2>
      <div class="meta"><span id="selectedCount">0</span> selected · <span id="visibleCount">0</span> shown · <span id="totalCount">0</span> total</div>
    </div>
    <ul id="pageList"></ul>
  </section>

  <section class="panel">
    <div class="panel-head">
      <h2>Checklist</h2>
      <div class="meta"><span id="checklistVerified">0</span> verified · <span id="checklistTotal">0</span> total</div>
    </div>
    <div id="checklistList"></div>
  </section>

  <section class="panel" id="previewPanel" hidden>
    <div class="panel-head"><h2>Single preview</h2><button class="secondary" id="closePreviewBtn" type="button">Close</button></div>
    <div id="previewMount"></div>
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Iframe grid</h2><div class="meta" id="gridMeta">No pages loaded.</div></div>
    <div id="iframeGrid"><div class="empty">Select pages above and click "Load selected in grid".</div></div>
  </section>
</main>



`;

export default function TestPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/i18n.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/i18n.js"); } catch (e) { console.error('script load failed', "js/i18n.js", e); } }
      try { await import(/* @vite-ignore */ "test.js"); } catch (_) { try { await import(/* @vite-ignore */ "test.js"); } catch (e) { console.error('script load failed', "test.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-test');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-test" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
