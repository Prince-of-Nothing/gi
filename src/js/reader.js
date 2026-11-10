const query = new URLSearchParams(location.search);
const storyId = query.get("story");
const requestedChapterNumber = query.get("chapter");
const requestedChapterId = query.get("chapterId");
const downloadRequested = query.get("download") === "1";
const continueReading = query.get("continue") === "1";

function lastReadStorageKey(storyId) {
  return `gidireads-last-read-${storyId || "story"}`;
}
function saveLastReadLocal(storyId, chapterId, chapterNumber) {
  try {
    if (!storyId) return;
    localStorage.setItem(lastReadStorageKey(storyId), JSON.stringify({
      storyId,
      chapterId: chapterId || null,
      chapterNumber: chapterNumber != null ? Number(chapterNumber) : null,
      ts: Date.now()
    }));
  } catch (_) {}
}
function loadLastReadLocal(storyId) {
  try {
    if (!storyId) return null;
    const raw = localStorage.getItem(lastReadStorageKey(storyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) { return null; }
}

let supabase = null;
let user = null;
let story = null;
let chapters = [];
let chapter = null;
let sessionId = null;
let completionRetryTimer = null;
let completionRefreshSessionId = null;
let saveTimer = null;
let lastSavedProgress = -1;
let furthestProgress = 0;
let pageTouchStartScrollLeft = 0;
let comments = [];
let commentLikeIds = new Set();
let offlineMode = false;
let continueReadingHandled = false;

const OFFLINE_DB = "gidireads-reader-offline-v1";
function openOfflineDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("Offline storage is not supported on this browser."));
    const request = indexedDB.open(OFFLINE_DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains("stories")) request.result.createObjectStore("stories", { keyPath: "storyId" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open offline storage."));
  });
}
async function putOfflineBundle(bundle) {
  const db = await openOfflineDb();
  await new Promise((resolve, reject) => { const tx = db.transaction("stories", "readwrite"); tx.objectStore("stories").put(bundle); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
  db.close();
}
async function getOfflineBundle(id) {
  const db = await openOfflineDb();
  const value = await new Promise((resolve, reject) => { const request = db.transaction("stories", "readonly").objectStore("stories").get(id); request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error); });
  db.close(); return value;
}
async function cacheCurrentStoryForOffline() {
  if (!story || !chapters.length) throw new Error("The published chapters have not finished loading.");
  await putOfflineBundle({ story, chapters, storyId: story.id, savedAt: new Date().toISOString() });
}


const $ = (selector) => document.querySelector(selector);
const storageKey = (name) => `gidireads-reader-${name}`;

function escapeHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function sanitizeHtml(value = "") {
  const template = document.createElement("template");
  template.innerHTML = value;

  const allowed = new Set([
    "P","BR","STRONG","EM","B","I","U","S","H2","H3","BLOCKQUOTE","UL","OL","LI","A"
  ]);

  template.content.querySelectorAll("*").forEach((node) => {
    if (!allowed.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }

    [...node.attributes].forEach((attr) => {
      const safeLink =
        node.tagName === "A" &&
        attr.name.toLowerCase() === "href" &&
        /^https?:\/\//i.test(attr.value);

      if (!safeLink) node.removeAttribute(attr.name);
    });
  });

  // Older contenteditable saves may use <b>/<i>; normalize them for the reader.
  template.content.querySelectorAll("b").forEach((node) => {
    const strong = document.createElement("strong");
    strong.innerHTML = node.innerHTML;
    node.replaceWith(strong);
  });
  template.content.querySelectorAll("i").forEach((node) => {
    const em = document.createElement("em");
    em.innerHTML = node.innerHTML;
    node.replaceWith(em);
  });

  return template.innerHTML;
}

function legacyInlineMarkup(value = "") {
  const escaped = escapeHtml(value);
  const tokens = [];
  const stash = (html) => {
    const key = `\u0000${tokens.length}\u0000`;
    tokens.push(html);
    return key;
  };

  // Bold first so its asterisks are not consumed by the italic pass.
  let text = escaped.replace(/\*\*([^*\n]+?)\*\*/g, (_, content) => stash(`<strong>${content}</strong>`));
  text = text.replace(/\*([^*\n]+?)\*/g, (_, content) => stash(`<em>${content}</em>`));

  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)] || "");
}

function legacyContentToHtml(value = "") {
  return value
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => {
      const html = legacyInlineMarkup(paragraph).replace(/\n/g, "<br>");
      return `<p>${html}</p>`;
    })
    .join("");
}

function chapterHtml(item) {
  if (item.content_html) return sanitizeHtml(item.content_html);
  return legacyContentToHtml(item.content || "");
}

