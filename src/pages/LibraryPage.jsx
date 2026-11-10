import React from 'react';
import { supabase } from '../js/supabaseClient.js';
import { showToast, refreshUnreadBadge } from '../js/ui.js';
import { mountMyLists } from '../js/reading-lists.js';

function esc(v = '') { return String(v); }
function compact(n) {
  n = Number(n || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 ? 1 : 0).replace('.0', '')}m`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 ? 1 : 0).replace('.0', '')}k`;
  return String(n);
}
function authorName(story) { return story?.profiles?.display_name || story?.profiles?.username || 'Unknown author'; }
function statusLabel(s) { return s === 'completed' ? 'Completed' : s === 'reading' ? 'Reading' : 'Saved'; }

function Cover({ url, title, cls = 'card-cover' }) {
  if (url) return <div className={cls}><img src={url} alt={`${title} cover`} loading="lazy" /></div>;
  return <div className={`${cls} cover-placeholder`}>{(title || '?')[0].toUpperCase()}</div>;
}

export default function LibraryPage() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [entries, setEntries] = React.useState([]);
  const [bookmarks, setBookmarks] = React.useState([]);
  const [progressMap, setProgressMap] = React.useState(new Map());
  const [offlineMap, setOfflineMap] = React.useState(new Map());
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selected, setSelected] = React.useState(new Set());
  const [menu, setMenu] = React.useState(null); // {storyId, x, y}
  const [toast, setToast] = React.useState('');
  const listsRef = React.useRef(null);
  const longPressTimer = React.useRef(null);
  const suppressClickId = React.useRef(null);

  const showLocalToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3200); try { showToast(msg); } catch {} };

  const progressFor = React.useCallback((entry) => {
    const p = progressMap.get(entry.story_id);
    return Math.max(0, Math.min(100, Number(p?.progress_percent ?? p?.chapter_progress_percent ?? 0)));
  }, [progressMap]);

  async function loadShelf(uid) {
    setLoading(true);
    const [entryRes, bookmarkRes, progressRes, offlineRes] = await Promise.all([
      supabase.from('library_entries').select('id,status,last_chapter_number,story_id,updated_at,stories(id,title,description,cover_url,primary_genre,secondary_genre,tags,reads,echo_count,status,profiles!stories_author_id_fkey(username,display_name,avatar_url))').eq('reader_id', uid).order('updated_at', { ascending: false }),
      supabase.from('reading_bookmarks').select('id,story_id,chapter_id,created_at,stories(id,title,cover_url,profiles!stories_author_id_fkey(username,display_name)),chapters(id,title,chapter_number,content_type,is_published)').eq('reader_id', uid).order('created_at', { ascending: false }),
      supabase.from('reading_progress').select('story_id,chapter_id,progress_percent,chapter_progress_percent,last_read_at').eq('reader_id', uid),
      supabase.from('reading_offline_items').select('story_id,downloaded_chapters,last_synced_at').eq('reader_id', uid)
    ]);
    setEntries(entryRes.error ? [] : (entryRes.data || []));
    setBookmarks(bookmarkRes.error ? [] : (bookmarkRes.data || []));
    setProgressMap(new Map((progressRes.data || []).map(x => [x.story_id, x])));
    setOfflineMap(new Map((offlineRes.data || []).map(x => [x.story_id, x])));
    setLoading(false);
  }

  React.useEffect(() => {
    document.body.className = 'library-page';
    document.title = 'My Shelf — GidiReads';
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user || null;
      if (!mounted) return;
      setUser(u);
      if (u) { await loadShelf(u.id); try { refreshUnreadBadge(supabase, u.id); } catch {} }
      else setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) loadShelf(u.id); else { setEntries([]); setBookmarks([]); setLoading(false); }
    });
    return () => { mounted = false; document.body.className = ''; sub?.subscription?.unsubscribe?.(); };
  }, []);

  React.useEffect(() => {
    if (user && listsRef.current) {
      try { mountMyLists(listsRef.current, supabase, user); } catch (_) {}
    }
  }, [user]);

  const reading = React.useMemo(() => entries.filter(e => e.status === 'reading').sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)), [entries]);
  const bookmarkedStories = React.useMemo(() => {
    const out = []; const seen = new Set();
    bookmarks.forEach(b => { if (b.stories && !seen.has(b.story_id)) { seen.add(b.story_id); out.push(b); } });
    return out;
  }, [bookmarks]);
  const seenIds = React.useMemo(() => new Set(bookmarkedStories.map(b => b.story_id)), [bookmarkedStories]);
  const saved = React.useMemo(() => entries.filter(e => e.status === 'saved' && !seenIds.has(e.story_id)), [entries, seenIds]);
  const completed = React.useMemo(() => entries.filter(e => e.status === 'completed' && !seenIds.has(e.story_id)), [entries, seenIds]);

  const availableIds = entries.filter(e => e.stories).map(e => e.story_id);
  const allSelected = availableIds.length > 0 && availableIds.every(id => selected.has(id));
  const someSelected = availableIds.some(id => selected.has(id));

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelectionMode(false); setSelected(new Set()); }
  function enterSelectionMode(id = null) {
    setSelectionMode(true);
    if (id) setSelected(prev => new Set(prev).add(id));
  }
  async function removeSelected() {
    const ids = [...selected];
    if (!ids.length || !user) return;
    if (!window.confirm(`Remove ${ids.length} selected ${ids.length === 1 ? 'novel' : 'novels'} from your library? The original published stories will remain on GidiReads.`)) return;
    const owned = entries.filter(e => ids.includes(e.story_id));
    if (!owned.length) { clearSelection(); return; }
    const { error } = await supabase.from('library_entries').delete().eq('reader_id', user.id).in('story_id', owned.map(e => e.story_id));
    if (error) { showLocalToast('Could not remove the selected novels. Please try again.'); return; }
    const removed = new Set(owned.map(e => e.story_id));
    setEntries(prev => prev.filter(e => !removed.has(e.story_id)));
    clearSelection();
    showLocalToast(`${removed.size} ${removed.size === 1 ? 'novel' : 'novels'} removed from your library.`);
  }

  async function handleMenuAction(action, id) {
    const entry = entries.find(e => e.story_id === id);
    const s = entry?.stories;
    if (!s) return;
    if (action === 'select-remove') { setMenu(null); enterSelectionMode(); return; }
    if (action === 'share') {
      const url = `${window.location.origin}/story.html?id=${encodeURIComponent(id)}`;
      try {
        if (navigator.share) await navigator.share({ title: s.title, text: `Read ${s.title} on GidiReads.`, url });
        else { await navigator.clipboard.writeText(url); showLocalToast('Story link copied.'); }
      } catch (e) { if (e?.name !== 'AbortError') showLocalToast('Could not share this story.'); }
      setMenu(null); return;
    }
    if (action === 'offline') { setMenu(null); window.location.href = `reader.html?story=${encodeURIComponent(id)}&download=1`; return; }
    if (action === 'remove') {
      const { error } = await supabase.from('library_entries').delete().eq('id', entry.id).eq('reader_id', user.id);
      if (error) showLocalToast('Could not remove this story.');
      else { setEntries(prev => prev.filter(e => e.id !== entry.id)); showLocalToast('Removed from your shelf.'); setMenu(null); }
    }
  }

  function storyHref(entry) {
    const s = entry.stories; if (!s) return '#';
    const readingStatus = entry.status === 'reading';
    const chapter = entry.last_chapter_number || 1;
    return readingStatus ? `reader.html?story=${encodeURIComponent(s.id)}&chapter=${chapter}` : `story.html?id=${encodeURIComponent(s.id)}`;
  }

  function StoryCard({ entry, bookmarkCount = 0, isBookmarkCard = false }) {
    const s = entry.stories; if (!s) return null;
    const p = progressFor(entry);
    const offline = offlineMap.get(s.id);
    const isReading = entry.status === 'reading';
    const isCompleted = entry.status === 'completed';
    const isSelected = selected.has(s.id);
    const href = isBookmarkCard ? (isReading ? `reader.html?story=${encodeURIComponent(s.id)}&chapter=${entry.last_chapter_number || 1}` : `story.html?id=${encodeURIComponent(s.id)}`) : storyHref(entry);

    return (
      <article
        className={`story-card${isSelected ? ' is-selected' : ''}${selectionMode && !isBookmarkCard ? ' selection-mode' : ''}${isBookmarkCard ? ' bookmarked-story-card' : ''}`}
        data-story-id={s.id}
        onClick={(e) => {
          if (suppressClickId.current === s.id) { suppressClickId.current = null; e.preventDefault(); e.stopPropagation(); return; }
          if (!isBookmarkCard && selectionMode && !e.target.closest('[data-menu-story],.library-select-story,button')) {
            e.preventDefault(); toggleSelect(s.id);
          }
        }}
        onPointerDown={(e) => {
          if (isBookmarkCard || selectionMode) return;
          if (e.target.closest('[data-menu-story],.library-select-story,input,button')) return;
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          clearTimeout(longPressTimer.current);
          longPressTimer.current = setTimeout(() => { suppressClickId.current = s.id; enterSelectionMode(s.id); }, 550);
        }}
        onPointerUp={() => { clearTimeout(longPressTimer.current); }}
        onPointerLeave={() => { clearTimeout(longPressTimer.current); }}
      >
        {!isBookmarkCard && (
          <label className="library-select-story" hidden={!selectionMode}>
            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(s.id)} aria-label={`Select ${s.title} for removal`} />
            <span></span>
          </label>
        )}
        <a href={href} aria-label={`Open ${s.title}`}>
          <Cover url={s.cover_url} title={s.title} />
          {isBookmarkCard
            ? <span className="status-chip bookmark-status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4z" /></svg>{bookmarkCount > 1 ? `${bookmarkCount} bookmarks` : 'Bookmarked'}</span>
            : <span className="status-chip">{statusLabel(entry.status)}</span>}
        </a>
        <button className="menu-trigger" aria-label={`More actions for ${s.title}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMenu({ storyId: s.id, x: Math.min(window.innerWidth - 276, Math.max(12, r.right - 260)), y: Math.min(window.innerHeight - 250, r.bottom + 8) }); }}>⋯</button>
        <div className="card-body">
          <h3 className="card-title">{s.title}</h3>
          <p className="card-author">{authorName(s)}</p>
          {isReading ? (
            <>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${p}%` }}></div></div>
              <div className="progress-line"><span>{Math.round(p)}% read</span><span>Ch. {entry.last_chapter_number || 1}</span></div>
            </>
          ) : (
            <div className="card-meta"><span>{compact(s.reads)} reads</span><span className="echo">✦ {compact(s.echo_count)} echoes</span>{offline ? <span>Offline</span> : null}{isBookmarkCard && isCompleted ? <span>Finished</span> : null}</div>
          )}
          {!isBookmarkCard && isCompleted ? <div className="card-meta" style={{ marginTop: 10 }}><span>Finished</span></div> : null}
        </div>
      </article>
    );
  }

  function Section({ kicker, title, items, seeKey, renderItem, id }) {
    if (!items.length) return null;
    return (
      <section className={`shelf-section${id === 'continueSection' ? ' continue-section' : ''}${id === 'bookmarksSection' ? ' bookmarks-section' : ''}`} id={id}>
        <div className="shelf-section-head">
          <div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>
          {items.length > 6 ? <button className="see-all" onClick={() => showLocalToast('Your shelf keeps your collection here.')}>See all <span>→</span></button> : null}
        </div>
        <div className={`story-grid${id === 'bookmarksSection' ? ' bookmark-story-grid' : ''}`}>{items.slice(0, 6).map(renderItem)}</div>
      </section>
    );
  }

  const menuEntry = menu ? entries.find(e => e.story_id === menu.storyId) : null;
  const globalEmpty = !loading && user && entries.length === 0 && bookmarks.length === 0;

  return (
    <>
      <main className="library-main">
        <section className="library-hero">
          <div className="library-hero-glow"></div>
          <div className="library-hero-stars" aria-hidden="true"></div>
          <div className="library-hero-inner section-inner">
            <div className="library-hero-copy">
              <div className="shelf-heading"><span className="shelf-icon" aria-hidden="true"><svg viewBox="0 0 72 72"><path d="M14 19c0-3 2-5 5-5h34c3 0 5 2 5 5v39H19c-3 0-5-2-5-5V19z"/><path d="M14 51c0-4 3-7 7-7h37M26 22h20M26 30h20M26 38h14"/></svg></span><span>MY SHELF</span></div>
              <h1>My Shelf</h1>
              <div className="hero-rule"><span></span><i></i><span></span></div>
            </div>
            <div className="library-hero-art" aria-hidden="true">
              <svg className="anime-sketch anime-sketch-one" viewBox="0 0 280 360"><path className="sketch-line" d="M111 86c-5-35 8-58 40-67 35-10 65 9 70 43 5 34-13 66-43 73-33 8-62-14-67-49z"/></svg>
            </div>
          </div>
        </section>

        <section className="library-content section-inner">
          {!user && !loading && (
            <div className="library-login-state">
              <div className="login-state-icon"><svg viewBox="0 0 64 64"><path d="M11 18h42v32H11z"/><path d="M11 26h42M22 18v32M42 18v32"/><path d="M29 8l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg></div>
              <h2>Your shelf is waiting.</h2>
              <a className="btn btn-primary" href="/auth?mode=login&returnTo=%2Flibrary">Log in to open it</a>
            </div>
          )}

          {user && (
            <div id="libraryApp">
              <div className="library-bulk-toolbar" hidden={!selectionMode || availableIds.length === 0}>
                <label><input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={(e) => { if (e.target.checked) setSelected(new Set(availableIds)); else setSelected(new Set()); }} /> <span>Select all novels</span></label>
                <span>{selected.size} selected</span>
                <button type="button" onClick={removeSelected} disabled={selected.size === 0}>Remove selected</button>
                <button type="button" onClick={clearSelection}>Cancel</button>
              </div>

              {loading ? <div className="library-loading">Loading…</div> : (
                <>
                  <Section id="continueSection" kicker="PICK UP WHERE YOU LEFT OFF" title="Continue Reading" items={reading} renderItem={(e) => <StoryCard key={e.id} entry={e} />} />
                  <Section id="bookmarksSection" kicker="BOOKMARKED STORIES" title="Bookmarked" items={bookmarkedStories} renderItem={(b) => {
                    const entry = entries.find(e => e.story_id === b.story_id) || { story_id: b.story_id, status: 'saved', last_chapter_number: 1, stories: b.stories };
                    const count = bookmarks.filter(x => x.story_id === b.story_id).length;
                    return <StoryCard key={b.id} entry={entry} bookmarkCount={count} isBookmarkCard />;
                  }} />
                  <Section id="savedSection" kicker="YOUR COLLECTION" title="My Shelf" items={saved} renderItem={(e) => <StoryCard key={e.id} entry={e} />} />
                  <section className="shelf-section rl-section" id="myListsSection" ref={listsRef}></section>
                  <Section id="completedSection" kicker="FINISHED WORLDS" title="Completed" items={completed} renderItem={(e) => <StoryCard key={e.id} entry={e} />} />
                  {globalEmpty && (
                    <section className="shelf-empty">
                      <div className="empty-orbit"><span></span><span></span><span></span><svg viewBox="0 0 80 80"><path d="M14 22h52v38H14zM14 31h52M28 22v38M52 22v38"/><path d="M38 10l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg></div>
                      <h2>Nothing on your shelf yet.</h2>
                      <a href="explore.html" className="btn btn-primary">Explore stories</a>
                    </section>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </main>

      {menu && menuEntry && (
        <>
          <div className="library-menu-overlay" onClick={() => setMenu(null)}></div>
          <div className="story-menu" style={{ left: menu.x, top: menu.y, position: 'fixed' }}>
            <div className="story-menu-head"><span>Story actions</span><button onClick={() => setMenu(null)} aria-label="Close">×</button></div>
            <div>
              {menuEntry.status === 'reading' ? <a className="story-menu-item" href={`reader.html?story=${encodeURIComponent(menu.storyId)}&chapter=${menuEntry.last_chapter_number || 1}`}>Continue Reading</a> : null}
              <a className="story-menu-item" href={`story.html?id=${encodeURIComponent(menu.storyId)}`}>Story Info</a>
              <button className="story-menu-item" onClick={() => handleMenuAction('share', menu.storyId)}>Share Story</button>
              <button className="story-menu-item" onClick={() => handleMenuAction('offline', menu.storyId)}>{offlineMap.has(menu.storyId) ? 'Saved Offline' : 'Download Offline'}</button>
              <button className="story-menu-item danger" onClick={() => handleMenuAction('remove', menu.storyId)}>Remove from Library</button>
              <button className="story-menu-item" onClick={() => handleMenuAction('select-remove', menu.storyId)}>Select to Remove from Library</button>
            </div>
          </div>
        </>
      )}

      <div className="toast" hidden={!toast} style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>{toast}</div>
    </>
  );
}
