import React from 'react';
import { supabase } from '../js/supabaseClient.js';
import { refreshUnreadBadge, showToast } from '../js/ui.js';

const PUSH_PUBLIC_KEY = 'BE9sZzg5wM_B2kTxj4yV1EfQ_5RKYvz1AhZYNEzyWn9UBrvvE0S0qfd5f0i8eqoQ1dTo-11mnNpEnxMgNfiBsLY';
const CATEGORIES = [['system', 'System'], ['comments', 'Comments'], ['likes', 'Likes'], ['reviews', 'Reviews'], ['echoes', 'Echoes'], ['collections', 'Collections']];
const CATEGORY_META = {
  system: { icon: 'system', label: 'System' }, comments: { icon: 'comments', label: 'Comments' },
  likes: { icon: 'likes', label: 'Likes' }, reviews: { icon: 'reviews', label: 'Reviews' },
  echoes: { icon: 'echoes', label: 'Echoes' }, collections: { icon: 'collections', label: 'Collections' },
};

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
}
function timeAgo(dateStr) {
  const diff = Math.max(0, (Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now'; if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`; if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function Icon({ type }) {
  const paths = {
    system: <><path d="M12 3.5 19 7v5c0 4.4-2.9 7.4-7 8.5C7.9 19.4 5 16.4 5 12V7l7-3.5Z"/><path d="M12 8v4l2.4 1.5"/></>,
    comments: <><path d="M5 6.5h14v9H9l-4 3v-12Z"/><path d="M8 10h8M8 13h5"/></>,
    likes: <><path d="M7 10v9H4V10h3Z"/><path d="M10 19h6.5c1 0 1.7-.6 2-1.5l1-4.4c.3-1.1-.5-2.1-1.6-2.1H14l.7-3.1c.2-.9-.4-1.8-1.3-2.1L10 10v9Z"/></>,
    reviews: <path d="m12 4 2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7L12 4Z"/>,
    echoes: <><circle cx="12" cy="12" r="2"/><path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.7 6.7l1.4 1.4M15.9 15.9l1.4 1.4M17.3 6.7l-1.4 1.4M8.1 15.9l-1.4 1.4"/></>,
    collections: <path d="M6 4.5h12v15l-6-3.5-6 3.5v-15Z"/>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type] || paths.system}</svg>;
}
function notificationTargetLink(n) {
  if (n.category === 'comments' || n.category === 'likes') {
    if (n.story_id && n.chapter_id) return `reader.html?story=${encodeURIComponent(n.story_id)}&chapter=${encodeURIComponent(n.chapter_number || 1)}${n.comment_id ? `&commentId=${encodeURIComponent(n.comment_id)}` : ''}`;
  }
  if (n.category === 'echoes' && n.story_id && n.chapter_id) return `reader.html?story=${encodeURIComponent(n.story_id)}&chapter=${encodeURIComponent(n.chapter_number || 1)}`;
  if (n.category === 'reviews' && n.story_id) return `story.html?id=${encodeURIComponent(n.story_id)}${n.review_id ? `#review-${encodeURIComponent(n.review_id)}` : ''}`;
  if (n.category === 'collections' && n.story_id) return `story.html?id=${encodeURIComponent(n.story_id)}`;
  return n.link || '#';
}
function safeAnnouncementLink(value) {
  const raw = String(value || '').trim(); if (!raw) return '';
  if (/^(javascript|data|vbscript):/i.test(raw)) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9_./#?=&%-]+$/i.test(raw) && !raw.startsWith('//')) return raw;
  return '';
}

export default function NotificationsPage() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [announcements, setAnnouncements] = React.useState([]);
  const [readIds, setReadIds] = React.useState(new Set());
  const [activeCategory, setActiveCategory] = React.useState('system');
  const [pushStatus, setPushStatus] = React.useState('Checking browser support…');
  const [pushLabel, setPushLabel] = React.useState('Enable push notifications');
  const [pushDisabled, setPushDisabled] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    document.body.className = '';
    document.title = 'Notifications — GidiReads';
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user || null;
      if (!mounted) return;
      setUser(u);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  async function syncPush(u) {
    if (!u) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushDisabled(true); setPushStatus('This browser does not support web push notifications. In-app announcements will still work.'); return;
    }
    if (Notification.permission === 'denied') {
      setPushDisabled(true); setPushStatus('Notifications are blocked in your browser settings. Allow them there to enable push alerts.'); return;
    }
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      const subscription = await registration.pushManager.getSubscription();
      setPushDisabled(false);
      setPushLabel(subscription ? 'Turn off push notifications' : 'Enable push notifications');
      setPushStatus(subscription ? 'Browser push alerts are enabled on this device.' : 'Push alerts are optional. Choose Enable to allow browser notifications.');
    } catch {
      setPushDisabled(true); setPushStatus('Could not prepare browser notifications. Check that sw.js is deployed at the website root.');
    }
  }

  async function loadAll(u) {
    if (!u) { setRows([]); setAnnouncements([]); setReadIds(new Set()); setLoading(false); return; }
    setLoading(true);
    try { await syncPush(u); } catch {}
    const { data, error } = await supabase.from('notifications').select('id, category, actor_id, story_id, chapter_id, comment_id, review_id, library_entry_id, message, link, is_read, created_at, profiles:actor_id(username,display_name,avatar_url)').eq('user_id', u.id).order('created_at', { ascending: false }).limit(150);
    const list = error ? [] : (data || []);
    setRows(list);
    const order = ['system', 'comments', 'likes', 'reviews', 'echoes', 'collections'];
    if (!list.some(n => n.category === activeCategory)) { const first = order.find(c => list.some(n => n.category === c)); if (first) setActiveCategory(first); }
    try { await refreshUnreadBadge(supabase, u.id); } catch {}

    // announcements
    try {
      const now = new Date().toISOString();
      const [{ data: aRows }, { data: reads }] = await Promise.all([
        supabase.from('platform_announcements').select('id,title,message,audience,category,priority,link_url,opportunity_id,publish_at,expires_at,created_at').eq('status', 'published').lte('publish_at', now).or(`expires_at.is.null,expires_at.gt.${now}`).order('publish_at', { ascending: false }).limit(100),
        supabase.from('platform_announcement_reads').select('announcement_id').eq('user_id', u.id)
      ]);
      const [{ data: profile }, { count: authoredStories }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', u.id).maybeSingle(),
        supabase.from('stories').select('id', { count: 'exact', head: true }).eq('author_id', u.id)
      ]);
      const isAdmin = profile?.role === 'admin';
      const isWriter = (authoredStories || 0) > 0;
      const allowedAudience = isAdmin ? ['all', 'readers', 'authors', 'holiday_participants', 'holiday_finalists'] : (isWriter ? ['all', 'authors'] : ['all', 'readers']);
      let eligibleIds = new Set();
      const targeted = (aRows || []).filter(a => ['holiday_participants', 'holiday_finalists'].includes(a.audience));
      if (targeted.length) {
        const oppIds = [...new Set(targeted.map(a => a.opportunity_id).filter(Boolean))];
        if (oppIds.length) {
          const { data: entries } = await supabase.from('holiday_hearts_entries').select('author_id,opportunity_id,is_finalist,status').in('opportunity_id', oppIds).not('status', 'in', '(withdrawn,rejected,disqualified)');
          (entries || []).forEach(e => { eligibleIds.add(`${e.opportunity_id}:${e.author_id}:participant`); if (e.is_finalist && e.status === 'approved') eligibleIds.add(`${e.opportunity_id}:${e.author_id}:finalist`); });
        }
      }
      const filtered = (aRows || []).filter(a => {
        if (['all', 'readers', 'authors'].includes(a.audience || 'all')) return allowedAudience.includes(a.audience || 'all');
        const kind = a.audience === 'holiday_finalists' ? 'finalist' : 'participant';
        return !!a.opportunity_id && eligibleIds.has(`${a.opportunity_id}:${u.id}:${kind}`);
      });
      setAnnouncements(filtered);
      setReadIds(new Set((reads || []).map(x => x.announcement_id)));
    } catch { setAnnouncements([]); }
    setLoading(false);
  }

  React.useEffect(() => { loadAll(user); }, [user]);

  const counts = React.useMemo(() => {
    const c = {};
    rows.forEach(n => { if (!n.is_read) c[n.category] = (c[n.category] || 0) + 1; });
    return c;
  }, [rows]);
  const visible = rows.filter(n => n.category === activeCategory);
  const unreadAnnouncements = announcements.filter(a => !readIds.has(a.id)).length;

  async function togglePush() {
    if (!user) return;
    setPushDisabled(true);
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id);
        setPushStatus('Push alerts are turned off on this device.');
      } else {
        let permission = Notification.permission;
        if (permission === 'default') permission = await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('Browser notification permission was not granted.');
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(PUSH_PUBLIC_KEY) });
        const { error } = await supabase.from('push_subscriptions').upsert({ user_id: user.id, endpoint: subscription.endpoint, subscription: subscription.toJSON(), updated_at: new Date().toISOString() }, { onConflict: 'endpoint' });
        if (error) { await subscription.unsubscribe(); throw error; }
        setPushStatus('Push alerts are enabled on this device.');
      }
    } catch (e) { setPushStatus(e?.message || 'Could not update push notification settings.'); }
    finally { await syncPush(user); }
  }

  async function markRowRead(n) {
    if (!user || n.is_read) return notificationTargetLink(n);
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', n.id).eq('user_id', user.id);
    if (!error) {
      setRows(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      try { await refreshUnreadBadge(supabase, user.id); } catch {}
    } else { showToast(`Could not mark notification as read: ${error.message}`); }
    return notificationTargetLink(n);
  }

  async function markAllRead() {
    if (!user) return;
    setBusy(true);
    await Promise.all([
      supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false),
      (async () => {
        const unread = announcements.filter(a => !readIds.has(a.id)).map(a => a.id);
        if (!unread.length) return;
        await supabase.from('platform_announcement_reads').upsert(unread.map(announcement_id => ({ announcement_id, user_id: user.id, read_at: new Date().toISOString() })), { onConflict: 'announcement_id,user_id' });
        setReadIds(new Set([...readIds, ...unread]));
      })()
    ]);
    setRows(prev => prev.map(n => ({ ...n, is_read: true })));
    try { await refreshUnreadBadge(supabase, user.id); } catch {}
    showToast('All notifications marked as read.');
    setBusy(false);
  }

  async function markAnnouncementRead(id) {
    if (!user || readIds.has(id)) return;
    const { error } = await supabase.from('platform_announcement_reads').upsert({ announcement_id: id, user_id: user.id, read_at: new Date().toISOString() }, { onConflict: 'announcement_id,user_id' });
    if (!error) { setReadIds(prev => new Set([...prev, id])); try { await refreshUnreadBadge(supabase, user.id); } catch {} }
  }

  return (
    <main role="main" id="main-content">
      <section className="notifications-hero">
        <div className="section-inner notifications-head">
          <div>
            <p className="hero-eyebrow">YOUR GIDIREADS ACTIVITY</p>
            <h1 className="explore-title">Notifications</h1>
            <p className="notifications-subtitle">A quiet place for the people, stories and updates that matter to you.</p>
          </div>
          <button className="notifications-mark-all" type="button" onClick={markAllRead} disabled={busy || loading || !user}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 9.5 17 19 7.5" /></svg>
            <span>Mark all as read</span>
          </button>
        </div>
      </section>

      <section className="section notifications-section">
        <div className="section-inner">
          <div className="notification-toolbar">
            <div>
              <p className="notification-toolbar-label">ACTIVITY</p>
              <h2>Recent notifications</h2>
            </div>
            <p className="notification-toolbar-note">Unread activity glows until you open it.</p>
          </div>

          {announcements.length > 0 && (
            <section className="announcement-feed-panel" aria-labelledby="announcementFeedTitle">
              <div className="announcement-feed-head">
                <div><p className="notification-toolbar-label">FROM GIDIREADS</p><h2 id="announcementFeedTitle">Platform announcements</h2></div>
                <span className="announcement-feed-count">{unreadAnnouncements ? `${unreadAnnouncements} unread` : 'All caught up'}</span>
              </div>
              <div>
                {announcements.map(a => {
                  const read = readIds.has(a.id);
                  const link = safeAnnouncementLink(a.link_url);
                  return (
                    <article key={a.id} className={`announcement-feed-item ${read ? 'is-read' : 'is-unread'}`}>
                      <div className="announcement-feed-mark" aria-hidden="true">{a.priority === 'urgent' ? '!' : 'G'}</div>
                      <div className="announcement-feed-copy">
                        <div className="announcement-feed-meta">
                          <span className="announcement-feed-category">{a.category || 'platform'}</span>
                          {a.priority && a.priority !== 'normal' ? <span className={`announcement-priority priority-${a.priority}`}>{a.priority}</span> : null}
                          <time>{timeAgo(a.publish_at || a.created_at)}</time>
                        </div>
                        <h3>{a.title}</h3>
                        <p>{a.message}</p>
                        <div className="announcement-feed-actions">
                          {link ? <a href={link} {...(/^https?:\/\//i.test(link) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>Open update <span aria-hidden="true">→</span></a> : null}
                          <button type="button" onClick={() => markAnnouncementRead(a.id)} disabled={read}>{read ? 'Read' : 'Mark as read'}</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {user && (
            <section className="push-optin-panel" aria-label="Browser push notification settings">
              <div className="push-optin-copy">
                <p className="notification-toolbar-label">STAY IN THE LOOP</p>
                <h2>Browser push alerts</h2>
                <p>Get important GidiReads announcements even when this page is closed. You can turn them off any time.</p>
                <span role="status" aria-live="polite">{pushStatus}</span>
              </div>
              <button className="btn btn-primary" type="button" onClick={togglePush} disabled={pushDisabled}>{pushLabel}</button>
            </section>
          )}

          <div className="notification-tabs" role="tablist" aria-label="Notification categories">
            {CATEGORIES.map(([value, label]) => {
              const count = counts[value] || 0;
              return (
                <button key={value} type="button" role="tab" aria-selected={activeCategory === value} className={`notification-tab ${activeCategory === value ? 'active' : ''}`} onClick={() => setActiveCategory(value)}>
                  <span className="notification-tab-icon"><Icon type={CATEGORY_META[value].icon} /></span>
                  <span>{label}</span>
                  {count ? <b className="notification-tab-count">{count > 99 ? '99+' : count}</b> : null}
                </button>
              );
            })}
          </div>

          <div id="notificationsList">
            {loading ? <div className="empty-row">Loading…</div> : visible.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-mark"><Icon type={CATEGORY_META[activeCategory]?.icon || 'system'} /></div>
                <h3>No {CATEGORY_META[activeCategory]?.label.toLowerCase() || 'new'} notifications yet</h3>
                <p>New activity will appear here when there is something to show.</p>
              </div>
            ) : visible.map(n => {
              const profile = n.profiles || null;
              const isSystem = n.category === 'system';
              const username = isSystem ? 'GidiReads' : (profile?.username ? `@${profile.username}` : (profile?.display_name || 'GidiReads'));
              const display = !isSystem && profile?.display_name && profile.display_name !== profile.username ? profile.display_name : '';
              const link = notificationTargetLink(n);
              const actorName = profile?.display_name || profile?.username || '';
              const msg = (isSystem ? (n.message || '') : (n.message || '').replace(actorName, '')).trim();
              return (
                <a key={n.id} href={link} className={`notification-row ${n.is_read ? 'is-read' : 'is-unread'}`} onClick={async (e) => { e.preventDefault(); const target = await markRowRead(n); if (target && target !== '#') window.location.href = target; }}>
                  <span className="notification-avatar-wrap">
                    {isSystem ? <img className="notification-avatar notification-avatar-system" src="assets/gidireads-logo.png" alt="GidiReads system" loading="lazy" /> : profile?.avatar_url ? <img className="notification-avatar" src={profile.avatar_url} alt="" loading="lazy" /> : <span className="notification-avatar notification-avatar-fallback">{(profile?.username || profile?.display_name || 'G').charAt(0).toUpperCase()}</span>}
                    <span className={`notification-type-icon notification-type-${n.category}`}><Icon type={CATEGORY_META[n.category]?.icon || 'system'} /></span>
                  </span>
                  <span className="notification-body">
                    <span className="notification-topline"><strong>{username}</strong>{display ? <span className="notification-display-name">{display}</span> : null}</span>
                    <span className="notification-message">{msg}</span>
                    <span className="notification-time">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.is_read ? <span className="notification-unread-mark" aria-label="Unread"></span> : null}
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