function wordCount(item) {
  const text = (item.content || "").replace(/<[^>]+>/g, " ");
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function readingMinutes(item) {
  return Math.max(1, Math.ceil(wordCount(item) / 220));
}

function sectionLabel(item) {
  const type = item.content_type || "chapter";
  if (type === "chapter") return item.chapter_number ? `Chapter ${item.chapter_number}` : "Chapter";
  const labels = {
    prologue: "Prologue",
    epilogue: "Epilogue",
    interlude: "Interlude",
    preface: "Preface",
    introduction: "Introduction",
    bonus: "Bonus",
    other: "Section"
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function sortChapters(a, b) {
  return (a.display_order ?? 999999) - (b.display_order ?? 999999) ||
         (a.chapter_number ?? 999999) - (b.chapter_number ?? 999999);
}

function formatCount(value) {
  const n = Number(value || 0);
  if (n < 1000) return String(Math.round(n));
  if (n < 1000000) return `${Math.round(n / 100) / 10}k`.replace(".0k", "k");
  if (n < 1000000000) return `${Math.round(n / 100000) / 10}M`.replace(".0M", "M");
  return `${Math.round(n / 100000000) / 10}B`.replace(".0B", "B");
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2200);
}

function setError(message, title = "We couldn't open this manuscript.") {
  $("#loadingState").hidden = true;
  $("#book").hidden = true;
  $("#errorState").hidden = false;
  $("#errorTitle").textContent = title;
  $("#errorText").textContent = message;
}

function setLoaded() {
  $("#loadingState").hidden = true;
  $("#errorState").hidden = true;
  $("#book").hidden = false;
}

function openDrawer(id) {
  $("#scrim").hidden = false;
  $(id).classList.add("open");
  $(id).setAttribute("aria-hidden", "false");
  document.body.classList.add("controls");
}

function closeDrawers() {
  ["#controlsDrawer", "#chapterDrawer"].forEach((id) => {
    $(id).classList.remove("open");
    $(id).setAttribute("aria-hidden", "true");
  });
  $("#scrim").hidden = true;
}

const READER_THEMES = ['light','beige','sepia','dark','night','darkness','green','blue','custom'];
function readReaderCustom() {
  try { var raw = localStorage.getItem(storageKey('custom-theme')); if (!raw) return null; var p = JSON.parse(raw); return p && typeof p === 'object' ? p : null; } catch (_) { return null; }
}
function injectReaderCustomStyle() {
  var c = readReaderCustom();
  var vars = (c && c.vars && typeof c.vars === 'object') ? c.vars : {};
  var id = 'gidireads-reader-custom-style';
  var style = document.getElementById(id);
  if (!style) { style = document.createElement('style'); style.id = id; document.head.appendChild(style); }
  var css = 'body.theme-custom { ';
  for (var k in vars) { if (Object.prototype.hasOwnProperty.call(vars, k)) css += k + ':' + vars[k] + ';'; }
  css += ' }';
  style.textContent = css;
}
function setTheme(theme) {
  if (READER_THEMES.indexOf(theme) === -1) theme = 'light';
  READER_THEMES.forEach((t) => document.body.classList.remove('theme-' + t));
  document.body.classList.add('theme-' + theme);
  document.body.dataset.readerTheme = theme;
  if (theme === 'custom') injectReaderCustomStyle();
  // keep legacy .dark class for any older rules
  document.body.classList.toggle('dark', theme === 'dark' || theme === 'night' || theme === 'darkness');
  localStorage.setItem(storageKey("theme"), theme);
  document.querySelectorAll("[data-theme]").forEach((button) => {
    button.classList.toggle("active", button.dataset.theme === theme);
  });
}

function applyPreferences() {
  const font = localStorage.getItem(storageKey("font")) || "editorial";
  const size = localStorage.getItem(storageKey("size")) || "1.08";
  const line = localStorage.getItem(storageKey("line")) || "1.68";
  const width = localStorage.getItem(storageKey("width")) || "680";

  $("#fontSelect").value = font;
  $("#sizeRange").value = size;
  $("#lineRange").value = line;
  $("#widthRange").value = width;

  $("#manuscript").className = `manuscript ${font === "editorial" ? "" : font}`;
  document.documentElement.style.setProperty("--size", `${size}rem`);
  document.documentElement.style.setProperty("--lh", line);
  document.documentElement.style.setProperty("--width", `${width}px`);
}

function setFlow(flow) {
  document.body.classList.toggle("pages", flow === "pages");
  localStorage.setItem(storageKey("flow"), flow);
  document.querySelectorAll("[data-flow]").forEach((button) => {
    button.classList.toggle("active", button.dataset.flow === flow);
  });
  requestAnimationFrame(() => {
    if (flow === "pages") {
      $("#manuscript").scrollLeft = 0;
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    updateProgressUI();
  });
}

function currentProgress() {
  if (document.body.classList.contains("pages")) {
    const track = $("#manuscript");
    const max = Math.max(1, track.scrollWidth - track.clientWidth);
    return Math.max(0, Math.min(100, (track.scrollLeft / max) * 100));
  }
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return Math.max(0, Math.min(100, (window.scrollY / max) * 100));
}

function furthestStorageKey() {
  return storageKey(`furthest-${story?.id || "story"}-${chapter?.id || "chapter"}`);
}

function loadStoredFurthest() {
  const value = Number(localStorage.getItem(furthestStorageKey()));
  furthestProgress = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function updateFurthest(progress) {
  furthestProgress = Math.max(furthestProgress, progress);
  localStorage.setItem(furthestStorageKey(), String(furthestProgress));
  return furthestProgress;
}

async function saveProgress(progress = currentProgress()) {
  progress = updateFurthest(progress);
  if (!user || !story || !chapter || !supabase || !sessionId) return;

  const positionOffset = document.body.classList.contains("pages")
    ? Math.max(0, Math.round($("#manuscript").scrollLeft))
    : Math.max(0, Math.round(window.scrollY));

  const { data, error } = await supabase.rpc("save_gidireads_reading_progress", {
    p_story_id: story.id,
    p_chapter_id: chapter.id,
    p_progress: Math.max(0, Math.min(100, Number(progress) || 0)),
    p_position_offset: positionOffset,
    p_session_id: sessionId
  });

  if (error) {
    console.warn("Progress save failed:", error.message);
    return;
  }
  if (data === true) {
    if (completionRetryTimer) clearTimeout(completionRetryTimer);
    completionRetryTimer = null;
    // Refresh server-owned milestone progress once per verified reading session.
    // The database remains responsible for every award; this client only requests a refresh.
    if (completionRefreshSessionId !== sessionId) {
      completionRefreshSessionId = sessionId;
      const { error: refreshError } = await supabase.rpc("refresh_my_achievements");
      if (refreshError) console.warn("Achievement refresh will retry on My GidiReads:", refreshError.message);
    }
    console.info("Chapter completion verified by the reading-session service.");

    // Auto-advance to next chapter if available
    const index = chapters.findIndex((item) => item.id === chapter.id);
    if (index >= 0 && index < chapters.length - 1) {
      setTimeout(() => openChapter(chapters[index + 1].id), 1500);
    }
  } else if (progress >= 95 && sessionId) {
    // If the reader reaches the end before the minimum session duration, retry
    // once more later even if the scroll position no longer changes.
    if (completionRetryTimer) clearTimeout(completionRetryTimer);
    completionRetryTimer = setTimeout(() => { if (sessionId) saveProgress(progress); }, 15000);
  }
}

async function recordEvent(eventType, metadata = {}) {
  if (!user || !story || !supabase) return;

  const { error } = await supabase.from("reading_events").insert({
    reader_id: user.id,
    story_id: story.id,
    chapter_id: chapter?.id || null,
    event_type: eventType,
    discovery_source: query.get("source") || "direct",
    metadata
  });

  if (error) console.warn("Reading event failed:", error.message);
}

async function endReadingSession() {
  if (!user || !sessionId || !supabase) return;
  const closingSession = sessionId;
  sessionId = null;
  if (completionRetryTimer) clearTimeout(completionRetryTimer);
  completionRetryTimer = null;
  const { error } = await supabase.rpc("end_gidireads_reading_session", {
    p_session_id: closingSession
  });
  if (error) console.warn("Reading session could not be closed:", error.message);
}

async function startReadingSession() {
  if (!user || !story || !chapter || !supabase) return;

  const { data, error } = await supabase.rpc("start_gidireads_reading_session", {
    p_story_id: story.id,
    p_chapter_id: chapter.id
  });

  if (error || !data) {
    console.warn("Reading session could not start:", error?.message || "No session was returned.");
    sessionId = null;
    return;
  }

  sessionId = data;
  await recordEvent("reading_session_started");
}

function updateProgressUI() {
  const progress = updateFurthest(currentProgress());
  const progressBar = $("#progressBar");
  if (progressBar) progressBar.style.width = `${progress}%`;
  const progressChip = $("#progressChip");
  if (progressChip) progressChip.textContent = `${Math.round(progress)}%`;
  const endTitle = $("#endTitle");
  if (endTitle) endTitle.textContent = progress >= 95 ? "You reached the end" : "Continue reading";

  if (user && chapter && Math.abs(progress - lastSavedProgress) >= 2) {
    lastSavedProgress = progress;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveProgress(progress), 350);
  }
}

function renderChapterList() {
  const activeIndex = chapters.findIndex((item) => item.id === chapter.id);

  $("#chapterList").innerHTML = chapters.map((item, index) => `
    <button class="chapter-item ${index === activeIndex ? "active" : ""}" type="button" data-id="${escapeHtml(item.id)}" data-number="${escapeHtml(item.chapter_number)}">
      <b>${escapeHtml(sectionLabel(item))}</b>
      <small>${escapeHtml(item.title || "Untitled")}</small>
    </button>
  `).join("");

  $("#chapterList").querySelectorAll("[data-id]").forEach((button) => {
    button.addEventListener("click", () => openChapter(button.dataset.id));
  });
}

async function restorePosition() {
  if (!user || !supabase || !story || !chapter) return;

  const { data, error } = await supabase
    .from("reading_progress")
    .select("position_offset,chapter_id,chapter_progress_percent,progress_percent")
    .eq("reader_id", user.id)
    .eq("story_id", story.id)
    .maybeSingle();

  if (error) {
    console.warn("Progress restore failed:", error.message);
    return;
  }

  if (data?.chapter_id === chapter.id) {
    loadStoredFurthest();
    furthestProgress = Math.max(furthestProgress, Number(data.progress_percent ?? data.chapter_progress_percent ?? 0));
    if (Number(data.position_offset) > 0) {
      setTimeout(() => {
        if (document.body.classList.contains("pages")) {
          $("#manuscript").scrollLeft = Number(data.position_offset);
        } else {
          window.scrollTo({ top: Number(data.position_offset), behavior: "auto" });
        }
        updateProgressUI();
      }, 80);
    } else {
      updateProgressUI();
    }
  }
}

async function renderChapter() {
  const index = chapters.findIndex((item) => item.id === chapter.id);

  $("#storyTitle").textContent = story.title;
  $("#storyKicker").textContent = story.title.toUpperCase();
  $("#sectionLabel").textContent = sectionLabel(chapter);
  $("#chapterTitle").textContent = chapter.title || sectionLabel(chapter);
  $("#authorName").textContent =
    story.profiles?.display_name ||
    story.profiles?.username ||
    "GidiReads author";
  $("#readingTime").textContent = `${readingMinutes(chapter)} min read`;
  $("#manuscript").innerHTML = chapterHtml(chapter);

  $("#authorNote").hidden = !chapter.author_note;
  $("#authorNoteText").textContent = chapter.author_note || "";

  // The chapter-end Previous/Next footer is optional; older readers may still render it.
  const previousBtn = $("#previousBtn");
  const nextBtn = $("#nextBtn");
  if (previousBtn) previousBtn.disabled = index <= 0;
  if (nextBtn) nextBtn.disabled = index >= chapters.length - 1;

  $("#storyLink").href = `story.html?id=${encodeURIComponent(story.id)}`;

  renderChapterList();
  if (!offlineMode && navigator.onLine) {
    await loadComments().catch(() => {});
    await loadBookmarkState().catch(() => {});
  } else {
    $("#commentsList").innerHTML = '<p class="comment-empty">Comments are available when you reconnect.</p>';
    $("#commentsCount").textContent = "—";
    updateBookmarkUI(false);
  }
  window.scrollTo({ top: 0, behavior: "auto" });
}

function commentProfileMarkup(profile) {
  const name = profile?.display_name || profile?.username || "Reader";
  const avatar = profile?.avatar_url
    ? `<img class="comment-avatar" src="${escapeHtml(profile.avatar_url)}" alt="${escapeHtml(name)}" loading="lazy">`
    : `<span class="comment-avatar comment-avatar-fallback">${escapeHtml(name.charAt(0).toUpperCase())}</span>`;
  return `<div class="comment-profile">${avatar}<strong>${escapeHtml(name)}${profile?.is_verified ? ' <span class="comment-verified">✓</span>' : ''}</strong></div>`;
}

function formatCommentDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function requireCommentLogin() {
  if (user) return true;
  toast("Log in to comment, reply, or like comments.");
  return false;
}

function renderComments() {
  const list = $("#commentsList");
  const count = $("#commentsCount");
  if (!list || !count) return;
  count.textContent = String(comments.length);
  if (!comments.length) {
    list.innerHTML = `<p class="comment-empty">No comments yet. Start the conversation.</p>`;
    return;
  }

  const childrenOf = (id) => comments.filter((c) => c.parent_comment_id === id);
  const renderOne = (comment, depth = 0) => {
    const mine = user?.id === comment.author_id;
    const children = childrenOf(comment.id);
    const liked = commentLikeIds.has(comment.id);
    return `
      <article class="comment-row ${depth ? "comment-reply" : ""}" data-comment-id="${escapeHtml(comment.id)}" style="--comment-depth:${Math.min(depth,3)}">
        ${commentProfileMarkup(comment.profiles)}
        <div class="comment-body">
          <div class="comment-meta"><span>${formatCommentDate(comment.created_at)}</span>${comment.updated_at !== comment.created_at ? "<span>edited</span>" : ""}</div>
          <p class="comment-text">${escapeHtml(comment.content)}</p>
          <div class="comment-actions">
            <button type="button" class="comment-like-btn ${liked ? "liked" : ""}" data-comment-like="${escapeHtml(comment.id)}" aria-pressed="${liked}">♡ <span>${comment.like_count || 0}</span> Like</button>
            <button type="button" class="comment-reply-btn" data-comment-reply="${escapeHtml(comment.id)}">↩ Reply</button>
            ${mine ? `<button type="button" class="comment-reply-btn" data-comment-edit="${escapeHtml(comment.id)}">Edit</button><button type="button" class="comment-reply-btn" data-comment-delete="${escapeHtml(comment.id)}">Delete</button>` : ""}
          </div>
          <div class="comment-reply-form" data-reply-form="${escapeHtml(comment.id)}" hidden>
            <textarea rows="2" maxlength="2000" data-reply-input="${escapeHtml(comment.id)}" placeholder="Write a reply…"></textarea>
            <div class="comment-form-actions"><button type="button" class="action" data-reply-cancel="${escapeHtml(comment.id)}">Cancel</button><button type="button" class="action primary" data-reply-submit="${escapeHtml(comment.id)}">Reply</button></div>
          </div>
          <div class="comment-replies">${children.map((child) => renderOne(child, depth + 1)).join("")}</div>
        </div>
      </article>`;
  };

  list.innerHTML = comments.filter((c) => !c.parent_comment_id).map((c) => renderOne(c)).join("");
  wireCommentInteractions();
}

async function loadComments() {
  const list = $("#commentsList");
  if (!list || !chapter) return;
  list.innerHTML = `<p class="comment-empty">Loading comments…</p>`;

  const { data, error } = await supabase
    .from("comments")
    .select("id, chapter_id, author_id, parent_comment_id, content, created_at, updated_at, profiles(username, display_name, avatar_url, is_verified)")
    .eq("chapter_id", chapter.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Comments load error:", error);
    list.innerHTML = `<p class="comment-empty">Could not load comments. Please try again.</p>`;
    return;
  }

  comments = data || [];
  const ids = comments.map((c) => c.id);
  commentLikeIds = new Set();
  if (ids.length) {
    const { data: likes, error: likesError } = await supabase
      .from("comment_likes")
      .select("comment_id, reader_id")
      .in("comment_id", ids);
    if (!likesError) {
      const counts = new Map();
      (likes || []).forEach((like) => {
        counts.set(like.comment_id, (counts.get(like.comment_id) || 0) + 1);
        if (user?.id === like.reader_id) commentLikeIds.add(like.comment_id);
      });
      comments.forEach((comment) => { comment.like_count = counts.get(comment.id) || 0; });
    } else {
      comments.forEach((comment) => { comment.like_count = 0; });
    }
  }
  renderComments();
}

function wireCommentInteractions() {
  const list = $("#commentsList");
  if (!list) return;

  list.querySelectorAll("[data-comment-like]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault(); event.stopPropagation();
      if (!requireCommentLogin()) return;
      const id = button.dataset.commentLike;
      const active = button.getAttribute("aria-pressed") === "true";
      button.disabled = true;
      const result = active
        ? await supabase.from("comment_likes").delete().eq("comment_id", id).eq("reader_id", user.id)
        : await supabase.from("comment_likes").insert({ comment_id: id, reader_id: user.id });
      button.disabled = false;
      if (result.error) { console.error("Comment like error:", result.error); toast("Could not update the comment like."); return; }
      const comment = comments.find((c) => c.id === id);
      if (comment) comment.like_count = Math.max(0, Number(comment.like_count || 0) + (active ? -1 : 1));
      if (active) commentLikeIds.delete(id); else commentLikeIds.add(id);
      button.classList.toggle("liked", !active);
      button.setAttribute("aria-pressed", String(!active));
      button.querySelector("span").textContent = String(comment?.like_count || 0);
    });
  });

  list.querySelectorAll("[data-comment-reply]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault(); event.stopPropagation();
      if (!requireCommentLogin()) return;
      const id = button.dataset.commentReply;
      const form = list.querySelector(`[data-reply-form="${id}"]`);
      if (!form) return;
      form.hidden = false;
      form.querySelector("textarea")?.focus();
    });
  });

  list.querySelectorAll("[data-reply-cancel]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault(); event.stopPropagation();
      const form = list.querySelector(`[data-reply-form="${button.dataset.replyCancel}"]`);
      if (form) { form.hidden = true; form.querySelector("textarea").value = ""; }
    });
  });

  list.querySelectorAll("[data-reply-submit]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault(); event.stopPropagation();
      if (!requireCommentLogin()) return;
      const parentId = button.dataset.replySubmit;
      const form = list.querySelector(`[data-reply-form="${parentId}"]`);
      const input = form?.querySelector("textarea");
      const content = input?.value.trim();
      if (!content) return toast("Write a reply first.");
      button.disabled = true;
      const { error } = await supabase.from("comments").insert({ chapter_id: chapter.id, author_id: user.id, parent_comment_id: parentId, content });
      button.disabled = false;
      if (error) { console.error("Comment reply error:", error); toast("Could not post your reply."); return; }
      await recordEvent("comment_created");
      toast("Reply posted");
      await loadComments();
    });
  });

  list.querySelectorAll("[data-comment-edit]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault(); event.stopPropagation();
      if (!requireCommentLogin()) return;
      const comment = comments.find((c) => c.id === button.dataset.commentEdit);
      if (!comment) return;
      const text = window.prompt("Edit your comment:", comment.content);
      if (text === null) return;
      const content = text.trim();
      if (!content) return toast("Comment cannot be empty.");
      const { error } = await supabase.from("comments").update({ content }).eq("id", comment.id).eq("author_id", user.id);
      if (error) { console.error("Comment edit error:", error); toast("Could not update your comment."); return; }
      toast("Comment updated");
      await loadComments();
    });
  });

  list.querySelectorAll("[data-comment-delete]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault(); event.stopPropagation();
      if (!requireCommentLogin()) return;
      if (!window.confirm("Delete this comment?")) return;
      const { error } = await supabase.from("comments").delete().eq("id", button.dataset.commentDelete).eq("author_id", user.id);
      if (error) { console.error("Comment delete error:", error); toast("Could not delete your comment."); return; }
      toast("Comment deleted");
      await loadComments();
    });
  });
}

