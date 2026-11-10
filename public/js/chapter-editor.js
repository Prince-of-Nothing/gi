import { supabase } from './supabaseClient.js';

const $ = (s) => document.querySelector(s);
const esc = (value) => { const d = document.createElement('div'); d.textContent = value ?? ''; return d.innerHTML; };
const params = new URLSearchParams(location.search);
const storyId = params.get('story');
const chapterId = params.get('chapter');

const savedFont=localStorage.getItem('gidireads-editor-font');
const savedSize=localStorage.getItem('gidireads-editor-size');
if(savedFont && [...$('#fontFamily').options].some(o=>o.value===savedFont)) $('#fontFamily').value=savedFont;
if(savedSize && [...$('#fontSize').options].some(o=>o.value===savedSize)) $('#fontSize').value=savedSize;

function openSide(){ $('#studioSidebar').classList.add('open'); $('#sidebarBackdrop').classList.add('show'); }
function closeSide(){ $('#studioSidebar').classList.remove('open'); $('#sidebarBackdrop').classList.remove('show'); }
$('#menuButton').addEventListener('click', openSide);
$('#sidebarClose').addEventListener('click', closeSide);
$('#sidebarBackdrop').addEventListener('click', closeSide);
document.querySelectorAll('.studio-nav-item').forEach((x) => x.addEventListener('click', closeSide));
document.querySelectorAll('[data-coming]').forEach((x) => x.addEventListener('click', () => alert(`${x.dataset.coming || x.textContent.trim()} is the next Authors Studio room and is not connected yet.`)));

const state = { story:null, chapter:null, isSaving:false, lastSavedHtml:'' };
const editor = $('#editor');
const authorNote = $('#authorNote');

function setSaveState(text, type='') { const el=$('#saveState'); el.textContent=text; el.className=type; }
function updateAuthorNoteCount(){
  const count=(authorNote?.value || '').length;
  if($('#authorNoteCount')) $('#authorNoteCount').textContent=`${count.toLocaleString()} / 2000`;
}
authorNote?.addEventListener('input',()=>{ updateAuthorNoteCount(); setSaveState('Unsaved changes'); });

function wordCount(text){ const clean=(text||'').trim(); return clean ? clean.split(/\s+/).length : 0; }
function updateCounts(){
  const text = editor.innerText || '';
  const words = wordCount(text);
  const chars = text.replace(/\s/g,'').length;
  const mins = words ? Math.max(1, Math.ceil(words/200)) : 0;
  $('#wordCount').textContent = `${words.toLocaleString()} ${words===1?'word':'words'}`;
  $('#characterCount').textContent = `${chars.toLocaleString()} ${chars===1?'character':'characters'}`;
  $('#readingTime').textContent = `${mins} ${mins===1?'min':'mins'} read`;
  $('#sideWordCount').textContent = words.toLocaleString();
}
function normalizeHtml(){
  editor.querySelectorAll('div').forEach((node)=>{
    if(node.parentElement===editor && node.innerHTML.trim()) node.outerHTML=`<p>${node.innerHTML}</p>`;
  });
  // Store toolbar emphasis as semantic HTML rather than Markdown markers.
  editor.querySelectorAll('b').forEach((node)=>{
    const strong=document.createElement('strong');
    strong.innerHTML=node.innerHTML;
    [...node.attributes].forEach((attr)=>strong.setAttribute(attr.name,attr.value));
    node.replaceWith(strong);
  });
  editor.querySelectorAll('i').forEach((node)=>{
    const em=document.createElement('em');
    em.innerHTML=node.innerHTML;
    [...node.attributes].forEach((attr)=>em.setAttribute(attr.name,attr.value));
    node.replaceWith(em);
  });
  return editor.innerHTML.trim();
}
function plainText(){ return (editor.innerText || '').trim(); }
function currentType(){ return $('#contentType').value; }
function typeLabel(type){ return ({chapter:'Chapter',prologue:'Prologue',epilogue:'Epilogue',interlude:'Interlude',preface:'Preface',introduction:'Introduction',bonus:'Bonus',other:'Other'})[type] || 'Chapter'; }
function syncTypeUI(){
  const type=currentType();
  const numbered=type==='chapter';
  $('#chapterNumberField').style.display=numbered?'block':'none';
  $('#typeSummary').textContent = numbered ? 'Chapter · Numbered' : `${typeLabel(type)} · Unnumbered`;
}
function syncFontUI(){
  const font=$('#fontFamily').value, size=$('#fontSize').value;
  localStorage.setItem('gidireads-editor-font', font);
  localStorage.setItem('gidireads-editor-size', size);
  const map={3:'16',4:'18',5:'20',6:'22'};
  editor.style.fontFamily=`"${font}", serif`;
  editor.style.fontSize=`${map[size]||18}px`;
  $('#fontSummary').textContent=`${font} · ${map[size]||18} px`;
}
function exec(command, value=null){
  editor.focus();
  document.execCommand(command,false,value);
  updateCounts();
}
document.querySelectorAll('[data-command]').forEach((button)=>{
  button.addEventListener('mousedown',(event)=>event.preventDefault());
});
document.querySelectorAll('[data-command]').forEach((button)=>button.addEventListener('click',()=>exec(button.dataset.command)));
$('#fontFamily').addEventListener('change', syncFontUI);
$('#fontSize').addEventListener('change',()=>{ exec('fontSize',$('#fontSize').value); syncFontUI(); });
$('#contentType').addEventListener('change',syncTypeUI);
editor.addEventListener('input',()=>{updateCounts();setSaveState('Unsaved changes');});

