// Page inspector helper for /test.html
// Lets you select specific pages (or all) to inspect without auto-loading everything.

const PAGES = [
  "account.html","admin-economy.html","admin.html","ae-apply.html",
  "ae-author-feedback.html","ae-draft-review.html","ae-review.html","ae.html",
  "analytics.html","auth.html","author-notes.html","author.html","authors-studio.html",
  "chapter-editor.html","chapter-pricing.html","collection.html","community-space.html",
  "community.html","contract-center.html","create-story.html",
  "creator-earnings.html","explore.html","holiday-hearts-entry.html",
  "holiday-hearts.html","index.html","library.html","moderator.html",
  "my-gidireads.html","my-stories.html","notifications.html","opportunities.html",
  "opportunity.html","people.html","rankings.html",
  "reader.html","reading-list.html","reset-password.html",
  "settings.html","store.html","story-bible.html","story-metadata.html",
  "story-publishing.html","story-workspace.html","story.html","terms.html","welcome.html"
];

const SKIP = new Set(["test.html"]);
const selected = new Set();
let currentFilter = "";

// Checklist storage key
const CHECKLIST_STORAGE_KEY = "gidireads-test-checklist";

// Common verification checks
const CHECKLIST_ITEMS = [
  { id: "header", name: "Header loads correctly", desc: "site-nav / studio-topbar / reader-top etc present" },
  { id: "footer", name: "Footer present", desc: "site-footer with links to Terms etc" },
  { id: "nav", name: "Navigation links work", desc: "Home/Explore/Rankings/Library/Gathering links present" },
  { id: "theme", name: "Theme switching works", desc: "Theme toggle / theme icons render" },
  { id: "unread", name: "Unread badge shows", desc: "navUnreadBadge / homeDesktopUnreadBadge element exists" },
  { id: "i18n", name: "Language switcher works", desc: "gr-lang-switcher present, FR/RU translations apply" },
  { id: "auth", name: "Auth modal works", desc: "Login/Register modal opens on click" },
  { id: "mobile", name: "Mobile responsive", desc: "Bottom nav visible, stacks on narrow viewport" },
  { id: "js-errors", name: "No console errors", desc: "Open DevTools → Console: no red errors" },
  { id: "assets", name: "All assets load", desc: "Network tab: no 404s for CSS/JS/images" },
];

function allPages() {
  return PAGES.filter(p => !SKIP.has(p));
}

function filteredPages() {
  const q = currentFilter.trim().toLowerCase();
  const pages = allPages();
  return q ? pages.filter(p => p.toLowerCase().includes(q)) : pages;
}

function $(id) { return document.getElementById(id); }

function setStatus(msg) {
  const el = $("status");
  if (el) el.textContent = msg;
}

function updateCounts() {
  const sc = $("selectedCount");
  const vc = $("visibleCount");
  const tc = $("totalCount");
  if (sc) sc.textContent = String(selected.size);
  if (vc) vc.textContent = String(filteredPages().length);
  if (tc) tc.textContent = String(allPages().length);
}

function renderList() {
  const ul = $("pageList");
  if (!ul) return;
  ul.innerHTML = "";
  const pages = filteredPages();
  if (!pages.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No pages match this filter.";
    ul.appendChild(li);
    updateCounts();
    return;
  }
  for (const page of pages) {
    const li = document.createElement("li");
    li.className = "page-item";

    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = selected.has(page);
    cb.addEventListener("change", () => {
      if (cb.checked) selected.add(page); else selected.delete(page);
      updateCounts();
    });
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = page;
    label.appendChild(cb);
    label.appendChild(name);

    const actions = document.createElement("div");
    actions.className = "actions";
    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "secondary";
    openBtn.textContent = "Open";
    openBtn.title = "Open in new tab";
    openBtn.addEventListener("click", () => window.open(page, "_blank", "noopener"));
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "secondary";
    prevBtn.textContent = "Preview";
    prevBtn.addEventListener("click", () => showPreview(page));
    actions.appendChild(openBtn);
    actions.appendChild(prevBtn);

    li.appendChild(label);
    li.appendChild(actions);
    ul.appendChild(li);
  }
  updateCounts();
}