async function openChapter(chapterId) {
  const nextChapter = chapters.find((item) => item.id === chapterId);
  if (!nextChapter || nextChapter.id === chapter.id) {
    closeDrawers();
    return;
  }

  await saveProgress(currentProgress());
  await endReadingSession();

  chapter = nextChapter;
  saveLastReadLocal(story?.id, chapter.id, chapter.chapter_number);
  history.replaceState({}, "", `reader.html?story=${encodeURIComponent(story.id)}&chapter=${encodeURIComponent(chapter.chapter_number)}`);

  await renderChapter();
  furthestProgress = 0;
  loadStoredFurthest();
  lastSavedProgress = -1;

  await recordEvent("chapter_opened");
  await startReadingSession();
  closeDrawers();
  document.body.classList.remove("controls");
}

async function toggleLibrary() {
  if (!user) {
    toast("Log in to add stories to your Library.");
    return;
  }

  const existing = await supabase
    .from("library_entries")
    .select("id")
    .eq("reader_id", user.id)
    .eq("story_id", story.id)
    .maybeSingle();

  if (existing.error) {
    toast("Library could not be checked.");
    return;
  }

  if (existing.data) {
    const { error } = await supabase.from("library_entries").delete().eq("id", existing.data.id);
    if (error) {
      toast("Could not remove this story.");
      return;
    }
    $("#libraryText").textContent = "Add to Library";
    await recordEvent("library_removed");
    toast("Removed from Library");
    return;
  }

  const { error } = await supabase.from("library_entries").insert({
    reader_id: user.id,
    story_id: story.id,
    status: "reading",
    last_chapter_number: chapter.chapter_number || null
  });

  if (error) {
    toast("Could not add this story.");
    return;
  }

  $("#libraryText").textContent = "Added to Library";
  await recordEvent("library_added");
  toast("Added to Library");
}

