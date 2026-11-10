import { supabase, supabaseEnvironment, supabaseProjectName } from './supabaseClient.js';

const $ = (id) => document.getElementById(id);
let currentUser = null;
let badgeRows = [];
let milestoneRows = [];
let achievementRows = [];
let taskRows = [];
let activeBadgeFilter = 'all';
let activeMilestoneCategory = 'all';
let activeMilestonePeriod = 'all';
let activeTaskFilter = 'all';
let walletActivityRows = [];
let walletActivityLimit = 10;
let activeWalletFilter = 'all';
// Awarding remains server-side; the release bundle requests a refresh only after the reviewed migration is installed.
const ENABLE_ACHIEVEMENT_REFRESH = true;
const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num = (value) => Number(value || 0).toLocaleString();
const moneyByCurrency = (rows) => { const totals=new Map(); (rows||[]).forEach(row=>{const code=String(row.currency||'').toUpperCase();totals.set(code,(totals.get(code)||0)+Number(row.creator_amount||0));}); return [...totals].map(([code,amount])=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency:code,minimumFractionDigits:2,maximumFractionDigits:2}).format(amount)}catch{return `${amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${code||'currency not set'}`}}).join(' · ')||'—'; };

function showEnvironmentNotice() {
  if (supabaseEnvironment !== 'dev') return;
  const banner = document.createElement('aside');
  banner.className = 'mgr-status';
  banner.setAttribute('role', 'status');
  banner.style.cssText = 'margin:0 auto 1rem;max-width:1180px;border:1px solid #c5a6e8;background:#f5efff;color:#39244e;padding:.75rem 1rem;border-radius:12px;font-size:.9rem;';
  banner.textContent = `Development testing mode · Connected to ${supabaseProjectName}. Production data is separate.`;
  const main = document.querySelector('.mgr-page');
  if (main) main.prepend(banner);
}
showEnvironmentNotice();

async function fetchAllRows(buildQuery, pageSize = 500) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
}

