const $=s=>document.querySelector(s);
const creationParams=new URLSearchParams(location.search);
const contestMode=creationParams.get('contest')==='holiday-hearts-2026';
const contestPrompt=creationParams.get('prompt')||'';
const title=$('#title'),desc=$('#description'),lang=$('#language');
const state={stage:1,primary:null,secondary:[],subgenres:[],tropes:[],tags:[],audience:null,setting:null,region:null,rating:'General',rightsConfirmed:false,adaptation:'Not Available',cover:null,coverFit:'contain',terms:{genre:[],subgenre:[],trope:[],tag:[],audience:[],setting:[],region:[]},loaded:false};
const DRAFT_KEY=`gidireads-create-story-draft-v1:${contestMode?'holiday-hearts-2026':'standard'}`;
let restoredDraft=null, draftSaveTimer=null, draftRestored=false, creationCompleted=false, initializing=true;
function readCreationDraft(){try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')}catch{return null}}
restoredDraft=readCreationDraft();
if(restoredDraft){
 title.value=restoredDraft.title||'';desc.value=restoredDraft.description||'';lang.value=restoredDraft.language||'English';
 const savedFormat=restoredDraft.format||'Novel';const formatRadio=document.querySelector(`input[name="format"][value="${CSS.escape(savedFormat)}"]`);if(formatRadio)formatRadio.checked=true;
 state.stage=Math.min(8,Math.max(1,Number(restoredDraft.stage)||1));
}
function creationDraftSnapshot(){
 const pickedCover=state.cover?.dataUrl?{dataUrl:state.cover.dataUrl,name:state.cover.name||'story-cover.jpg',width:state.cover.width||0,height:state.cover.height||0}:null;
 return {version:1,updatedAt:new Date().toISOString(),stage:state.stage,title:title.value,description:desc.value,language:lang.value,format:document.querySelector('input[name="format"]:checked')?.value||'Novel',primaryId:state.primary?.id||null,secondaryIds:state.secondary.map(x=>x.id),subgenreIds:state.subgenres.map(x=>x.id),tropeIds:state.tropes.map(x=>x.id),tagIds:state.tags.map(x=>x.id),audienceId:state.audience?.id||null,settingId:state.setting?.id||null,regionId:state.region?.id||null,rating:state.rating,rightsConfirmed:state.rightsConfirmed,adaptation:state.adaptation,coverFit:state.coverFit,cover:pickedCover};
}
function saveCreationDraft(){
 if(creationCompleted)return true;
 const snapshot=creationDraftSnapshot();
 const hasWork=!!(snapshot.title.trim()||snapshot.description.trim()||snapshot.primaryId||snapshot.secondaryIds.length||snapshot.subgenreIds.length||snapshot.tropeIds.length||snapshot.tagIds.length||snapshot.audienceId||snapshot.settingId||snapshot.regionId||snapshot.cover||snapshot.stage>1||snapshot.rightsConfirmed);
 if(!hasWork){localStorage.removeItem(DRAFT_KEY);$('#save').textContent='● Autosave is on';return true;}
 try{localStorage.setItem(DRAFT_KEY,JSON.stringify(snapshot));const stamp=new Date();$('#save').textContent=`● Saved on this device · ${stamp.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;return true;}
 catch(error){console.warn('Create Story autosave could not be stored:',error);$('#save').textContent='● Autosave storage is full on this device';return false;}
}
function scheduleCreationAutosave(){if(draftSaveTimer)clearTimeout(draftSaveTimer);draftSaveTimer=setTimeout(saveCreationDraft,350)}
function restoreCreationSelections(){
 if(!restoredDraft||draftRestored||!state.loaded)return;
 const term=(kind,id)=>id?findTerm(kind,id):null;
 state.primary=term('genre',restoredDraft.primaryId);
 state.secondary=(restoredDraft.secondaryIds||[]).map(id=>term('genre',id)).filter(Boolean);
 state.subgenres=(restoredDraft.subgenreIds||[]).map(id=>term('subgenre',id)).filter(Boolean);
 state.tropes=(restoredDraft.tropeIds||[]).map(id=>term('trope',id)).filter(Boolean);
 state.tags=(restoredDraft.tagIds||[]).map(id=>term('tag',id)).filter(Boolean);
 state.audience=term('audience',restoredDraft.audienceId);state.setting=term('setting',restoredDraft.settingId);state.region=term('region',restoredDraft.regionId);
 state.rating=restoredDraft.rating||'General';state.rightsConfirmed=!!restoredDraft.rightsConfirmed;state.adaptation=restoredDraft.adaptation||'Not Available';state.coverFit=restoredDraft.coverFit||'contain';
 if(restoredDraft.cover?.dataUrl){
   const c=restoredDraft.cover;state.cover={name:c.name||'story-cover.jpg',dataUrl:c.dataUrl,width:c.width||0,height:c.height||0,ratio:c.width&&c.height?c.width/c.height:0,file:null};
   const restoredCover=state.cover;fetch(c.dataUrl).then(r=>r.blob()).then(blob=>{if(state.cover===restoredCover)restoredCover.file=new File([blob],c.name||'story-cover.jpg',{type:blob.type||'image/jpeg'});}).catch(e=>console.warn('Saved cover could not be restored for upload:',e));
   const img=$('#coverPreviewImage');if(img){img.src=c.dataUrl;img.hidden=false;$('#coverPreviewFrame').querySelector('.cover-empty').hidden=true;$('#coverDropTitle').textContent='Replace cover';$('#coverDropText').textContent=c.name||'Saved cover';$('#coverStatus').textContent='Restored from your saved draft.';$('#coverDimensions').textContent=c.width&&c.height?`${c.width} × ${c.height} px`:'Saved cover';$('#removeCover').disabled=false;}
 }
 updateBasics();renderGenrePicker('#primaryTerms',$('#primarySearch').value,'primary');renderGenrePicker('#secondaryTerms',$('#secondarySearch').value,'secondary');$('#primaryCount').textContent=state.primary?'1 / 1':'0 / 1';$('#primarySelected').textContent=state.primary?`Primary: ${state.primary.name}`:'Choose one primary genre';renderSecondaryChips();$('#secondaryCount').textContent=`${state.secondary.length} / 3`;
 renderSubgenres();renderSubgenreChips();$('#subgenreCount').textContent=`${state.subgenres.length} / 3`;renderDiscovery('trope');renderDiscovery('tag');updateDiscoveryCounts();renderAudience();renderContext('setting');renderContext('region');renderRights();applyCoverFit();setStage(state.stage);
 draftRestored=true;$('#save').textContent='● Your previous work has been restored';scheduleCreationAutosave();
}

function theme(t){const d=t==='dark';document.documentElement.dataset.theme=d?'dark':'light';const b=$('#theme');b.querySelector('span').textContent=d?'☀':'☾';b.querySelector('b').textContent=d?'Light':'Dark'}
theme(localStorage.getItem('gidireads-authors-theme')==='dark'?'dark':'light');
$('#theme').addEventListener('click',()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('gidireads-authors-theme',n);theme(n)});
function openMenu(){$('#sidebar').classList.add('open');$('#backdrop').classList.add('show')}function closeMenu(){$('#sidebar').classList.remove('open');$('#backdrop').classList.remove('show')}
$('#menu').addEventListener('click',openMenu);$('#closeMenu').addEventListener('click',closeMenu);$('#backdrop').addEventListener('click',closeMenu);
document.querySelectorAll('.sidebar nav a').forEach(x=>x.addEventListener('click',closeMenu));
document.querySelectorAll('[data-coming]').forEach(x=>x.addEventListener('click',()=>alert(`${x.dataset.coming} is part of a later Authors Studio room and is not connected yet.`)));
function updateBasics(){const t=title.value,d=desc.value;$('#titleCount').textContent=`${t.length} / 120`;$('#descriptionCount').textContent=`${d.length} / 1500`;$('#previewTitle').textContent=t.trim()||'Untitled story';$('#previewDescription').textContent=d.trim()||'Your synopsis will appear here as you shape the story.';$('#previewLanguage').textContent=lang.value;$('#initial').textContent=(t.trim()||'G').charAt(0).toUpperCase();$('#format').textContent=(document.querySelector('input[name=format]:checked')?.value||'Novel').toUpperCase();$('#save').textContent='● Changes not saved'}
[title,desc,lang].forEach(x=>x.addEventListener('input',()=>{updateBasics();scheduleCreationAutosave()}));document.querySelectorAll('input[name=format]').forEach(x=>x.addEventListener('change',()=>{updateBasics();scheduleCreationAutosave()}));
function setStage(stage){
 state.stage=stage;
 const basics=document.querySelector('.paper:not(.classification-paper):not(.discovery-paper):not(.audience-paper):not(.context-paper):not(.rights-paper):not(.cover-paper):not(.review-paper)');
 const panels={2:$('#classificationPanel'),3:$('#discoveryPanel'),4:$('#audiencePanel'),5:$('#contextPanel'),6:$('#coverPanel'),7:$('#rightsPanel'),8:$('#reviewPanel')};
 basics.hidden=stage!==1;
 Object.entries(panels).forEach(([n,p])=>{if(p)p.hidden=stage!==Number(n)});
 document.querySelector('.preview').hidden=stage!==1;
 const progress=Math.min(stage,8);
 $('#fill').style.width=`${(progress/8)*100}%`;
 const titles={1:'01 · Basics',2:'02 · Classification',3:'03 · Discovery',4:'04 · Audience',5:'05 · Setting & Context',6:'06 · Story Cover',7:'07 · Content & Rights',8:'08 · Review'};
 $('#stepTitle').textContent=titles[stage]||titles[1];
 $('#stepCount').textContent=`${stage} of 8`;
 document.querySelectorAll('.progress li').forEach((x,i)=>x.classList.toggle('active',i===stage-1));
 const nextLabels={1:'Continue to Classification <span>→</span>',2:'Continue to Discovery <span>→</span>',3:'Continue to Audience <span>→</span>',4:'Continue to Setting &amp; Context <span>→</span>',5:'Continue to Story Cover <span>→</span>',6:'Continue to Content &amp; Rights <span>→</span>',7:'Continue to Review <span>→</span>',8:'Create Story <span>→</span>'};
 const nextEl=$('#next');
 if(nextEl){ nextEl.innerHTML=nextLabels[stage]; nextEl.disabled=stage===8; }
 const saveLabels={1:'● Changes not saved',2:'● Classification not saved',3:'● Discovery not saved',4:'● Audience not saved',5:'● Setting & Context not saved',6:'● Story Cover not saved',7:'● Content & Rights not saved',8:'● Review not saved'};
 $('#save').textContent=saveLabels[stage];
 if(stage===8)renderReview();
 if(!initializing)scheduleCreationAutosave();
 scrollTo({top:0,behavior:'smooth'});
}
function findTerm(kind,id){return state.terms[kind].find(x=>x.id===id)||null}
function renderGenrePicker(selector,search,mode){const box=$(selector),q=search.trim().toLowerCase(),filtered=state.terms.genre.filter(t=>t.name.toLowerCase().includes(q));const ids=mode==='primary'?(state.primary?[state.primary.id]:[]):state.secondary.map(x=>x.id);const limit=mode==='secondary'&&state.secondary.length>=3;box.innerHTML=filtered.map(t=>{const selected=ids.includes(t.id),disabled=!selected&&limit;return `<button type="button" class="term-button ${selected?'selected':''}" data-term="${t.id}" ${disabled?'disabled':''}>${t.name}</button>`}).join('')||'<div class="selected-line">No matching genres.</div>';box.querySelectorAll('[data-term]').forEach(b=>b.addEventListener('click',()=>mode==='primary'?selectPrimary(b.dataset.term):toggleSecondary(b.dataset.term)))}
function renderSubgenres(){const box=$('#subgenreTerms'),q=$('#subgenreSearch').value.trim().toLowerCase(),filtered=state.terms.subgenre.filter(t=>t.name.toLowerCase().includes(q));box.innerHTML=filtered.map(t=>{const selected=state.subgenres.some(x=>x.id===t.id),disabled=!selected&&state.subgenres.length>=3;return `<button type="button" class="term-button ${selected?'selected':''}" data-term="${t.id}" ${disabled?'disabled':''}>${t.name}</button>`}).join('')||'<div class="selected-line">No matching subgenres.</div>';box.querySelectorAll('[data-term]').forEach(b=>b.addEventListener('click',()=>toggleSubgenre(b.dataset.term)))}
function selectPrimary(id){const t=findTerm('genre',id);if(!t)return;state.primary=t;state.secondary=state.secondary.filter(x=>x.id!==id);renderGenrePicker('#primaryTerms',$('#primarySearch').value,'primary');renderGenrePicker('#secondaryTerms',$('#secondarySearch').value,'secondary');$('#primaryCount').textContent='1 / 1';$('#primarySelected').textContent=`Primary: ${t.name}`;renderSecondaryChips();$('#classificationMessage').textContent=''}
function toggleSecondary(id){if(state.primary?.id===id){$('#classificationMessage').textContent='Your primary genre cannot also be a secondary genre.';return}const old=state.secondary.find(x=>x.id===id);if(old)state.secondary=state.secondary.filter(x=>x.id!==id);else if(state.secondary.length<3){const t=findTerm('genre',id);if(t)state.secondary.push(t)}else{$('#classificationMessage').textContent='You can choose up to 3 secondary genres.'}renderGenrePicker('#secondaryTerms',$('#secondarySearch').value,'secondary');renderSecondaryChips();$('#secondaryCount').textContent=`${state.secondary.length} / 3`}
function renderSecondaryChips(){$('#secondarySelected').innerHTML=state.secondary.map(t=>`<span class="term-chip">${t.name}<button type="button" data-remove="${t.id}" aria-label="Remove ${t.name}">×</button></span>`).join('');$('#secondarySelected').querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{state.secondary=state.secondary.filter(x=>x.id!==b.dataset.remove);renderGenrePicker('#secondaryTerms',$('#secondarySearch').value,'secondary');renderSecondaryChips();$('#secondaryCount').textContent=`${state.secondary.length} / 3`}))}
function toggleSubgenre(id){const old=state.subgenres.find(x=>x.id===id);if(old)state.subgenres=state.subgenres.filter(x=>x.id!==id);else if(state.subgenres.length<3){const t=findTerm('subgenre',id);if(t)state.subgenres.push(t)}else{$('#classificationMessage').textContent='You can choose up to 3 subgenres.'}renderSubgenres();renderSubgenreChips();$('#subgenreCount').textContent=`${state.subgenres.length} / 3`}
function renderSubgenreChips(){$('#subgenreSelected').innerHTML=state.subgenres.map(t=>`<span class="term-chip">${t.name}<button type="button" data-remove-sub="${t.id}" aria-label="Remove ${t.name}">×</button></span>`).join('');$('#subgenreSelected').querySelectorAll('[data-remove-sub]').forEach(b=>b.addEventListener('click',()=>{state.subgenres=state.subgenres.filter(x=>x.id!==b.dataset.removeSub);renderSubgenres();renderSubgenreChips();$('#subgenreCount').textContent=`${state.subgenres.length} / 3`}))}
function renderDiscovery(kind){const box=kind==='trope'?$('#tropeResults'):$('#tagResults'),search=kind==='trope'?$('#tropeSearch').value:$('#tagSearch').value,q=search.trim().toLowerCase(),limit=kind==='trope'?20:50,selected=kind==='trope'?state.tropes:state.tags;const list=state.terms[kind].filter(t=>t.name.toLowerCase().includes(q));box.innerHTML=list.map(t=>{const active=selected.some(x=>x.id===t.id),disabled=!active&&selected.length>=limit;return `<button type="button" class="discovery-term ${active?'selected':''}" data-discovery-term="${t.id}" ${disabled?'disabled':''}>${t.name}</button>`}).join('')||'<p class="discovery-empty">No matching suggestions.</p>';box.querySelectorAll('[data-discovery-term]').forEach(b=>b.addEventListener('click',()=>toggleDiscovery(kind,b.dataset.discoveryTerm)));renderDiscoveryChips(kind)}
function toggleDiscovery(kind,id){const selected=kind==='trope'?state.tropes:state.tags,limit=kind==='trope'?20:50;const old=selected.find(x=>x.id===id);if(old){if(kind==='trope')state.tropes=selected.filter(x=>x.id!==id);else state.tags=selected.filter(x=>x.id!==id)}else if(selected.length<limit){const t=findTerm(kind,id);if(!t)return;if(kind==='trope')state.tropes=[...selected,t];else state.tags=[...selected,t]}else{$('#discoveryMessage').textContent=`You can choose up to ${limit} ${kind}s.`}renderDiscovery(kind);updateDiscoveryCounts();$('#save').textContent='● Discovery not saved'}
function renderDiscoveryChips(kind){const box=kind==='trope'?$('#tropeSelected'):$('#tagSelected'),selected=kind==='trope'?state.tropes:state.tags;box.innerHTML=selected.map(t=>`<span class="discovery-chip">${t.name}<button type="button" data-remove-discovery="${t.id}" aria-label="Remove ${t.name}">×</button></span>`).join('');box.querySelectorAll('[data-remove-discovery]').forEach(b=>b.addEventListener('click',()=>toggleDiscovery(kind,b.dataset.removeDiscovery)))}
function updateDiscoveryCounts(){$('#tropeCount').textContent=`${state.tropes.length} / 20`;$('#tagCount').textContent=`${state.tags.length} / 50`}

function renderContext(kind){const isSetting=kind==='setting',box=$(isSetting?'#settingResults':'#regionResults'),search=$(isSetting?'#settingSearch':'#regionSearch'),selected=isSetting?state.setting:state.region,q=search.value.trim().toLowerCase();const list=state.terms[kind].filter(t=>t.name.toLowerCase().includes(q));box.innerHTML=list.map(t=>{const active=selected?.id===t.id;return `<button type="button" class="context-term ${active?'selected':''}" data-context-term="${t.id}"><span>${t.name}</span><b>${active?'✓':'+'}</b></button>`}).join('')||'<p class="context-empty">No matching options.</p>';box.querySelectorAll('[data-context-term]').forEach(b=>b.addEventListener('click',()=>selectContext(kind,b.dataset.contextTerm)));renderContextSelection(kind)}
function selectContext(kind,id){const t=findTerm(kind,id);if(!t)return;if(kind==='setting')state.setting=t;else state.region=t;renderContext(kind);$('#contextMessage').textContent=`${kind==='setting'?'Setting':'Region / cultural context'} selected: ${t.name}`;$('#save').textContent='● Setting & Context not saved'}
function renderContextSelection(kind){const isSetting=kind==='setting',selected=isSetting?state.setting:state.region,box=$(isSetting?'#settingSelected':'#regionSelected'),count=$(isSetting?'#settingCount':'#regionCount');count.textContent=`${selected?1:0} / 1`;box.innerHTML=selected?`<span class="context-chip">${selected.name}<button type="button" data-clear-context="${kind}" aria-label="Remove ${selected.name}">×</button></span>`:'';box.querySelector('[data-clear-context]')?.addEventListener('click',()=>{if(kind==='setting')state.setting=null;else state.region=null;renderContext(kind);$('#contextMessage').textContent='';$('#save').textContent='● Setting & Context not saved'})}
function renderAudience(){const box=$('#audienceOptions'),selected=state.audience;const descriptions={
'Children':'Stories primarily intended for children.',
'Middle Grade':'Stories primarily intended for middle-grade readers.',
'Young Adult':'Stories primarily intended for teen readers.',
'New Adult':'Stories primarily intended for readers in the transition to adulthood.',
'Adult':'Stories primarily intended for adult readers.',
'General Audience':'Stories intended for a broad audience rather than a specific age group.'};box.innerHTML=state.terms.audience.map(t=>{const active=selected?.id===t.id;return `<button type=\"button\" class=\"audience-option ${active?'selected':''}\" data-audience=\"${t.id}\"><span class=\"audience-index\">${String(t.sort_order??'').padStart(2,'0')}</span><span class=\"audience-copy\"><strong>${t.name}</strong><small>${descriptions[t.name]||'Choose this audience for the story.'}</small></span><span class=\"audience-mark\">${active?'✓':'+'}</span></button>`}).join('')||'<p class=\"audience-empty\">Audience options could not be loaded.</p>';box.querySelectorAll('[data-audience]').forEach(b=>b.addEventListener('click',()=>{const t=findTerm('audience',b.dataset.audience);if(!t)return;state.audience=t;renderAudience();$('#audienceMessage').textContent=`Audience selected: ${t.name}`;$('#save').textContent='● Audience not saved'}))}

async function loadTaxonomy(){if(state.loaded)return;try{const mod=await import('./supabaseClient.js');const client=mod.supabase||mod.default;if(!client)throw new Error('Supabase client export not found');const {data,error}=await client.from('gidireads_taxonomy_terms').select('id,name,slug,category,sort_order').eq('is_active',true).in('category',['genre','subgenre','trope','tag','audience','setting','region']).order('sort_order',{ascending:true}).order('name',{ascending:true});if(error)throw error;for(const t of data||[]){if(state.terms[t.category])state.terms[t.category].push(t)}
if(contestMode){
 const contestTag=state.terms.tag.find(t=>/holiday[\s_-]*hearts/i.test(`${t.name||''} ${t.slug||''}`));
 if(contestTag&&!state.tags.some(t=>t.id===contestTag.id))state.tags.push(contestTag);
 const banner=$('#contestModeBanner');
 if(banner){banner.hidden=false;const label=$('#contestPromptNotice');if(label)label.textContent=contestPrompt?`Selected prompt: ${contestPrompt.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}. Publish your story, then submit it through Opportunities.`:'Publish your story, then submit it through Opportunities.';}
}
state.loaded=true;renderGenrePicker('#primaryTerms',$('#primarySearch').value,'primary');renderGenrePicker('#secondaryTerms',$('#secondarySearch').value,'secondary');renderSubgenres();renderDiscovery('trope');renderDiscovery('tag');renderAudience();renderContext('setting');renderContext('region');restoreCreationSelections()}catch(e){console.error(e);$('#classificationMessage').textContent='The classification list could not be loaded. Check the Supabase connection before continuing.'}}
$('#primarySearch').addEventListener('input',()=>renderGenrePicker('#primaryTerms',$('#primarySearch').value,'primary'));$('#secondarySearch').addEventListener('input',()=>renderGenrePicker('#secondaryTerms',$('#secondarySearch').value,'secondary'));$('#subgenreSearch').addEventListener('input',renderSubgenres);$('#tropeSearch').addEventListener('input',()=>renderDiscovery('trope'));$('#tagSearch').addEventListener('input',()=>renderDiscovery('tag'));$('#settingSearch').addEventListener('input',()=>renderContext('setting'));$('#regionSearch').addEventListener('input',()=>renderContext('region'));
document.addEventListener('input',scheduleCreationAutosave);document.addEventListener('change',scheduleCreationAutosave);document.addEventListener('click',e=>{if(e.target.closest('.term-button,.discovery-term,.context-term,.audience-option,[data-rating],[data-adaptation],[data-fit],[data-remove],[data-remove-sub],[data-remove-discovery],[data-clear-context]'))scheduleCreationAutosave()});window.addEventListener('pagehide',saveCreationDraft);
function renderRights(){document.querySelectorAll('[data-rating]').forEach(b=>{const active=b.dataset.rating===state.rating;b.classList.toggle('selected',active);b.querySelector('b').textContent=active?'✓':'+'});document.querySelectorAll('[data-adaptation]').forEach(b=>{const active=b.dataset.adaptation===state.adaptation;b.classList.toggle('selected',active);b.querySelector('b').textContent=active?'✓':'+'});$('#rightsConfirm').checked=state.rightsConfirmed}
document.querySelectorAll('[data-rating]').forEach(b=>b.addEventListener('click',()=>{state.rating=b.dataset.rating;renderRights();$('#rightsMessage').textContent=`Content rating selected: ${state.rating}`;$('#save').textContent='● Content & Rights not saved'}));document.querySelectorAll('[data-adaptation]').forEach(b=>b.addEventListener('click',()=>{state.adaptation=b.dataset.adaptation;renderRights();$('#rightsMessage').textContent=`Adaptation availability: ${state.adaptation}`;$('#save').textContent='● Content & Rights not saved'}));$('#rightsConfirm').addEventListener('change',e=>{state.rightsConfirmed=e.target.checked;$('#rightsMessage').textContent=e.target.checked?'Rights confirmation recorded for this draft.':'Rights confirmation removed.';$('#save').textContent='● Content & Rights not saved'});renderRights();

function applyCoverFit(){
 const img=$('#coverPreviewImage');
 document.querySelectorAll('[data-fit]').forEach(b=>b.classList.toggle('active',b.dataset.fit===state.coverFit));
 if(img){img.classList.toggle('fill',state.coverFit==='cover');img.style.objectPosition='center center';}
 $('#coverFitNote').textContent=state.coverFit==='contain'?'Full cover keeps the entire artwork visible. This is the default.':'Fill frame uses the portrait frame edge-to-edge and may crop the outer edges of the artwork.';
}
function clearCoverPreview(){
 const img=$('#coverPreviewImage');
 img.hidden=true;img.removeAttribute('src');
 $('#coverPreviewFrame').querySelector('.cover-empty').hidden=false;
 $('#coverDropTitle').textContent='Choose a cover';
 $('#coverDropText').textContent='Tap to upload a JPG, PNG or WebP image.';
 $('#coverStatus').textContent='No cover selected yet.';
 $('#coverDimensions').textContent='No image selected.';
 $('#removeCover').disabled=true;
 applyCoverFit();
}
function readCover(file){
 if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
   $('#coverStatus').textContent='Please choose a JPG, PNG or WebP image.';return;
 }
 const reader=new FileReader();
 reader.onload=()=>{
   const img=new Image();
   img.onload=()=>{
     const ratio=img.width/img.height;
     state.cover={file,name:file.name,dataUrl:reader.result,width:img.width,height:img.height,ratio};
     const ratioText=(Math.round(ratio*100)/100).toFixed(2);
     const recommended=Math.abs(ratio-(5/8))<0.015;
     $('#coverPreviewImage').src=reader.result;
     $('#coverPreviewImage').hidden=false;
     $('#coverPreviewFrame').querySelector('.cover-empty').hidden=true;
     $('#coverDropTitle').textContent='Replace cover';
     $('#coverDropText').textContent=file.name;
     $('#coverStatus').textContent=recommended?'Cover matches the recommended 5:8 portrait ratio.':`Cover uploaded. Its ratio is ${ratioText}:1; the complete image is preserved in Full cover mode.`;
     $('#coverDimensions').textContent=`${img.width} × ${img.height} px · ratio ${ratioText}:1`;
     $('#removeCover').disabled=false;
     applyCoverFit();
     $('#save').textContent='● Story Cover not saved';
     try{const max=1400,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);state.cover.dataUrl=canvas.toDataURL('image/jpeg',0.8);scheduleCreationAutosave()}catch(saveError){console.warn('Cover preview could not be compressed for autosave:',saveError)}
   };
   img.onerror=()=>{$('#coverStatus').textContent='That image could not be read. Try another file.'};
   img.src=reader.result;
 };
 reader.readAsDataURL(file);
}
$('#coverInput').addEventListener('change',e=>readCover(e.target.files?.[0]));
$('#coverDrop').addEventListener('dragover',e=>{e.preventDefault();$('#coverDrop').classList.add('dragging')});
$('#coverDrop').addEventListener('dragleave',()=>$('#coverDrop').classList.remove('dragging'));
$('#coverDrop').addEventListener('drop',e=>{e.preventDefault();$('#coverDrop').classList.remove('dragging');readCover(e.dataTransfer.files?.[0])});
$('#removeCover').addEventListener('click',()=>{state.cover=null;$('#coverInput').value='';clearCoverPreview();$('#save').textContent='● Story Cover not saved';scheduleCreationAutosave()});
document.querySelectorAll('[data-fit]').forEach(b=>b.addEventListener('click',()=>{state.coverFit=b.dataset.fit;applyCoverFit();$('#save').textContent='● Story Cover not saved';scheduleCreationAutosave()}));
$('#removeCover').disabled=true;
function renderReview(){
 const primary=state.primary?.name||'Not selected';
 const secondary=state.secondary.map(x=>x.name).join(', ')||'None';
 const subgenres=state.subgenres.map(x=>x.name).join(', ')||'None';
 const tropes=state.tropes.map(x=>x.name).join(', ')||'None';
 const tags=state.tags.map(x=>x.name).join(', ')||'None';
 const audience=state.audience?.name||'Not selected';
 const setting=state.setting?.name||'Not selected';
 const region=state.region?.name||'Not selected';
 const format=document.querySelector('input[name=format]:checked')?.value||'Novel';
 const cover=state.cover?`${state.cover.width} × ${state.cover.height} px`:'No cover selected';
 const items=[
  ['Story title',title.value.trim()||'Untitled story',desc.value.trim()?'Synopsis added':'No synopsis yet'],
  ['Format & language',`${format} · ${lang.value}`,''],
  ['Primary genre',primary,`Secondary: ${secondary}`],
  ['Subgenres',subgenres,`Tropes: ${tropes}`],
  ['Tags',tags,''],
  ['Audience',audience,`Setting: ${setting}`],
  ['Region / cultural context',region,`Rating: ${state.rating}`],
  ['Story cover',cover,state.cover?`Fit: ${state.coverFit==='contain'?'Full cover':'Fill frame'}`:'You can add one later.'],
  ['Story rights',state.rightsConfirmed?'Confirmed':'Not confirmed',`Adaptation: ${state.adaptation}`]
 ];
 $('#reviewGrid').innerHTML=items.map(([label,value,note])=>`<div class="review-item"><small>${label}</small><strong>${escapeHtmlReview(value)}</strong>${note?`<p>${escapeHtmlReview(note)}</p>`:''}</div>`).join('');
 const ready = title.value.trim() && state.primary && state.audience && state.setting && state.region && state.rightsConfirmed;
 $('#reviewMessage').textContent=ready
   ? 'Everything is ready. Creating the story will save it as a Draft in GidiReads; it will not publish the story.'
   : 'Before the story can be created, complete the required selections and confirm your publishing rights.';
 $('#next').disabled=!ready;
}
function escapeHtmlReview(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

let savingStory=false;
function setCreationState(mode, message, storyId){
 const box=$('#creationState');
 if(!box)return;
 box.hidden=false;
 if(mode==='saving'){
   box.innerHTML=`<div class="creation-kicker">CREATING YOUR STORY</div><h3>Saving this work.</h3><p>${escapeHtmlReview(message||'Connecting the details you entered to GidiReads.')}</p><div class="creation-progress"><span aria-hidden="true"></span><span>Saving your story as a Draft…</span></div>`;
 }else if(mode==='success'){
   box.innerHTML=`<div class="creation-kicker">STORY CREATED</div><h3>Your story is ready.</h3><p><strong>${escapeHtmlReview(title.value.trim()||'Untitled story')}</strong> has been created as a Draft. Nothing has been published.</p><div class="creation-actions"><a href="story-workspace.html?story=${encodeURIComponent(storyId)}">Open Story Workspace <span>→</span></a></div>`;
 }else if(mode==='error'){
   box.innerHTML=`<div class="creation-kicker">COULD NOT CREATE STORY</div><h3>Your details are still here.</h3><p>${escapeHtmlReview(message||'Something went wrong while saving. Nothing has been published.')}</p><div class="creation-actions"><button type="button" id="retryCreate">Try again</button></div>`;
   $('#retryCreate')?.addEventListener('click',createStory);
 }
}

async function createStory(){
 if(savingStory)return;
 if(state.stage!==8)return;
 renderReview();
 if($('#next').disabled){
   $('#reviewMessage').textContent='Please complete the required selections and confirm your publishing rights before creating the story.';
   return;
 }
 savingStory=true;
 $('#next').disabled=true;
 $('#reviewMessage').textContent='';
 setCreationState('saving','Your cover and story details are being connected to Supabase.');
 let client, storyId=null, coverPath=null;
 try{
   const mod=await import('./supabaseClient.js');
   client=mod.supabase||mod.default;
   if(!client)throw new Error('Supabase client export not found.');
   const {data:{user},error:authError}=await client.auth.getUser();
   if(authError)throw authError;
   if(!user)throw new Error('You need to be signed in to create a story.');

   const format=document.querySelector('input[name=format]:checked')?.value||'Novel';
   const {data:formatTerm,error:formatError}=await client.from('gidireads_taxonomy_terms').select('id,name').eq('category','format').eq('name',format).eq('is_active',true).maybeSingle();
   if(formatError)throw formatError;
   if(!formatTerm)throw new Error(`The ${format} format is not available in the current GidiReads taxonomy.`);

   const storyPayload={
     author_id:user.id,
     title:title.value.trim(),
     description:desc.value.trim()||null,
     primary_genre:state.primary.name,
     secondary_genre:state.secondary.map(x=>x.name).join(', ')||null,
     status:'draft',
     language:lang.value,
     tags:state.tags.map(x=>x.name),
     content_rating:state.rating,
     cover_fit:state.coverFit,
     cover_position:'50% 50%',
     rights_confirmed:state.rightsConfirmed,
     adaptation_availability:state.adaptation
   };

   const {data:story,error:storyError}=await client.from('stories').insert(storyPayload).select('id').single();
   if(storyError)throw storyError;
   storyId=story.id;

   if(state.cover?.dataUrl&&!state.cover.file){const blob=await (await fetch(state.cover.dataUrl)).blob();state.cover.file=new File([blob],state.cover.name||'story-cover.jpg',{type:blob.type||'image/jpeg'});}
   if(state.cover?.file){
     const ext=state.cover.file.type==='image/png'?'png':state.cover.file.type==='image/webp'?'webp':'jpg';
     coverPath=`${user.id}/${storyId}.${ext}`;
     const {error:uploadError}=await client.storage.from('covers').upload(coverPath,state.cover.file,{contentType:state.cover.file.type,upsert:true,cacheControl:'3600'});
     if(uploadError)throw uploadError;
     const {data:publicUrlData}=client.storage.from('covers').getPublicUrl(coverPath);
     const coverUrl=publicUrlData?.publicUrl;
     if(!coverUrl)throw new Error('The cover was uploaded, but its public URL could not be created.');
     const {error:updateError}=await client.from('stories').update({cover_url:coverUrl}).eq('id',storyId).eq('author_id',user.id);
     if(updateError)throw updateError;
   }

   const relations=[];
   if(state.primary)relations.push({story_id:storyId,term_id:state.primary.id,relationship_type:'primary_genre'});
   for(const term of state.secondary)relations.push({story_id:storyId,term_id:term.id,relationship_type:'secondary_genre'});
   for(const term of state.subgenres)relations.push({story_id:storyId,term_id:term.id,relationship_type:'subgenre'});
   for(const term of state.tropes)relations.push({story_id:storyId,term_id:term.id,relationship_type:'trope'});
   for(const term of state.tags)relations.push({story_id:storyId,term_id:term.id,relationship_type:'tag'});
   if(state.audience)relations.push({story_id:storyId,term_id:state.audience.id,relationship_type:'audience'});
   relations.push({story_id:storyId,term_id:formatTerm.id,relationship_type:'format'});
   if(state.setting)relations.push({story_id:storyId,term_id:state.setting.id,relationship_type:'setting'});
   if(state.region)relations.push({story_id:storyId,term_id:state.region.id,relationship_type:'region'});

   if(relations.length){
     const {error:relationError}=await client.from('story_taxonomy').insert(relations);
     if(relationError)throw relationError;
   }

   creationCompleted=true;if(draftSaveTimer)clearTimeout(draftSaveTimer);localStorage.removeItem(DRAFT_KEY);$('#save').textContent='● Draft saved to GidiReads';
   setCreationState('success','',storyId);
 }catch(error){
   console.error('Create story failed:',error);
   if(storyId){
     try{await client.from('story_taxonomy').delete().eq('story_id',storyId);}catch(cleanupError){console.warn('Taxonomy cleanup failed:',cleanupError);}
     try{await client.from('stories').delete().eq('id',storyId).eq('author_id',(await client.auth.getUser()).data.user?.id);}catch(cleanupError){console.warn('Story cleanup failed:',cleanupError);}
   }
   if(coverPath){try{await client.storage.from('covers').remove([coverPath]);}catch(cleanupError){console.warn('Cover cleanup failed:',cleanupError);}}
   setCreationState('error',error?.message||'An unexpected error occurred.');
   $('#reviewMessage').textContent='The story was not kept after the failed save attempt. Your form details remain on this page so you can try again.';
 }finally{
   savingStory=false;
 }
}

const __next=$('#next');
if(__next)__next.addEventListener('click',async()=>{
 if(state.stage===8){await createStory();return;}
 if(state.stage===1){setStage(2);await loadTaxonomy()}
 else if(state.stage===2){setStage(3);await loadTaxonomy()}
 else if(state.stage===3){setStage(4);await loadTaxonomy()}
 else if(state.stage===4){setStage(5);await loadTaxonomy()}
 else if(state.stage===5){setStage(6)}
 else if(state.stage===6){setStage(7)}
 else if(state.stage===7){setStage(8)}
});

updateBasics();setStage(state.stage);initializing=false;if(restoredDraft&&state.stage>1)loadTaxonomy();else if(restoredDraft)scheduleCreationAutosave();