function openEchoModal() {
  if (!user) { toast("Log in to leave an Echo."); return; }
  const modal = $("#echoModal");
  $("#echoChapterLabel").textContent = chapter?.title || `Chapter ${chapter?.chapter_number || ""}`;
  $("#echoModalStatus").textContent = "";
  $("#echoAmount").value = "1";
  modal.hidden = false;
  $("#echoModalClose").focus();
  const note = $("#echoBalanceNote");
  supabase.from("wallet_accounts").select("echoes_free,echoes_bonus,echoes_promotional").eq("user_id", user.id).maybeSingle().then(({ data }) => {
    const n = data ? (data.echoes_free || 0) + (data.echoes_bonus || 0) + (data.echoes_promotional || 0) : 0;
    note.textContent = n > 0 ? `You have ${n.toLocaleString()} Echo${n === 1 ? "" : "es"} available.` : "You have no Echoes right now. Claim your daily Echoes in My GidiReads.";
  }).catch(() => {});
}
function closeEchoModal() { $("#echoModal").hidden = true; }
async function leaveEcho() { openEchoModal(); }
async function submitEchoSelection() {
  const button = $("#echoSubmit");
  const status = $("#echoModalStatus");
  const amount = Number($("#echoAmount").value);
  const scope = document.querySelector('input[name="echoScope"]:checked')?.value || "chapter";
  if (!Number.isInteger(amount) || amount < 1 || amount > 100) { status.textContent = "Choose between 1 and 100 Echoes."; return; }
  if (!user || !story || !chapter) { status.textContent = "Sign in and open a published chapter first."; return; }
  button.disabled = true; button.textContent = "Sending…"; status.textContent = "";
  try {
    const { data, error } = await supabase.rpc("gidireads_send_echo_support", {
      p_story_id: story.id,
      p_chapter_id: scope === "chapter" ? chapter.id : null,
      p_amount: amount,
      p_idempotency_key: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.reason || "echo_not_sent");
    status.textContent = `Sent ${amount} Echo${amount === 1 ? "" : "es"} to ${scope === "chapter" ? "this chapter" : "the novel"}.`;
    await recordEvent("echo_given");
    toast("Your Echo support was recorded.");
    setTimeout(closeEchoModal, 1100);
  } catch (error) {
    console.error("Echo support error:", error);
    status.textContent = error?.code === "PGRST202"
      ? "Echo support is being set up. Please try again in a moment."
      : error?.message?.includes("insufficient_echoes") ? "You don't have enough available Echoes for that amount."
      : error?.message?.includes("cannot_echo_own_story") ? "You can't Echo your own story."
      : "The Echo could not be sent. Your balance has not been intentionally changed; please try again.";
  } finally { button.disabled = false; button.textContent = "Send Echo"; }
}

async function prepareOffline() {
  if (!story || !chapters.length) return toast("Wait until the story has finished loading, then try again.");
  const button = $("#offlineBtn");
  button.disabled = true;
  try {
    await cacheCurrentStoryForOffline();
    if (user && navigator.onLine && supabase) {
      const { error } = await supabase.from("reading_offline_items").upsert({
        reader_id: user.id,
        story_id: story.id,
        downloaded_chapters: chapters.length,
        last_synced_at: new Date().toISOString()
      }, { onConflict: "reader_id,story_id" });
      if (error) console.warn("Offline download saved on this device; server sync failed:", error.message);
      else await recordEvent("offline_downloaded");
    }
    $("#offlineText").textContent = "Saved for offline";
    toast(`Saved ${chapters.length} published sections on this device for offline reading.`);
  } catch (error) {
    console.warn("Offline save failed:", error);
    toast(error?.message || "This story could not be saved for offline reading.");
  } finally { button.disabled = false; }
}

async function loadBookmarkState() {
  if (!user || !supabase || !chapter) {
    updateBookmarkUI(false);
    return;
  }
  const { data, error } = await supabase
    .from("reading_bookmarks")
    .select("id")
    .eq("reader_id", user.id)
    .eq("chapter_id", chapter.id)
    .maybeSingle();
  if (error) {
    console.warn("Bookmark state could not be loaded:", error.message);
    updateBookmarkUI(false);
    return;
  }
  updateBookmarkUI(Boolean(data));
}

function updateBookmarkUI(saved) {
  const button = $("#bookmarkBtn");
  const text = $("#bookmarkText");
  const hint = $("#bookmarkHint");
  if (!button || !text || !hint) return;
  button.classList.toggle("saved", saved);
  button.querySelector(".reader-action-icon").textContent = saved ? "♥" : "♡";
  text.textContent = saved ? "Bookmarked" : "Bookmark";
  hint.textContent = saved ? "Saved in your reading bookmarks" : "Save this chapter for later";
}

async function toggleBookmark() {
  if (!user) {
    toast("Log in to bookmark this chapter.");
    return;
  }
  const existing = await supabase
    .from("reading_bookmarks")
    .select("id")
    .eq("reader_id", user.id)
    .eq("chapter_id", chapter.id)
    .maybeSingle();
  if (existing.error) {
    toast("Could not check this bookmark.");
    return;
  }
  if (existing.data) {
    const { error } = await supabase.from("reading_bookmarks").delete().eq("id", existing.data.id).eq("reader_id", user.id);
    if (error) {
      toast("Could not remove the bookmark.");
      return;
    }
    updateBookmarkUI(false);
    toast("Bookmark removed.");
    return;
  }
  const { error } = await supabase.from("reading_bookmarks").insert({
    reader_id: user.id,
    story_id: story.id,
    chapter_id: chapter.id
  });
  if (error) {
    toast("Could not bookmark this chapter.");
    return;
  }
  updateBookmarkUI(true);
  toast("Chapter bookmarked.");
}

async function shareChapter() {
  if (!chapter || !story) return;
  const url = `${location.origin}${location.pathname}?story=${encodeURIComponent(story.id)}&chapterId=${encodeURIComponent(chapter.id)}`;
  const title = `${story.title} — ${chapter.title || sectionLabel(chapter)}`;
  const shareData = { title, text: `Read ${title} on GidiReads.`, url };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    await navigator.clipboard.writeText(url);
    toast("Chapter link copied.");
  } catch (error) {
    if (error?.name === "AbortError") return;
    try {
      await navigator.clipboard.writeText(url);
      toast("Chapter link copied.");
    } catch {
      toast("Could not share this chapter.");
    }
  }
}