function buildPreview(){
  const title=$('#chapterTitle').value.trim() || 'Untitled section';
  $('#previewTitle').textContent=title;
  $('#previewMeta').textContent=`${typeLabel(currentType())} · ${wordCount(plainText()).toLocaleString()} words · ${$('#fontFamily').selectedOptions[0].textContent}`;
  const article=$('#previewContent');
  article.innerHTML=editor.innerHTML.trim() || '<p style="color:var(--e-muted)">This section is still blank.</p>';
  article.style.fontFamily=`"${$('#fontFamily').value}", serif`;
  article.style.fontSize=`${({'3':'16','4':'18','5':'20','6':'22'}[$('#fontSize').value]||18)}px`;
  if(!article.querySelector('h1')) article.insertAdjacentHTML('afterbegin',`<h1>${esc(title)}</h1>`);
  const note=(authorNote?.value || '').trim();
  if(note){
    article.insertAdjacentHTML('beforeend',`<section class=\"preview-author-note\"><h3>Author's Note</h3><p>${esc(note).replace(/\n/g,'<br>')}</p></section>`);
  }
  $('#previewOverlay').hidden=false;
  document.body.style.overflow='hidden';
}
$('#previewButton').addEventListener('click',buildPreview);
$('#closePreview').addEventListener('click',()=>{ $('#previewOverlay').hidden=true; document.body.style.overflow=''; });
$('#previewOverlay').addEventListener('click',(e)=>{if(e.target.id==='previewOverlay'){ $('#previewOverlay').hidden=true; document.body.style.overflow=''; }});

async function load(){
  if(!storyId){ fail('No story was selected.'); return; }
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user){ fail('Log in to open the Chapter Editor.'); return; }
  const {data:story,error:storyError}=await supabase.from('stories').select('id,title,author_id,cover_url').eq('id',storyId).eq('author_id',user.id).single();
  if(storyError||!story){ fail('This story could not be opened from your author account.'); return; }
  state.story=story;
  const {data:chapters,error:chapterError}=await supabase.from('chapters').select('id,chapter_number,title,content,content_html,author_note,content_type,is_published,display_order,updated_at').eq('story_id',storyId).order('display_order',{ascending:true});
  if(chapterError){ fail('The manuscript could not be loaded.'); return; }
  $('#storyContext').textContent=story.title;
  const workspaceUrl=`story-workspace.html?story=${encodeURIComponent(storyId)}`;
  $('#workspaceLink').href=workspaceUrl; $('#footerWorkspace').href=workspaceUrl;
  if(chapterId){
    state.chapter=(chapters||[]).find(c=>c.id===chapterId) || null;
    if(!state.chapter){ fail('That manuscript section could not be found.'); return; }
    hydrateExisting(state.chapter);
  } else {
    const chapterNumbers=(chapters||[]).filter(c=>c.content_type==='chapter' && Number.isInteger(c.chapter_number)).map(c=>c.chapter_number);
    const next=chapterNumbers.length ? Math.max(...chapterNumbers)+1 : 1;
    $('#chapterNumber').value=next;
    $('#pageTitle').textContent='New chapter';
    $('#editorKicker').textContent='NEW MANUSCRIPT SECTION';
    $('#sideSectionTitle').textContent='New section';
    authorNote.value='';
    updateAuthorNoteCount();
    setSaveState('New draft');
  }
  syncTypeUI(); syncFontUI(); updateCounts();
}
function hydrateExisting(c){
  $('#pageTitle').textContent='Edit manuscript section';
  $('#editorKicker').textContent='MANUSCRIPT SECTION';
  $('#chapterTitle').value=c.title||'';
  authorNote.value=c.author_note||'';
  updateAuthorNoteCount();
  $('#contentType').value=c.content_type||'chapter';
  $('#chapterNumber').value=c.chapter_number??'';
  editor.innerHTML=c.content_html || (c.content ? `<p>${esc(c.content).replace(/\n/g,'</p><p>')}</p>` : '');
  $('#sideSectionTitle').textContent=c.title||typeLabel(c.content_type||'chapter');
  state.lastSavedHtml=editor.innerHTML;
  setSaveState('Saved','saved');
}
function fail(message){ $('#pageTitle').textContent='Chapter Editor unavailable'; $('#storyContext').textContent=message; document.querySelectorAll('.editor-layout,.editor-top-actions').forEach(x=>x.style.opacity='.45'); setSaveState('Unavailable','error'); }

