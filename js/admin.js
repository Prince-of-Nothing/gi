import { supabase } from './supabaseClient.js';
import { showToast, wireWriteSheet, refreshUnreadBadge } from './ui.js';
import { renderOpportunitiesAdmin } from './opportunities-admin.js';
import { renderResourcesAdmin } from './resources-admin.js';
import { renderChapterPricingAdmin } from './chapter-pricing-admin.js';

let currentUser = null;
let isAdmin = false;
let activeTab = 'overview';
let activeHomeSettings = null;
let homepageStoryOptions = [];

const loginBtn = document.getElementById('loginBtn');
const accessDenied = document.getElementById('accessDenied');
const adminDashboard = document.getElementById('adminDashboard');
const adminTabs = document.getElementById('adminTabs');
const adminTabContent = document.getElementById('adminTabContent');
const reportDetailModal = document.getElementById('reportDetailModal');
const reportDetailBody = document.getElementById('reportDetailBody');
const adminPublicProfile = document.getElementById('adminPublicProfile');
const accessDeniedMessage = document.getElementById('accessDeniedMessage');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.querySelectorAll('[data-close="reportDetail"]').forEach((btn) => btn.addEventListener('click', () => { reportDetailModal.hidden = true; }));
reportDetailModal.addEventListener('click', (e) => { if (e.target === reportDetailModal) reportDetailModal.hidden = true; });

loginBtn.addEventListener('click', async () => {
  if (!currentUser) {
    window.location.href = 'auth.html?mode=login&returnTo=' + encodeURIComponent('admin.html');
    return;
  }
  loginBtn.disabled = true;
  const { error } = await supabase.auth.signOut();
  if (error) {
    showToast(error.message || 'Could not log out. Please try again.');
    loginBtn.disabled = false;
    return;
  }
  window.location.href = 'auth.html?mode=login&returnTo=' + encodeURIComponent('admin.html');
});

adminTabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.genre-chip');
  if (!btn) return;
  activeTab = btn.dataset.tab;
  adminTabs.querySelectorAll('.genre-chip').forEach((t) => { t.classList.toggle('active', t === btn); t.setAttribute('aria-selected', String(t === btn)); });
  renderTab();
});

async function logAdminAction(action, targetType, targetId, reason) {
  await supabase.from('admin_audit_log').insert({
    admin_id: currentUser.id,
    action,
    target_type: targetType,
    target_id: targetId,
    reason: reason || null,
  });
}

async function refreshAdminAuth(session) {
  currentUser = session?.user ?? null;
  isAdmin = false;
  loginBtn.textContent = currentUser ? 'Log out' : 'Log in';
  loginBtn.disabled = false;
  adminDashboard.hidden = true;
  accessDenied.hidden = true;
  refreshUnreadBadge(supabase, currentUser?.id);

  if (!currentUser) {
    accessDenied.hidden = false;
    if (accessDeniedMessage) accessDeniedMessage.textContent = 'Please sign in first, then return here with an administrator account.';
    return;
  }

  const { data: profile, error } = await supabase
    .from('profiles').select('role').eq('id', currentUser.id).maybeSingle();
  if (error) {
    accessDenied.hidden = false;
    if (accessDeniedMessage) accessDeniedMessage.textContent = `We could not verify your administrator access: ${error.message}. Please refresh. If it continues, the production profile permissions need checking.`;
    console.error('[GidiReads Admin] Profile role lookup failed:', error);
    return;
  }

  isAdmin = profile?.role === 'admin';
  if (!isAdmin) {
    accessDenied.hidden = false;
    if (accessDeniedMessage) accessDeniedMessage.textContent = 'You are signed in, but this account does not have the administrator role. Sign in with an authorised GidiReads administrator account.';
    return;
  }

  if (adminPublicProfile) adminPublicProfile.href = `author.html?id=${encodeURIComponent(currentUser.id)}`;
  adminDashboard.hidden = false;
  renderTab();
}

async function initAuth() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    await refreshAdminAuth(data?.session ?? null);
  } catch (error) {
    console.error('[GidiReads Admin] Could not restore auth session:', error);
    currentUser = null;
    isAdmin = false;
    loginBtn.textContent = 'Log in';
    accessDenied.hidden = false;
    if (accessDeniedMessage) accessDeniedMessage.textContent = `We could not restore your sign-in session: ${error.message || 'Unknown authentication error'}. Please sign in again.`;
  }
}

supabase.auth.onAuthStateChange((_event, session) => {
  // Run profile checks after Supabase finishes its auth event callback.
  Promise.resolve().then(() => refreshAdminAuth(session)).catch((error) => {
    console.error('[GidiReads Admin] Auth refresh failed:', error);
    accessDenied.hidden = false;
    if (accessDeniedMessage) accessDeniedMessage.textContent = 'Your sign-in changed, but administrator access could not be refreshed. Please reload this page.';
  });
});

async function renderTab() {
  if (!isAdmin) return;
  adminTabContent.innerHTML = '<p class="empty-row">Loading…</p>';

  if (activeTab === 'overview') return renderOverview();
  if (activeTab === 'reports') return renderReports();
  if (activeTab === 'users') return renderUsers();
  if (activeTab === 'staff') return renderStaffRoles();
  if (activeTab === 'aeApplications') return renderAEApplications();
  if (activeTab === 'stories') return renderStories();
  if (activeTab === 'homepage') return renderHomepage();
  if (activeTab === 'announcements') return renderAnnouncements();
  if (activeTab === 'opportunities') return renderOpportunitiesAdmin({ supabase, currentUser, adminTabContent, escapeHtml, logAdminAction, showToast });
  if (activeTab === 'resources') return renderResourcesAdmin({ supabase, currentUser, adminTabContent, escapeHtml, logAdminAction, showToast });
  if (activeTab === 'pricing') return renderChapterPricingAdmin({ supabase, currentUser, adminTabContent, escapeHtml, logAdminAction, showToast });
  if (activeTab === 'auditlog') return renderAuditLog();
}