function setStatus(message, type = '') { const el = $('mgrStatus'); el.textContent = message; el.className = `mgr-status${type ? ` ${type}` : ''}`; }
function setTab(name) {
  document.querySelectorAll('.mgr-tab').forEach(button => { const active = button.dataset.panel === name; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); });
  document.querySelectorAll('.mgr-panel').forEach(panel => { const active = panel.dataset.content === name; panel.classList.toggle('active', active); panel.hidden = !active; });
}
function badgeSymbol(badge) {
  const symbols = {author_words:'W',author_first_publication:'✎',author_story_count:'✦',author_story_completed:'✓',reader_chapters:'▤',reader_novels:'⌕',reader_library:'▣',reader_completed:'✓',reader_days:'◷',reader_comments:'“',reader_likes:'♡',author_received_likes:'✧',reader_echoes:'✦',author_echoes:'✧',community_comments:'C',special:'✦',membership:'G'};
  return symbols[badge.rule_key] || (badge.category === 'author' ? '✎' : badge.category === 'reader' ? '▤' : '✧');
}
function badgeArt(row, small = false) {
  return row.image_url
    ? `<img class="mgr-badge-art${small ? ' small' : ''}" src="${esc(row.image_url)}" alt="${esc(row.name)} badge" loading="lazy" width="${small ? 42 : 64}" height="${small ? 42 : 64}">`
    : `<span class="mgr-badge-mark${row.earned ? '' : ' locked'}">${esc(badgeSymbol(row))}</span>`;
}
function renderBadges() {
  const earned = badgeRows.filter(row => row.earned);
  $('badgeCount').textContent = `${earned.length} earned`;
  $('statBadges').textContent = num(earned.length);
  const rows = badgeRows.filter(row => activeBadgeFilter === 'all' || row.category === activeBadgeFilter);
  if (!rows.length) { $('badgeGrid').innerHTML = '<p class="mgr-empty">No badges are available in this category yet.</p>'; return; }
  $('badgeGrid').innerHTML = rows.map(row => `<article class="mgr-badge-card ${row.earned ? 'earned' : 'unearned'}"><div class="mgr-badge-art-wrap ${row.earned ? '' : 'locked'}">${badgeArt(row)}</div><div class="mgr-badge-details"><h3>${esc(row.name)}</h3><p>${esc(row.description || 'A GidiReads achievement.')}</p><small>${row.earned ? `Earned ${new Date(row.awarded_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}` : esc(row.requirement_label || 'Not earned yet')}</small>${row.earned ? `<label class="mgr-public-badge-toggle"><input type="checkbox" data-badge-visibility="${esc(row.id)}" ${row.is_public ? 'checked' : ''}> Display on public profile</label>` : ''}</div></article>`).join('');
  const recentItems=[...earned.map(row=>({kind:'badge',name:row.name,date:row.awarded_at,row})),...(achievementRows||[]).map(row=>({kind:'milestone',name:row.name_snapshot,date:row.completed_at,row}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).filter((item,index,all)=>all.findIndex(other=>other.kind===item.kind&&other.name===item.name&&String(other.date).slice(0,10)===String(item.date).slice(0,10))===index).slice(0,4);
  $('recentBadges').innerHTML = recentItems.length ? recentItems.map(item => `<div class="mgr-mini-badge">${item.kind==='badge'?badgeArt(item.row,true):'<span class="mgr-history-check" aria-hidden="true">✓</span>'}<span><strong>${esc(item.name)}</strong><small>${item.kind==='badge'?'Badge earned':'Milestone completed'} · ${new Date(item.date).toLocaleDateString(undefined,{day:'numeric',month:'short'})}</small></span></div>`).join('') : '<p class="mgr-empty">Your first achievements will appear here as you read, write, and participate.</p>';
}
function getCycleKey(row) {
  const tz = row.cycle_timezone || 'UTC';
  let dateText;
  try { const parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()); const part=type=>parts.find(p=>p.type===type)?.value||'00'; dateText=`${part('year')}-${part('month')}-${part('day')}`; }
  catch { dateText = new Date().toISOString().slice(0,10); }
  const day = new Date(`${dateText}T00:00:00Z`);
  if (row.period === 'daily') return dateText;
  if (row.period === 'weekly') { const dow=day.getUTCDay()||7; day.setUTCDate(day.getUTCDate()-dow+1); const iso=getIsoWeekParts(day); return `${iso.year}-W${String(iso.week).padStart(2,'0')}`; }
  if (row.period === 'monthly') return dateText.slice(0,7);
  if (row.period === 'event') return `event-${row.milestone_slug}`;
  return 'lifetime';
}
function getIsoWeekParts(date) { const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())); d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7)); const year=d.getUTCFullYear(),yearStart=new Date(Date.UTC(year,0,1)); return {year,week:Math.ceil((((d-yearStart)/86400000)+1)/7)}; }
function formatPeriodLabel(key) {
  const weekly=String(key||'').match(/^(\d{4})-W(\d{2})$/);
  const fmt=date=>date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  if(weekly){const year=Number(weekly[1]),week=Number(weekly[2]);const jan4=new Date(Date.UTC(year,0,4));const monday=new Date(jan4);monday.setUTCDate(jan4.getUTCDate()-((jan4.getUTCDay()||7)-1)+(week-1)*7);const sunday=new Date(monday);sunday.setUTCDate(monday.getUTCDate()+6);return `${fmt(monday)} – ${fmt(sunday)}`;}
  if(key==='lifetime')return 'Lifetime achievement';
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(key||'')))return fmt(new Date(`${key}T00:00:00Z`));
  if(/^\d{4}-\d{2}$/.test(String(key||''))){const [y,m]=key.split('-').map(Number);return new Date(Date.UTC(y,m-1,1)).toLocaleDateString(undefined,{month:'long',year:'numeric',timeZone:'UTC'});}
  return String(key||'Achievement');
}
function milestoneProgress(row) {
  const key = getCycleKey(row);
  const matches = row.progress_rows || [];
  return matches.find(p => p.period_key === key) || (row.period === 'lifetime' || row.period === 'once' ? matches.find(p => p.period_key === 'lifetime') : null) || {progress_value:0,target_value:row.target_value,status:'in_progress',period_key:key};
}
function isMilestoneEligible(row) { const roles=row.eligible_roles||['reader']; return roles.includes('reader') || roles.includes('all') || (roles.includes('author') && row.user_is_author); }
function milestoneCard(row) {
  const p = milestoneProgress(row), target=Math.max(1,Number(p.target_value||row.target_value||1)), value=Math.max(0,Number(p.progress_value||0)), percent=Math.min(100,Math.round(value/target*100)), complete=p.status==='completed'||value>=target;
  const badge = row.badge || null;
  const eligible = isMilestoneEligible(row);
  const periodLabel = ({lifetime:'Lifetime',daily:'Daily',weekly:'Weekly',monthly:'Monthly',once:'One-time',event:'Event'})[row.period] || row.period;
  const state = !eligible ? 'Available after your first eligible story is published' : complete ? 'Completed' : `${num(value)} of ${num(target)}`;
  return `<article class="mgr-milestone-card ${complete?'is-complete':''} ${eligible?'':'is-locked'}"><div class="mgr-milestone-top"><div><span class="mgr-milestone-category">${esc(row.category)} · ${esc(periodLabel)}</span><h3>${esc(row.name)}</h3></div>${badge?`<img class="mgr-milestone-badge" src="${esc(badge.image_url||'assets/badges/curious-reader.svg')}" alt="${esc(badge.name)} badge" loading="lazy">`:''}</div><p class="mgr-milestone-description">${esc(row.description)}</p><div class="mgr-progress-meta"><span>${esc(state)}</span><strong>${eligible?percent:0}%</strong></div><div class="mgr-progress-track" role="progressbar" aria-label="${esc(row.name)} progress" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${eligible?Math.min(value,target):0}"><span class="mgr-progress-fill ${complete?'complete':''}" style="width:${eligible?percent:0}%"></span></div>${complete?`<p class="mgr-milestone-state"><span aria-hidden="true">✓</span> Milestone completed${p.completed_at?` · ${new Date(p.completed_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}`:''}</p>`:badge?`<p class="mgr-milestone-reward">Linked badge: ${esc(badge.name)}</p>`:''}</article>`;
}
function renderMilestones() {
  const rows = milestoneRows.filter(row => (activeMilestoneCategory==='all'||row.category===activeMilestoneCategory) && (activeMilestonePeriod==='all'||row.period===activeMilestonePeriod));
  $('milestoneCount').textContent = `${milestoneRows.length} available`;
  $('milestoneGrid').innerHTML = rows.length ? rows.map(milestoneCard).join('') : '<p class="mgr-empty">No published milestones match these filters.</p>';
  const overview = milestoneRows.filter(isMilestoneEligible).sort((a,b)=>{const pa=milestoneProgress(a),pb=milestoneProgress(b);return (pa.status==='completed')-(pb.status==='completed') || (Number(pb.progress_value||0)/Math.max(1,Number(pb.target_value||b.target_value||1)))-(Number(pa.progress_value||0)/Math.max(1,Number(pa.target_value||a.target_value||1)));}).slice(0,3);
  $('overviewMilestoneProgress').innerHTML = overview.length ? overview.map(row=>{const p=milestoneProgress(row),target=Math.max(1,Number(p.target_value||row.target_value||1)),value=Math.min(target,Number(p.progress_value||0)),percent=Math.min(100,Math.round(value/target*100));return `<div class="mgr-overview-milestone"><div><strong>${esc(row.name)}</strong><small>${p.status==='completed'?'Completed':`${num(value)} / ${num(target)}`}</small></div><div class="mgr-progress-track"><span class="mgr-progress-fill ${p.status==='completed'?'complete':''}" style="width:${percent}%"></span></div></div>`}).join('') : '<p class="mgr-empty">Milestone progress will appear after the reviewed database setup is installed.</p>';
  $('achievementHistory').innerHTML = achievementRows.length ? achievementRows.map(a=>`<article class="mgr-history-item"><span class="mgr-history-check" aria-hidden="true">✓</span><div><strong>${esc(a.name_snapshot)}</strong><p>${esc(a.description_snapshot||'Milestone completed.')}</p><small>${esc(formatPeriodLabel(a.period_key))} · completed ${new Date(a.completed_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})} · result ${num(a.final_progress)} / ${num(a.target_value)}</small></div></article>`).join('') : '<p class="mgr-empty">Completed milestones will be recorded here. Previous weekly cycles remain in this history.</p>';
}
function renderTasks() {
  const rows = taskRows.filter(task => activeTaskFilter === 'all' || task.category === activeTaskFilter);
  if (!rows.length) { $('taskList').innerHTML = '<article class="mgr-card"><h2>No active tasks yet</h2><p class="mgr-muted">New tasks will appear here when they are active in the GidiReads task catalogue. Progress and rewards are verified by the server.</p></article>'; return; }
  $('taskList').innerHTML = rows.map(task => `<article class="mgr-task-item"><span class="mgr-task-symbol">${esc(task.icon || '✧')}</span><div class="mgr-task-copy"><strong>${esc(task.title)}</strong><p>${esc(task.description || '')}</p><small>${esc(task.reward_label || 'Reward details available in task rules')}</small></div><div class="mgr-task-actions"><span class="mgr-task-state">${esc(task.state_label || 'Available')}</span><button class="mgr-task-claim" type="button" data-claim-task="${esc(task.id)}" ${task.claim_disabled ? 'disabled' : ''}>${esc(task.claim_label || 'Check progress')}</button></div></article>`).join('');
}
function setBalances(wallet) {
  const ready = !!wallet;
  const balances = {g_coins:wallet?.g_coins,echoes_purchased:wallet?.echoes_purchased,echoes_promotional:wallet?.echoes_promotional,echoes_free:wallet?.echoes_free,echoes_bonus:wallet?.echoes_bonus,gidipasses:wallet?.gidipasses};
  const display = value => ready ? num(value) : '—';
  $('snapshotCoins').textContent = $('walletCoins').textContent = display(balances.g_coins);
  $('snapshotPurchasedEchoes').textContent = $('walletPurchasedEchoes').textContent = display(balances.echoes_purchased);
  $('snapshotPromoEchoes').textContent = $('walletPromoEchoes').textContent = display(balances.echoes_promotional);
  $('snapshotFreeEchoes').textContent = $('walletFreeEchoes').textContent = display(balances.echoes_free);
  $('snapshotBonusEchoes').textContent = $('walletBonusEchoes').textContent = display(balances.echoes_bonus);
  $('snapshotPasses').textContent = $('walletPasses').textContent = display(balances.gidipasses);
  const note = document.querySelector('.mgr-wallet-snapshot')?.nextElementSibling;
  if (note) note.textContent = ready ? 'Balances are read-only here. Transactions must be processed by verified server-side operations.' : 'Wallet is not connected yet. No balance is being assumed or displayed as a real zero.';
}
async function loadProfile() {
  const {data:{session}} = await supabase.auth.getSession();
  currentUser = session?.user || null;
  $('loginBtn').textContent = currentUser ? 'Log out' : 'Log in';
  if (!currentUser) { $('loginNote').hidden = false; $('managerContent').hidden = true; setStatus(''); return; }
  $('loginNote').hidden = true; $('managerContent').hidden = false; setStatus('Loading your account…');
  const {data:profile,error:profileError} = await supabase.from('profiles').select('id,username,display_name,bio,avatar_url,role').eq('id',currentUser.id).maybeSingle();
  if (profileError) throw profileError;
  const p = profile || {};
  if (ENABLE_ACHIEVEMENT_REFRESH) {
    try {
      const { data: newlyAwarded, error: awardError } = await supabase.rpc('refresh_my_achievements');
      if (awardError) console.warn('Achievement refresh is not available yet:', awardError.message);
      else if (Number(newlyAwarded) > 0) console.info(`GidiReads awarded ${newlyAwarded} new achievement(s).`);
    } catch (awardErr) { console.warn('Achievement refresh is not available yet:', awardErr); }
  }
  $('mgrDisplayName').textContent = p.display_name || p.username || 'GidiReads member';
  $('mgrUsername').textContent = p.username ? `@${p.username}` : currentUser.email || '';
  $('mgrBio').textContent = p.bio || '';
  $('mgrRole').textContent = p.role === 'admin' ? 'Administrator' : 'Reader & author account';
  $('mgrAvatar').src = p.avatar_url || 'assets/gidireads-logo.png';
  $('publicProfileLink').href = `author.html?id=${encodeURIComponent(currentUser.id)}`;
  $('welcomeTitle').textContent = `Welcome back, ${p.display_name || p.username || 'storyteller'}.`;
  const [{data:stories,error:storiesError},{data:events,error:eventsError},{data:wallet,error:walletError},{data:catalog,error:catalogError},{data:earned,error:earnedError},{data:tasks,error:tasksError},{data:transactions,error:transactionsError},{data:paymentOrders,error:paymentOrdersError},{data:unlocks,error:unlocksError},{data:walletGifts,error:walletGiftsError},{data:passHistory,error:passHistoryError},{data:applications,error:applicationsError},{data:contracts,error:contractsError},{data:earnings,error:earningsError},{data:milestones,error:milestonesError},{data:progressRows,error:progressError},{data:verifiedChapters,error:verifiedChaptersError}] = await Promise.all([
    supabase.from('stories').select('id,title,status').eq('author_id',currentUser.id),
    supabase.from('reading_events').select('story_id,chapter_id,event_type,occurred_at').eq('reader_id',currentUser.id).in('event_type',['chapter_opened','chapter_completed','story_completed','comment_created','echo_given']),
    supabase.from('wallet_accounts').select('g_coins,echoes_purchased,echoes_promotional,echoes_free,echoes_bonus,gidipasses').eq('user_id',currentUser.id).maybeSingle(),
    supabase.from('badge_catalog').select('id,badge_slug,name,description,category,tier,rule_key,threshold_value,requirement_label,image_url,is_active').order('display_order'),
    supabase.from('user_badges').select('badge_id,awarded_at,cycle_key,is_public,public_order').eq('user_id',currentUser.id).order('awarded_at',{ascending:false}),
    supabase.from('task_catalog').select('id,task_slug,title,description,category,reward_type,reward_amount,reward_badge_id,icon').eq('is_active',true).order('display_order'),
    fetchAllRows(() => supabase.from('wallet_transactions').select('id,currency,transaction_type,amount,status,description,reference_type,reference_id,related_transaction_id,metadata,created_at').eq('user_id',currentUser.id).order('created_at',{ascending:false}),500),
    fetchAllRows(() => supabase.from('wallet_payment_orders').select('id,order_type,amount_minor,currency_code,credit_currency,credit_amount,pass_plan_key,status,created_at,verified_at').eq('user_id',currentUser.id).order('created_at',{ascending:false}),500),
    fetchAllRows(() => supabase.from('wallet_chapter_unlocks').select('id,chapter_id,story_id,price_g_coins,transaction_id,unlocked_at').eq('user_id',currentUser.id).order('unlocked_at',{ascending:false}),500),
    fetchAllRows(() => supabase.rpc('gidireads_my_gift_history'),500),
    fetchAllRows(() => supabase.from('gidipass_subscriptions').select('id,plan_key,starts_at,ends_at,status,granted_by,created_at,payment_order_id').eq('user_id',currentUser.id).order('created_at',{ascending:false}),500),
    supabase.from('contract_applications').select('id,status').eq('author_id',currentUser.id),
    supabase.from('creator_contracts').select('id,status').eq('author_id',currentUser.id),
    supabase.from('creator_earnings').select('creator_amount,currency,status,payout_request_id').eq('creator_id',currentUser.id),
    supabase.from('milestone_catalog').select('id,milestone_slug,name,description,category,period,eligible_roles,target_value,verification_key,badge_id,status,display_order,cycle_timezone').eq('status','published').order('display_order'),
    supabase.from('user_milestone_progress').select('milestone_id,period_key,progress_value,target_value,status,completed_at,updated_at').eq('user_id',currentUser.id).order('updated_at',{ascending:false}),
    supabase.from('user_completed_chapters').select('chapter_id').eq('user_id',currentUser.id)
  ]);
  const {data:history,error:historyError} = await fetchAllRows(() => supabase.from('user_achievements').select('id,milestone_slug,name_snapshot,description_snapshot,category,period_key,target_value,final_progress,completed_at').eq('user_id',currentUser.id).order('completed_at',{ascending:false}),500);
  for (const [err,label] of [[storiesError,'stories'],[eventsError,'reading activity'],[walletError,'wallet'],[catalogError,'badge catalogue'],[earnedError,'earned badges'],[tasksError,'tasks'],[transactionsError,'transactions'],[paymentOrdersError,'payment orders'],[unlocksError,'chapter unlocks'],[walletGiftsError,'wallet gifts'],[passHistoryError,'GidiPass history'],[applicationsError,'contract applications'],[contractsError,'creator contracts'],[earningsError,'creator earnings'],[milestonesError,'milestone catalogue'],[progressError,'milestone progress'],[historyError,'achievement history'],[verifiedChaptersError,'verified chapter completions']]) if (err) console.warn(`GidiReads ${label}:`,err.message);
  let taskProgressRows = [];
  if (!tasksError) { const progressResult = await supabase.from('user_task_progress').select('task_id,period_key,status,progress_value,target_value').eq('user_id', currentUser.id).order('updated_at',{ascending:false}); if (!progressResult.error) taskProgressRows = progressResult.data || []; else console.warn('GidiReads task progress:', progressResult.error.message); }
  const storyList = stories || [];
  const publishedStories = storyList.filter(s => ['ongoing','completed'].includes(s.status));
  let publishedWords = 0;
  if (storyList.length) {
    const {data:chapters,error:chapterError} = await supabase.from('chapters').select('story_id,content,content_html,is_published').in('story_id',storyList.map(s=>s.id)).eq('is_published',true);
    if (chapterError) console.warn('GidiReads chapter counts:',chapterError.message);
    (chapters||[]).forEach(ch => { const text = String(ch.content_html || ch.content || '').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').trim(); publishedWords += text ? text.split(/\s+/).filter(Boolean).length : 0; });
  }
  const readEvents = events || [];
  const completedChapters = new Set((verifiedChapters||[]).map(e=>e.chapter_id).filter(Boolean)).size;
  $('statWords').textContent = num(publishedWords); $('statStories').textContent = num(publishedStories.length); $('statChapters').textContent = verifiedChaptersError ? '—' : num(completedChapters);
  setBalances(wallet);
  loadDailyEchoStatus();
  if (!applicationsError && !contractsError && !earningsError) {
    $('creatorApplicationCount').textContent = num((applications||[]).length);
    $('creatorContractCount').textContent = num((contracts||[]).filter(c=>['active','accepted','signed'].includes(String(c.status||'').toLowerCase())).length);
    const availableRows=(earnings||[]).filter(r=>r.status==='available'&&!r.payout_request_id);
    $('creatorAvailableEarnings').textContent=moneyByCurrency(availableRows);
    $('creatorSnapshotNote').textContent=availableRows.length?'Available earnings are grouped by the currency saved on each record. Payouts remain disabled until a payment provider is ready.':'No available creator earnings have been recorded yet. Payouts remain disabled until a payment provider is ready.';
  } else {
    $('creatorApplicationCount').textContent=$('creatorContractCount').textContent=$('creatorAvailableEarnings').textContent='—';
    $('creatorSnapshotNote').textContent='Creator account data is not connected in this database environment yet; no figures are being assumed.';
  }
  const earnedMap = new Map();
  (earned||[]).forEach(row=>{ if(!earnedMap.has(row.badge_id)) earnedMap.set(row.badge_id,row); });
  const activeMilestoneBadgeIds = new Set((milestones||[]).map(m=>m.badge_id).filter(Boolean));
  badgeRows = (catalog||[]).map(b=>{const award=earnedMap.get(b.id);return {...b,earned:!!award,awarded_at:award?.awarded_at||null,is_public:!!award?.is_public,cycle_key:award?.cycle_key||'once'};}).filter(b=>b.earned||activeMilestoneBadgeIds.has(b.id)||b.rule_key==='manual');
  const hasAuthor = publishedStories.length > 0;
  const progressByMilestone = new Map();
  (progressRows||[]).forEach(row=>{if(!progressByMilestone.has(row.milestone_id))progressByMilestone.set(row.milestone_id,[]);progressByMilestone.get(row.milestone_id).push(row);});
  const badgeById = new Map(badgeRows.map(b=>[b.id,b]));
  milestoneRows = (milestones||[]).map(m=>({...m,user_is_author:hasAuthor,progress_rows:progressByMilestone.get(m.id)||[],badge:badgeById.get(m.badge_id)||null}));
  achievementRows = history||[];
  renderBadges();
  renderMilestones();
  const achievementErrors = [catalogError, earnedError, milestonesError, progressError, historyError].filter(Boolean);
  if (achievementErrors.length) {
    const details = [...new Set(achievementErrors.map(err => err.message || 'Unknown database error'))].join(' · ');
    const missingSchema = achievementErrors.some(err => /relation .* does not exist|schema cache|could not find the table/i.test(err.message || ''));
    const message = missingSchema
      ? 'The selected Supabase project does not have the complete Phase 1 achievements schema yet.'
      : 'The selected Supabase project returned an error while loading some achievement records.';
    const panelMessage = `<article class="mgr-card"><h2>Achievement data needs attention</h2><p class="mgr-muted">${esc(message)}</p><p class="mgr-muted"><strong>Environment:</strong> ${esc(supabaseProjectName)}</p><details><summary>Technical details</summary><p class="mgr-muted">${esc(details)}</p></details></article>`;
    if (catalogError) $('badgeGrid').innerHTML = panelMessage;
    if (milestonesError) $('milestoneGrid').innerHTML = panelMessage;
    if (earnedError || historyError) $('recentBadges').innerHTML = panelMessage;
    if (progressError || historyError) $('overviewMilestoneProgress').innerHTML = panelMessage;
    if (historyError) $('achievementHistory').innerHTML = panelMessage;
    if (catalogError) { $('statBadges').textContent = '—'; $('badgeCount').textContent = 'Unavailable'; }
    if (milestonesError) $('milestoneCount').textContent = 'Unavailable';
  }
  const taskBadgeIds=[...new Set((tasks||[]).map(t=>t.reward_badge_id).filter(Boolean))];let taskBadgeMap=new Map();if(taskBadgeIds.length){const {data:taskBadges,error:taskBadgeError}=await supabase.from('badge_catalog').select('id,name').in('id',taskBadgeIds);if(taskBadgeError)console.warn('Task reward badges:',taskBadgeError.message);(taskBadges||[]).forEach(b=>taskBadgeMap.set(b.id,b.name));}
  taskRows = (tasks||[]).map(task=>{ const progress = taskProgressRows.filter(p=>p.task_id===task.id).sort((a,b)=>String(b.period_key).localeCompare(String(a.period_key)))[0]; const claimed = progress?.status==='claimed'; const complete = progress?.status==='completed'; const rewardLabel=task.reward_type==='badge'?`Badge reward · ${taskBadgeMap.get(task.reward_badge_id)||'Badge'}`:`${task.reward_amount||''} ${String(task.reward_type||'').replace(/_/g,' ')}`.trim(); return {...task,state_label:claimed?'Claimed':complete?'Ready to claim':progress?`${progress.progress_value}/${progress.target_value}`:'Available',claim_label:claimed?'Claimed':complete?'Claim reward':'Check progress',claim_disabled:claimed,reward_label:rewardLabel||'Reward configured by GidiReads'}; });
  renderTasks();
  if (walletError || !wallet) {
    setBalances(null);
    $('walletTransactions').innerHTML = `<p class="mgr-empty">${walletError ? 'Your wallet could not be loaded right now. Please refresh and try again.' : 'Your wallet is not available yet. No balance has been assumed.'}</p>`;
  } else {
    const txRows = transactionsError ? [] : (transactions || []);
    const ledgerRows = txRows.map(tx => ({...tx,activityKind:'ledger',label:tx.description || prettyWalletType(tx.transaction_type),currency:tx.currency,amount:Number(tx.amount),status:tx.status||'recorded',date:tx.created_at}));
    const paymentRows = paymentOrdersError ? [] : (paymentOrders || []).map(order=>({id:order.id,activityKind:'payment',label:prettyWalletType(order.order_type),currency:order.currency_code,amount:Number(order.amount_minor)/100,status:order.status,date:order.created_at,reference_type:'payment order',transaction_type:order.order_type}));
    walletActivityRows = [...ledgerRows,...paymentRows].sort((a,b)=>new Date(b.date)-new Date(a.date));
    renderWalletActivity();
    if(transactionsError) $('walletTransactions').innerHTML = '<p class="mgr-empty">Wallet activity could not be loaded. Please refresh and try again.</p>';
  }
  await renderWalletRelatedHistory({paymentOrders:paymentOrdersError?null:paymentOrders,unlocks:unlocksError?null:unlocks,gifts:walletGiftsError?null:walletGifts,passes:passHistoryError?null:passHistory,stories:storyList});
  await loadWalletGiftCatalogue();
  setStatus('Your account activity has loaded.', 'success');
}

async function loadWalletGiftCatalogue(){const host=$('giftCatalogue');if(!host)return;host.innerHTML='<p class="mgr-empty">Loading gift catalogue…</p>';const {data,error}=await supabase.from('wallet_gift_catalog').select('gift_key,display_name,cost_echoes,asset_path').eq('is_active',true).order('sort_order');if(error){console.warn('Wallet gift catalogue unavailable:',error.message);host.innerHTML='<p class="mgr-empty">Gift prices and artwork are temporarily unavailable. You can still open the Store to try again.</p>';return;}const rows=data||[];host.innerHTML=rows.length?rows.map(g=>`<a class="mgr-gift-item mgr-gift-item-link" href="store.html#giftsView" aria-label="Open the store to send ${esc(g.display_name)}"><img src="${esc(g.asset_path||`assets/gifts/${g.gift_key}.svg`)}" alt="${esc(g.display_name)} gift artwork" loading="lazy"><div><strong>${esc(g.display_name)}</strong><span>${num(g.cost_echoes)} Support Echoes</span><small>Open Gift Store ↗</small></div></a>`).join(''):'<p class="mgr-empty">No gifts are available at the moment.</p>';}

function prettyWalletType(value='') {
  const words=String(value||'Wallet activity').replace(/[_-]+/g,' ').trim();
  return words ? words.replace(/\b\w/g,ch=>ch.toUpperCase()) : 'Wallet activity';
}
function walletDate(value) {
  if(!value) return 'Date unavailable';
  const d=new Date(value); return Number.isNaN(d.getTime())?'Date unavailable':d.toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function walletStatus(value='recorded') {
  const clean=String(value||'recorded').toLowerCase().replace(/[_-]+/g,' ');
  const klass=/paid|completed|confirmed|success|succeeded|recorded|posted|active|verified|unlocked/.test(clean)?'good':/pending|processing|created|initiated/.test(clean)?'pending':/failed|cancel|refund|revers|expired|declined/.test(clean)?'bad':'neutral';
  return `<span class="mgr-wallet-status ${klass}">${esc(prettyWalletType(clean))}</span>`;
}
function walletAmount(amount,currency,sign=true) {
  const n=Number(amount||0), prefix=sign&&n>0?'+':'';
  return `${prefix}${num(n)} <span class="mgr-wallet-currency">${esc(currency||'—')}</span>`;
}
function renderWalletActivity() {
  const rows=walletActivityRows.filter(row=>{const currency=String(row.currency||'').toLowerCase();if(activeWalletFilter==='all')return true;if(activeWalletFilter==='money')return row.activityKind==='payment'||/purchase|payment|refund/.test(`${row.activityKind} ${row.transaction_type||''} ${row.reference_type||''}`);if(activeWalletFilter==='echoes')return currency.startsWith('echoes_');return currency===activeWalletFilter;});
  const shown=rows.slice(0,walletActivityLimit);
  $('walletTransactions').innerHTML=shown.length?`<div class="mgr-wallet-activity-list">${shown.map(tx=>`<article class="mgr-wallet-activity"><div class="mgr-wallet-activity-main"><strong>${esc(tx.label||prettyWalletType(tx.transaction_type))}</strong><small>${esc(walletDate(tx.date))}${tx.reference_type?` · ${esc(prettyWalletType(tx.reference_type))}`:''}</small></div><div class="mgr-wallet-activity-side"><strong>${walletAmount(tx.amount,tx.currency)}</strong>${walletStatus(tx.status)}</div></article>`).join('')}</div>`:'<p class="mgr-empty">No activity matches this filter yet.</p>';
  const more=$('walletLoadMore'); if(more) more.hidden=shown.length>=rows.length;
}
async function renderWalletRelatedHistory({paymentOrders,unlocks,gifts,passes,stories}) {
  const storyNames=new Map((stories||[]).map(s=>[s.id,s.title]));
  const storyIds=[...new Set((unlocks||[]).map(u=>u.story_id).filter(id=>id&&!storyNames.has(id)))];
  if(storyIds.length){
    const {data:titles,error:titleError}=await supabase.from('stories').select('id,title').in('id',storyIds);
    if(!titleError)(titles||[]).forEach(story=>storyNames.set(story.id,story.title));
    else console.warn('GidiReads unlocked story titles:',titleError.message);
  }
  if(unlocks===null) $('walletUnlockHistory').innerHTML='<p class="mgr-empty">Chapter unlock history could not be loaded.</p>';
  else if(!unlocks?.length) $('walletUnlockHistory').innerHTML='<p class="mgr-empty">No chapter unlocks recorded yet.</p>';
  else $('walletUnlockHistory').innerHTML=unlocks.map(u=>`<article class="mgr-wallet-activity"><div class="mgr-wallet-activity-main"><strong>${esc(storyNames.get(u.story_id)||'Unlocked chapter')}</strong><small>${esc(walletDate(u.unlocked_at))} · Permanent access recorded</small></div><div class="mgr-wallet-activity-side"><strong>${num(u.price_g_coins)} G Coins</strong>${walletStatus('unlocked')}</div></article>`).join('');
  if(paymentOrders===null) $('walletPurchaseHistory').innerHTML='<p class="mgr-empty">Purchase history could not be loaded.</p>';
  else if(!paymentOrders?.length) $('walletPurchaseHistory').innerHTML='<p class="mgr-empty">No purchases recorded yet.</p>';
  else $('walletPurchaseHistory').innerHTML=paymentOrders.map(o=>`<article class="mgr-wallet-activity"><div class="mgr-wallet-activity-main"><strong>${esc(prettyWalletType(o.order_type))}${o.pass_plan_key?` · ${esc(o.pass_plan_key)}`:''}</strong><small>${esc(walletDate(o.created_at))}${o.verified_at?` · Verified ${esc(walletDate(o.verified_at))}`:''}</small></div><div class="mgr-wallet-activity-side"><strong>${(Number(o.amount_minor)/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} <span class="mgr-wallet-currency">${esc(o.currency_code||'—')}</span></strong>${walletStatus(o.status)}</div></article>`).join('');
  if(gifts===null) $('walletGiftHistory').innerHTML='<p class="mgr-empty">Gift activity could not be loaded.</p>';
  else if(!gifts?.length) $('walletGiftHistory').innerHTML='<p class="mgr-empty">No gifts sent or received yet.</p>';
  else $('walletGiftHistory').innerHTML=gifts.map(g=>{const sent=g.recipient_user_id!==currentUser.id;return `<article class="mgr-wallet-activity"><div class="mgr-wallet-activity-main"><strong>${sent?'Gift sent':'Gift received'}${g.gift_key?` · ${esc(String(g.gift_key).replace(/[-_]/g,' '))}`:''}</strong><small>${esc(walletDate(g.created_at))}${g.note?` · ${esc(g.note)}`:''}</small></div><div class="mgr-wallet-activity-side"><strong>${sent?'−':'+'}${num(g.amount)} <span class="mgr-wallet-currency">${esc(g.currency)}</span></strong>${walletStatus('recorded')}</div></article>`}).join('');
  if(passes===null) $('walletPassHistory').innerHTML='<p class="mgr-empty">GidiPass activity could not be loaded.</p>';
  else if(!passes?.length) $('walletPassHistory').innerHTML='<p class="mgr-empty">No GidiPass activity recorded yet.</p>';
  else $('walletPassHistory').innerHTML=passes.map(pass=>`<article class="mgr-wallet-activity"><div class="mgr-wallet-activity-main"><strong>${esc(prettyWalletType(pass.plan_key))}</strong><small>${esc(walletDate(pass.starts_at))} – ${esc(walletDate(pass.ends_at))}</small></div><div class="mgr-wallet-activity-side">${walletStatus(pass.status)}</div></article>`).join('');
}

document.querySelectorAll('.mgr-tab').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.dataset.panel)));
document.querySelectorAll('[data-wallet-filter]').forEach(btn=>btn.addEventListener('click',()=>{activeWalletFilter=btn.dataset.walletFilter;walletActivityLimit=10;document.querySelectorAll('[data-wallet-filter]').forEach(b=>b.classList.toggle('active',b===btn));renderWalletActivity()}));
$('walletLoadMore')?.addEventListener('click',()=>{walletActivityLimit+=10;renderWalletActivity()});
document.querySelectorAll('[data-go-panel]').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.dataset.goPanel)));
document.querySelectorAll('[data-badge-filter]').forEach(btn=>btn.addEventListener('click',()=>{activeBadgeFilter=btn.dataset.badgeFilter;document.querySelectorAll('[data-badge-filter]').forEach(b=>b.classList.toggle('active',b===btn));renderBadges()}));
document.querySelectorAll('[data-milestone-category]').forEach(btn=>btn.addEventListener('click',()=>{activeMilestoneCategory=btn.dataset.milestoneCategory;document.querySelectorAll('[data-milestone-category]').forEach(b=>b.classList.toggle('active',b===btn));renderMilestones()}));
document.querySelectorAll('[data-milestone-period]').forEach(btn=>btn.addEventListener('click',()=>{activeMilestonePeriod=btn.dataset.milestonePeriod;document.querySelectorAll('[data-milestone-period]').forEach(b=>b.classList.toggle('active',b===btn));renderMilestones()}));
$('badgeGrid').addEventListener('change',async e=>{const input=e.target.closest('[data-badge-visibility]');if(!input||!currentUser)return;input.disabled=true;const {error}=await supabase.rpc('set_my_badge_visibility',{p_badge_id:input.dataset.badgeVisibility,p_is_public:input.checked});if(error){input.checked=!input.checked;setStatus(error.message||'Badge visibility could not be updated.','error');input.disabled=false;return;}const row=badgeRows.find(b=>b.id===input.dataset.badgeVisibility);if(row)row.is_public=input.checked;setStatus(input.checked?'Badge added to your public profile.':'Badge hidden from your public profile.','success');input.disabled=false;});
document.querySelectorAll('[data-task-category]').forEach(btn=>btn.addEventListener('click',()=>{activeTaskFilter=btn.dataset.taskCategory;document.querySelectorAll('[data-task-category]').forEach(b=>b.classList.toggle('active',b===btn));renderTasks()}));
$('taskList').addEventListener('click',async e=>{const btn=e.target.closest('[data-claim-task]');if(!btn||!currentUser)return;btn.disabled=true;const {data,error}=await supabase.rpc('claim_gidireads_task',{p_task_id:btn.dataset.claimTask});if(error){setStatus(error.message||'Task progress could not be checked.','error');btn.disabled=false;return;}if(data?.status==='claimed'){setStatus('Task reward recorded.','success');await loadProfile();}else if(data?.status==='already_claimed'){setStatus('You have already claimed this task for the current period.','success');await loadProfile();}else{setStatus(`Progress checked: ${Number(data?.progress||0).toLocaleString()} / ${Number(data?.target||0).toLocaleString()}.`,'success');await loadProfile();}});
$('loginBtn').addEventListener('click',async()=>{if(currentUser){await supabase.auth.signOut();location.href='index.html'}else location.href='account.html'});
$('openLoginBtn').addEventListener('click',()=>location.href='account.html');
supabase.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;loadProfile().catch(err=>{console.error(err);setStatus('Could not load all account information. Check the database setup and refresh.', 'error')})});
loadProfile().catch(err=>{console.error(err);setStatus('Some sections could not load. The database migration may not have been applied yet.', 'error');$('loginNote').hidden=!!currentUser;$('managerContent').hidden=!currentUser;});


