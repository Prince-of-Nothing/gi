const THEME_KEY = 'gidireads-authors-theme';
const themeMeta = document.getElementById('themeColorMeta');
function applyTheme(theme){
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  if(themeMeta) themeMeta.setAttribute('content', dark ? '#17131a' : '#f4efe7');
  const toggle = document.getElementById('themeToggle');
  if(toggle){
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    const icon = toggle.querySelector('.theme-icon');
    const label = toggle.querySelector('.theme-label');
    if(icon) icon.textContent = dark ? '☀' : '☾';
    if(label) label.textContent = dark ? 'Light' : 'Dark';
  }
}
const savedTheme = localStorage.getItem(THEME_KEY);
applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
document.getElementById('themeToggle')?.addEventListener('click',()=>{
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY,next);
  applyTheme(next);
});

import { supabase } from './supabaseClient.js';

const $ = (selector) => document.querySelector(selector);
const esc = (value = '') => { const d = document.createElement('div'); d.textContent = value; return d.innerHTML; };
let currentUser = null;
let stories = [];
let chaptersByStory = new Map();

function wordCount(text = '') { return text.trim() ? text.trim().split(/\s+/).length : 0; }
function relativeTime(value) {
  if (!value) return '';
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function openSidebar(){ $('#studioSidebar')?.classList.add('open'); $('#sidebarBackdrop')?.classList.add('show'); }
function closeSidebar(){ $('#studioSidebar')?.classList.remove('open'); $('#sidebarBackdrop')?.classList.remove('show'); }
$('#menuButton')?.addEventListener('click', openSidebar);
$('#sidebarClose')?.addEventListener('click', closeSidebar);
$('#sidebarBackdrop')?.addEventListener('click', closeSidebar);
document.querySelectorAll('.studio-nav-item').forEach((item)=>item.addEventListener('click', closeSidebar));

document.querySelectorAll('[data-coming]').forEach((el)=>el.addEventListener('click',()=>{
  const label = el.dataset.coming;
  window.alert(`${label} is planned for the next Authors Studio phase and is not connected to a live workflow yet.`);
}));

function renderEmptyHome(){
  $('#continueTitle').textContent = 'Your writing space is ready.';
  $('#continueMeta').textContent = 'Create a story to begin building your library.';
  $('#continueDetails').hidden = true;
  $('#continueButton').textContent = 'Open My Stories →';
  $('#continueButton').href = 'my-stories.html';
  $('#storyShelf').innerHTML = '<p class="muted">Every story begins somewhere. Your first one could begin here.</p>';
  $('#wordTotal').textContent = '0'; $('#chapterTotal').textContent = '0'; $('#storyTotal').textContent = '0';
}

function renderContinue(story){
  const chapterRows = chaptersByStory.get(story.id) || [];
  const latestChapter = [...chapterRows].sort((a,b)=>new Date(b.updated_at || b.created_at || 0)-new Date(a.updated_at || a.created_at || 0))[0];
  $('#continueTitle').textContent=story.title||'Untitled story';
  $('#continueMeta').textContent=latestChapter ? `${latestChapter.title || `Chapter ${latestChapter.chapter_number}`} · ${latestChapter.is_published===true ? `${wordCount(latestChapter.content)} published words` : 'Draft chapter'}` : 'No chapters yet.';
  const details=$('#continueDetails');
  details.innerHTML=`<span>${esc(story.status||'Draft')}</span><span>${chapterRows.length} ${chapterRows.length===1?'chapter':'chapters'}</span>${latestChapter?`<span>Edited ${relativeTime(latestChapter.updated_at||latestChapter.created_at)}</span>`:''}`;
  details.hidden=false;
  $('#continueButton').textContent=latestChapter?'Continue writing →':'Open story →';
  $('#continueButton').href='my-stories.html';
}
function renderShelf(){
  const shelf=$('#storyShelf');
  if(!stories.length){ renderEmptyHome(); return; }
  shelf.innerHTML=stories.slice(0,8).map((story)=>{
    const initial=esc((story.title||'?').trim().charAt(0).toUpperCase());
    return `<a class="shelf-book" href="my-stories.html" aria-label="Open ${esc(story.title)}"><div>${story.cover_url?`<img src="${esc(story.cover_url)}" alt="${esc(story.title)} cover">`:`<div class="shelf-placeholder">${initial}</div>`}</div><h3>${esc(story.title||'Untitled')}</h3><p>${esc(story.status||'Draft')}</p></a>`;
  }).join('');
}

function renderActivity(){
  let totalWords=0,totalChapters=0; const events=[];
  for(const story of stories){
    const rows=chaptersByStory.get(story.id)||[]; totalChapters+=rows.length;
    rows.forEach((chapter)=>{if(chapter.is_published===true)totalWords+=wordCount(chapter.content); events.push({date:chapter.updated_at||chapter.created_at,title:chapter.title||`Chapter ${chapter.chapter_number}`,story:story.title,type:chapter.is_published?'Published':'Draft'});});
  }
  $('#wordTotal').textContent=totalWords.toLocaleString(); $('#chapterTotal').textContent=totalChapters.toLocaleString(); $('#storyTotal').textContent=stories.length.toLocaleString();
  const recent=events.filter(e=>e.date).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
  $('#recentActivity').innerHTML=recent.length?recent.map(e=>`<div class="timeline-item"><strong>${esc(e.type)} — ${esc(e.title)}</strong><p>${esc(e.story)} · ${relativeTime(e.date)}</p></div>`).join(''):'<p class="muted">Your chapter activity will appear here as you write.</p>';
  $('#activityChart').innerHTML='<div class="chart-empty"><span class="chart-line"></span><p>Writing history will appear here once GidiReads has a reliable saved activity record.</p></div>';
}

async function load(){
  const {data:{session}}=await supabase.auth.getSession(); currentUser=session?.user||null;
  if(!currentUser){ $('#welcomeName').textContent=''; renderEmptyHome(); return; }
  const {data:aeRole}=await supabase.from('staff_assignments').select('role_key').eq('user_id',currentUser.id).eq('role_key','acquisitions_editor').eq('is_active',true).maybeSingle();
  const aeLink=$('#aeWorkspaceLink');if(aeLink)aeLink.hidden=!aeRole;
  // Keep the visible navigation sequence continuous when the conditional AE link is hidden.
  const visibleNavItems=[...document.querySelectorAll('.studio-nav .studio-nav-item')].filter(item=>!item.hidden);
  visibleNavItems.forEach((item,index)=>{const mark=item.querySelector('.nav-mark');if(mark)mark.textContent=String(index+1).padStart(2,'0');});
  const {data:profile}=await supabase.from('profiles').select('username, display_name').eq('id',currentUser.id).maybeSingle();
  const name=profile?.display_name||profile?.username||currentUser.email?.split('@')[0]||''; $('#welcomeName').textContent=name?`, ${name}`:'';
  const {data,error}=await supabase.from('stories').select('id,title,status,primary_genre,cover_url,created_at').eq('author_id',currentUser.id).order('created_at',{ascending:false});
  if(error){ $('#continueMeta').textContent='We could not load your stories right now.'; return; }
  stories=data||[]; chaptersByStory=new Map();
  await Promise.all(stories.map(async(story)=>{const {data:chapters}=await supabase.from('chapters').select('id,chapter_number,title,content,is_published,created_at,updated_at,archived_at').eq('story_id',story.id).is('archived_at',null).order('chapter_number',{ascending:true}); chaptersByStory.set(story.id,chapters||[]);}));
  if(stories.length) renderContinue(stories[0]); else renderEmptyHome();
  renderActivity(); renderShelf();
}

document.querySelectorAll('.range-switch button').forEach((button)=>button.addEventListener('click',()=>{
  document.querySelectorAll('.range-switch button').forEach(b=>b.classList.remove('active')); button.classList.add('active');
  $('#activityChart').innerHTML='<div class="chart-empty"><span class="chart-line"></span><p>This range will become a real writing-activity graph once activity history is stored.</p></div>';
}));
supabase.auth.onAuthStateChange(()=>load());
load();