function selectAll() {
  for (const p of allPages()) selected.add(p);
  renderList();
  setStatus(`Selected all ${selected.size} pages.`);
}

function selectNone() {
  selected.clear();
  renderList();
  setStatus("Selection cleared.");
}

function selectFiltered() {
  const pages = filteredPages();
  for (const p of pages) selected.add(p);
  renderList();
  setStatus(`Added ${pages.length} filtered page(s) to selection (${selected.size} total).`);
}

function setStatus(msg) {
  const el = $("status");
  if (el) el.textContent = msg;
}

// --- Checklist persistence ---
function loadChecklist() {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {};
}

function saveChecklist(data) {
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
}

// --- Checklist rendering ---
function renderChecklist() {
  const container = $("checklistList");
  const verifiedEl = $("checklistVerified");
  const totalEl = $("checklistTotal");
  if (!container) return;

  const state = loadChecklist();
  let verifiedCount = 0;

  container.innerHTML = "";
  for (const item of CHECKLIST_ITEMS) {
    const isVerified = !!state[item.id];
    if (isVerified) verifiedCount++;

    const div = document.createElement("div");
    div.className = "checklist-item" + (isVerified ? " verified" : "");
    div.dataset.id = item.id;

    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = isVerified;
    cb.addEventListener("change", () => {
      const newState = loadChecklist();
      newState[item.id] = cb.checked;
      saveChecklist(newState);
      div.classList.toggle("verified", cb.checked);
      if (verifiedEl) verifiedEl.textContent = String(Object.values(loadChecklist()).filter(Boolean).length);
      setStatus(cb.checked ? `✓ Verified: ${item.name}` : `Unverified: ${item.name}`);
    });

    const name = document.createElement("span");
    name.className = "checklist-name";
    name.textContent = item.name;

    const desc = document.createElement("span");
    desc.className = "checklist-desc";
    desc.textContent = item.desc;

    label.appendChild(cb);
    label.appendChild(name);
    label.appendChild(desc);

    const actions = document.createElement("div");
    actions.className = "actions";
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "secondary";
    removeBtn.textContent = "Remove";
    removeBtn.title = "Remove from checklist (cannot be restored without clearing localStorage)";
    removeBtn.addEventListener("click", () => {
      if (!confirm(`Remove "${item.name}" from checklist? This cannot be undone.`)) return;
      const newState = loadChecklist();
      delete newState[item.id];
      saveChecklist(newState);
      div.remove();
      if (totalEl) totalEl.textContent = String(CHECKLIST_ITEMS.length - Object.keys(newState).length);
      setStatus(`Removed: ${item.name}`);
    });
    actions.appendChild(removeBtn);

    div.appendChild(label);
    div.appendChild(desc);
    div.appendChild(actions);
    container.appendChild(div);
  }
  if (verifiedEl) verifiedEl.textContent = String(verifiedCount);
  if (totalEl) totalEl.textContent = String(CHECKLIST_ITEMS.length);
}

function parseViewport() {
  const preset = $("viewportPreset");
  const w = Number(($("viewportWidth") && $("viewportWidth").value) || 0);
  const h = Number(($("viewportHeight") && $("viewportHeight").value) || 0);
  const mode = preset ? preset.value : "responsive";
  if (mode === "responsive") return { mode: "responsive" };
  if (mode === "custom") return { mode: "fixed", w: Math.max(240, w || 360), h: Math.max(240, h || 800) };
  const m = mode.match(/^(\d+)x(\d+)$/);
  if (m) return { mode: "fixed", w: Number(m[1]), h: Number(m[2]) };
  return { mode: "responsive" };
}

function syncViewportInputsFromPreset() {
  const preset = $("viewportPreset");
  const wIn = $("viewportWidth");
  const hIn = $("viewportHeight");
  if (!preset) return;
  const v = preset.value;
  if (v === "responsive") {
    if (wIn) wIn.disabled = true;
    if (hIn) hIn.disabled = true;
    return;
  }
  if (wIn) wIn.disabled = false;
  if (hIn) hIn.disabled = false;
  if (v !== "custom") {
    const m = v.match(/^(\d+)x(\d+)$/);
    if (m) {
      if (wIn) wIn.value = m[1];
      if (hIn) hIn.value = m[2];
    }
  }
}

