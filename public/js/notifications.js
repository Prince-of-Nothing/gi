import { supabase } from './supabaseClient.js';
import { signUpWithUsername } from './auth-guard.js';
import { wireWriteSheet, refreshUnreadBadge, showToast } from './ui.js';

let currentUser = null;
let authMode = 'login';
let activeCategory = 'system';
let isWriter = false;
let notificationRows = [];
let announcementRows = [];
let announcementReadIds = new Set();
const PUSH_PUBLIC_KEY = 'BE9sZzg5wM_B2kTxj4yV1EfQ_5RKYvz1AhZYNEzyWn9UBrvvE0S0qfd5f0i8eqoQ1dTo-11mnNpEnxMgNfiBsLY';
const pushOptinPanel = document.getElementById('pushOptinPanel');
const pushOptinButton = document.getElementById('pushOptinButton');
const pushOptinStatus = document.getElementById('pushOptinStatus');

const loginBtn = document.getElementById('loginBtn');
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authUsername = document.getElementById('authUsername');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authError = document.getElementById('authError');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authSwitchBtn = document.getElementById('authSwitchBtn');
const authSwitchPrompt = document.getElementById('authSwitchPrompt');
const authModalTitle = document.getElementById('authModalTitle');
const authModalSub = document.getElementById('authModalSub');
const loggedOutState = document.getElementById('loggedOutState');
const notificationsList = document.getElementById('notificationsList');
const notificationTabs = document.getElementById('notificationTabs');
const markAllReadBtn = document.getElementById('markAllReadBtn');
const announcementFeedPanel = document.getElementById('announcementFeedPanel');
const announcementFeed = document.getElementById('announcementFeed');
const announcementFeedCount = document.getElementById('announcementFeedCount');


function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
}
function setPushStatus(message) { if (pushOptinStatus) pushOptinStatus.textContent = message; }
async function syncPushControls() {
  if (!pushOptinPanel || !currentUser) { if(pushOptinPanel) pushOptinPanel.hidden=true; return; }
  pushOptinPanel.hidden=false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    pushOptinButton.disabled=true; setPushStatus('This browser does not support web push notifications. In-app announcements will still work.'); return;
  }
  if (Notification.permission === 'denied') {
    pushOptinButton.disabled=true; setPushStatus('Notifications are blocked in your browser settings. Allow them there to enable push alerts.'); return;
  }
  try {
    const registration = await navigator.serviceWorker.register('./sw.js');
    const subscription = await registration.pushManager.getSubscription();
    pushOptinButton.disabled=false;
    pushOptinButton.textContent=subscription?'Turn off push notifications':'Enable push notifications';
    setPushStatus(subscription?'Browser push alerts are enabled on this device.':'Push alerts are optional. Choose Enable to allow browser notifications.');
  } catch (error) {
    pushOptinButton.disabled=true; setPushStatus('Could not prepare browser notifications. Check that sw.js is deployed at the website root.');
  }
}
async function togglePushNotifications() {
  if(!currentUser) { setPushStatus('Log in first to enable push alerts.'); return; }
  pushOptinButton.disabled=true;
  try {
    const registration=await navigator.serviceWorker.register('./sw.js');
    let subscription=await registration.pushManager.getSubscription();
    if(subscription) {
      const endpoint=subscription.endpoint;
      await subscription.unsubscribe();
      const {error}=await supabase.from('push_subscriptions').delete().eq('endpoint',endpoint).eq('user_id',currentUser.id);
      if(error) throw error;
      setPushStatus('Push alerts are turned off on this device.');
    } else {
      let permission=Notification.permission;
      if(permission==='default') permission=await Notification.requestPermission();
      if(permission!=='granted') throw new Error('Browser notification permission was not granted.');
      subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(PUSH_PUBLIC_KEY)});
      const {error}=await supabase.from('push_subscriptions').upsert({user_id:currentUser.id,endpoint:subscription.endpoint,subscription:subscription.toJSON(),updated_at:new Date().toISOString()},{onConflict:'endpoint'});
      if(error) { await subscription.unsubscribe(); throw error; }
      setPushStatus('Push alerts are enabled on this device.');
    }
  } catch(error) { setPushStatus(error?.message||'Could not update push notification settings.'); }
  finally { pushOptinButton.disabled=false; await syncPushControls(); }
}
pushOptinButton?.addEventListener('click',togglePushNotifications);