// ============ Acquisitions & Developmental Editor applications ============
async function renderAEApplications() {
  const { data: apps, error } = await supabase.from('ae_applications').select('id,user_id,answers,status,admin_note,submitted_at,reviewed_at,contract_start,contract_end').order('submitted_at',{ascending:false}).limit(200);
  if(error){adminTabContent.innerHTML=`<div class="adm-notice adm-notice-warning"><strong>AE applications could not load.</strong><p>${escapeHtml(error.message)}</p><p>Check that BUILD-04-AE-EDITOR-SPACE-MIGRATION.sql has been reviewed and applied after deployment.</p></div>`;return;}
  const ids=[...new Set((apps||[]).map(a=>a.user_id))];let profiles=[];if(ids.length){const r=await supabase.from('profiles').select('id,username,display_name').in('id',ids);if(!r.error)profiles=r.data||[];}
  const people=new Map(profiles.map(p=>[p.id,p]));
  adminTabContent.innerHTML=`<section class="adm-manager-panel"><div class="adm-panel-heading"><div><p class="adm-kicker">TEAM APPLICATIONS</p><h2>AE applications</h2><p>Review applicants before giving them access to the AE workspace. Approving an application also gives the AE role.</p></div></div><div class="adm-role-list">${(apps||[]).length?(apps||[]).map(a=>{const p=people.get(a.user_id)||{};const x=a.answers||{};return `<article class="adm-role-row" style="display:block;padding:18px;margin:12px 0"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><strong>${escapeHtml(p.display_name||p.username||'GidiReads member')}</strong><p>@${escapeHtml(p.username||'unknown')} · Submitted ${new Date(a.submitted_at).toLocaleDateString()}</p></div><strong>${escapeHtml((a.status||'in_review').replace('_',' '))}</strong></div><details style="margin:14px 0"><summary>Read application answers</summary>${[['Experience',x.experience],['Editing approach',x.approach],['Understanding of GidiReads',x.platform_understanding],['Sample feedback',x.sample_feedback],['Weekly availability',x.availability],['Relevant link',x.links]].filter(z=>z[1]).map(([k,v])=>`<p><strong>${k}:</strong> ${escapeHtml(v)}</p>`).join('')}</details><label class="adm-field"><span>Admin note (optional)</span><textarea class="ae-admin-note" rows="2">${escapeHtml(a.admin_note||'')}</textarea></label>${a.status==='approved'?`<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px"><label class="adm-field"><span>AE contract starts</span><input type="date" class="ae-contract-start" value="${escapeHtml(a.contract_start||'')}"></label><label class="adm-field"><span>AE contract ends</span><input type="date" class="ae-contract-end" value="${escapeHtml(a.contract_end||'')}"></label><button class="btn btn-outline" data-ae-contract="${a.id}">Save contract period</button></div>`:''}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn btn-outline" data-ae-review="in_review" data-id="${a.id}">Keep in review</button><button class="btn btn-primary" data-ae-review="approved" data-id="${a.id}">Approve & give access</button><button class="btn btn-ghost" data-ae-review="rejected" data-id="${a.id}">Reject</button></div></article>`}).join(''):'<p class="empty-row">There are no AE applications yet.</p>'}</div></section>`;
  adminTabContent.querySelectorAll('[data-ae-contract]').forEach(btn=>btn.addEventListener('click',async()=>{const row=btn.closest('.adm-role-row');const p_start=row.querySelector('.ae-contract-start').value,p_end=row.querySelector('.ae-contract-end').value;if(!p_start||!p_end){showToast('Enter both contract dates first.');return;}btn.disabled=true;const {data,error}=await supabase.rpc('admin_set_ae_contract_period',{p_application_id:btn.dataset.aeContract,p_start,p_end});if(error||!data?.success){showToast(`Could not save contract period: ${error?.message||'Please try again.'}`);btn.disabled=false;return;}await logAdminAction('ae_contract_period_set','ae_application',btn.dataset.aeContract,`${p_start} to ${p_end}`);showToast('AE contract period saved.');renderAEApplications();}));
  adminTabContent.querySelectorAll('[data-ae-review]').forEach(btn=>btn.addEventListener('click',async()=>{const row=btn.closest('.adm-role-row');const note=row.querySelector('.ae-admin-note').value;btn.disabled=true;const {data,error}=await supabase.rpc('admin_review_ae_application',{p_application_id:btn.dataset.id,p_status:btn.dataset.aeReview,p_note:note});if(error||!data?.success){showToast(`Could not update application: ${error?.message||'Please try again.'}`);btn.disabled=false;return;}await logAdminAction('ae_application_'+btn.dataset.aeReview,'ae_application',btn.dataset.id,note||btn.dataset.aeReview);showToast(btn.dataset.aeReview==='approved'?'Application approved. AE access is now active.':btn.dataset.aeReview==='rejected'?'Application rejected.':'Application kept in review.');renderAEApplications();}));
  const [{data:aeRows},{data:contracts}]=await Promise.all([supabase.from('staff_assignments').select('user_id').eq('role_key','acquisitions_editor').eq('is_active',true),supabase.from('creator_contracts').select('author_id,story_id,starts_at,ends_at').eq('status','active')]);
  const now=Date.now();const currentContracts=(contracts||[]).filter(c=>(!c.starts_at||new Date(c.starts_at).getTime()<=now)&&(!c.ends_at||new Date(c.ends_at).getTime()>=now));const aeIds=[...new Set((aeRows||[]).map(x=>x.user_id))],authorIds=[...new Set(currentContracts.map(x=>x.author_id))];let aeProfiles=[],authorProfiles=[],assigned=[];
  if(aeIds.length){const r=await supabase.from('profiles').select('id,username,display_name').in('id',aeIds);aeProfiles=r.data||[];}
  if(authorIds.length){const r=await supabase.from('profiles').select('id,username,display_name').in('id',authorIds);authorProfiles=r.data||[];}
  const ar=await supabase.from('ae_author_assignments').select('ae_user_id,author_id,is_active').eq('is_active',true);if(!ar.error)assigned=ar.data||[];
  adminTabContent.insertAdjacentHTML('beforeend',`<section class="adm-manager-panel" style="margin-top:22px"><div class="adm-panel-heading"><div><p class="adm-kicker">AUTHOR SUPPORT</p><h2>Assign contracted authors</h2><p>Only approved AEs and authors with an active GidiReads contract can be selected.</p></div></div>${aeProfiles.length&&authorProfiles.length?`<div class="adm-role-row"><label class="adm-field"><span>Approved AE</span><select id="aeAssignEditor">${aeProfiles.map(x=>`<option value="${x.id}">${escapeHtml(x.display_name||x.username||'AE')}</option>`).join('')}</select></label><label class="adm-field"><span>Contracted author</span><select id="aeAssignAuthor">${authorProfiles.map(x=>`<option value="${x.id}">${escapeHtml(x.display_name||x.username||'Author')}</option>`).join('')}</select></label><button class="btn btn-primary" id="aeAssignButton">Assign author</button></div>`:'<p class="empty-row">An approved AE and an author with an active contract are needed before an assignment can be made.</p>'}<div>${assigned.map(x=>{const ae=aeProfiles.find(y=>y.id===x.ae_user_id),au=authorProfiles.find(y=>y.id===x.author_id);return `<p>${escapeHtml(ae?.display_name||ae?.username||'AE')} → ${escapeHtml(au?.display_name||au?.username||'Author')} <button class=\"btn btn-ghost\" data-ae-unassign=\"${x.ae_user_id}\" data-author=\"${x.author_id}\">Remove assignment</button></p>`}).join('')||'<p class="empty-row">No active AE author assignments.</p>'}</div></section>`);
  document.getElementById('aeAssignButton')?.addEventListener('click',async()=>{const b=document.getElementById('aeAssignButton');b.disabled=true;const {data,error}=await supabase.rpc('admin_assign_ae_author',{p_ae_user_id:document.getElementById('aeAssignEditor').value,p_author_id:document.getElementById('aeAssignAuthor').value,p_active:true});if(error||!data?.success){showToast(`Could not assign author: ${error?.message||'Please try again.'}`);b.disabled=false;return;}await logAdminAction('ae_author_assigned','ae_author_assignment',document.getElementById('aeAssignAuthor').value,'Assigned contracted author to AE');showToast('Author assigned to AE.');renderAEApplications();});
  adminTabContent.querySelectorAll('[data-ae-unassign]').forEach(btn=>btn.addEventListener('click',async()=>{btn.disabled=true;const {data,error}=await supabase.rpc('admin_assign_ae_author',{p_ae_user_id:btn.dataset.aeUnassign,p_author_id:btn.dataset.author,p_active:false});if(error||!data?.success){showToast(`Could not remove assignment: ${error?.message||'Please try again.'}`);btn.disabled=false;return;}await logAdminAction('ae_author_unassigned','ae_author_assignment',btn.dataset.author,'Removed AE author assignment');showToast('Assignment removed.');renderAEApplications();}));
  const {data:promos}=await supabase.from('ae_promotion_recommendations').select('id,ae_user_id,story_id,placement,reason,status,admin_note,created_at').eq('status','pending').order('created_at',{ascending:false}).limit(100);
  const promoStoryIds=[...new Set((promos||[]).map(x=>x.story_id))],promoAeIds=[...new Set((promos||[]).map(x=>x.ae_user_id))];let promoStories=[],promoAes=[];
  if(promoStoryIds.length){const q=await supabase.from('stories').select('id,title').in('id',promoStoryIds);promoStories=q.data||[];}
  if(promoAeIds.length){const q=await supabase.from('profiles').select('id,username,display_name').in('id',promoAeIds);promoAes=q.data||[];}
  adminTabContent.insertAdjacentHTML('beforeend',`<section class="adm-manager-panel" style="margin-top:22px"><div class="adm-panel-heading"><div><p class="adm-kicker">EDITORIAL RECOMMENDATIONS</p><h2>Promotion requests</h2><p>AEs can recommend features. Admins make the final decision.</p></div></div>${(promos||[]).map(x=>{const st=promoStories.find(y=>y.id===x.story_id),ae=promoAes.find(y=>y.id===x.ae_user_id);return `<article class="adm-role-row" style="display:block;padding:16px;margin:10px 0"><strong>${escapeHtml(st?.title||'Story')}</strong><p>Suggested by ${escapeHtml(ae?.display_name||ae?.username||'AE')} · ${escapeHtml(x.placement.replaceAll('_',' '))}</p><p>${escapeHtml(x.reason)}</p><label class="adm-field"><span>Admin note (optional)</span><textarea class="ae-promo-note" rows="2"></textarea></label><div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-primary" data-ae-promo="approved" data-id="${x.id}">Approve</button><button class="btn btn-ghost" data-ae-promo="rejected" data-id="${x.id}">Reject</button></div></article>`}).join('')||'<p class="empty-row">No promotion requests are waiting.</p>'}</section>`);
  adminTabContent.querySelectorAll('[data-ae-promo]').forEach(btn=>btn.addEventListener('click',async()=>{const row=btn.closest('.adm-role-row');btn.disabled=true;const {data,error}=await supabase.rpc('admin_review_ae_promotion',{p_id:btn.dataset.id,p_status:btn.dataset.aePromo,p_note:row.querySelector('.ae-promo-note').value});if(error||!data?.success){showToast(`Could not update recommendation: ${error?.message||'Please try again.'}`);btn.disabled=false;return;}await logAdminAction('ae_promotion_'+btn.dataset.aePromo,'ae_promotion',btn.dataset.id,row.querySelector('.ae-promo-note').value||btn.dataset.aePromo);showToast(`Promotion recommendation ${btn.dataset.aePromo}.`);renderAEApplications();}));
  const {data:aePerformance,error:aePerformanceError}=await supabase.rpc('admin_get_ae_performance');
  const performanceRows=Array.isArray(aePerformance)?aePerformance:[];
  const replacementOptions=aeProfiles.map(x=>`<option value="${x.id}">${escapeHtml(x.display_name||x.username||'AE')}</option>`).join('');
  adminTabContent.insertAdjacentHTML('beforeend',`<section class="adm-manager-panel" style="margin-top:22px"><div class="adm-panel-heading"><div><p class="adm-kicker">AUTHOR EXPERIENCE &amp; QUALITY</p><h2>AE performance and author reviews</h2><p>Use verified editorial activity, author ratings and moderated reports when considering AE bonuses or changes to editor access. Ratings are evidence, not automatic decisions.</p></div></div>${aePerformanceError?`<p class="empty-row">Performance records could not load: ${escapeHtml(aePerformanceError.message)}</p>`:performanceRows.map(x=>`<article class="adm-role-row" style="display:block;padding:16px;margin:12px 0"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><strong>${escapeHtml(x.ae_name)}</strong><span>${Number(x.average_rating||0).toFixed(2)} / 5 · ${Number(x.author_ratings||0)} author reviews</span></div><p>${Number(x.assigned_authors||0)} assigned authors · ${Number(x.reviews_sent||0)} editorial reviews · ${Number(x.open_reports||0)} open reports · ${Number(x.total_reports||0)} total reports</p><label class="adm-field"><span>Replacement AE (optional)</span><select class="ae-replacement-select"><option value="">Do not reassign automatically</option>${aeProfiles.filter(y=>y.id!==x.ae_user_id).map(y=>`<option value="${y.id}">${escapeHtml(y.display_name||y.username||'AE')}</option>`).join('')}</select></label><label class="adm-field"><span>Admin decision note</span><textarea class="ae-authority-note" rows="2" maxlength="3000" placeholder="Record the reason for changing AE authority…"></textarea></label><button class="btn btn-ghost" data-ae-authority-remove="${x.ae_user_id}">Remove AE authority${Number(x.assigned_authors||0)?' and reassign authors if a replacement is selected':''}</button></article>`).join('')||'<p class="empty-row">No active Acquisition Editors to assess yet.</p>'}</section>`);
  adminTabContent.querySelectorAll('[data-ae-authority-remove]').forEach(btn=>btn.addEventListener('click',async()=>{const row=btn.closest('.adm-role-row'),replacement=row.querySelector('.ae-replacement-select').value,note=row.querySelector('.ae-authority-note').value;if(!confirm(replacement?"Remove this AE's authority and move their active contracted authors to the selected replacement?":"Remove this AE's authority? Their active author assignments will be closed."))return;btn.disabled=true;const {data,error}=await supabase.rpc('admin_manage_ae_authority',{p_ae_user_id:btn.dataset.aeAuthorityRemove,p_action:replacement?'remove_and_reassign':'remove_authority',p_reassign_to:replacement||null,p_note:note});if(error||!data?.success){showToast(`Could not update AE authority: ${error?.message||'Please try again.'}`);btn.disabled=false;return;}await logAdminAction('ae_authority_removed','acquisition_editor',btn.dataset.aeAuthorityRemove,`${note||'Authority removed'}${replacement?`; reassigned ${data.reassigned_authors||0} authors`:''}`);showToast(`AE authority removed. ${Number(data.reassigned_authors||0)} authors reassigned.`);renderAEApplications();}));
}

// ============ Overview ============
async function renderOverview() {
  const [
    { data: profileCounts, error: profileCountsError },
    { count: totalStories },
    { count: ongoingStories },
    { count: completedStories },
    { count: draftStories },
    { count: publishedChapters },
    { count: draftChapters },
    { count: totalComments },
    { count: pendingReports },
    { count: resolvedReports },
  ] = await Promise.all([
    supabase.rpc('admin_profile_counts'),
    supabase.from('stories').select('id', { count: 'exact', head: true }),
    supabase.from('stories').select('id', { count: 'exact', head: true }).eq('status', 'ongoing'),
    supabase.from('stories').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('stories').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('chapters').select('id', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('chapters').select('id', { count: 'exact', head: true }).eq('is_published', false),
    supabase.from('comments').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
  ]);
  let safeProfileCounts = profileCounts;
  if (profileCountsError) {
    // Backward-compatible during the short V5 rollout window, before the
    // matching SQL migration creates the admin-only profile RPCs.
    const [usersCount, adminsCount, suspendedCount, disabledCount] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_status', 'suspended'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_status', 'disabled'),
    ]);
    const countError = usersCount.error || adminsCount.error || suspendedCount.error || disabledCount.error;
    if (countError) throw countError;
    safeProfileCounts = {
      total_users: usersCount.count || 0,
      total_admins: adminsCount.count || 0,
      suspended_accounts: suspendedCount.count || 0,
      disabled_accounts: disabledCount.count || 0,
    };
  }
  const totalUsers = Number(safeProfileCounts?.total_users || 0);
  const totalAdmins = Number(safeProfileCounts?.total_admins || 0);
  const suspendedAccounts = Number(safeProfileCounts?.suspended_accounts || 0);
  const disabledAccounts = Number(safeProfileCounts?.disabled_accounts || 0);

  const { data: authorRows } = await supabase.from('stories').select('author_id');
  const totalAuthors = new Set((authorRows || []).map((r) => r.author_id)).size;
  const totalReaders = (totalUsers || 0) - totalAuthors - (totalAdmins || 0);

  const { data: totals } = await supabase.from('stories').select('reads, echo_count');
  const totalReads = (totals || []).reduce((sum, s) => sum + (s.reads || 0), 0);
  const totalEchoes = (totals || []).reduce((sum, s) => sum + (s.echo_count || 0), 0);

  adminTabContent.innerHTML = `
    <h3 class="admin-section-heading">Accounts</h3>
    <div class="admin-stat-grid">
      ${statCard('Total Users', totalUsers)}
      ${statCard('Authors', totalAuthors)}
      ${statCard('Readers (no stories)', Math.max(0, totalReaders))}
      ${statCard('Admins', totalAdmins)}
      ${statCard('Suspended', suspendedAccounts)}
      ${statCard('Disabled', disabledAccounts)}
    </div>
    <h3 class="admin-section-heading">Stories</h3>
    <div class="admin-stat-grid">
      ${statCard('Total Stories', totalStories)}
      ${statCard('Ongoing', ongoingStories)}
      ${statCard('Completed', completedStories)}
      ${statCard('Draft', draftStories)}
      ${statCard('Published Chapters', publishedChapters)}
      ${statCard('Draft Chapters', draftChapters)}
    </div>
    <h3 class="admin-section-heading">Engagement</h3>
    <div class="admin-stat-grid">
      ${statCard('Total Reads', totalReads)}
      ${statCard('Total Echoes', totalEchoes)}
      ${statCard('Total Comments', totalComments)}
    </div>
    <h3 class="admin-section-heading">Moderation</h3>
    <div class="admin-stat-grid">
      ${statCard('Pending Reports', pendingReports)}
      ${statCard('Resolved Reports', resolvedReports)}
    </div>
  `;
}