async function loadDailyEchoStatus(){const btn=$('claimDailyEchoes');if(!btn)return;btn.disabled=true;btn.textContent='Checking availability…';try{const {data,error}=await supabase.rpc('gidireads_get_daily_echo_status');if(error)throw error;const row=Array.isArray(data)?data[0]:(data||{});const streak=Number(row.streak_day??row.current_streak??0);$('dailyEchoStreak').textContent=`${streak} day${streak===1?'':'s'} · streak`;const next=row.next_claim_at?new Date(row.next_claim_at):null;const expiry=row.next_expiry_at?new Date(row.next_expiry_at):null;const canClaim=!!(row.can_claim??row.claim_available??(!row.last_claim_at||(next&&next<=new Date())));$('dailyEchoMessage').textContent=canClaim?'Claim 2 free appreciation Echoes plus a 1-Echo streak reward. Unused grants carry forward, and each grant expires individually 24 hours after it is issued.':`Your daily Echoes are already claimed${next?`. Next claim available ${next.toLocaleString()}`:''}.`;if(expiry&&expiry>new Date()){$('dailyEchoExpiry').textContent=`Your earliest free Echoes expire ${expiry.toLocaleString()}${expiry-new Date()<2*60*60*1000?' — less than two hours away':''}.`;}else $('dailyEchoExpiry').textContent='Each free grant has its own 24-hour expiry.';btn.disabled=!canClaim;btn.textContent=canClaim?'Claim daily Echoes':'Already claimed';}catch(e){console.warn('Daily Echo status unavailable',e);$('dailyEchoMessage').textContent='Daily Echo status is temporarily unavailable. Your wallet balance has not been changed.';btn.disabled=true;btn.textContent='Unavailable right now';}}
$('claimDailyEchoes')?.addEventListener('click',async()=>{const btn=$('claimDailyEchoes');btn.disabled=true;btn.textContent='Claiming…';try{const {data,error}=await supabase.rpc('gidireads_claim_daily_echoes',{p_idempotency_key:crypto.randomUUID()});if(error)throw error;const result=Array.isArray(data)?data[0]:(data||{});if(result.success===false||result.claimed===false){$('dailyEchoMessage').textContent=result.message||'Your daily Echoes have already been claimed.';}else{$('dailyEchoMessage').textContent='Your daily appreciation Echoes have been claimed.';}await loadProfile();await loadDailyEchoStatus();}catch(e){console.warn('Daily Echo claim failed',e);$('dailyEchoMessage').textContent='We could not claim your Echoes right now. Please try again later.';btn.disabled=true;btn.textContent='Try again later';}});