function openModal(){const r=location.pathname.split('/').pop()+location.search+location.hash;location.href='auth.html?mode=login&returnTo='+encodeURIComponent(r)}
function closeModal(modal) { modal.hidden = true; document.body.style.overflow = ''; }

document.querySelectorAll('[data-close="auth"]').forEach((btn) => btn.addEventListener('click', () => closeModal(authModal)));
authModal.addEventListener('click', (e) => { if (e.target === authModal) closeModal(authModal); });

loginBtn.addEventListener('click', () => {
  if (currentUser) supabase.auth.signOut();
  else { authModalSub.textContent = 'Log in to publish and follow stories.'; openModal(authModal); }
});

const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
forgotPasswordBtn.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  if (!email) { authError.textContent = 'Enter your email above first, then tap "Forgot password?" again.'; authError.hidden = false; return; }
  forgotPasswordBtn.disabled = true;
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  forgotPasswordBtn.disabled = false;
  if (error) { authError.textContent = error.message; authError.hidden = false; }
  else { authModalSub.textContent = 'If that email has an account, a reset link is on its way.'; authError.hidden = true; }
});

authSwitchBtn.addEventListener('click', () => { authMode = authMode === 'login' ? 'signup' : 'login'; updateAuthModeUI(); });
function updateAuthModeUI() {
  authError.hidden = true;
  if (authMode === 'signup') {
    authModalTitle.textContent = 'Create your account'; authSubmitBtn.textContent = 'Create account';
    authSwitchPrompt.textContent = 'Already have an account?'; authSwitchBtn.textContent = 'Log in'; authUsername.parentElement.style.display = 'flex';
  } else {
    authModalTitle.textContent = 'Welcome to GidiReads'; authSubmitBtn.textContent = 'Log in';
    authSwitchPrompt.textContent = 'New to GidiReads?'; authSwitchBtn.textContent = 'Create an account'; authUsername.parentElement.style.display = 'none';
  }
}
updateAuthModeUI();

authForm.addEventListener('submit', async (e) => {
  e.preventDefault(); authError.hidden = true; authSubmitBtn.disabled = true;
  try {
    const email = authEmail.value.trim(), password = authPassword.value;
    if (authMode === 'signup') {
      const username = authUsername.value.trim(); if (!username) throw new Error('Please choose a username.');
      const data = await signUpWithUsername(supabase, { username, email, password });
      if (!data.session) { authModalSub.textContent = 'Check your email to confirm your account, then log in.'; authMode = 'login'; updateAuthModeUI(); authForm.reset(); return; }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error;
    }
    authForm.reset(); closeModal(authModal);
  } catch (err) { authError.textContent = err.message || 'Something went wrong. Please try again.'; authError.hidden = false; }
  finally { authSubmitBtn.disabled = false; }
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user ?? null;
  loginBtn.textContent = currentUser ? 'Log out' : 'Log in';
  refreshUnreadBadge(supabase, currentUser?.id);
  loadNotifications();
});