function statCard(label, value) {
  return `<div class="admin-stat-card"><p class="admin-stat-value">${value ?? 0}</p><p class="admin-stat-label">${escapeHtml(label)}</p></div>`;
}

// ============ Reports ============
const REASON_LABELS = {
  plagiarism: 'Plagiarism', copyright: 'Copyright concern', harassment: 'Harassment',
  hate_discrimination: 'Hate/discriminatory content', sexual_content: 'Sexual/inappropriate content',
  spam: 'Spam', scam_fraud: 'Scam/fraud', violence: 'Violence/graphic content',
  impersonation: 'Impersonation', other: 'Other',
};

async function renderReports() {
  const { data: reports, error } = await supabase
    .from('reports')
    .select('id, reported_type, reported_id, reason, description, status, admin_notes, action_taken, created_at, profiles!reports_reporter_id_fkey(username, display_name)')
    .order('created_at', { ascending: false });

  if (error) {
    adminTabContent.innerHTML = `<p class="empty-row">Could not load reports: ${escapeHtml(error.message)}</p>`;
    return;
  }
  if (!reports || reports.length === 0) {
    adminTabContent.innerHTML = `<p class="empty-row">No reports have been filed.</p>`;
    return;
  }

  adminTabContent.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Reporter</th><th>Type</th><th>Reason</th><th>Status</th><th>Filed</th><th></th></tr></thead>
      <tbody>
        ${reports.map((r) => `
          <tr>
            <td>${escapeHtml(r.profiles?.display_name || r.profiles?.username || 'Unknown')}</td>
            <td>${escapeHtml(r.reported_type)}</td>
            <td>${escapeHtml(REASON_LABELS[r.reason] || r.reason)}</td>
            <td><span class="admin-status-badge status-${r.status}">${escapeHtml(r.status.replace('_', ' '))}</span></td>
            <td>${new Date(r.created_at).toLocaleDateString()}</td>
            <td><button class="btn btn-outline admin-review-btn" data-id="${r.id}">Review</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  adminTabContent.querySelectorAll('.admin-review-btn').forEach((btn) => {
    btn.addEventListener('click', () => openReportDetail(reports.find((r) => r.id === btn.dataset.id)));
  });
}

async function openReportDetail(report) {
  reportDetailBody.innerHTML = `<p class="empty-row">Loading reported content…</p>`;
  reportDetailModal.hidden = false;
  document.body.style.overflow = 'hidden';

  let contentHtml = '<p class="empty-row">Content not found (may have been deleted).</p>';

  try {
    if (report.reported_type === 'story') {
      const { data } = await supabase.from('stories').select('title, description, status, profiles!stories_author_id_fkey(username, display_name)').eq('id', report.reported_id).single();
      if (data) {
        const authorName = data.profiles?.display_name || data.profiles?.username || 'Unknown';
        contentHtml = `<div class="reported-content-box"><p class="empty-kicker">Reported story</p><p><strong>${escapeHtml(data.title)}</strong> by ${escapeHtml(authorName)} · ${escapeHtml(data.status)}</p><p>${escapeHtml(data.description || '')}</p><a href="story.html?id=${report.reported_id}" target="_blank" class="btn btn-outline">Open story</a></div>`;
      }
    } else if (report.reported_type === 'chapter') {
      const { data } = await supabase.from('chapters').select('title, content, chapter_number, story_id, stories(title)').eq('id', report.reported_id).single();
      if (data) {
        contentHtml = `<div class="reported-content-box"><p class="empty-kicker">Reported chapter</p><p><strong>Ch. ${data.chapter_number} — ${escapeHtml(data.title || 'Untitled')}</strong> in "${escapeHtml(data.stories?.title || '')}"</p><p>${escapeHtml((data.content || '').slice(0, 400))}${(data.content || '').length > 400 ? '…' : ''}</p><a href="reader.html?story=${data.story_id}&chapter=${data.chapter_number}" target="_blank" class="btn btn-outline">Open chapter</a></div>`;
      }
    } else if (report.reported_type === 'comment') {
      const { data } = await supabase.from('comments').select('content, chapter_id, profiles(username, display_name)').eq('id', report.reported_id).single();
      if (data) {
        const commenterName = data.profiles?.display_name || data.profiles?.username || 'Unknown';
        contentHtml = `<div class="reported-content-box"><p class="empty-kicker">Reported comment</p><p>by ${escapeHtml(commenterName)}</p><p>"${escapeHtml(data.content)}"</p><button class="btn btn-outline admin-delete-comment-btn" data-id="${report.reported_id}">Delete comment</button></div>`;
      }
    } else if (report.reported_type === 'user') {
      const { data } = await supabase.from('profiles').select('username, display_name, bio').eq('id', report.reported_id).single();
      if (data) {
        contentHtml = `<div class="reported-content-box"><p class="empty-kicker">Reported user</p><p><strong>${escapeHtml(data.display_name || data.username)}</strong></p><p>${escapeHtml(data.bio || 'No bio')}</p><a href="author.html?id=${report.reported_id}" target="_blank" class="btn btn-outline">View profile</a></div>`;
      }
    }
  } catch (err) {
    contentHtml = `<p class="empty-row">Error loading content: ${escapeHtml(err.message)}</p>`;
  }

  reportDetailBody.innerHTML = `
    ${contentHtml}
    <p><strong>Reason:</strong> ${escapeHtml(REASON_LABELS[report.reason] || report.reason)}</p>
    <p><strong>Reporter's description:</strong> ${escapeHtml(report.description || 'None provided')}</p>
    <label class="field"><span>Admin notes</span><textarea id="adminNotesInput" rows="3">${escapeHtml(report.admin_notes || '')}</textarea></label>
    <label class="field"><span>Action taken</span><input type="text" id="actionTakenInput" value="${escapeHtml(report.action_taken || '')}" /></label>
    <label class="field">
      <span>Status</span>
      <select id="reportStatusSelect">
        <option value="pending" ${report.status === 'pending' ? 'selected' : ''}>Pending</option>
        <option value="under_review" ${report.status === 'under_review' ? 'selected' : ''}>Under Review</option>
        <option value="resolved" ${report.status === 'resolved' ? 'selected' : ''}>Resolved</option>
        <option value="rejected" ${report.status === 'rejected' ? 'selected' : ''}>Rejected</option>
        <option value="escalated" ${report.status === 'escalated' ? 'selected' : ''}>Escalated</option>
      </select>
    </label>
    <button class="btn btn-primary" id="saveReportBtn">Save</button>
  `;
  reportDetailModal.hidden = false;
  document.body.style.overflow = 'hidden';

  reportDetailModal.hidden = false;
  document.body.style.overflow = 'hidden';

  document.querySelector('.admin-delete-comment-btn')?.addEventListener('click', async (e) => {
    const btn = e.target;
    if (!confirm('Delete this comment?')) return;
    const { error: delError } = await supabase.from('comments').delete().eq('id', btn.dataset.id);
    if (delError) { showToast(`Could not delete: ${delError.message}`); return; }
    await logAdminAction('delete_comment', 'comment', btn.dataset.id, 'Removed via report review');
    showToast('Comment deleted');
    btn.closest('.reported-content-box').innerHTML += '<p class="empty-row">Comment deleted.</p>';
  });

  document.getElementById('saveReportBtn').addEventListener('click', async () => {
    const status = document.getElementById('reportStatusSelect').value;
    const admin_notes = document.getElementById('adminNotesInput').value.trim();
    const action_taken = document.getElementById('actionTakenInput').value.trim();

    const { error } = await supabase.from('reports').update({
      status, admin_notes, action_taken,
      assigned_admin_id: currentUser.id,
      resolved_at: ['resolved', 'rejected'].includes(status) ? new Date().toISOString() : null,
    }).eq('id', report.id);

    if (error) {
      showToast(`Could not update report: ${error.message}`);
      return;
    }
    await logAdminAction(`report_${status}`, report.reported_type, report.reported_id, action_taken);
    reportDetailModal.hidden = true;
    document.body.style.overflow = '';
    showToast('Report updated');
    renderReports();
  });
}

// ============ Users ============
async function renderUsers() {
  let usersResult = await supabase.rpc('admin_list_users', { p_limit: 100 });
  if (usersResult.error) {
    usersResult = await supabase.from('profiles')
      .select('id, username, display_name, role, account_status, created_at')
      .order('created_at', { ascending: false }).limit(100);
  }
  const { data: users, error } = usersResult;

  if (error) {
    adminTabContent.innerHTML = `<p class="empty-row">Could not load users: ${escapeHtml(error.message)}</p>`;
    return;
  }

  adminTabContent.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr></thead>
      <tbody>
        ${users.map((u) => `
          <tr>
            <td>${escapeHtml(u.display_name || u.username)}</td>
            <td>${escapeHtml(u.role)}</td>
            <td><span class="admin-status-badge status-${u.account_status}">${escapeHtml(u.account_status)}</span></td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>
              ${u.role === 'admin' ? '' : u.account_status === 'active'
                ? `<button class="btn btn-outline admin-suspend-btn" data-id="${u.id}" data-name="${escapeHtml(u.display_name || u.username)}">Suspend</button>`
                : `<button class="btn btn-outline admin-restore-btn" data-id="${u.id}" data-name="${escapeHtml(u.display_name || u.username)}">Restore</button>`}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  adminTabContent.querySelectorAll('.admin-suspend-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { data, error: e } = await supabase.rpc('admin_set_user_status', {
        p_user_id: btn.dataset.id, p_status: 'suspended', p_reason: `Suspended ${btn.dataset.name}`,
      });
      if (e || !data?.success) { showToast(`Could not suspend: ${data?.reason || e?.message}`); return; }
      showToast('User suspended');
      renderUsers();
    });
  });
  adminTabContent.querySelectorAll('.admin-restore-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { data, error: e } = await supabase.rpc('admin_set_user_status', {
        p_user_id: btn.dataset.id, p_status: 'active', p_reason: `Restored ${btn.dataset.name}`,
      });
      if (e || !data?.success) { showToast(`Could not restore: ${data?.reason || e?.message}`); return; }
      showToast('User restored');
      renderUsers();
    });
  });
}