async function syncReaderCountry(session) {
  if (!session?.access_token || !navigator.onLine) return;
  try {
    const response = await fetch('/api/reader-country', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (!response.ok) console.info('Country-level readership statistics are temporarily unavailable.');
  } catch (error) {
    console.info('Country-level readership statistics could not be refreshed:', error?.message || 'Network unavailable.');
  }
}

async function loadStory() {
  if (!storyId) throw new Error("This reader link is missing the story ID. Open the Reader from a Story Page or Library item.");
  let networkError = null;
  try {
    const authResult = await supabase.auth.getSession();
    user = authResult.data?.session?.user || null;
    await syncReaderCountry(authResult.data?.session);
    const storyResult = await supabase.from("stories").select("id,title,status,reads,echo_count,author_id,cover_url").eq("id", storyId).maybeSingle();
    if (storyResult.error) throw storyResult.error;
    if (!storyResult.data) throw new Error("This story is not available.");
    story = storyResult.data;
    const authorResult = await supabase.from("profiles").select("display_name,username").eq("id", story.author_id).maybeSingle();
    story.profiles = authorResult.data || {};
    if (authorResult.error) console.warn("Reader author details unavailable:", authorResult.error);
    const chapterResult = await supabase.from("chapters").select("id,story_id,chapter_number,title,content,content_html,content_type,display_order,author_note,updated_at,is_published").eq("story_id", story.id).eq("is_published", true).is("archived_at", null).order("display_order", { ascending: true });
    if (chapterResult.error) throw chapterResult.error;
    chapters = (chapterResult.data || []).sort(sortChapters);
    if (!chapters.length) throw new Error("This story does not have a published section yet.");
    const readResult = await supabase.rpc("record_story_read", { p_story_id: story.id });
    if (readResult.error) console.warn("Story read could not be recorded:", readResult.error.message);
    else if (readResult.data?.reads != null) story.reads = readResult.data.reads;

    let savedProgress = null;
    if (user) {
      const progressResult = await supabase.from("reading_progress").select("chapter_id").eq("reader_id", user.id).eq("story_id", story.id).maybeSingle();
      if (!progressResult.error) savedProgress = progressResult.data;
    }

    // Resolve chapter: explicit URL param > saved progress > local last read > first chapter
    let resolvedChapter = null;
    if (requestedChapterId) {
      resolvedChapter = chapters.find((item) => item.id === requestedChapterId);
    }
    if (!resolvedChapter && requestedChapterNumber) {
      resolvedChapter = chapters.find((item) => Number(item.chapter_number) === Number(requestedChapterNumber));
    }
    if (!resolvedChapter && continueReading && savedProgress?.chapter_id) {
      resolvedChapter = chapters.find((item) => item.id === savedProgress.chapter_id);
      if (resolvedChapter) {
        // Redirect to clean URL with chapter number
        history.replaceState({}, "", `reader.html?story=${encodeURIComponent(story.id)}&chapter=${encodeURIComponent(resolvedChapter.chapter_number)}`);
      }
    }
    if (!resolvedChapter && savedProgress?.chapter_id) {
      resolvedChapter = chapters.find((item) => item.id === savedProgress.chapter_id);
    }
    if (!resolvedChapter && !requestedChapterId && !requestedChapterNumber) {
      const localLast = loadLastReadLocal(story.id);
      if (localLast) {
        if (localLast.chapterId) resolvedChapter = chapters.find((item) => item.id === localLast.chapterId);
        if (!resolvedChapter && localLast.chapterNumber != null) {
          resolvedChapter = chapters.find((item) => Number(item.chapter_number) === Number(localLast.chapterNumber));
        }
      }
    }
    if (!resolvedChapter) resolvedChapter = chapters[0];
    chapter = resolvedChapter;
    saveLastReadLocal(story.id, chapter.id, chapter.chapter_number);

    // Store chapter number in URL for user-friendly URLs
    if (!requestedChapterId && !requestedChapterNumber && !continueReading) {
      history.replaceState({}, "", `reader.html?story=${encodeURIComponent(story.id)}&chapter=${encodeURIComponent(chapter.chapter_number)}`);
    }
    offlineMode = false;
  } catch (error) {
    networkError = error;
    if (error?.message === "This story is not available." || error?.message === "This story does not have a published section yet.") throw error;
    const cached = await getOfflineBundle(storyId).catch(() => null);
    if (!cached?.story || !Array.isArray(cached.chapters) || !cached.chapters.length) throw networkError;
    story = cached.story;
    chapters = cached.chapters.sort(sortChapters);
    chapter = (requestedChapterId && chapters.find((item) => item.id === requestedChapterId)) ||
      (requestedChapterNumber && chapters.find((item) => Number(item.chapter_number) === Number(requestedChapterNumber))) || chapters[0];
    user = null;
    offlineMode = true;
    toast("Offline mode — showing the version saved on this device.");
  }

  document.title = `${story.title} — GidiReads`;
  furthestProgress = 0;
  await renderChapter();
  if (!offlineMode) {
    loadStoredFurthest();
    if (user) {
      const libraryResult = await supabase.from("library_entries").select("id").eq("reader_id", user.id).eq("story_id", story.id).maybeSingle();
      if (!libraryResult.error) $("#libraryText").textContent = libraryResult.data ? "Added to Library" : "Add to Library";
    }
    await recordEvent("story_opened");
    await recordEvent("chapter_opened");
    await startReadingSession();
    await restorePosition();
  } else {
    $("#offlineText").textContent = "Saved for offline";
  }
}

async function bootstrap() {
  $("#retryBtn").disabled = true;
  if (!storyId) {
    setError("Open the Reader from a Story Page or Library item.");
    return;
  }

  try {
    // Dynamic import is intentional: if the user's existing supabaseClient.js
    // is missing or malformed, the reader now shows an error instead of
    // getting stuck forever on "Opening the manuscript…".
    const savedTheme = localStorage.getItem(storageKey("theme")) || "light";
    setTheme(savedTheme);
    try {
      const module = await import("./supabaseClient.js");
      supabase = module.supabase;
      if (!supabase) throw new Error("Supabase client unavailable.");
      await loadStory();
    } catch (networkError) {
      if (supabase) throw networkError;
      const cached = await getOfflineBundle(storyId).catch(() => null);
      if (!cached?.story || !Array.isArray(cached.chapters) || !cached.chapters.length) throw networkError;
      story = cached.story; chapters = cached.chapters.sort(sortChapters);
      chapter = (requestedChapterId && chapters.find((item) => item.id === requestedChapterId)) ||
        (requestedChapterNumber && chapters.find((item) => Number(item.chapter_number) === Number(requestedChapterNumber))) || chapters[0];
      user = null; offlineMode = true;
      document.title = `${story.title} — GidiReads`;
      await renderChapter();
      $("#offlineText").textContent = "Saved for offline";
      toast("Offline mode — showing the version saved on this device.");
    }
    setLoaded();
    if (downloadRequested && !offlineMode) await prepareOffline();
  } catch (error) {
    console.error("GidiReads Reader initialisation failed:", error);
    const safeMessage = error?.message === "This story is not available."
      ? "This story is not available. It may have been unpublished or moved."
      : "We couldn't open this story right now. If you saved it offline on this device, reconnect once and try again.";
    setError(safeMessage);
  } finally {
    $("#retryBtn").disabled = false;
  }
}

$("#retryBtn").addEventListener("click", () => {
  $("#errorState").hidden = true;
  $("#loadingState").hidden = false;
  bootstrap();
});

$("#menuBtn").addEventListener("click", () => openDrawer("#controlsDrawer"));
$("#closeControls").addEventListener("click", closeDrawers);
$("#closeChapters").addEventListener("click", closeDrawers);
$("#scrim").addEventListener("click", closeDrawers);
$("#newCommentForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (!requireCommentLogin() || !chapter) return;
  const input = $("#newCommentInput");
  const content = input.value.trim();
  if (!content) return toast("Write a comment first.");
  const button = event.submitter;
  if (button) button.disabled = true;
  const { error } = await supabase.from("comments").insert({ chapter_id: chapter.id, author_id: user.id, content });
  if (button) button.disabled = false;
  if (error) { console.error("Comment post error:", error); toast("Could not post your comment."); return; }
  input.value = "";
  await recordEvent("comment_created");
  toast("Comment posted");
  await loadComments();
});

