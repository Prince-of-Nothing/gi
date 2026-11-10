import { COUNTRY_OPTIONS } from './country-options.js';
import { supabase } from './supabaseClient.js';

const $ = (s) => document.querySelector(s);
const esc = (v) => { const n = document.createElement('span'); n.textContent = String(v ?? ''); return n.innerHTML; };
const fmt = (v) => new Intl.NumberFormat().format(Number(v || 0));
const contractNames = { echoes_only: 'Echo-only', non_exclusive: 'Non-exclusive', exclusive: 'Exclusive' };
function applyTheme(dark){document.documentElement.dataset.theme=dark?'dark':'light';const b=$('#themeToggle');if(b){b.textContent=dark?'Light mode':'Dark mode';b.setAttribute('aria-pressed',String(dark));}document.querySelector('meta[name=theme-color]')?.setAttribute('content',dark?'#100a16':'#f5f1f7');}
applyTheme(localStorage.getItem('gidireads-authors-theme')==='dark');
let user = null, stories = [], contracts = [], activeData = null;

function status(message, kind = 'info') {
  const el = $('#status'); el.textContent = message; el.dataset.kind = kind; el.hidden = false; $('#dashboard').hidden = true;
}
function showDashboard() { $('#status').hidden = true; $('#dashboard').hidden = false; }
function compareText(current, previous) {
  if (previous === null || previous === undefined) return 'All-time total';
  const a=Number(current||0), b=Number(previous||0);
  if (b===0) return a===0 ? 'No activity in either period' : 'New activity this period';
  const pct=((a-b)/b)*100;
  return `${pct>0?'+':''}${pct.toFixed(1)}% vs previous period`;
}
function metric(label, value, note, tone, icon, previous) {
  return `<article class="an-metric tone-${tone}"><div class="an-metric-top"><span>${icon}</span><small>${label}</small></div><strong>${fmt(value)}</strong><p>${note}</p><small class="an-compare">${compareText(value,previous)}</small></article>`;
}
function chartCard(title, points, key, color, totalValue = null, suffix = '') {
  const values = points.map(p => Number(p[key] || 0));
  const max = Math.max(1, ...values), min = Math.min(0, ...values), w = 620, h = 170, pad = 16;
  const coords = values.map((v,i) => [pad + (values.length < 2 ? 0 : i*(w-pad*2)/(values.length-1)), h-pad - ((v-min)/(max-min || 1))*(h-pad*2)]);
  const line = coords.map((p,i) => `${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${coords.at(-1)?.[0] || pad},${h-pad} L${coords[0]?.[0] || pad},${h-pad} Z`;
  const ticks = [0,.33,.66,1].map(t => `<line x1="${pad}" y1="${pad+t*(h-pad*2)}" x2="${w-pad}" y2="${pad+t*(h-pad*2)}" class="an-gridline"/>`).join('');
  const dots = coords.filter((_,i) => values.length <= 12 || i % Math.ceil(values.length/10) === 0 || i===values.length-1).map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${color}"/>`).join('');
  const total = totalValue === null || totalValue === undefined ? values.reduce((sum, value) => sum + value, 0) : Number(totalValue || 0);
  return `<article class="an-chart"><div class="an-chart-title"><h3>${title}</h3><strong style="color:${color}">${fmt(total)}${suffix}</strong></div><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${title} trend">${ticks}<path d="${area}" fill="${color}" opacity=".10"/><path d="${line}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg><div class="an-chart-foot"><span>${points[0]?.day || 'Start'}</span><span>${points.at(-1)?.day || 'Today'}</span></div></article>`;
}
function render(data) {
  activeData = data;
  const m = data.metrics || {}, prev = data.previous_metrics || null, series = data.series || [], chapters = data.chapters || [];
  $('#selectedStoryTitle').textContent = data.story?.title || 'Story performance';
  $('#storySub').textContent = `Figures for ${data.story?.title || 'your selected story'} · ${data.period?.days ? `Last ${data.period.days} days, compared with the previous ${data.period.days}` : 'All-time totals; trend chart shows the latest 12 months'}`;
  const type = data.story?.contract_type || '';
  $('#contractLabel').textContent = contractNames[type] || 'Active contract';
  $('#contractType').textContent = `${contractNames[type] || 'Active'} contract`;
  $('#metricCards').innerHTML = [
    metric('Story reads',m.reads,'Times readers opened this story','violet','◉',prev?.reads),
    metric('Chapter reads',m.chapter_reads,'Chapter opens across the story','blue','▤',prev?.chapter_reads),
    metric('Effective reads',m.effective_reads,'Qualifying completed reading sessions','green','✓',prev?.effective_reads),
    metric('Comments',m.comments,'Comments on your chapters','gold','✎',prev?.comments),
    metric('Reviews',m.reviews,'Reviews submitted for this story','pink','★',prev?.reviews)
  ].join('');
  $('#charts').innerHTML = [
    chartCard('Story reads',series,'reads','#b79aff',m.reads),
    chartCard('Effective reads',series,'effective_reads','#70d7b0',m.effective_reads),
    chartCard('Chapter comments',series,'comments','#f2bf72',m.comments),
    ...(data.echo_summary ? [chartCard('Echoes received',series,'echoes','#72c9ee',data.echo_summary.echoes)] : [])
  ].join('');
  const maxChapter = Math.max(1,...chapters.map(c=>Number(c.chapter_reads||0)));
  const bestChapter = chapters.reduce((best,c)=>!best || Number(c.chapter_reads||0)>Number(best.chapter_reads||0)?c:best,null);
  $('#chapterChart').innerHTML = chapters.length ? `${bestChapter && Number(bestChapter.chapter_reads)>0 ? `<div class="an-best-chapter"><span>TOP CHAPTER THIS PERIOD</span><strong>Chapter ${esc(bestChapter.chapter_number)} · ${esc(bestChapter.title || 'Untitled chapter')}</strong><small>${fmt(bestChapter.chapter_reads)} chapter opens</small></div>` : ''}<div class="an-bars">${chapters.map(c=>`<div class="an-bar-row"><span>Ch. ${esc(c.chapter_number)}</span><div class="an-bar-track"><i style="width:${Math.max(2,Number(c.chapter_reads||0)/maxChapter*100)}%"></i></div><b>${fmt(c.chapter_reads)}</b></div>`).join('')}</div>` : '<p class="an-empty">No chapter activity has been recorded in this period.</p>';
  $('#chapterTable').innerHTML = chapters.length ? `<table><thead><tr><th>Chapter</th><th>Reads</th><th>Effective</th><th>Comments</th></tr></thead><tbody>${chapters.map(c=>`<tr><td>${esc(c.chapter_number)} · ${esc(c.title || 'Untitled chapter')}</td><td>${fmt(c.chapter_reads)}</td><td>${fmt(c.effective_reads)}</td><td>${fmt(c.comments)}</td></tr>`).join('')}</tbody></table>` : '';
  const ratings = data.review_ratings || {};
  const ratingRows = [['Plot','plot'],['Characters','characters'],['Writing','writing'],['World-building','worldbuilding'],['Pacing','pacing']];
  $('#reviewRatings').innerHTML = ratingRows.map(([label,key])=>{const n=Number(ratings[key]||0);return `<div class="an-rating-row"><span>${label}</span><div class="an-rating-track"><i style="width:${Math.max(0,Math.min(100,n/5*100))}%"></i></div><b>${n.toFixed(2)}</b></div>`}).join('');
  $('#reviewSummary').textContent = m.average_rating ? `Overall average: ${Number(m.average_rating).toFixed(2)} / 5` : 'No review ratings in this period.';
  $('#appreciatorStats').innerHTML = data.echo_summary ? `<div class="an-support-stat"><strong>${fmt(data.echo_summary.echoes)}</strong><span>Echoes received</span></div><div class="an-support-stat"><strong>${fmt(data.echo_summary.unique_echo_senders)}</strong><span>Unique Echo senders</span></div>` : '<p class="an-empty">Verified Echo totals will appear after the analytics database update is installed.</p>';
  $('#purchaseNote').textContent = data.echo_summary ? (data.attribution_notes?.purchased_echoes || 'Only Echoes with a verified story link are included.') : 'Echo totals are temporarily hidden so older, incomplete figures are not shown as if they were complete.';
  $('#followerContent').innerHTML = `<div class="an-audience-stat"><strong>${fmt(m.author_followers)}</strong><span>Author followers</span></div><div class="an-audience-stat"><strong>${fmt(m.author_gift_senders)}</strong><span>Gift senders</span></div><div class="an-audience-stat"><strong>${fmt(m.author_gift_events)}</strong><span>Gift events</span></div>`;
  $('#subscriberPanel').hidden = !['non_exclusive','exclusive'].includes(type);
  $('#subscriberContent').textContent = ['non_exclusive','exclusive'].includes(type) ? `${fmt(m.locked_chapter_subscribers)} readers` : '';
  const geo=data.geography||{};
  $('#countryPanel').innerHTML = geo.available && Array.isArray(geo.countries) && geo.countries.length ? `<div class="an-country-list">${geo.countries.map(c=>`<div class="an-country-row"><span>${esc(COUNTRY_OPTIONS.find(([code])=>code===c.country_code)?.[1]||c.country_code)}</span><div class="an-country-track"><i style="width:${Math.max(2,Math.min(100,Number(c.share_percent)||0))}%"></i></div><strong>${fmt(c.reader_count)}</strong><small>${Number(c.share_percent||0).toFixed(1)}%</small></div>`).join('')}</div><p class="an-help">Country is estimated from the reader's connection at the time they read. Percentages use the groups shown; countries with fewer than five readers are hidden.</p>` : `<strong>Country breakdown is not available yet.</strong><p>Country totals will appear once at least five readers from a country have read this story.</p>`;
  $('#metricNotes').innerHTML = `<p><b>Effective reads:</b> ${esc(data.attribution_notes?.effective_reads || 'Qualifying reading sessions are counted separately from chapter opens.')}</p><p><b>Gifts:</b> ${esc(data.attribution_notes?.gifts || 'Gift totals are shown at author level when story attribution is unavailable.')}</p><p><b>Story reads:</b> A story open is not the same as a completed chapter.</p><p><b>Reader drop-off:</b> We are not showing a drop-off score yet because the current progress data is not strong enough to make that figure reliable.</p>`;
  showDashboard();
}
async function loadStories() {
  const [sr, cr] = await Promise.all([
    supabase.from('stories').select('id,title,status').eq('author_id',user.id).order('created_at',{ascending:false}),
    supabase.from('creator_contracts').select('id,story_id,contract_type,status,accepted_at,starts_at,ends_at').eq('author_id',user.id).in('status',['active','accepted','signed']).order('accepted_at',{ascending:false})
  ]);
  if (sr.error || cr.error) throw new Error('We could not load your contracted stories. Please refresh and try again.');
  stories = sr.data || []; contracts = cr.data || [];
  const now = Date.now();
  const byStory = new Map();
  contracts.filter(c=>(!c.starts_at || new Date(c.starts_at).getTime()<=now) && (!c.ends_at || new Date(c.ends_at).getTime()>=now)).forEach(c=>{if(!byStory.has(c.story_id)) byStory.set(c.story_id,c)});
  const available = stories.filter(s=>byStory.has(s.id));
  const select=$('#storySelect'); select.replaceChildren();
  if(!available.length){select.add(new Option('No active contracted stories',''));status(stories.length?'Your stories are here, but none has an active contract for analytics yet.':'Your contracted stories will appear here when an agreement is active.');return;}
  available.forEach(s=>select.add(new Option(s.title||'Untitled story',s.id)));
  select.addEventListener('change',loadSelected); $('#periodSelect').addEventListener('change',loadSelected); $('#refreshAnalytics').addEventListener('click',loadSelected);
  await loadSelected();
}
async function loadSelected(){
  const storyId=$('#storySelect').value; if(!storyId)return;
  const days=Number($('#periodSelect').value);
  const story=stories.find(s=>s.id===storyId); const contract=contracts.find(c=>c.story_id===storyId);
  $('#contractLabel').textContent=contractNames[contract?.contract_type]||'Active contract';
  status(`Loading verified figures for ${story?.title||'your story'}…`);
  try{
    const [baseResult,echoResult,countryResult]=await Promise.all([
      supabase.rpc('author_story_analytics',{p_story_id:storyId,p_days:days}),
      supabase.rpc('author_story_echo_summary',{p_story_id:storyId,p_days:days}),
      supabase.rpc('author_story_country_distribution',{p_story_id:storyId,p_days:days})
    ]);
    if(baseResult.error)throw baseResult.error;
    if(!baseResult.data?.metrics)throw new Error('The analytics response was incomplete.');
    const data=baseResult.data;
    if(!echoResult.error&&echoResult.data){data.echo_summary=echoResult.data;data.metrics.echoes=echoResult.data.echoes;data.metrics.unique_echo_senders=echoResult.data.unique_echo_senders;data.series=(data.series||[]).map(point=>({...point,echoes:(echoResult.data.series||[]).find(x=>x.day===point.day)?.echoes||0}));if(data.previous_metrics&&echoResult.data.previous_echoes!==null)data.previous_metrics.echoes=echoResult.data.previous_echoes;}
    else data.echo_summary=null;
    if(!countryResult.error&&countryResult.data)data.geography=countryResult.data;
    else data.geography={available:false,reason:'Country statistics are temporarily unavailable. Please refresh and try again.'};
    render(data);
  }catch(err){console.error('[Analytics Centre]',err);status('We could not load the figures for this story. Your contract is still recognised. Please refresh in a moment.', 'error');}
}
$('#themeToggle').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';localStorage.setItem('gidireads-authors-theme',dark?'dark':'light');applyTheme(dark);});
async function init(){
  try{const {data,error}=await supabase.auth.getSession();if(error)throw error;user=data?.session?.user||null;if(!user){status('Please sign in to view your Authors Studio analytics.');return;}await loadStories();}
  catch(err){console.error('[Analytics Centre] init',err);status(err.message||'The Analytics Centre could not be opened. Please refresh and try again.','error');}
}
init();