// ============ Stories ============
async function renderStories() {
  const { data: stories, error } = await supabase
    .from('stories')
    .select('id, title, status, echo_count, reads, profiles!stories_author_id_fkey(username, display_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    adminTabContent.innerHTML = `<p class="empty-row">Could not load stories: ${escapeHtml(error.message)}</p>`;
    return;
  }

  adminTabContent.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Title</th><th>Author</th><th>Status</th><th>Reads</th><th>Echoes</th><th></th></tr></thead>
      <tbody>
        ${stories.map((s) => `
          <tr>
            <td>${escapeHtml(s.title)}</td>
            <td>${escapeHtml(s.profiles?.display_name || s.profiles?.username || '—')}</td>
            <td><span class="admin-status-badge status-${s.status}">${escapeHtml(s.status)}</span></td>
            <td>${s.reads || 0}</td>
            <td>${s.echo_count || 0}</td>
            <td>
              ${s.status === 'draft'
                ? `<button class="btn btn-outline admin-restore-story-btn" data-id="${s.id}" data-title="${escapeHtml(s.title)}">Restore</button>`
                : `<button class="btn btn-outline admin-unpublish-story-btn" data-id="${s.id}" data-title="${escapeHtml(s.title)}">Unpublish</button>`}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  adminTabContent.querySelectorAll('.admin-unpublish-story-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { data, error: e } = await supabase.rpc('admin_set_story_status', {
        p_story_id: btn.dataset.id, p_status: 'draft', p_reason: `Unpublished "${btn.dataset.title}"`,
      });
      if (e || !data?.success) { showToast(`Could not unpublish: ${data?.reason || e?.message}`); return; }
      showToast('Story unpublished');
      renderStories();
    });
  });
  adminTabContent.querySelectorAll('.admin-restore-story-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { data, error: e } = await supabase.rpc('admin_set_story_status', {
        p_story_id: btn.dataset.id, p_status: 'ongoing', p_reason: `Restored "${btn.dataset.title}"`,
      });
      if (e || !data?.success) { showToast(`Could not restore: ${data?.reason || e?.message}`); return; }
      showToast('Story restored');
      renderStories();
    });
  });
}

// ============ Staff roles and capabilities ============
async function renderStaffRoles() {
  const [{ data: rpcProfiles, error: rpcProfilesError }, { data: roles, error: rolesError }, { data: assignments, error: assignmentsError }] = await Promise.all([
    supabase.rpc('admin_list_users', { p_limit: 500 }),
    supabase.from('staff_roles').select('role_key,label,description,is_assignable').order('label'),
    supabase.from('staff_assignments').select('user_id,role_key,is_active,updated_at')
  ]);
  let profiles = rpcProfiles;
  let profilesError = rpcProfilesError;
  if (profilesError) {
    const fallbackProfiles = await supabase.from('profiles').select('id,username,display_name,role,account_status').order('username').limit(500);
    profiles = fallbackProfiles.data;
    profilesError = fallbackProfiles.error;
  }
  if (profilesError || rolesError || assignmentsError) {
    adminTabContent.innerHTML = `<div class="adm-notice adm-notice-warning"><strong>Role management could not load.</strong><p>${escapeHtml(profilesError?.message || rolesError?.message || assignmentsError?.message || 'Check the staff-role migration.')}</p></div>`;
    return;
  }
  const active = new Map((assignments||[]).filter(a=>a.is_active).map(a=>[a.user_id,a.role_key]));
  const assignableRoles = (roles||[]).filter(r=>r.is_assignable);
  adminTabContent.innerHTML = `<section class="adm-manager-panel adm-role-manager">
    <div class="adm-panel-heading"><div><p class="adm-kicker">ACCESS CONTROL</p><h2>Roles & permissions</h2><p>Assign staff access to existing accounts. Roles are enforced by Supabase policies and protected functions, not just by this screen.</p></div></div>
    <div class="adm-role-notice"><strong>Owner / Super Admin</strong><p>Your existing admin account remains the owner role. It is not assigned through this selector. Community Moderators cannot access creator contracts, earnings, payouts, financial settings, or owner-only announcements.</p></div>
    <div class="adm-role-list">${(profiles||[]).filter(p=>p.role!=='admin').map(p=>{
      const roleKey=active.get(p.id)||'';
      return `<article class="adm-role-row" data-user-id="${p.id}"><div class="adm-role-user"><strong>${escapeHtml(p.display_name||p.username||'Unnamed user')}</strong><span>@${escapeHtml(p.username||'unknown')} · ${escapeHtml(p.account_status||'active')}</span></div><label class="adm-field"><span>Staff role</span><select class="adm-staff-role-select"><option value="">No staff role</option>${assignableRoles.map(r=>`<option value="${escapeHtml(r.role_key)}" ${roleKey===r.role_key?'selected':''}>${escapeHtml(r.label)}</option>`).join('')}</select></label><button type="button" class="btn btn-primary adm-save-staff-role">Save role</button></article>`;
    }).join('')||'<p class="empty-row">No eligible accounts found.</p>'}</div>
    <div class="adm-role-capabilities"><h3>Available role capabilities</h3>${assignableRoles.map(r=>`<div><strong>${escapeHtml(r.label)}</strong><p>${escapeHtml(r.description)}</p></div>`).join('')}</div>
  </section>`;
  adminTabContent.querySelectorAll('.adm-save-staff-role').forEach(btn=>btn.addEventListener('click',async()=>{
    const row=btn.closest('[data-user-id]'); const roleKey=row.querySelector('.adm-staff-role-select').value; btn.disabled=true; const previous=btn.textContent;btn.textContent='Saving…';
    let result;
    if(roleKey){result=await supabase.rpc('admin_set_staff_assignment',{p_user_id:row.dataset.userId,p_role_key:roleKey,p_active:true});}
    else {
      const oldRole=active.get(row.dataset.userId);
      if(!oldRole){btn.disabled=false;btn.textContent=previous;showToast('No staff role change to save.');return;}
      result=await supabase.rpc('admin_set_staff_assignment',{p_user_id:row.dataset.userId,p_role_key:oldRole,p_active:false});
    }
    btn.disabled=false;btn.textContent=previous;
    if(result.error||!result.data?.success){showToast(`Could not save role: ${result.data?.reason||result.error?.message||'Unknown error'}`);return;}
    showToast(roleKey?'Staff role assigned.':'Staff role removed.'); await logAdminAction(roleKey?'assigned_staff_role':'removed_staff_role','staff_assignment',row.dataset.userId,roleKey||'No staff role'); renderStaffRoles();
  }));
}

// ============ Audit Log ============
// ============ Homepage ============
async function renderFeaturedManager() {
  const { data: featured, error: featuredError } = await supabase
    .from('stories')
    .select('id,title,status,cover_url,primary_genre,reads,profiles!stories_author_id_fkey(username,display_name)')
    .eq('is_admin_featured', true)
    .order('title');

  const { data: allStories, error: allStoriesError } = await supabase
    .from('stories')
    .select('id,title,status,cover_url,primary_genre,reads,profiles!stories_author_id_fkey(username,display_name)')
    .neq('status', 'draft')
    .order('title');

  if (featuredError || allStoriesError) {
    adminTabContent.innerHTML = `<p class="empty-row">Could not load Featured for You settings.</p>`;
    return;
  }

  const order = activeHomeSettings?.featured_story_order || [];
  const current = [...(featured || [])].sort((a,b) => { const ai=order.indexOf(a.id), bi=order.indexOf(b.id); if(ai<0&&bi<0)return a.title.localeCompare(b.title); if(ai<0)return 1; if(bi<0)return -1; return ai-bi; });
  const available = (allStories || []).filter((story) => !current.some((item) => item.id === story.id));
  const atLimit = current.length >= 4;

  adminTabContent.innerHTML = `
    <div class="admin-homepage-featured">
      <div class="admin-section-heading-row">
        <div>
          <h3 class="admin-section-heading">Featured for You</h3>
          <p class="empty-body">Choose the stories that appear in the Featured for You section on the homepage. Maximum 4 stories.</p>
        </div>
        <strong class="admin-featured-count">${current.length}/4</strong>
      </div>

      <div class="admin-featured-list">
        ${current.length ? current.map((story, index) => `
          <div class="admin-featured-item">
            <span class="admin-featured-number">${index + 1}</span>
            ${story.cover_url ? `<img src="${escapeHtml(story.cover_url)}" alt="" class="admin-featured-cover">` : '<div class="admin-featured-cover admin-featured-cover-fallback">G</div>'}
            <div class="admin-featured-info">
              <strong>${escapeHtml(story.title)}</strong>
              <span>${escapeHtml(story.status || 'Published')}</span>
            </div>
            <div class="adm-button-row adm-featured-actions"><button type="button" class="btn btn-ghost adm-feature-move" data-id="${story.id}" data-direction="up" aria-label="Move ${escapeHtml(story.title)} up" ${index===0?'disabled':''}>↑</button><button type="button" class="btn btn-ghost adm-feature-move" data-id="${story.id}" data-direction="down" aria-label="Move ${escapeHtml(story.title)} down" ${index===current.length-1?'disabled':''}>↓</button><button class="btn btn-outline admin-remove-featured-btn" data-id="${story.id}" data-title="${escapeHtml(story.title)}">Remove</button></div>
          </div>
        `).join('') : '<p class="empty-row">No stories are currently selected for Featured for You.</p>'}
      </div>

      <div class="admin-featured-add adm-featured-library">
        <div class="adm-featured-library-heading"><div><h4>Add stories to Featured for You</h4><p class="empty-body">Search the library, then add a story using its own button. You can feature up to four stories.</p></div><span class="admin-featured-count">${current.length}/4 selected</span></div>
        <label class="adm-field adm-featured-search"><span>Search available stories</span><input id="featureStorySearch" type="search" placeholder="Type a title or author name…" ${atLimit || !available.length ? 'disabled' : ''}></label>
        <div class="adm-featured-available" id="featuredAvailableStories">
          ${atLimit ? '<p class="empty-row">You have reached the four-story limit. Remove a featured story above to add another.</p>' : available.length ? available.map(story => `<article class="adm-featured-option" data-feature-search="${escapeHtml(`${story.title||''} ${story.profiles?.display_name||''} ${story.profiles?.username||''}`.toLowerCase())}">${story.cover_url ? `<img src="${escapeHtml(story.cover_url)}" alt="" loading="lazy">` : '<div class="adm-featured-option-cover">G</div>'}<div class="adm-featured-option-copy"><strong>${escapeHtml(story.title||'Untitled story')}</strong><small>${escapeHtml(story.profiles?.display_name||story.profiles?.username||'GidiReads author')}</small><span>${escapeHtml(story.primary_genre||'Story')} · ${Number(story.reads||0).toLocaleString()} reads</span></div><button type="button" class="btn btn-primary adm-add-featured-story" data-id="${escapeHtml(story.id)}" ${atLimit?'disabled':''}>Add story</button></article>`).join('') : '<p class="empty-row">No other published stories are available to add.</p>'}
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.adm-feature-move').forEach(btn => btn.addEventListener('click', async () => {
    const ids = current.map(story => story.id); const from = ids.indexOf(btn.dataset.id); const to = from + (btn.dataset.direction === 'up' ? -1 : 1);
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from],ids[to]]=[ids[to],ids[from]]; btn.disabled=true;
    const nextSettings = deepMergeSettings(activeHomeSettings); nextSettings.featured_story_order = ids;
    const {error}=await supabase.from('homepage_admin_settings').upsert({id:true,settings:nextSettings,updated_by:currentUser.id,updated_at:new Date().toISOString()},{onConflict:'id'});
    if(error){showToast(`Could not reorder featured stories: ${error.message}`);btn.disabled=false;return;}
    activeHomeSettings=nextSettings; await logAdminAction('reordered_featured_stories','stories',ids.join(','),'Changed Featured for You story order'); showToast('Featured story order saved'); renderHomepage();
  }));

  document.querySelectorAll('.admin-remove-featured-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const { data, error: e } = await supabase.rpc('admin_set_featured', {
        p_story_id: btn.dataset.id,
        p_featured: false,
      });
      if (e || !data?.success) {
        btn.disabled = false;
        showToast(`Could not remove: ${data?.reason || e?.message || 'Unknown error'}`);
        return;
      }
      showToast(`Removed ${btn.dataset.title} from Featured for You`);
      renderHomepage();
    });
  });

  const featuredSearch = document.getElementById('featureStorySearch');
  featuredSearch?.addEventListener('input', () => {
    const q = featuredSearch.value.trim().toLowerCase();
    document.querySelectorAll('#featuredAvailableStories [data-feature-search]').forEach(card => { card.hidden = !card.dataset.featureSearch.includes(q); });
  });
  document.querySelectorAll('.adm-add-featured-story').forEach(button => button.addEventListener('click', async () => {
    const id = button.dataset.id;
    if (!id || current.length >= 4) return;
    button.disabled = true; button.textContent = 'Adding…';
    const { data, error: e } = await supabase.rpc('admin_set_featured', { p_story_id: id, p_featured: true });
    if (e || !data?.success) {
      button.disabled = false; button.textContent = 'Add story';
      const message = data?.reason === 'featured_limit_reached' ? 'Featured for You already has 4 stories. Remove one before adding another.' : (data?.reason || e?.message || 'Unknown error');
      showToast(`Could not add story: ${message}`); return;
    }
    const nextSettings = deepMergeSettings(activeHomeSettings); nextSettings.featured_story_order = [...(nextSettings.featured_story_order||[]).filter(x=>x!==id),id];
    const { error: orderError } = await supabase.from('homepage_admin_settings').upsert({id:true,settings:nextSettings,updated_by:currentUser.id,updated_at:new Date().toISOString()},{onConflict:'id'});
    if (!orderError) activeHomeSettings = nextSettings;
    showToast('Story added to Featured for You'); renderHomepage();
  }));
}