const __chaptersBtn=$("#chaptersBtn"); if(__chaptersBtn) __chaptersBtn.addEventListener("click", () => openDrawer("#chapterDrawer"));

const __previousBtn=$("#previousBtn"); if(__previousBtn) __previousBtn.addEventListener("click", () => {
  const index = chapters.findIndex((item) => item.id === chapter.id);
  if (index > 0) openChapter(chapters[index - 1].id);
});

const __nextBtn=$("#nextBtn"); if(__nextBtn) __nextBtn.addEventListener("click", () => {
  const index = chapters.findIndex((item) => item.id === chapter.id);
  if (index < chapters.length - 1) openChapter(chapters[index + 1].id);
});

$("#libraryBtn").addEventListener("click", toggleLibrary);
$("#echoBtn").addEventListener("click", leaveEcho);
$("#echoModalClose").addEventListener("click", closeEchoModal);
$("#echoModal").addEventListener("click", (event) => { if (event.target === $("#echoModal")) closeEchoModal(); });
$("#echoAmountDown").addEventListener("click", () => { $("#echoAmount").value = Math.max(1, Number($("#echoAmount").value || 1) - 1); });
$("#echoAmountUp").addEventListener("click", () => { $("#echoAmount").value = Math.min(100, Number($("#echoAmount").value || 1) + 1); });
$("#echoSubmit").addEventListener("click", submitEchoSelection);
$("#readerEchoBtn").addEventListener("click", leaveEcho);
$("#bookmarkBtn").addEventListener("click", toggleBookmark);
$("#shareBtn").addEventListener("click", shareChapter);
$("#offlineBtn").addEventListener("click", prepareOffline);

