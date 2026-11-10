import { supabase } from './supabaseClient.js';
import { RESOURCE_ARTICLES, RESOURCE_CATEGORIES } from './resources-content.js';

const $ = (s) => document.querySelector(s);
const esc = (v='') => { const n=document.createElement('span'); n.textContent=String(v); return n.innerHTML; };
function safeArticleHTML(source=''){const parsed=new DOMParser().parseFromString(String(source),'text/html');const allowed=new Set(['P','H2','H3','UL','OL','LI','STRONG','EM','B','I','A','BLOCKQUOTE','CODE']);function clean(node){const out=document.createDocumentFragment();for(const child of [...node.childNodes]){if(child.nodeType===Node.TEXT_NODE){out.append(document.createTextNode(child.textContent));continue;}if(child.nodeType!==Node.ELEMENT_NODE)continue;if(!allowed.has(child.tagName)){out.append(clean(child));continue;}const el=document.createElement(child.tagName.toLowerCase());if(child.tagName==='A'){const href=child.getAttribute('href')||'';if(/^(https?:\/\/|\/|#|\.\.?\/)/i.test(href)){el.setAttribute('href',href);if(/^https?:\/\//i.test(href)){el.setAttribute('target','_blank');el.setAttribute('rel','noopener noreferrer');}}}el.append(clean(child));out.append(el);}return out;}const holder=document.createElement('div');holder.append(clean(parsed.body));return holder.innerHTML;}
const resourceAudience = document.body.dataset.audience === 'readers' ? 'readers' : 'authors';
let articles = RESOURCE_ARTICLES.filter(a => a.audience === 'all' || a.audience === resourceAudience);
let activeCategory = 'All resources';
let activeArticle = null;
const home = $('#resourceHome'), articleView = $('#resourceArticle');

function renderCategories(){
  const visibleCategories = RESOURCE_CATEGORIES.filter(c => articles.some(a => a.category === c));
  if(activeCategory !== 'All resources' && !visibleCategories.includes(activeCategory)) activeCategory = 'All resources';
  $('#resourceCategoryList').innerHTML = ['All resources',...visibleCategories].map(c=>`<button type="button" class="resource-category ${activeCategory===c?'active':''}" data-category="${esc(c)}">${esc(c)}<span>${c==='All resources'?articles.length:articles.filter(a=>a.category===c).length}</span></button>`).join('');
}
function renderList(){
  const q=$('#resourceSearch').value.trim().toLowerCase();
  const rows=articles.filter(a=>(activeCategory==='All resources'||a.category===activeCategory)&&(!q||`${a.title} ${a.summary} ${a.category} ${a.body}`.toLowerCase().includes(q)));
  $('#resourceCount').textContent=`${rows.length} ${rows.length===1?'guide':'guides'}`;
  $('#resourceArticleList').innerHTML=rows.length?rows.map(a=>`<button class="resource-card" type="button" data-article="${esc(a.slug)}"><span class="resource-card-category">${esc(a.category)}</span><strong>${esc(a.title)}</strong><span>${esc(a.summary)}</span><i>Read guide <b>→</b></i></button>`).join(''):'<p class="resource-empty">No guides match that search. Try another word or choose a different topic.</p>';
}
function openArticle(slug){
  const a=articles.find(x=>x.slug===slug); if(!a)return;
  activeArticle=a; home.hidden=true; articleView.hidden=false;
  $('#articleCategory').textContent=a.category; $('#articleTitle').textContent=a.title; $('#articleSummary').textContent=a.summary;
  const fmtDate=(v)=>v?new Date(v).toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'}):'';$('#articleUpdated').textContent=a.published_at?`Published ${fmtDate(a.published_at)} · Updated ${fmtDate(a.updated_at)}`:`Updated ${a.updated||'2 November 2026'}`;
  $('#articleBody').innerHTML=safeArticleHTML(a.body);
  const related=articles.filter(x=>x.slug!==a.slug&&(x.category===a.category||x.slug==='troubleshooting-common-problems')).slice(0,3);
  $('#resourceRelated').innerHTML=related.length?`<p class="resources-eyebrow">RELATED GUIDES</p><div>${related.map(x=>`<button type="button" data-article="${esc(x.slug)}">${esc(x.title)} <span>→</span></button>`).join('')}</div>`:'';
  $('#resourceFeedbackMessage').textContent=''; window.scrollTo({top:0,behavior:'smooth'});
  history.replaceState(null,'',`#${encodeURIComponent(slug)}`);
}
function showHome(){activeArticle=null;articleView.hidden=true;home.hidden=false;history.replaceState(null,'',location.pathname);renderCategories();renderList();}
$('#resourceCategoryList').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;activeCategory=b.dataset.category;renderCategories();renderList();});
$('#resourceArticleList').addEventListener('click',e=>{const b=e.target.closest('[data-article]');if(b)openArticle(b.dataset.article);});
$('#resourceRelated').addEventListener('click',e=>{const b=e.target.closest('[data-article]');if(b)openArticle(b.dataset.article);});
$('#resourceBack').addEventListener('click',showHome);
$('#resourceSearch').addEventListener('input',()=>{if(!home.hidden){renderList();}else{showHome();renderList();}});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('#resourceSearch').focus();}if(e.key==='Escape'&&document.activeElement===$('#resourceSearch'))$('#resourceSearch').blur();});
$('#resourceFeedback').addEventListener('click',e=>{const b=e.target.closest('[data-helpful]');if(!b||!activeArticle)return;$('#resourceFeedbackMessage').textContent=b.dataset.helpful==='yes'?'Thank you for checking.':'Thanks for letting us know. You can try a related guide or search for another answer.';});

async function loadPublishedArticles(){
  const {data,error}=await supabase.from('resource_articles').select('slug,category,title,summary,body,audience,published_at,updated_at').eq('status','published').or(`audience.eq.all,audience.eq.${resourceAudience}`).order('sort_order',{ascending:true}).order('title',{ascending:true});
  if(!error&&Array.isArray(data)&&data.length){const published=new Map(data.map(a=>[a.slug,{...a,updated:a.updated_at?new Date(a.updated_at).toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'}):'2 November 2026'}]));articles=RESOURCE_ARTICLES.map(a=>published.get(a.slug)||a);for(const [slug,a] of published){if(!articles.some(x=>x.slug===slug))articles.push(a);}}
  else if(error){console.info('Using the bundled resource guides until the resource-content migration is available.');}
  renderCategories();renderList();
  const slug=decodeURIComponent(location.hash.slice(1));if(slug)openArticle(slug);
}
window.addEventListener('hashchange',()=>{const slug=decodeURIComponent(location.hash.slice(1));if(slug)openArticle(slug);else showHome();});
renderCategories();renderList();loadPublishedArticles();