const DEFAULT_HOME_SETTINGS = {
  hero: { enabled: true, eyebrow: 'GidiReads', title: 'Find a story worth staying for.', description: 'Discover novels, new voices and worlds you can disappear into.', cta_label: 'Explore stories', cta_url: 'explore.html', image_url: '', story_id: '' },
  sections: {
    featured: { enabled: true, order: 1, kicker: 'A place to begin', title: 'Featured for you' },
    trending: { enabled: true, order: 2, kicker: 'What readers are picking up', title: 'Trending now' },
    updated: { enabled: true, order: 3, kicker: 'New chapters to catch up on', title: 'Recently updated' },
    new: { enabled: true, order: 4, kicker: 'Fresh on the platform', title: 'New releases' },
    genres: { enabled: true, order: 5, kicker: 'Find your kind of story', title: 'Explore by genre' },
    tropes: { enabled: true, order: 6, kicker: 'Looking for a particular dynamic?', title: 'Discover by trope' }
  },
  custom_sections: [],
  explore: { featured_enabled: true, featured_title: 'Featured stories', featured_subtitle: 'Hand-picked stories from the GidiReads community', featured_max: 2 }
};

function deepMergeSettings(raw) {
  const result = JSON.parse(JSON.stringify(DEFAULT_HOME_SETTINGS));
  if (!raw || typeof raw !== 'object') return result;
  if (raw.hero) Object.assign(result.hero, raw.hero);
  if (raw.explore) Object.assign(result.explore, raw.explore);
  if (raw.sections) Object.keys(result.sections).forEach(k => { if (raw.sections[k]) Object.assign(result.sections[k], raw.sections[k]); });
  result.custom_sections = Array.isArray(raw.custom_sections) ? raw.custom_sections.map((x, i) => ({ id: String(x.id || `custom-${i+1}`), enabled: x.enabled !== false, order: Number(x.order) || 10+i, kicker: String(x.kicker || ''), title: String(x.title || ''), body: String(x.body || ''), image_url: String(x.image_url || ''), cta_label: String(x.cta_label || ''), cta_url: String(x.cta_url || ''), layout: x.layout === 'image-right' ? 'image-right' : 'image-left', story_ids: Array.isArray(x.story_ids) ? x.story_ids.map(String) : [] })) : [];
  result.featured_story_order = Array.isArray(raw.featured_story_order) ? raw.featured_story_order : [];
  return result;
}