function wireThemeButtons() {
  document.querySelectorAll("[data-theme]").forEach((button) => {
    if (button.dataset.themeBound) return;
    button.dataset.themeBound = "1";
    button.addEventListener("click", () => setTheme(button.dataset.theme));
  });
}
wireThemeButtons();
document.addEventListener("click", (event) => {
  const button = event.target.closest && event.target.closest("[data-theme]");
  if (!button) return;
  if (button.closest("#controlsDrawer") || button.closest(".reader-body")) {
    event.preventDefault();
    setTheme(button.dataset.theme);
  }
});
// Custom reader appearance
const readerCustomJson=document.getElementById("readerCustomJson");
const applyReaderCustom=document.getElementById("applyReaderCustom");
const clearReaderCustom=document.getElementById("clearReaderCustom");
try{ const raw=localStorage.getItem(storageKey("custom-theme")); if(raw && readerCustomJson) readerCustomJson.value=raw; }catch(_){}
if(applyReaderCustom) applyReaderCustom.addEventListener("click", ()=>{
  try{
    const obj=JSON.parse(readerCustomJson.value);
    if(!obj||typeof obj!=='object') throw new Error('Invalid JSON');
    if(!obj.vars||typeof obj.vars!=='object') obj.vars={};
    localStorage.setItem(storageKey("custom-theme"), JSON.stringify(obj));
    setTheme("custom");
  }catch(e){ alert('Error: '+e.message); }
});
if(clearReaderCustom) clearReaderCustom.addEventListener("click", ()=>{
  try{ localStorage.removeItem(storageKey("custom-theme")); if(readerCustomJson) readerCustomJson.value=''; }catch(_){}
});

