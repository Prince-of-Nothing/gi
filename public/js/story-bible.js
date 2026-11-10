import './studio-workspaces-common.js';
import { supabase } from './supabaseClient.js';
const $ = (s,root=document)=>root.querySelector(s); const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cats=['Characters','Locations','Worldbuilding','Magic Systems','Timelines','Relationships'];let storyId='',userId='',activeCat='Characters',editingId=null,entries=[];
const key=()=>`gidireads:bible:v1:${userId}:${storyId}`;
async function read(){
  if(!storyId||!userId){entries=[];render();return;}
  const local=(()=>{try{const v=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(v)?v:[];}catch{return [];}})();
  const {data,error}=await supabase.from('story_bible_entries').select('id,category,title,details,updated_at').eq('user_id',userId).eq('story_id',storyId).order('updated_at',{ascending:false});
  if(error){entries=local;render();$('#pageStatus').textContent='Could not sync with your account. Your browser copy is still available.';$('#pageStatus').classList.add('error');return;}
  let rows=data||[];
  const existingIds=new Set(rows.map(row=>row.id));
  const legacy=local.filter(x=>x?.id&&!existingIds.has(x.id)).map(x=>({id:x.id,user_id:userId,story_id:storyId,category:x.category,title:x.title,details:x.details,updated_at:x.updatedAt||new Date().toISOString()}));
  if(legacy.length){
    const {error:migrationError}=await supabase.from('story_bible_entries').upsert(legacy,{onConflict:'id'});
    if(migrationError){entries=rows.map(row=>({...row,updatedAt:row.updated_at}));render();$('#pageStatus').textContent='Some older entries could not transfer yet. Your browser copy is still available.';$('#pageStatus').classList.add('error');return;}
    const {data:refreshed,error:reloadError}=await supabase.from('story_bible_entries').select('id,category,title,details,updated_at').eq('user_id',userId).eq('story_id',storyId).order('updated_at',{ascending:false});
    if(reloadError){entries=rows.map(row=>({...row,updatedAt:row.updated_at}));render();$('#pageStatus').textContent='Saved, but could not refresh the list. Please reload.';return;}
    rows=refreshed||[];
  }
  entries=rows.map(row=>({...row,updatedAt:row.updated_at}));
  localStorage.setItem(key(),JSON.stringify(entries));render();$('#pageStatus').textContent='Synced to your GidiReads account';$('#pageStatus').classList.remove('error');
}
function render(){const list=$('#entryList');$('#categoryTitle').textContent=activeCat;const rows=entries.filter(x=>x.category===activeCat).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));list.innerHTML=rows.length?rows.map(x=>`<article class="ws-entry"><div class="ws-entry-main"><h3>${esc(x.title)}</h3><p>${esc(x.details)}</p><p style="margin-top:8px;font-size:10px">Updated ${esc(new Date(x.updatedAt||Date.now()).toLocaleDateString())}</p></div><div class="ws-entry-actions"><button class="ws-mini" data-edit="${esc(x.id)}">Edit</button><button class="ws-mini" data-delete="${esc(x.id)}">Delete</button></div></article>`).join(''):'<div class="ws-empty">No '+esc(activeCat.toLowerCase())+' yet. Add your first entry to begin building this story’s reference guide.</div>';list.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>edit(b.dataset.edit)));list.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>remove(b.dataset.delete)));}
function editor(show){$('#entryEditor').classList.toggle('ws-hidden',!show);if(!show){editingId=null;$('#entryForm').reset();$('#entryStatus').textContent='';}}
function edit(id){const x=entries.find(e=>e.id===id);if(!x)return;editingId=id;$('#entryTitle').value=x.title;$('#entryDetails').value=x.details;editor(true);$('#entryTitle').focus();}
async function remove(id){if(!confirm('Delete this Story Bible entry?'))return;const {error}=await supabase.from('story_bible_entries').delete().eq('id',id).eq('user_id',userId).eq('story_id',storyId);if(error){$('#pageStatus').textContent='Could not delete this entry. Please try again.';$('#pageStatus').classList.add('error');return;}entries=entries.filter(e=>e.id!==id);localStorage.setItem(key(),JSON.stringify(entries));render();$('#pageStatus').textContent='Entry deleted from your account';$('#pageStatus').classList.remove('error');}
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{activeCat=b.dataset.category;document.querySelectorAll('[data-category]').forEach(x=>x.classList.toggle('active',x===b));render();editor(false);}));
$('#addEntry').addEventListener('click',()=>{editingId=null;$('#entryForm').reset();editor(true);$('#entryTitle').focus();});$('#cancelEntry').addEventListener('click',()=>editor(false));$('#entryForm').addEventListener('submit',async e=>{e.preventDefault();if(!storyId||!userId){$('#entryStatus').textContent='Sign in and choose a story first.';return;}const item={id:editingId||crypto.randomUUID(),category:activeCat,title:$('#entryTitle').value.trim(),details:$('#entryDetails').value.trim(),updatedAt:new Date().toISOString()};$('#entryStatus').textContent='Saving to your account…';const {error}=await supabase.from('story_bible_entries').upsert({id:item.id,user_id:userId,story_id:storyId,category:item.category,title:item.title,details:item.details,updated_at:item.updatedAt},{onConflict:'id'});if(error){$('#entryStatus').textContent='Could not sync this entry: '+error.message;return;}if(editingId)entries=entries.map(x=>x.id===editingId?item:x);else entries.push(item);localStorage.setItem(key(),JSON.stringify(entries));editor(false);render();$('#pageStatus').textContent='Saved and synced to your GidiReads account';$('#pageStatus').classList.remove('error');});
document.addEventListener('studio:storychange',e=>{storyId=e.detail.storyId;userId=e.detail.userId||'';editor(false);if(storyId)read();else{$('#entryList').innerHTML='<div class="ws-empty">Choose a story to begin building its world.</div>';entries=[];}});
