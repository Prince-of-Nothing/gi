import { supabase } from './supabaseClient.js';
import { markStoryPage } from './contracted-bar.js';
const $=s=>document.querySelector(s), esc=v=>{const d=document.createElement('div');d.textContent=v??'';return d.innerHTML};
const params=new URLSearchParams(location.search), storyId=params.get('story');
const meta=$('#themeColorMeta');
function theme(t){const d=t==='dark';document.documentElement.dataset.theme=d?'dark':'light';meta?.setAttribute('content',d?'#17131a':'#f4efe7');const b=$('#themeToggle');if(b){b.setAttribute('aria-pressed',String(d));b.setAttribute('aria-label',d?'Switch to light theme':'Switch to dark theme');b.querySelector('.theme-icon').textContent=d?'☀':'☾';b.querySelector('.theme-label').textContent=d?'Light':'Dark'}}
theme(localStorage.getItem('gidireads-authors-theme')==='dark'?'dark':'light');
$('#themeToggle').addEventListener('click',()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('gidireads-authors-theme',n);theme(n)});
function openSide(){$('#studioSidebar').classList.add('open');$('#sidebarBackdrop').classList.add('show')}
function closeSide(){$('#studioSidebar').classList.remove('open');$('#sidebarBackdrop').classList.remove('show')}
$('#menuButton').onclick=openSide;$('#sidebarClose').onclick=closeSide;$('#sidebarBackdrop').onclick=closeSide;
document.querySelectorAll('.studio-nav-item').forEach(x=>x.onclick=closeSide);
document.querySelectorAll('[data-coming]').forEach(x=>x.onclick=()=>alert(`${x.dataset.coming||x.textContent.trim()} is the next Authors Studio room and is not connected yet.`));
function words(t=''){return t.trim()?t.trim().split(/\s+/).length:0}
function typeLabel(type){return ({chapter:'Chapter',prologue:'Prologue',epilogue:'Epilogue',interlude:'Interlude',preface:'Preface',introduction:'Introduction',bonus:'Bonus',other:'Other'})[type]||'Section'}
function chapterDisplayLabel(c){
  if(c.content_type==='chapter') return Number.isInteger(c.chapter_number)?`Chapter ${c.chapter_number}`:'Chapter';
  return typeLabel(c.content_type);
}
function renderChapters(chapters){
  const list=$('#chapterList');
  if(!chapters?.length){
    list.innerHTML=`<div class="workspace-empty"><div><p class="eyebrow">A BLANK PAGE</p><h3>This story has no chapters yet.</h3><p>Your manuscript is ready for its first section.</p></div><button class="button button-dark" id="emptyNewButton">Write the first section <span>→</span></button></div>`;
    $('#emptyNewButton')?.addEventListener('click',()=>location.href=`chapter-editor.html?story=${encodeURIComponent(storyId)}`);
    return;
  }
  list.innerHTML=chapters.map((c,index)=>{
    const label=chapterDisplayLabel(c);
    const fallback=c.content_type==='chapter'?label:typeLabel(c.content_type);
    const isFirst=index===0,isLast=index===chapters.length-1;
    return `<div class="chapter-row-editorial" data-id="${esc(c.id)}">
      <a class="chapter-main-link" href="chapter-editor.html?story=${encodeURIComponent(storyId)}&chapter=${encodeURIComponent(c.id)}">
        <span class="chapter-number">${esc(label)}</span>
        <span class="chapter-info"><strong>${esc(c.title||fallback)}</strong><small>${words(c.content).toLocaleString()} words · ${c.updated_at?`Edited ${new Date(c.updated_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`:'No edit date'}</small></span>
        <span class="chapter-status ${c.is_published?'published':''}">${c.is_published?'Published':'Draft'}</span>
      </a>
      <span class="chapter-reorder" aria-label="Change manuscript order">
        <button type="button" class="chapter-move" data-direction="up" data-id="${esc(c.id)}" ${isFirst?'disabled':''} aria-label="Move ${esc(label)} up">↑</button>
        <button type="button" class="chapter-move" data-direction="down" data-id="${esc(c.id)}" ${isLast?'disabled':''} aria-label="Move ${esc(label)} down">↓</button>
      </span>
    </div>`;
  }).join('');
  list.querySelectorAll('.chapter-move').forEach(button=>button.addEventListener('click',()=>moveChapter(button.dataset.id,button.dataset.direction)));
}
async function moveChapter(id,direction){
  const rows=[...document.querySelectorAll('.chapter-row-editorial')];
  const index=rows.findIndex(row=>row.dataset.id===id);
  const targetIndex=direction==='up'?index-1:index+1;
  if(index<0||targetIndex<0||targetIndex>=rows.length) return;
  const button=rows[index].querySelector(`[data-direction="${direction}"]`);
  if(button) button.disabled=true;
  const orderedIds=rows.map(row=>row.dataset.id);
  [orderedIds[index],orderedIds[targetIndex]]=[orderedIds[targetIndex],orderedIds[index]];
  const updates=orderedIds.map((chapterId,position)=>supabase.from('chapters').update({display_order:position}).eq('id',chapterId).eq('story_id',storyId));
  const results=await Promise.all(updates);
  const failed=results.find(result=>result.error);
  if(failed){alert('The manuscript order could not be saved. Please try again.');return load();}
  await load();
}
async function load(){
  if(!storyId){error('No story was selected.');return}
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){error('Log in to open a story workspace.');return}
  const {data:aeRole}=await supabase.from('staff_assignments').select('role_key').eq('user_id',user.id).eq('role_key','acquisitions_editor').eq('is_active',true).maybeSingle();
  const aeLink=$('#aeWorkspaceLink');if(aeLink)aeLink.hidden=!aeRole;
  const visibleNav=[...document.querySelectorAll('.studio-nav .studio-nav-item')].filter(item=>!item.hidden);visibleNav.forEach((item,index)=>{const mark=item.querySelector('.nav-mark');if(mark)mark.textContent=String(index+1).padStart(2,'0')});
  const {data:story,error:e}=await supabase.from('stories').select('id,title,description,status,primary_genre,secondary_genre,content_rating,language,cover_url').eq('id',storyId).eq('author_id',user.id).single();
  if(e||!story){error('This story could not be opened from your author account.');return}
  const {data:chapters,error:chapterError}=await supabase.from('chapters').select('id,chapter_number,title,content,is_published,created_at,updated_at,content_type,display_order,archived_at').eq('story_id',storyId).is('archived_at',null).order('display_order',{ascending:true});
  if(chapterError){error('The manuscript could not be loaded.');return}
  $('#storyTitle').textContent=story.title||'Untitled story';
  $('#storyDescription').textContent=story.description||'No synopsis has been added yet.';
  $('#storyMeta').innerHTML=[story.primary_genre,story.status,story.content_rating||'General',story.language||'English'].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('');
  $('#workspaceCover').innerHTML=story.cover_url?`<img src="${esc(story.cover_url)}" alt="${esc(story.title)} cover">`:`<div class="workspace-cover-fallback">${esc((story.title||'?').trim().charAt(0).toUpperCase())}</div>`;
  markStoryPage(storyId, $('#workspaceCover'));
  renderChapters(chapters||[]);
  const last=(chapters||[]).filter(c=>c.is_published!==false).at(-1) || (chapters||[]).at(-1);
  $('#continueButton').onclick=()=>last?location.href=`reader.html?story=${encodeURIComponent(storyId)}&chapter=${encodeURIComponent(last.chapter_number || 1)}`:location.href=`chapter-editor.html?story=${encodeURIComponent(storyId)}`;
  $('#editStoryButton').onclick=()=>location.href=`story-publishing.html?story=${encodeURIComponent(storyId)}`;
  $('#newChapterButton').onclick=()=>location.href=`chapter-editor.html?story=${encodeURIComponent(storyId)}`;
  const publishingDoor=$('#publishingDoor');if(publishingDoor) publishingDoor.href=`story-publishing.html?story=${encodeURIComponent(storyId)}`;
  const pricingDoor=$('#chapterPricingDoor');if(pricingDoor){pricingDoor.href=`chapter-pricing.html?story=${encodeURIComponent(storyId)}`;const {data:pricingContext,error:pricingContextError}=await supabase.rpc('gidireads_get_story_pricing_context',{p_story_id:storyId});pricingDoor.hidden=!!pricingContextError||!pricingContext?.length;}
  const workspaceDoors={storyBibleDoor:'story-bible.html',authorNotesDoor:'author-notes.html',storyMetadataDoor:'story-metadata.html'};
  Object.entries(workspaceDoors).forEach(([id,page])=>{const link=$('#'+id);if(link)link.href=`${page}?story=${encodeURIComponent(storyId)}`;});
}
function error(message){$('#storyTitle').textContent='Workspace unavailable';$('#storyDescription').textContent=message;$('#chapterList').innerHTML=`<div class="workspace-empty"><p>${esc(message)}</p></div>`}
load();