async function ensureUniqueNumber(chapterNumber){
  if(currentType()!=='chapter') return true;
  const {data,error}=await supabase.from('chapters').select('id').eq('story_id',storyId).eq('chapter_number',chapterNumber).limit(1);
  if(error) throw error;
  return !data?.length || data[0].id===state.chapter?.id;
}

async function save(returnToWorkspace=false){
  if(state.isSaving || !state.story) return;
  const title=$('#chapterTitle').value.trim();
  const type=currentType();
  const text=plainText();
  if(!title){ setSaveState('Title required','error'); $('#chapterTitle').focus(); return; }
  if(!text){ setSaveState('Write something first','error'); editor.focus(); return; }
  let chapterNumber=null;
  if(type==='chapter'){
    chapterNumber=Number($('#chapterNumber').value);
    if(!Number.isInteger(chapterNumber)||chapterNumber<1){ setSaveState('Enter a valid chapter number','error'); $('#chapterNumber').focus(); return; }
    try{ if(!(await ensureUniqueNumber(chapterNumber))){ setSaveState(`Chapter ${chapterNumber} already exists`,'error'); $('#chapterNumber').focus(); return; } }catch(err){ setSaveState('Could not check chapter number','error'); return; }
  }
  state.isSaving=true; setSaveState('Saving…','saving');
  const contentHtml=normalizeHtml();
  const payload={story_id:storyId,chapter_number:chapterNumber,title,content:text,content_html:contentHtml,author_note:(authorNote.value||'').trim() || null,content_type:type,is_published:false};
  let result;
  if(state.chapter){
    result=await supabase.from('chapters').update(payload).eq('id',state.chapter.id).select('id,chapter_number,title,content,content_html,author_note,content_type,display_order,updated_at').single();
  }else{
    const {data:maxRows,error:maxError}=await supabase.from('chapters').select('display_order').eq('story_id',storyId).order('display_order',{ascending:false}).limit(1);
    if(maxError){ state.isSaving=false; setSaveState('Could not save','error'); return; }
    payload.display_order=(maxRows?.[0]?.display_order ?? -1)+1;
    result=await supabase.from('chapters').insert(payload).select('id,chapter_number,title,content,content_html,author_note,content_type,display_order,updated_at').single();
  }
  if(result.error){ state.isSaving=false; setSaveState('Could not save','error'); return; }
  state.chapter=result.data; state.lastSavedHtml=contentHtml; state.isSaving=false; setSaveState('Saved just now','saved');
  $('#pageTitle').textContent='Edit manuscript section'; $('#editorKicker').textContent='MANUSCRIPT SECTION'; $('#sideSectionTitle').textContent=title;
  if(returnToWorkspace) location.href=`story-workspace.html?story=${encodeURIComponent(storyId)}`;
}
$('#saveDraftTop').addEventListener('click',()=>save(false));
$('#saveDraftSide').addEventListener('click',()=>save(false));
$('#saveReturnButton').addEventListener('click',()=>save(true));
load();