function applyViewportToIframes() {
  const vp = parseViewport();
  const grid = $("iframeGrid");
  const mount = $("previewMount");
  const apply = (iframe, isPreview) => {
    if (!iframe) return;
    if (vp.mode === "responsive") {
      iframe.style.width = "100%";
      iframe.style.height = isPreview ? "65vh" : "300px";
    } else {
      iframe.style.width = vp.w + "px";
      iframe.style.height = vp.h + "px";
    }
  };
  if (grid) grid.querySelectorAll("iframe").forEach(f => apply(f, false));
  if (mount) mount.querySelectorAll("iframe").forEach(f => apply(f, true));
  if (vp.mode === "responsive") setStatus("Viewport set to responsive.");
  else setStatus(`Viewport set to ${vp.w} × ${vp.h}. Applied to loaded preview/grid iframes.`);
}

function showPreview(page) {
  const panel = $("previewPanel");
  const mount = $("previewMount");
  if (!panel || !mount) return;
  mount.innerHTML = "";
  const iframe = document.createElement("iframe");
  iframe.src = page;
  iframe.title = page;
  mount.appendChild(iframe);
  panel.hidden = false;
  applyViewportToIframes();
  setStatus(`Previewing ${page}.`);
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closePreview() {
  const panel = $("previewPanel");
  const mount = $("previewMount");
  if (mount) mount.innerHTML = "";
  if (panel) panel.hidden = true;
}

function loadGrid() {
  const grid = $("iframeGrid");
  const meta = $("gridMeta");
  if (!grid) return;
  const pages = Array.from(selected);
  grid.innerHTML = "";
  if (!pages.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No pages selected. Choose pages above, then load the grid.";
    grid.appendChild(empty);
    if (meta) meta.textContent = "No pages loaded.";
    setStatus("Select at least one page to load the grid.");
    return;
  }
  for (const page of pages) {
    const card = document.createElement("div");
    card.className = "iframe-card";
    const title = document.createElement("div");
    title.className = "iframe-title";
    const link = document.createElement("a");
    link.href = page;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = page;
    title.appendChild(link);
    const iframe = document.createElement("iframe");
    iframe.src = page;
    iframe.loading = "lazy";
    iframe.title = page;
    card.appendChild(title);
    card.appendChild(iframe);
    grid.appendChild(card);
  }
  if (meta) meta.textContent = `${pages.length} page(s) loaded.`;
  applyViewportToIframes();
  setStatus(`Loaded ${pages.length} page(s) in the iframe grid.`);
}

function clearGrid() {
  const grid = $("iframeGrid");
  const meta = $("gridMeta");
  if (grid) {
    grid.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Grid cleared. Select pages and load again when needed.";
    grid.appendChild(empty);
  }
  if (meta) meta.textContent = "No pages loaded.";
  setStatus("Iframe grid cleared.");
}

function openSelectedTabs() {
  const pages = Array.from(selected);
  if (!pages.length) {
    setStatus("Select at least one page to open in tabs.");
    return;
  }
  let opened = 0;
  for (const page of pages) {
    const w = window.open(page, "_blank", "noopener");
    if (w) opened++;
  }
  setStatus(`Opened ${opened}/${pages.length} page(s) in new tabs. (Your browser may block popups/tabs if many are opened at once.)`);
}

function setStatus(msg) {
  const el = $("status");
  if (el) el.textContent = msg;
}

function updateCounts() {
  const sc = $("selectedCount");
  const vc = $("visibleCount");
  const tc = $("totalCount");
  if (sc) sc.textContent = String(selected.size);
  if (vc) vc.textContent = String(filteredPages().length);
  if (tc) tc.textContent = String(allPages().length);
}

function selectAll() {
  for (const p of allPages()) selected.add(p);
  renderList();
  setStatus(`Selected all ${selected.size} pages.`);
}

function selectNone() {
  selected.clear();
  renderList();
  setStatus("Selection cleared.");
}

function selectFiltered() {
  const pages = filteredPages();
  for (const p of pages) selected.add(p);
  renderList();
  setStatus(`Added ${pages.length} filtered page(s) to selection (${selected.size} total).`);
}

function renderList() {
  const ul = $("pageList");
  if (!ul) return;
  ul.innerHTML = "";
  const pages = filteredPages();
  if (!pages.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No pages match this filter.";
    ul.appendChild(li);
    updateCounts();
    return;
  }
  for (const page of pages) {
    const li = document.createElement("li");
    li.className = "page-item";

    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = selected.has(page);
    cb.addEventListener("change", () => {
      if (cb.checked) selected.add(page); else selected.delete(page);
      updateCounts();
    });
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = page;
    label.appendChild(cb);
    label.appendChild(name);

    const actions = document.createElement("div");
    actions.className = "actions";
    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "secondary";
    openBtn.textContent = "Open";
    openBtn.title = "Open in new tab";
    openBtn.addEventListener("click", () => window.open(page, "_blank", "noopener"));
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "secondary";
    prevBtn.textContent = "Preview";
    prevBtn.addEventListener("click", () => showPreview(page));
    actions.appendChild(openBtn);
    actions.appendChild(prevBtn);

    li.appendChild(label);
    li.appendChild(actions);
    ul.appendChild(li);
  }
  updateCounts();
}

function showPreview(page) {
  const panel = $("previewPanel");
  const mount = $("previewMount");
  if (!panel || !mount) return;
  mount.innerHTML = "";
  const iframe = document.createElement("iframe");
  iframe.src = page;
  iframe.title = page;
  mount.appendChild(iframe);
  panel.hidden = false;
  applyViewportToIframes();
  setStatus(`Previewing ${page}.`);
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closePreview() {
  const panel = $("previewPanel");
  const mount = $("previewMount");
  if (mount) mount.innerHTML = "";
  if (panel) panel.hidden = true;
}

function clearGrid() {
  const grid = $("iframeGrid");
  const meta = $("gridMeta");
  if (grid) {
    grid.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Grid cleared. Select pages and load again when needed.";
    grid.appendChild(empty);
  }
  if (meta) meta.textContent = "No pages loaded.";
  setStatus("Iframe grid cleared.");
}

function openSelectedTabs() {
  const pages = Array.from(selected);
  if (!pages.length) {
    setStatus("Select at least one page to open in tabs.");
    return;
  }
  let opened = 0;
  for (const page of pages) {
    const w = window.open(page, "_blank", "noopener");
    if (w) opened++;
  }
  setStatus(`Opened ${opened}/${pages.length} page(s) in new tabs. (Your browser may block popups/tabs if many are opened at once.)`);
}

function init() {
  renderList();
  renderChecklist();
  updateCounts();

  const search = $("search");
  if (search) {
    search.addEventListener("input", (e) => {
      currentFilter = e.target.value || "";
      renderList();
    });
  }

  const bind = (id, fn) => { const el = $(id); if (el) el.addEventListener("click", fn); };
  bind("selectAllBtn", selectAll);
  bind("selectNoneBtn", selectNone);
  bind("selectFilteredBtn", selectFiltered);
  bind("loadGridBtn", loadGrid);
  bind("openTabsBtn", openSelectedTabs);
  bind("clearGridBtn", clearGrid);
  bind("closePreviewBtn", closePreview);
  bind("applyViewportBtn", applyViewportToIframes);

  const preset = $("viewportPreset");
  if (preset) {
    preset.addEventListener("change", () => {
      syncViewportInputsFromPreset();
      applyViewportToIframes();
    });
  }
  const wIn = $("viewportWidth");
  const hIn = $("viewportHeight");
  const onSizeInput = () => {
    const p = $("viewportPreset");
    if (p && p.value !== "custom") p.value = "custom";
  };
  if (wIn) wIn.addEventListener("input", onSizeInput);
  if (hIn) hIn.addEventListener("input", onSizeInput);
  syncViewportInputsFromPreset();

  setStatus(`Ready. ${allPages().length} pages available. Select pages to inspect.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}