async function uploadHomepageMedia(file) {
  if (!file) return '';
  const allowed = ['image/jpeg','image/png','image/webp','image/avif'];
  if (!allowed.includes(file.type)) throw new Error('Choose a JPG, PNG, WEBP or AVIF image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.');
  if (!currentUser) throw new Error('Please sign in as an administrator first.');
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(-80) || 'homepage-image';
  const path = `${currentUser.id}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from('homepage-media').upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
  if (error) throw error;
  const { data } = supabase.storage.from('homepage-media').getPublicUrl(path);
  return data.publicUrl;
}
function customSectionMarkup(item, index) {
  const id = String(item.id || `custom-${index+1}`);
  const selectedIds = Array.isArray(item.story_ids) ? item.story_ids.map(String) : [];
  return `<article class="adm-custom-section-row" data-custom-section="${escapeHtml(id)}">
    <div class="adm-custom-section-head"><strong>Custom section ${index+1}</strong><button type="button" class="btn btn-ghost adm-remove-custom-section">Remove section</button></div>
    <input type="hidden" name="custom_${escapeHtml(id)}_id" value="${escapeHtml(id)}">
    <div class="adm-field-grid">
      <label class="adm-toggle"><input type="checkbox" name="custom_${escapeHtml(id)}_enabled" ${item.enabled !== false ? 'checked' : ''}><span class="adm-toggle-track"></span><span class="adm-toggle-copy"><strong>Show this section</strong><small>Turn the section on or off without deleting it.</small></span></label>
      <label class="adm-field"><span>Display order</span><input type="number" min="1" max="30" name="custom_${escapeHtml(id)}_order" value="${Number(item.order)||10+index}"></label>
      <label class="adm-field"><span>Small heading</span><input maxlength="100" name="custom_${escapeHtml(id)}_kicker" value="${escapeHtml(item.kicker||'')}"></label>
      <label class="adm-field"><span>Section title</span><input maxlength="100" name="custom_${escapeHtml(id)}_title" required value="${escapeHtml(item.title||'')}"></label>
      <label class="adm-field adm-field-wide"><span>Text</span><textarea rows="3" maxlength="1200" name="custom_${escapeHtml(id)}_body" placeholder="Write the text readers will see…">${escapeHtml(item.body||'')}</textarea></label>
      <div class="adm-field adm-field-wide adm-story-picker" data-story-picker="${escapeHtml(id)}" data-selected-story-ids="${escapeHtml(JSON.stringify(selectedIds))}">
        <div class="adm-story-picker-heading"><div><strong>Stories for the “See all stories” page</strong><p>These novels will appear after a reader opens this section’s collection page — they will not appear above or inside the homepage banner.</p></div><span class="adm-selected-count" data-story-count="${escapeHtml(id)}">${selectedIds.length} selected</span></div>
        <div class="adm-selected-stories-wrap"><div class="adm-story-subhead"><strong>Selected stories</strong><small>Use Remove to take a story out of this collection.</small></div><div class="adm-selected-stories" data-selected-list="${escapeHtml(id)}"><p class="adm-picker-empty">No stories selected yet. Add them from the story library below.</p></div></div>
        <div class="adm-story-library-wrap"><div class="adm-story-subhead"><strong>Story library</strong><small>Choose stories deliberately using Add story.</small></div><input type="search" class="adm-story-search" placeholder="Search by story title or author…" aria-label="Search stories for this collection" data-story-search="${escapeHtml(id)}"><div class="adm-story-picker-list" data-story-list="${escapeHtml(id)}"></div></div>
      </div>
      <label class="adm-field"><span>Button label (optional)</span><input maxlength="50" name="custom_${escapeHtml(id)}_cta_label" value="${escapeHtml(item.cta_label||'')}"></label>
      <label class="adm-field"><span>Button destination (optional)</span><input maxlength="500" name="custom_${escapeHtml(id)}_cta_url" value="${escapeHtml(item.cta_url||'')}" placeholder="opportunities.html"></label>
      <label class="adm-field"><span>Image layout</span><select name="custom_${escapeHtml(id)}_layout"><option value="image-left" ${item.layout!=='image-right'?'selected':''}>Image on left</option><option value="image-right" ${item.layout==='image-right'?'selected':''}>Image on right</option></select></label>
      <label class="adm-field adm-field-wide"><span>Upload image from phone</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" data-home-upload="custom_${escapeHtml(id)}_image_url"><small class="adm-help">JPG, PNG, WEBP or AVIF · up to 5 MB. Uploads to GidiReads storage.</small><input type="hidden" name="custom_${escapeHtml(id)}_image_url" value="${escapeHtml(item.image_url||'')}"><img class="adm-image-preview" data-home-preview="custom_${escapeHtml(id)}_image_url" src="${escapeHtml(item.image_url||'')}" alt="Custom section image preview" ${item.image_url?'':'hidden'}></label>
    </div>
  </article>`;
}
function readCustomStoryIds(row) {
  try { const ids=JSON.parse(row.querySelector('[data-story-picker]')?.dataset.selectedStoryIds||'[]'); return Array.isArray(ids)?ids.map(String):[]; } catch { return []; }
}
function renderCustomStoryPicker(row) {
  if(!row)return;
  const picker=row.querySelector('[data-story-picker]'); if(!picker)return;
  const id=picker.dataset.storyPicker; const selected=readCustomStoryIds(row); const selectedSet=new Set(selected);
  const search=(picker.querySelector('[data-story-search]')?.value||'').trim().toLowerCase();
  const selectedStories=selected.map(storyId=>homepageStoryOptions.find(st=>String(st.id)===storyId)).filter(Boolean);
  const selectedList=picker.querySelector('[data-selected-list]');
  selectedList.innerHTML=selectedStories.length?selectedStories.map(st=>`<div class="adm-selected-story" data-selected-story="${escapeHtml(st.id)}"><div class="adm-selected-story-copy"><strong>${escapeHtml(st.title||'Untitled story')}</strong><small>${escapeHtml(st.profiles?.display_name||st.profiles?.username||'GidiReads author')}</small></div><button type="button" class="btn btn-ghost adm-remove-selected-story" data-remove-story="${escapeHtml(st.id)}">Remove</button></div>`).join(''):'<p class="adm-picker-empty">No stories selected yet. Add them from the story library below.</p>';
  const available=homepageStoryOptions.filter(st=>!selectedSet.has(String(st.id))&&`${st.title||''} ${st.profiles?.display_name||''} ${st.profiles?.username||''}`.toLowerCase().includes(search));
  const list=picker.querySelector('[data-story-list]');
  list.innerHTML=available.length?available.map(st=>`<div class="adm-available-story"><div class="adm-available-story-copy"><strong>${escapeHtml(st.title||'Untitled story')}</strong><small>${escapeHtml(st.profiles?.display_name||st.profiles?.username||'GidiReads author')}</small><small>${escapeHtml(st.primary_genre||'Story')} · ${Number(st.reads||0).toLocaleString()} reads</small></div><button type="button" class="btn btn-outline adm-add-story" data-add-story="${escapeHtml(st.id)}">Add story <span aria-hidden="true">+</span></button></div>`).join(''):'<p class="adm-picker-empty">No more matching stories to add.</p>';
  const count=picker.querySelector(`[data-story-count="${CSS.escape(id)}"]`); if(count)count.textContent=`${selected.length} selected`;
}

function bindHomepageImageUploads(root) {
  root.querySelectorAll('[data-home-upload]').forEach(input => input.addEventListener('change', async () => {
    const key = input.dataset.homeUpload, file = input.files?.[0]; if (!file) return;
    const hidden = root.querySelector(`[name="${CSS.escape(key)}"]`), preview = root.querySelector(`[data-home-preview="${CSS.escape(key)}"]`);
    const label = input.closest('label');
    try {
      if (preview && file) { preview.src = URL.createObjectURL(file); preview.hidden = false; }
      if (label.querySelector('.adm-help')) label.querySelector('.adm-help').textContent = 'Uploading image…';
      input.disabled = true;
      const url = await uploadHomepageMedia(file);
      hidden.value = url; preview.src = url; preview.hidden = false;
      if (label.querySelector('.adm-help')) label.querySelector('.adm-help').textContent = 'Uploaded. This image will appear after you save the settings.';
    } catch (err) {
      showToast(`Image upload failed: ${err.message || 'Please try again.'}`);
    } finally { input.disabled = false; }
  }));
}

async function renderHomepage() {
  const [{ data: settingsRow, error: settingsError }, { data: stories }] = await Promise.all([
    supabase.from('homepage_admin_settings').select('settings').eq('id', true).maybeSingle(),
    supabase.from('stories').select('id,title,status,cover_url,primary_genre,reads,echo_count,profiles!stories_author_id_fkey(username,display_name)').neq('status','draft').order('title')
  ]);
  activeHomeSettings = settingsError ? deepMergeSettings(null) : deepMergeSettings(settingsRow?.settings);
  homepageStoryOptions = (stories || []).filter(st => st.status !== 'draft');
  await renderFeaturedManager();
  if (settingsError) {
    adminTabContent.insertAdjacentHTML('afterbegin', `<div class="adm-notice adm-notice-warning"><strong>Homepage controls need their database migration.</strong><p>Featured for You remains available below. Run <code>GIDIREADS-PHASE-02-03-MIGRATION.sql</code> in Supabase SQL Editor to enable hero, section and Explore settings.</p><p class="adm-muted">Database message: ${escapeHtml(settingsError.message)}</p></div>`);
    return;
  }
  const cfg = activeHomeSettings;
  const storyOptions = (stories || []).map(st => `<option value="${st.id}" ${cfg.hero.story_id===st.id?'selected':''}>${escapeHtml(st.title)}</option>`).join('');
  const sections = Object.entries(cfg.sections).map(([key, v]) => `
    <div class="adm-section-row" data-section-row="${key}">
      <label class="adm-toggle"><input type="checkbox" name="section_${key}_enabled" ${v.enabled?'checked':''}><span class="adm-toggle-track"></span><span class="adm-toggle-copy"><strong>${escapeHtml(v.title)}</strong><small>${escapeHtml(key==='featured'?'Uses the existing Featured for You story selection':key==='trending'?'Keeps algorithmic ranking; this only controls placement':'Controls visibility and placement on the homepage')}</small></span></label>
      <label class="adm-field adm-order-field"><span>Order</span><input type="number" name="section_${key}_order" min="1" max="20" value="${Number(v.order)||1}"></label>
      <label class="adm-field"><span>Section title</span><input type="text" name="section_${key}_title" maxlength="90" value="${escapeHtml(v.title)}"></label>
      <label class="adm-field"><span>Small heading</span><input type="text" name="section_${key}_kicker" maxlength="100" value="${escapeHtml(v.kicker)}"></label>
    </div>`).join('');
  const manager = `
    <section class="adm-manager-panel">
      <div class="adm-panel-heading"><div><p class="adm-kicker">PRESENTATION & DISCOVERY</p><h2>Homepage & Explore Manager</h2><p>Shape what readers see without changing or deleting their stories.</p></div><span class="adm-live-chip"><i></i> Connected settings</span></div>
      <form id="homepageSettingsForm" class="adm-form">
        <div class="adm-subheading"><span class="adm-step">01</span><div><h3>Hero area</h3><p>Control the first message readers see.</p></div></div>
        <label class="adm-toggle adm-hero-toggle"><input type="checkbox" name="hero_enabled" ${cfg.hero.enabled?'checked':''}><span class="adm-toggle-track"></span><span class="adm-toggle-copy"><strong>Show homepage hero</strong><small>Hide or show the full introduction area.</small></span></label>
        <div class="adm-field-grid">
          <label class="adm-field"><span>Eyebrow</span><input name="hero_eyebrow" maxlength="60" value="${escapeHtml(cfg.hero.eyebrow)}"></label>
          <label class="adm-field"><span>Call-to-action label</span><input name="hero_cta_label" maxlength="40" value="${escapeHtml(cfg.hero.cta_label)}"></label>
          <label class="adm-field adm-field-wide"><span>Main headline</span><input name="hero_title" maxlength="130" required value="${escapeHtml(cfg.hero.title)}"></label>
          <label class="adm-field adm-field-wide"><span>Introduction</span><textarea name="hero_description" maxlength="320" rows="3">${escapeHtml(cfg.hero.description)}</textarea></label>
          <label class="adm-field"><span>Button destination</span><input name="hero_cta_url" maxlength="500" value="${escapeHtml(cfg.hero.cta_url)}" placeholder="explore.html"></label>
          <label class="adm-field adm-field-wide"><span>Hero artwork URL (optional)</span><input name="hero_image_url" maxlength="800" value="${escapeHtml(cfg.hero.image_url||'')}" placeholder="https://… or upload an image below"><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" data-home-upload="hero_image_url"><small class="adm-help">Upload from your phone · JPG, PNG, WEBP or AVIF · up to 5 MB</small><img class="adm-image-preview" data-home-preview="hero_image_url" src="${escapeHtml(cfg.hero.image_url||'')}" alt="Hero image preview" ${cfg.hero.image_url?'':'hidden'}></label>
          <label class="adm-field"><span>Hero story (manual selection)</span><select name="hero_story_id"><option value="">No hero story selected</option>${storyOptions}</select><small class="adm-help">Only the story you choose appears in the hero artwork. GidiReads will not substitute a popular story automatically.</small></label>
        </div>
        <div class="adm-subheading"><span class="adm-step">02</span><div><h3>Homepage sections</h3><p>Switch sections on or off, set their display order and edit their headings. Trending stays algorithmic.</p></div></div>
        <div class="adm-section-manager">${sections}</div>
        <div class="adm-subheading"><span class="adm-step">03</span><div><h3>Your custom sections</h3><p>Create extra editorial sections such as Holiday Season, a reading campaign, or a featured announcement. Each section can have text, an image, and a button.</p></div></div>
        <div id="customHomeSections" class="adm-custom-sections">${cfg.custom_sections.map(customSectionMarkup).join('')}</div>
        <div class="adm-custom-add-row"><button type="button" class="btn btn-outline" id="addCustomHomeSection">+ Add a custom section</button><span class="adm-muted">You can add, edit, reorder, hide, or remove custom sections.</span></div>
        <div class="adm-subheading"><span class="adm-step">04</span><div><h3>Explore featured area</h3><p>Manage the separate Explore-page display. This does not change trending calculations.</p></div></div>
        <div class="adm-field-grid">
          <label class="adm-toggle"><input type="checkbox" name="explore_featured_enabled" ${cfg.explore.featured_enabled?'checked':''}><span class="adm-toggle-track"></span><span class="adm-toggle-copy"><strong>Show Featured on Explore</strong><small>Uses stories selected in Featured for You below.</small></span></label>
          <label class="adm-field"><span>Section title</span><input name="explore_featured_title" maxlength="90" value="${escapeHtml(cfg.explore.featured_title)}"></label>
          <label class="adm-field adm-field-wide"><span>Section description</span><input name="explore_featured_subtitle" maxlength="180" value="${escapeHtml(cfg.explore.featured_subtitle)}"></label>
          <label class="adm-field"><span>Stories shown on Explore</span><select name="explore_featured_max">${[1,2,3,4].map(n=>`<option value="${n}" ${Number(cfg.explore.featured_max)===n?'selected':''}>${n} ${n===1?'story':'stories'}</option>`).join('')}</select></label>
        </div>
        <div class="adm-form-actions"><p class="adm-muted">Changes appear on the public pages after saving. This does not modify story content or delete anything.</p><button class="btn btn-primary" type="submit" id="saveHomepageSettings">Save presentation settings</button></div>
      </form>
    </section>`;
  adminTabContent.insertAdjacentHTML('afterbegin', manager);
  const form = document.getElementById('homepageSettingsForm');
  bindHomepageImageUploads(form);
  const customContainer = document.getElementById('customHomeSections');
  customContainer.querySelectorAll('[data-custom-section]').forEach(renderCustomStoryPicker);
  document.getElementById('addCustomHomeSection').addEventListener('click', () => { const id = `custom-${Date.now()}`; customContainer.insertAdjacentHTML('beforeend', customSectionMarkup({ id, enabled:true, order:10+customContainer.children.length, title:'', kicker:'', body:'', image_url:'', cta_label:'', cta_url:'', layout:'image-left', story_ids:[] }, customContainer.children.length)); const row=customContainer.lastElementChild; bindHomepageImageUploads(row); renderCustomStoryPicker(row); });
  customContainer.addEventListener('click', e => {
    const removeSection=e.target.closest('.adm-remove-custom-section'); if(removeSection && confirm('Remove this custom section from the homepage settings?')) { removeSection.closest('[data-custom-section]').remove(); return; }
    const add=e.target.closest('[data-add-story]'); const remove=e.target.closest('[data-remove-story]'); const row=e.target.closest('[data-custom-section]'); if(!row)return;
    if(add){const ids=readCustomStoryIds(row);const id=String(add.dataset.addStory);if(!ids.includes(id))ids.push(id);row.querySelector('[data-story-picker]').dataset.selectedStoryIds=JSON.stringify(ids);renderCustomStoryPicker(row);return;}
    if(remove){const id=String(remove.dataset.removeStory);const ids=readCustomStoryIds(row).filter(x=>x!==id);row.querySelector('[data-story-picker]').dataset.selectedStoryIds=JSON.stringify(ids);renderCustomStoryPicker(row);return;}
  });
  customContainer.addEventListener('input', e => { const search=e.target.closest('[data-story-search]'); if(search)renderCustomStoryPicker(search.closest('[data-custom-section]')); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('saveHomepageSettings'); btn.disabled = true; btn.textContent = 'Saving…';
    const fd = new FormData(form); const next = deepMergeSettings(cfg);
    next.hero = { enabled: fd.has('hero_enabled'), eyebrow: String(fd.get('hero_eyebrow')||'').trim(), title: String(fd.get('hero_title')||'').trim(), description: String(fd.get('hero_description')||'').trim(), cta_label: String(fd.get('hero_cta_label')||'').trim(), cta_url: String(fd.get('hero_cta_url')||'explore.html').trim(), image_url: String(fd.get('hero_image_url')||'').trim(), story_id: String(fd.get('hero_story_id')||'') };
    Object.keys(next.sections).forEach(key => { next.sections[key] = { enabled: fd.has(`section_${key}_enabled`), order: Math.max(1,Math.min(20,Number(fd.get(`section_${key}_order`))||1)), title: String(fd.get(`section_${key}_title`)||'').trim(), kicker: String(fd.get(`section_${key}_kicker`)||'').trim() }; });
    next.custom_sections = [...form.querySelectorAll('[data-custom-section]')].map((row,index) => { const id=row.dataset.customSection; const val=k=>String(fd.get(`custom_${id}_${k}`)||'').trim(); return { id, enabled:fd.has(`custom_${id}_enabled`), order:Math.max(1,Math.min(30,Number(val('order'))||10+index)), kicker:val('kicker'), title:val('title'), body:val('body'), image_url:val('image_url'), cta_label:val('cta_label'), cta_url:val('cta_url'), layout:val('layout')==='image-right'?'image-right':'image-left', story_ids:readCustomStoryIds(row) }; }).filter(x=>x.title);
    next.explore = { featured_enabled: fd.has('explore_featured_enabled'), featured_title: String(fd.get('explore_featured_title')||'Featured stories').trim(), featured_subtitle: String(fd.get('explore_featured_subtitle')||'').trim(), featured_max: Math.max(1,Math.min(4,Number(fd.get('explore_featured_max'))||2)) };
    const { error } = await supabase.from('homepage_admin_settings').upsert({ id:true, settings:next, updated_by:currentUser.id, updated_at:new Date().toISOString() }, { onConflict:'id' });
    btn.disabled = false; btn.textContent = 'Save presentation settings';
    if (error) { showToast(`Could not save settings: ${error.message}`); return; }
    await logAdminAction('updated_homepage_settings','homepage_admin_settings','singleton','Updated hero, built-in/custom homepage sections and Explore presentation');
    showToast('Homepage and Explore settings saved');
  });
}

let announcementCache = [];
async function renderAnnouncements() {
  adminTabContent.innerHTML = '<p class="empty-row">Loading announcements…</p>';
  const { data, error } = await supabase.from('platform_announcements').select('*').order('created_at',{ascending:false}).limit(100);
  if (error) {
    adminTabContent.innerHTML = `<div class="adm-notice adm-notice-warning"><strong>Announcements need their database migration.</strong><p>Run <code>GIDIREADS-PHASE-02-03-MIGRATION.sql</code> in Supabase SQL Editor, then reopen this tab.</p><p class="adm-muted">Database message: ${escapeHtml(error.message)}</p></div>`;
    return;
  }
  announcementCache = data || [];
  adminTabContent.innerHTML = `
    <section class="adm-manager-panel">
      <div class="adm-panel-heading"><div><p class="adm-kicker">PLATFORM COMMUNICATIONS</p><h2>Announcements</h2><p>Publish in-app updates and browser push to the selected audience. Holiday Hearts participant/finalist broadcasts must be linked to the relevant opportunity. Email is handled separately.</p></div><span class="adm-live-chip"><i></i> In-app feed</span></div>
      <form id="announcementForm" class="adm-form">
        <input type="hidden" name="id" value="">
        <div class="adm-field-grid">
          <label class="adm-field adm-field-wide"><span>Announcement title</span><input name="title" maxlength="120" required placeholder="e.g. GidiReads community update"></label>
          <label class="adm-field adm-field-wide"><span>Message</span><textarea name="message" rows="4" maxlength="1800" required placeholder="Write a clear, useful update for the community…"></textarea></label>
          <label class="adm-field"><span>Audience</span><select name="audience"><option value="all">Everyone</option><option value="readers">Readers</option><option value="authors">Authors</option><option value="holiday_participants">Holiday Hearts participants</option><option value="holiday_finalists">Holiday Hearts finalists</option></select></label>
          <label class="adm-field"><span>Category</span><select name="category"><option value="platform">Platform update</option><option value="community">Community</option><option value="contest">Contest / opportunity</option><option value="maintenance">Maintenance</option><option value="policy">Policy</option></select></label>
          <label class="adm-field"><span>Priority</span><select name="priority"><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></label>
          <label class="adm-field"><span>Status</span><select name="status"><option value="draft">Save as draft</option><option value="published">Publish now</option><option value="scheduled">Schedule</option></select></label>
          <label class="adm-field"><span>Schedule date/time (optional)</span><input name="publish_at" type="datetime-local"></label>
          <label class="adm-field"><span>Expiry date/time (optional)</span><input name="expires_at" type="datetime-local"></label>
          <label class="adm-field adm-field-wide"><span>Optional destination URL</span><input name="link_url" maxlength="800" placeholder="explore.html or https://…"></label>
          <label class="adm-field adm-field-wide"><span>Related opportunity (optional — shows this update on that opportunity’s page)</span><select name="opportunity_id"><option value="">— none —</option></select></label>
        </div>
        <div class="adm-form-actions"><p class="adm-muted">Scheduled announcements appear in the feed when their scheduled time arrives. You can edit or archive them later.</p><div class="adm-button-row"><button type="button" class="btn btn-outline" id="resetAnnouncementForm">Clear form</button><button class="btn btn-primary" type="submit" id="saveAnnouncementBtn">Save announcement</button></div></div>
      </form>
    </section>
    <section class="adm-manager-panel adm-announcement-history"><div class="adm-panel-heading"><div><p class="adm-kicker">CONTENT HISTORY</p><h2>Recent announcements</h2><p>Drafts, scheduled items, published messages and archived items.</p></div></div>
      ${announcementCache.length ? `<div class="adm-history-list">${announcementCache.map(a=>`<article class="adm-history-item"><div class="adm-history-main"><div class="adm-history-title-row"><h3>${escapeHtml(a.title)}</h3><span class="adm-status adm-status-${escapeHtml(a.status)}">${escapeHtml(a.status)}</span></div><p>${escapeHtml(a.message)}</p><div class="adm-history-meta"><span>${escapeHtml(a.audience)} · ${escapeHtml(a.category)} · ${escapeHtml(a.priority)}</span><span>${a.publish_at?new Date(a.publish_at).toLocaleString():'Not scheduled'}</span></div></div><div class="adm-button-row"><button class="btn btn-outline adm-edit-announcement" data-id="${a.id}" type="button">Edit</button>${a.status==='archived'?'':`<button class="btn btn-ghost adm-archive-announcement" data-id="${a.id}" type="button">Archive</button>`}</div></article>`).join('')}</div>` : '<p class="empty-row">No announcements yet. Create your first announcement above.</p>'}
    </section>`;
  const form = document.getElementById('announcementForm');
  supabase.from('platform_opportunities').select('id,title').order('created_at',{ascending:false}).then(({data})=>{const sel=form.elements.opportunity_id;(data||[]).forEach(o=>sel.add(new Option(o.title,o.id)));});
  const reset = () => { form.reset(); form.elements.id.value=''; document.getElementById('saveAnnouncementBtn').textContent='Save announcement'; };
  document.getElementById('resetAnnouncementForm').addEventListener('click',reset);
  form.addEventListener('submit',async e=>{
    e.preventDefault(); const btn=document.getElementById('saveAnnouncementBtn'); btn.disabled=true; btn.textContent='Saving…';
    const fd=new FormData(form); const status=String(fd.get('status')); let publishAt=fd.get('publish_at')?new Date(fd.get('publish_at')).toISOString():null;
    if(status==='published') publishAt=new Date().toISOString();
    if(status==='scheduled'&&!publishAt){showToast('Choose a schedule date and time first.');btn.disabled=false;btn.textContent='Save announcement';return;}
    const link=String(fd.get('link_url')||'').trim();
    const audience=String(fd.get('audience'));
    const opportunityId=String(fd.get('opportunity_id')||'')||null;
    if(['holiday_participants','holiday_finalists'].includes(audience)&&!opportunityId){showToast('Choose the Holiday Hearts opportunity for this participant/finalist broadcast.');btn.disabled=false;btn.textContent='Save announcement';return;}
    const payload={opportunity_id:opportunityId,title:String(fd.get('title')||'').trim(),message:String(fd.get('message')||'').trim(),audience,category:String(fd.get('category')),priority:String(fd.get('priority')),status,publish_at:publishAt,expires_at:fd.get('expires_at')?new Date(fd.get('expires_at')).toISOString():null,link_url:link||null,updated_by:currentUser.id,updated_at:new Date().toISOString()};
    if(status==='published'&&!link) payload.link_url=null;
    const id=String(fd.get('id')||''); let result;
    if(id) result=await supabase.from('platform_announcements').update(payload).eq('id',id).select('id').single();
    else result=await supabase.from('platform_announcements').insert({...payload,created_by:currentUser.id}).select('id').single();
    btn.disabled=false;btn.textContent='Save announcement';
    if(result.error){showToast(`Could not save announcement: ${result.error.message}`);return;}
    await logAdminAction(id?'updated_announcement':'created_announcement','platform_announcements',result.data?.id||id,payload.status);
    const wasAlreadyPublished=!!(id&&announcementCache.find(a=>a.id===id)?.status==='published');
    if(status==='published'&&!wasAlreadyPublished) {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-targeted-announcement-push',{body:{announcement_id:result.data?.id||id},headers:session?.access_token?{Authorization:`Bearer ${session.access_token}`}:{}});
      if(pushError || pushResult?.setup_required) showToast('Announcement published in-app. Browser push is not fully configured yet; check the push setup guide.');
      else if(pushResult?.sent>0) showToast(`Announcement published. Push delivered to ${pushResult.sent} device(s)${pushResult.failed?`; ${pushResult.failed} delivery(s) failed`:''}.`);
      else showToast(pushResult?.total_targets>0?'Announcement published in-app, but push delivery failed for every subscribed device. Check the Edge Function logs.':'Announcement published in-app. No subscribed devices were available for push.');
    } else showToast(status==='scheduled'?'Announcement scheduled':'Announcement saved');
    await renderAnnouncements();
  });
  adminTabContent.querySelectorAll('.adm-edit-announcement').forEach(btn=>btn.addEventListener('click',()=>{
    const a=announcementCache.find(x=>x.id===btn.dataset.id);if(!a)return;
    Object.entries({id:a.id,title:a.title,message:a.message,audience:a.audience,category:a.category,priority:a.priority,status:a.status,publish_at:a.publish_at,expires_at:a.expires_at,link_url:a.link_url,opportunity_id:a.opportunity_id}).forEach(([k,v])=>{const el=form.elements[k];if(!el)return;el.value=(k==='publish_at'||k==='expires_at')&&v?new Date(v).toISOString().slice(0,16):v||'';});
    document.getElementById('saveAnnouncementBtn').textContent='Update announcement';form.scrollIntoView({behavior:'smooth',block:'start'});
  }));
  adminTabContent.querySelectorAll('.adm-archive-announcement').forEach(btn=>btn.addEventListener('click',async()=>{
    if(!confirm('Archive this announcement? It will no longer appear in the reader feed.'))return;btn.disabled=true;
    const {error}=await supabase.from('platform_announcements').update({status:'archived',updated_by:currentUser.id,updated_at:new Date().toISOString()}).eq('id',btn.dataset.id);
    if(error){showToast(`Could not archive: ${error.message}`);btn.disabled=false;return;}
    await logAdminAction('archived_announcement','platform_announcements',btn.dataset.id,'Archived announcement');showToast('Announcement archived');renderAnnouncements();
  }));
}

const AUDIT_LABELS = {
  holiday_hearts_entry_approve: 'Approved a Holiday Hearts entry', holiday_hearts_entry_reject: 'Rejected a Holiday Hearts entry',
  holiday_hearts_entry_disqualify: 'Disqualified a Holiday Hearts entry', holiday_hearts_entry_under_review: 'Marked an entry under review',
  holiday_hearts_set_finalists: 'Chose Holiday Hearts finalists', holiday_hearts_announce_finalists: 'Announced the finalists',
  holiday_hearts_exclude_vote: 'Excluded a vote', holiday_hearts_restore_vote: 'Restored a vote',
  holiday_hearts_calculate_results: 'Calculated contest results', holiday_hearts_confirm_results: 'Confirmed and published results',
  holiday_hearts_reopen_results: 'Reopened published results', updated_holiday_hearts_finalist_rules: 'Updated the finalist rules',
  created_opportunity_slide: 'Added a hero slide', updated_opportunity_slide: 'Edited a hero slide', deleted_opportunity_slide: 'Deleted a hero slide',
  enabled_opportunity_slide: 'Turned a hero slide on', disabled_opportunity_slide: 'Turned a hero slide off', reordered_opportunity_slides: 'Reordered hero slides'
};
const auditLabel = (a) => AUDIT_LABELS[a] || String(a || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const auditGroup = (a) => /holiday_hearts/.test(a) ? 'Holiday Hearts' : /opportunit|slide/.test(a) ? 'Opportunities' : /ban|role|user|suspend|verify/.test(a) ? 'Users & roles' : /story|chapter|report|remove|hide/.test(a) ? 'Content & reports' : /announce|homepage|section/.test(a) ? 'Site content' : 'Other';
const AUDIT_PAGE = 50;

async function renderAuditLog() {
  const state = { rows: [], done: false, loading: false, admin: 'all', group: 'all', q: '', from: '', to: '' };
  const fmt = (d) => new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' });
  adminTabContent.innerHTML = `<div class="adm-manager-panel"><div class="adm-panel-heading"><div><p class="adm-kicker">ACCOUNTABILITY</p><h2>Audit history</h2><p>Every sensitive admin action is recorded here: who did it, what it was, and why. Times are Lagos time (WAT). Entries cannot be edited or deleted from this screen.</p></div><div class="adm-button-row"><button class="btn btn-outline" id="auditExport" type="button">Export CSV</button></div></div>
    <div class="adm-field-grid">
      <label class="adm-field"><span>Search</span><input id="auditQ" placeholder="Action, reason or ID"></label>
      <label class="adm-field"><span>Area</span><select id="auditGroup"><option value="all">All areas</option>${['Holiday Hearts', 'Opportunities', 'Users & roles', 'Content & reports', 'Site content', 'Other'].map((g) => `<option>${g}</option>`).join('')}</select></label>
      <label class="adm-field"><span>Admin</span><select id="auditAdmin"><option value="all">Everyone</option></select></label>
      <label class="adm-field"><span>From</span><input id="auditFrom" type="date"></label>
      <label class="adm-field"><span>To</span><input id="auditTo" type="date"></label></div>
    <p class="adm-muted" id="auditCount"></p><div class="adm-history-list" id="auditList"></div>
    <div class="adm-button-row" style="margin-top:12px"><button class="btn btn-outline" id="auditMore" type="button">Load more</button></div></div>`;
  const $a = (id) => document.getElementById(id);
  const adminName = (l) => l.profiles?.display_name || l.profiles?.username || 'Unknown admin';

  const draw = () => {
    const q = state.q.trim().toLowerCase();
    const shown = state.rows.filter((l) => (state.admin === 'all' || l.admin_id === state.admin) && (state.group === 'all' || auditGroup(l.action) === state.group)
      && (!q || `${l.action} ${auditLabel(l.action)} ${l.reason || ''} ${l.target_id || ''} ${adminName(l)}`.toLowerCase().includes(q)));
    $a('auditCount').textContent = `${shown.length} shown${state.done ? '' : ' (more available)'}.`;
    $a('auditList').innerHTML = shown.length ? shown.map((l) => `<article class="adm-history-item"><div class="adm-history-main">
      <div class="adm-history-title-row"><h3>${escapeHtml(auditLabel(l.action))}</h3><span class="adm-status adm-status-draft">${escapeHtml(auditGroup(l.action))}</span></div>
      <p>${escapeHtml(adminName(l))} · ${fmt(l.created_at)}</p>
      ${l.reason ? `<p><strong>Reason:</strong> ${escapeHtml(l.reason)}</p>` : ''}
      <details><summary>Details</summary><p class="adm-muted">Action code: <code>${escapeHtml(l.action)}</code><br>Target: ${escapeHtml(l.target_type || '—')}${l.target_id ? ` · <code>${escapeHtml(l.target_id)}</code>` : ''}</p></details></div></article>`).join('')
      : '<p class="empty-row">No actions match these filters.</p>';
    $a('auditMore').hidden = state.done;
    const admins = [...new Map(state.rows.map((l) => [l.admin_id, adminName(l)])).entries()];
    const cur = $a('auditAdmin').value;
    $a('auditAdmin').innerHTML = '<option value="all">Everyone</option>' + admins.map(([id, n]) => `<option value="${escapeHtml(id)}">${escapeHtml(n)}</option>`).join('');
    $a('auditAdmin').value = admins.some(([id]) => id === cur) ? cur : 'all';
  };
  const load = async (reset = false) => {
    if (state.loading) return; state.loading = true;
    if (reset) { state.rows = []; state.done = false; }
    let qy = supabase.from('admin_audit_log').select('id, admin_id, action, target_type, target_id, reason, created_at, profiles(username, display_name)').order('created_at', { ascending: false }).range(state.rows.length, state.rows.length + AUDIT_PAGE - 1);
    if (state.from) qy = qy.gte('created_at', new Date(state.from + 'T00:00:00+01:00').toISOString());
    if (state.to) qy = qy.lte('created_at', new Date(state.to + 'T23:59:59+01:00').toISOString());
    const { data, error } = await qy;
    state.loading = false;
    if (error) { $a('auditList').innerHTML = `<p class="empty-row">Could not load the audit history: ${escapeHtml(error.message)}</p>`; return; }
    state.rows = state.rows.concat(data || []); state.done = (data || []).length < AUDIT_PAGE; draw();
  };
  $a('auditQ').addEventListener('input', (e) => { state.q = e.target.value; draw(); });
  $a('auditGroup').addEventListener('change', (e) => { state.group = e.target.value; draw(); });
  $a('auditAdmin').addEventListener('change', (e) => { state.admin = e.target.value; draw(); });
  $a('auditFrom').addEventListener('change', (e) => { state.from = e.target.value; load(true); });
  $a('auditTo').addEventListener('change', (e) => { state.to = e.target.value; load(true); });
  $a('auditMore').addEventListener('click', () => load());
  $a('auditExport').addEventListener('click', () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = ['When,Admin,Area,Action,Target,Target ID,Reason', ...state.rows.map((l) => [fmt(l.created_at), adminName(l), auditGroup(l.action), auditLabel(l.action), l.target_type, l.target_id, l.reason].map(esc).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `gidireads-audit-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  });
  load(true);
}

wireWriteSheet(() => currentUser, () => {});

initAuth();
