import { supabase } from './supabaseClient.js';
const card=document.getElementById('dailyStoryCard');const status=document.getElementById('dailyStoryStatus');
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeCover(url){return /^https:\/\/[^\s"'()\\]+$/i.test(String(url||''))?String(url):''}
function storyUrl(id){return `story.html?id=${encodeURIComponent(id)}`}
async function loadHeroStory(){try{
 const {data:settings,error:settingsError}=await supabase.from('homepage_admin_settings').select('settings').eq('id',true).maybeSingle();
 if(settingsError)throw settingsError;
 const storyId=settings?.settings?.hero?.story_id;
 let story=null;
 if(storyId){const result=await supabase.from('stories').select('id,title,description,primary_genre,cover_url,reads,profiles!stories_author_id_fkey(username,display_name)').eq('id',storyId).neq('status','draft').maybeSingle();if(result.error)throw result.error;story=result.data;}
 // Match the existing homepage: if no valid Hero story is selected, use its popular-story fallback.
 if(!story){const result=await supabase.from('stories').select('id,title,description,primary_genre,cover_url,reads,profiles!stories_author_id_fkey(username,display_name)').neq('status','draft').order('reads',{ascending:false}).limit(1).maybeSingle();if(result.error)throw result.error;story=result.data;}
 if(!story){card.innerHTML='<div class="gr-daily-empty"><p class="gr-daily-kicker">A STORY TO DISCOVER</p><h3>Stories are on their way.</h3><p class="gr-daily-description">There is no published story to feature just yet. You can still enter and explore GidiReads.</p><a class="gr-daily-read" href="index.html">Enter GidiReads</a></div>';card.style.gridTemplateColumns='1fr';status.textContent='The spotlight follows the homepage Hero selection, with the same popular-story fallback as the homepage.';return}
 const author=story.profiles?.display_name||story.profiles?.username||'GidiReads author';const cover=safeCover(story.cover_url);const desc=String(story.description||'').trim()||'Open this story to discover its world.';
 card.innerHTML=`${cover?`<img class="gr-daily-cover" src="${esc(cover)}" alt="Cover of ${esc(story.title)}" loading="eager">`:'<div class="gr-daily-cover" aria-label="No cover available"></div>'}<div class="gr-daily-copy"><p class="gr-daily-kicker">SELECTED ON GIDIREADS</p><h3>${esc(story.title)}</h3><p class="gr-daily-meta">${esc(author)}${story.primary_genre?' · '+esc(story.primary_genre):''}</p><p class="gr-daily-description">${esc(desc)}</p><a class="gr-daily-read" href="${storyUrl(story.id)}">Read Now <span aria-hidden="true">→</span></a></div>`;
 status.textContent=storyId&&story.id===storyId?'This is the novel selected in Admin Dashboard → Homepage Hero.':'No Hero novel was selected, so the homepage popular-story fallback is shown.';
 }catch(err){card.innerHTML='<div class="gr-daily-empty"><p class="gr-daily-kicker">YOUR NEXT STORY IS WAITING</p><h3>Enter GidiReads.</h3><p class="gr-daily-description">We could not load the current Hero novel. You can still explore stories from the homepage.</p><a class="gr-daily-read" href="index.html">Enter GidiReads</a></div>';card.style.gridTemplateColumns='1fr';status.textContent='The spotlight could not load right now. The rest of GidiReads is still available.';console.warn('[GidiReads welcome] Hero story load failed:',err)} }
document.querySelectorAll('a[href]').forEach(link=>link.addEventListener('click',()=>{try{localStorage.setItem('gr-welcome-seen','1')}catch{}}));
loadHeroStory();
