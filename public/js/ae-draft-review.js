import { supabase } from './supabaseClient.js';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storyId = new URLSearchParams(location.search).get('story');
async function load(){
  if(!storyId){$('draftNotice').textContent='No draft was selected.';$('draftChapters').innerHTML='';return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){$('draftNotice').textContent='Sign in with your approved AE account to view this draft.';$('draftChapters').innerHTML='';return;}
  const {data,error}=await supabase.rpc('ae_get_shared_draft',{p_story_id:storyId});
  if(error||!data?.story){$('draftNotice').textContent='This draft is not shared with your AE account, or the share is no longer active.';$('draftChapters').innerHTML='';return;}
  $('draftTitle').textContent=data.story.title||'Shared draft';
  $('draftAuthor').textContent=`Shared by ${data.story.author_name||'a GidiReads author'}`;
  const chapters=data.chapters||[];
  $('draftChapters').innerHTML=chapters.length?chapters.map(ch=>`<article class="ae-item ae-draft-chapter"><p class="ae-kicker">${ch.chapter_number==null?'DRAFT SECTION':`CHAPTER ${esc(ch.chapter_number)}`}</p><h2>${esc(ch.title||'Untitled section')}</h2><pre>${esc(ch.content||'')}</pre><small>Last updated ${ch.updated_at?new Date(ch.updated_at).toLocaleString():'date not recorded'}</small></article>`).join(''):`<article class="ae-item"><h2>Story overview</h2><p>${esc(data.story.description||'The author has shared this story, but there are no draft chapters available yet.')}</p></article>`;
  $('draftNotice').textContent='You have read-only access to this shared draft.';
}
load().catch(error=>{$('draftNotice').textContent='We could not open this draft. Please return to Shared drafts and try again.';console.error('[AE shared draft]',error);});