document.querySelectorAll("[data-flow]").forEach((button) => {
  button.addEventListener("click", () => setFlow(button.dataset.flow));
});

$("#fontSelect").addEventListener("change", (event) => {
  localStorage.setItem(storageKey("font"), event.target.value);
  applyPreferences();
});

$("#sizeRange").addEventListener("input", (event) => {
  localStorage.setItem(storageKey("size"), event.target.value);
  applyPreferences();
});

$("#lineRange").addEventListener("input", (event) => {
  localStorage.setItem(storageKey("line"), event.target.value);
  applyPreferences();
});

$("#widthRange").addEventListener("input", (event) => {
  localStorage.setItem(storageKey("width"), event.target.value);
  applyPreferences();
});

let tapTimestamp = 0;
$("#main").addEventListener("click", (event) => {
  if (event.target.closest("a,button,input,select,.comments-section")) return;

  const now = Date.now();
  if (now - tapTimestamp < 300) return;

  tapTimestamp = now;
  document.body.classList.toggle("controls");
});

let touchStartX = 0;
let touchStartY = 0;

document.addEventListener("touchstart", (event) => {
  if (event.target.closest("button,a,input,select,.comments-section")) return;
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
  pageTouchStartScrollLeft = $("#manuscript")?.scrollLeft || 0;
}, { passive: true });

document.addEventListener("touchend", async (event) => {
  if (event.target.closest(".comments-section")) return;
  if (!chapter || !chapters.length) return;

  const dx = event.changedTouches[0].clientX - touchStartX;
  const dy = event.changedTouches[0].clientY - touchStartY;

  if (Math.abs(dx) <= 80 || Math.abs(dx) <= Math.abs(dy) * 1.25) return;

  if (document.body.classList.contains("pages")) {
    const track = $("#manuscript");
    if (!track) return;

    const pageWidth = track.clientWidth;
    const max = Math.max(0, track.scrollWidth - pageWidth);
    const current = track.scrollLeft;
    const atStart = current <= 2;
    const atEnd = current >= max - 2;
    const target = dx < 0
      ? Math.min(max, current + pageWidth)
      : Math.max(0, current - pageWidth);

    // First move within the current chapter. Only an already-reached boundary
    // delegates the swipe to chapter navigation.
    if (dx < 0 && !atEnd) {
      track.scrollTo({ left: target, behavior: "smooth" });
      updateProgressUI();
      return;
    }
    if (dx > 0 && !atStart) {
      track.scrollTo({ left: target, behavior: "smooth" });
      updateProgressUI();
      return;
    }

    const index = chapters.findIndex((item) => item.id === chapter.id);
    if (dx < 0 && atEnd && index < chapters.length - 1) {
      await openChapter(chapters[index + 1].id);
    } else if (dx > 0 && atStart && index > 0) {
      await openChapter(chapters[index - 1].id);
    }
    return;
  }

  // Scroll mode keeps the existing chapter-navigation gesture.
  const index = chapters.findIndex((item) => item.id === chapter.id);
  if (dx < 0 && index < chapters.length - 1) await openChapter(chapters[index + 1].id);
  if (dx > 0 && index > 0) await openChapter(chapters[index - 1].id);
}, { passive: true });

window.addEventListener("scroll", updateProgressUI, { passive: true });
$("#manuscript").addEventListener("scroll", updateProgressUI, { passive: true });

document.addEventListener("visibilitychange", async () => {
  if (document.hidden) {
    await saveProgress();
    await endReadingSession();
  } else if (chapter) {
    await startReadingSession();
  }
});

window.addEventListener("beforeunload", () => {
  if (user && chapter) {
    saveProgress();
    endReadingSession();
  }
});

setTheme(localStorage.getItem(storageKey("theme")) || "light");
applyPreferences();
setFlow(localStorage.getItem(storageKey("flow")) || "scroll");
bootstrap();