function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str ?? ''; return div.innerHTML; }
function escapeAttr(str) { return escapeHtml(str).replace(/`/g, '&#96;'); }
function timeAgo(dateStr) {
  const diff = Math.max(0, (Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now'; if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`; if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const baseCategories = [['system','System'],['comments','Comments'],['likes','Likes'],['reviews','Reviews']];
const writerCategories = [['echoes','Echoes'],['collections','Collections']];
const categoryMeta = {
  system:{ icon:'system', label:'System' }, comments:{ icon:'comments', label:'Comments' },
  likes:{ icon:'likes', label:'Likes' }, reviews:{ icon:'reviews', label:'Reviews' }, echoes:{ icon:'echoes', label:'Echoes' }, collections:{ icon:'collections', label:'Collections' }
};

function iconSvg(type) {
  const paths = {
    all:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2 10.8 14.5 15.8 9.5"/>',
    system:'<path d="M12 3.5 19 7v5c0 4.4-2.9 7.4-7 8.5C7.9 19.4 5 16.4 5 12V7l7-3.5Z"/><path d="M12 8v4l2.4 1.5"/>',
    comments:'<path d="M5 6.5h14v9H9l-4 3v-12Z"/><path d="M8 10h8M8 13h5"/>',
    likes:'<path d="M7 10v9H4V10h3Z"/><path d="M10 19h6.5c1 0 1.7-.6 2-1.5l1-4.4c.3-1.1-.5-2.1-1.6-2.1H14l.7-3.1c.2-.9-.4-1.8-1.3-2.1L10 10v9Z"/>',
    reviews:'<path d="m12 4 2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7L12 4Z"/>',
    echoes:'<circle cx="12" cy="12" r="2"/><path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.7 6.7l1.4 1.4M15.9 15.9l1.4 1.4M17.3 6.7l-1.4 1.4M8.1 15.9l-1.4 1.4"/>',
    collections:'<path d="M6 4.5h12v15l-6-3.5-6 3.5v-15Z"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[type] || paths.system}</svg>`;
}

function categoryCounts() {
  const counts = {};
  notificationRows.forEach(n => { if (!n.is_read) counts[n.category] = (counts[n.category] || 0) + 1; });
  return counts;
}

function renderTabs() {
  const tabs = [...baseCategories, ...writerCategories];
  const counts = categoryCounts();
  notificationTabs.innerHTML = tabs.map(([value,label]) => {
    const count = counts[value] || 0;
    return `<button type="button" role="tab" aria-selected="${activeCategory===value}" class="notification-tab ${activeCategory===value?'active':''}" data-category="${value}">
      <span class="notification-tab-icon">${iconSvg(categoryMeta[value].icon)}</span><span>${label}</span>${count ? `<b class="notification-tab-count">${count > 99 ? '99+' : count}</b>` : ''}
    </button>`;
  }).join('');
  notificationTabs.querySelectorAll('[data-category]').forEach(btn => btn.addEventListener('click', () => { activeCategory = btn.dataset.category; renderTabs(); renderNotificationRows(); }));
}

function avatarMarkup(profile, isSystem = false) {
  if (isSystem) return `<img class="notification-avatar notification-avatar-system" src="assets/gidireads-logo.png" alt="GidiReads system" loading="lazy" />`;
  const name = profile?.username || profile?.display_name || 'GidiReads';
  const initial = escapeHtml(name.charAt(0).toUpperCase());
  if (profile?.avatar_url) return `<img class="notification-avatar" src="${escapeAttr(profile.avatar_url)}" alt="" loading="lazy" />`;
  return `<span class="notification-avatar notification-avatar-fallback">${initial}</span>`;
}

function notificationTargetLink(n) {
  if (n.category === 'comments' || n.category === 'likes') {
    if (n.story_id && n.chapter_id && n.comment_id) {
      return `reader.html?story=${encodeURIComponent(n.story_id)}&chapter=${encodeURIComponent(n.chapter_number || 1)}&commentId=${encodeURIComponent(n.comment_id)}`;
    }
    if (n.story_id && n.chapter_id) {
      return `reader.html?story=${encodeURIComponent(n.story_id)}&chapter=${encodeURIComponent(n.chapter_number || 1)}`;
    }
  }
  if (n.category === 'echoes' && n.story_id && n.chapter_id) {
    return `reader.html?story=${encodeURIComponent(n.story_id)}&chapter=${encodeURIComponent(n.chapter_number || 1)}`;
  }
  if (n.category === 'reviews' && n.story_id) {
    return `story.html?id=${encodeURIComponent(n.story_id)}${n.review_id ? `#review-${encodeURIComponent(n.review_id)}` : ''}`;
  }
  if (n.category === 'collections' && n.story_id) {
    return `story.html?id=${encodeURIComponent(n.story_id)}`;
  }
  return n.link || '#';
}

function renderNotificationRows() {
  const data = notificationRows.filter(n => n.category === activeCategory);
  if (!data.length) {
    notificationsList.innerHTML = `<div class="notification-empty"><div class="notification-empty-mark">${iconSvg(categoryMeta[activeCategory]?.icon || 'system')}</div><h3>No ${categoryMeta[activeCategory]?.label.toLowerCase() || 'new'} notifications yet</h3><p>New activity will appear here when there is something to show.</p></div>`;
    return;
  }
  notificationsList.innerHTML = data.map(n => {
    const profile = n.profiles || null;
    const isSystem = n.category === 'system';
    const username = isSystem ? 'GidiReads' : (profile?.username ? `@${profile.username}` : (profile?.display_name || 'GidiReads'));
    const display = !isSystem && profile?.display_name && profile.display_name !== profile.username ? profile.display_name : '';
    const icon = iconSvg(categoryMeta[n.category]?.icon || 'system');
    const link = notificationTargetLink(n);
    return `<a href="${escapeAttr(link)}" class="notification-row ${n.is_read ? 'is-read' : 'is-unread'}" data-id="${escapeAttr(n.id)}">
      <span class="notification-avatar-wrap">${avatarMarkup(profile, isSystem)}<span class="notification-type-icon notification-type-${escapeAttr(n.category)}">${icon}</span></span>
      <span class="notification-body">
        <span class="notification-topline"><strong>${escapeHtml(username)}</strong>${display ? `<span class="notification-display-name">${escapeHtml(display)}</span>` : ''}</span>
        <span class="notification-message">${escapeHtml((isSystem ? (n.message || '') : (n.message || '').replace((profile?.display_name || profile?.username || ''), '')).trim())}</span>
        <span class="notification-time">${timeAgo(n.created_at)}</span>
      </span>
      ${n.is_read ? '' : '<span class="notification-unread-mark" aria-label="Unread"></span>'}
    </a>`;
  }).join('');

  notificationsList.querySelectorAll('.notification-row').forEach(row => row.addEventListener('click', async event => {
    const item = notificationRows.find(n => n.id === row.dataset.id);
    if (!item || !currentUser) return;
    event.preventDefault();
    if (!item.is_read) {
      row.classList.add('is-saving-read');
      const { error } = await supabase.from('notifications').update({ is_read:true }).eq('id', item.id).eq('user_id', currentUser.id);
      row.classList.remove('is-saving-read');
      if (!error) { item.is_read = true; row.classList.remove('is-unread'); row.classList.add('is-read'); row.querySelector('.notification-unread-mark')?.remove(); renderTabs(); await refreshUnreadBadge(supabase, currentUser.id); } else { showToast(`Could not mark notification as read: ${error.message}`); }
    }
    const target = row.getAttribute('href');
    if (target && target !== '#') window.location.href = target;
  }));
}


function safeAnnouncementLink(value) {
  const raw=String(value||'').trim(); if(!raw) return '';
  if (/^(javascript|data|vbscript):/i.test(raw)) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9_./#?=&%-]+$/i.test(raw) && !raw.startsWith('//')) return raw;
  return '';
}
function renderAnnouncementFeed() {
  if(!announcementFeedPanel||!announcementFeed)return;
  announcementFeedPanel.hidden=!announcementRows.length;
  if(!announcementRows.length)return;
  const unread=announcementRows.filter(a=>!announcementReadIds.has(a.id)).length;
  if(announcementFeedCount)announcementFeedCount.textContent=unread?`${unread} unread`:'All caught up';
  announcementFeed.innerHTML=announcementRows.map(a=>{
    const read=announcementReadIds.has(a.id), link=safeAnnouncementLink(a.link_url);
    return `<article class="announcement-feed-item ${read?'is-read':'is-unread'}"><div class="announcement-feed-mark" aria-hidden="true">${a.priority==='urgent'?'!':'G'}</div><div class="announcement-feed-copy"><div class="announcement-feed-meta"><span class="announcement-feed-category">${escapeHtml(a.category||'platform')}</span>${a.priority==='normal'?'':`<span class="announcement-priority priority-${escapeHtml(a.priority)}">${escapeHtml(a.priority)}</span>`}<time>${timeAgo(a.publish_at||a.created_at)}</time></div><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.message)}</p><div class="announcement-feed-actions">${link?`<a href="${escapeAttr(link)}" ${/^https?:\/\//i.test(link)?'target="_blank" rel="noopener noreferrer"':''}>Open update <span aria-hidden="true">→</span></a>`:''}<button type="button" data-announcement-read="${escapeAttr(a.id)}" ${read?'disabled':''}>${read?'Read':'Mark as read'}</button></div></div></article>`;
  }).join('');
  announcementFeed.querySelectorAll('[data-announcement-read]').forEach(btn=>btn.addEventListener('click',async()=>{
    if(!currentUser||announcementReadIds.has(btn.dataset.announcementRead))return;
    btn.disabled=true;
    const {error}=await supabase.from('platform_announcement_reads').upsert({announcement_id:btn.dataset.announcementRead,user_id:currentUser.id,read_at:new Date().toISOString()},{onConflict:'announcement_id,user_id'});
    if(error){btn.disabled=false;return;}
    announcementReadIds.add(btn.dataset.announcementRead);renderAnnouncementFeed();await refreshUnreadBadge(supabase,currentUser.id);
  }));
}
async function loadAnnouncementFeed(){
  if(!currentUser||!announcementFeedPanel)return;
  const now=new Date().toISOString();
  const [{data:rows,error:rowsError},{data:reads,error:readsError}]=await Promise.all([
    supabase.from('platform_announcements').select('id,title,message,audience,category,priority,link_url,opportunity_id,publish_at,expires_at,created_at').eq('status','published').lte('publish_at',now).or(`expires_at.is.null,expires_at.gt.${now}`).order('publish_at',{ascending:false}).limit(100),
    supabase.from('platform_announcement_reads').select('announcement_id').eq('user_id',currentUser.id)
  ]);
  if(rowsError){announcementFeedPanel.hidden=true;return;}
  const isAdmin=(await supabase.from('profiles').select('role').eq('id',currentUser.id).maybeSingle()).data?.role==='admin';
  const allowedAudience=isAdmin?['all','readers','authors','holiday_participants','holiday_finalists']:(isWriter?['all','authors']:['all','readers']);
  const targeted=(rows||[]).filter(a=>['holiday_participants','holiday_finalists'].includes(a.audience));
  let eligibleIds=new Set();
  if(targeted.length){
    const oppIds=[...new Set(targeted.map(a=>a.opportunity_id).filter(Boolean))];
    if(oppIds.length){
      const {data:entries}=await supabase.from('holiday_hearts_entries').select('author_id,opportunity_id,is_finalist,status').in('opportunity_id',oppIds).not('status','in','(withdrawn,rejected,disqualified)');
      eligibleIds=new Set();
      (entries||[]).filter(e=>!['withdrawn','rejected','disqualified'].includes(e.status)).forEach(e=>{eligibleIds.add(`${e.opportunity_id}:${e.author_id}:participant`);if(e.is_finalist&&e.status==='approved')eligibleIds.add(`${e.opportunity_id}:${e.author_id}:finalist`);});
    }
  }
  announcementRows=(rows||[]).filter(a=>{
    if(['all','readers','authors'].includes(a.audience||'all'))return allowedAudience.includes(a.audience||'all');
    const kind=a.audience==='holiday_finalists'?'finalist':'participant';
    return !!a.opportunity_id&&eligibleIds.has(`${a.opportunity_id}:${currentUser.id}:${kind}`);
  });
  announcementReadIds=new Set((readsError?[]:reads||[]).map(x=>x.announcement_id));renderAnnouncementFeed();
}

async function loadNotifications() {
  if (!currentUser) {
    loggedOutState.hidden = false; notificationsList.innerHTML = ''; notificationTabs.innerHTML = ''; markAllReadBtn.disabled = true; if(announcementFeedPanel)announcementFeedPanel.hidden=true; if(pushOptinPanel)pushOptinPanel.hidden=true; return;
  }
  loggedOutState.hidden = true; markAllReadBtn.disabled = false; notificationsList.innerHTML = '<div class="empty-row">Loading…</div>'; await syncPushControls();
  const writerCheck = await supabase.from('stories').select('id', { count:'exact', head:true }).eq('author_id', currentUser.id);
  isWriter = (writerCheck.count || 0) > 0;

  const { data, error } = await supabase
    .from('notifications')
    .select('id, category, actor_id, story_id, chapter_id, comment_id, review_id, library_entry_id, message, link, is_read, created_at, profiles:actor_id(username,display_name,avatar_url)')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending:false })
    .limit(150);
  if (error) { notificationsList.innerHTML = `<div class="empty-row">Could not load notifications: ${escapeHtml(error.message)}</div>`; return; }
  notificationRows = data || [];
  const categoryOrder=['system','comments','likes','reviews','echoes','collections'];
  if(!notificationRows.some(n=>n.category===activeCategory)){const first=categoryOrder.find(cat=>notificationRows.some(n=>n.category===cat));if(first)activeCategory=first;}
  renderTabs(); renderNotificationRows(); refreshUnreadBadge(supabase, currentUser.id);
  await loadAnnouncementFeed();
}

markAllReadBtn?.addEventListener('click', async () => {
  if (!currentUser) return;
  markAllReadBtn.disabled = true;
  markAllReadBtn.setAttribute('aria-busy','true');
  const [{ error: notificationError }, announcementResult] = await Promise.all([
    supabase.from('notifications').update({ is_read:true }).eq('user_id', currentUser.id).eq('is_read', false),
    (async () => {
      const now = new Date().toISOString();
      const { data: rows, error: listError } = await supabase.from('platform_announcements').select('id,audience').eq('status','published').lte('publish_at',now).or(`expires_at.is.null,expires_at.gt.${now}`).order('publish_at',{ascending:false}).limit(200);
      if (listError || !rows?.length) return { error:listError };
      const unreadIds = rows.map(x=>x.id).filter(id=>announcementRows.some(a=>a.id===id)&&!announcementReadIds.has(id));
      if (!unreadIds.length) return { error:null };
      const { error } = await supabase.from('platform_announcement_reads').upsert(unreadIds.map(announcement_id=>({announcement_id,user_id:currentUser.id,read_at:new Date().toISOString()})),{onConflict:'announcement_id,user_id'});
      return { error };
    })()
  ]);
  if (!notificationError) notificationRows.forEach(n => { n.is_read = true; });
  if (!announcementResult.error) { announcementRows.forEach(a=>announcementReadIds.add(a.id)); renderAnnouncementFeed(); }
  renderTabs(); renderNotificationRows(); await refreshUnreadBadge(supabase, currentUser.id);
  if (notificationError || announcementResult.error) { markAllReadBtn.title='Some items could not be marked as read. Please try again.'; showToast('Some notifications could not be marked as read. Please try again.'); } else { showToast('All notifications marked as read.'); }
  markAllReadBtn.removeAttribute('aria-busy');
  markAllReadBtn.disabled = false;
});

async function initAuth() {
  const { data:{ session } } = await supabase.auth.getSession();
  currentUser = session?.user ?? null; loginBtn.textContent = currentUser ? 'Log out' : 'Log in'; loadNotifications();
}

wireWriteSheet(() => currentUser, () => { authModalSub.textContent = 'Log in or create an account to publish a story.'; openModal(authModal); });
initAuth();
