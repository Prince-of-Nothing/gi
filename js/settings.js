/* Settings page bootstrap. */
import { supabase } from './supabaseClient.js';
const $=id=>document.getElementById(id);
let currentUser=null;
const deleteError=(msg)=>{const el=$('deleteError');if(el){el.textContent=msg;el.hidden=false;}};

function status(el,msg){ if(el) el.textContent=msg; }

function buildColorGrid(gridId, vars, defaults) {
  const grid=$(gridId);
  if(!grid) return;
  grid.innerHTML = vars.map(([v,label]) =>
    `<label style="display:flex;align-items:center;gap:8px;font-size:.85rem;color:var(--text);">
      <span style="flex:1">${label}</span>
      <input type="color" data-var="${v}" value="${defaults[v]||'#888888'}" style="width:44px;height:32px;border:1px solid var(--line-color);border-radius:6px;background:var(--input-surface);padding:2px;">
    </label>`).join('');
}

const SITE_VARS = [
  ['--page-bg','Page background'],
  ['--surface','Surface'],
  ['--surface-2','Surface 2'],
  ['--text','Text'],
  ['--muted','Muted text'],
  ['--accent','Accent'],
  ['--line-color','Line'],
  ['--nav-surface','Nav surface'],
  ['--input-surface','Input surface']
];
const SITE_DEFAULTS = {
  '--page-bg':'#100a16','--surface':'#1b1024','--surface-2':'#21142b',
  '--text':'#f7effb','--muted':'#d0c1dc','--accent':'#cda5f1',
  '--line-color':'#3a2a45','--nav-surface':'#100a16','--input-surface':'#100a16'
};

const READER_VARS = [
  ['--paper','Paper'],
  ['--panel','Panel'],
  ['--ink','Ink'],
  ['--muted','Muted'],
  ['--accent','Accent'],
  ['--line','Line'],
  ['--gold','Gold']
];
const READER_DEFAULTS = {
  '--paper':'#100d14','--panel':'#19131f','--ink':'#f4edf7',
  '--muted':'#b7aabd','--accent':'#c4a6df','--line':'#3a2a45','--gold':'#d8b36a'
};

buildColorGrid('customColorGrid', SITE_VARS, SITE_DEFAULTS);
buildColorGrid('readerCustomColorGrid', READER_VARS, READER_DEFAULTS);

const applyCustomGui=$('applyCustomGui');
if(applyCustomGui) applyCustomGui.addEventListener('click',()=>{
  const vars={};
  document.querySelectorAll('#customColorGrid input[type="color"]').forEach(inp=>{vars[inp.dataset.var]=inp.value;});
  const mode=$('customModeSelect')?$('customModeSelect').value:'light';
  try{
    localStorage.setItem('gidireads-custom-theme', JSON.stringify({mode,vars}));
    if(window.GidiReadsTheme && typeof window.GidiReadsTheme.set==='function') window.GidiReadsTheme.set('custom');
    status($('customGuiStatus'),'Custom theme applied.');
  }catch(e){ status($('customGuiStatus'),'Could not save custom theme.'); }
});

const applyCustomTheme=$('applyCustomTheme');
if(applyCustomTheme) applyCustomTheme.addEventListener('click',()=>{
  const ta=$('customThemeJson');
  const st=$('customThemeStatus');
  try{
    const parsed=JSON.parse(ta.value||'{}');
    if(!parsed || typeof parsed!=='object') throw new Error('Invalid object');
    if(!parsed.vars || typeof parsed.vars!=='object') parsed.vars={};
    if(parsed.mode!=='dark' && parsed.mode!=='light') parsed.mode='light';
    localStorage.setItem('gidireads-custom-theme', JSON.stringify(parsed));
    if(window.GidiReadsTheme && typeof window.GidiReadsTheme.set==='function') window.GidiReadsTheme.set('custom');
    status(st,'Custom theme applied.');
  }catch(e){ status(st,'Invalid JSON: '+ (e.message||'parse error')); }
});

const clearCustomTheme=$('clearCustomTheme');
if(clearCustomTheme) clearCustomTheme.addEventListener('click',()=>{
  try{ localStorage.removeItem('gidireads-custom-theme'); }catch(_){}
  if(window.GidiReadsTheme && typeof window.GidiReadsTheme.set==='function') window.GidiReadsTheme.set('dark');
  const ta=$('customThemeJson'); if(ta) ta.value='';
  status($('customThemeStatus'),'Custom theme cleared.');
});

const applyReaderCustom=$('applyReaderCustomGui');
if(applyReaderCustom) applyReaderCustom.addEventListener('click',()=>{
  const vars={};
  document.querySelectorAll('#readerCustomColorGrid input[type="color"]').forEach(inp=>{vars[inp.dataset.var]=inp.value;});
  try{
    localStorage.setItem('gidireads-reader-custom-theme', JSON.stringify({vars}));
    // also use storageKey if available? reader uses storageKey('custom-theme')
    const key='gidireads-reader-'+( (window.location? '' : '') )+'custom-theme';
    localStorage.setItem(key, JSON.stringify({vars}));
    status($('readerCustomGuiStatus'),'Reader custom appearance saved.');
  }catch(e){ status($('readerCustomGuiStatus'),'Could not save reader custom appearance.'); }
});

// Danger zone (original)
if($('deleteAccountBtn')) $('deleteAccountBtn').addEventListener('click',()=>{if(!currentUser)return;const m=$('deleteModal');$('deleteError').hidden=true;$('deleteConfirmField').hidden=true;$('confirmDeleteBtn').hidden=true;$('deletePassword').value='';$('deleteConfirmInput').value='';const btn=$('verifyPasswordBtn');btn.disabled=false;btn.textContent='Verify password';$('confirmDeleteBtn').hidden=true;m.hidden=false;document.body.style.overflow='hidden';$('deletePassword').focus()});
document.querySelectorAll('[data-close="delete"]').forEach(b=>b.addEventListener('click',()=>{$('deleteModal').hidden=true;document.body.style.overflow=''}));
if($('deleteModal')) $('deleteModal').addEventListener('click',e=>{if(e.target===$('deleteModal')){$('deleteModal').hidden=true;document.body.style.overflow=''}});
if($('verifyPasswordBtn')) $('verifyPasswordBtn').addEventListener('click',async()=>{if(!currentUser)return;const email=currentUser.email;const password=$('deletePassword').value;const btn=$('verifyPasswordBtn');const el=$('deleteError');el.hidden=true;if(!password){deleteError('Enter your password to continue.');return}btn.disabled=true;btn.textContent='Verifying...';try{const {error:pwErr}=await supabase.auth.signInWithPassword({email,password});if(pwErr)throw Error('That password is incorrect. Please try again.');btn.textContent='Deleting...';$('deleteForm').requestSubmit()}catch(err){deleteError(err.message||'We could not verify your password.')}finally{btn.disabled=false}});
if($('deleteForm')) $('deleteForm').addEventListener('submit',async e=>{e.preventDefault();if(!currentUser)return;const btn=$('confirmDeleteBtn');const el=$('deleteError');el.hidden=true;const confirmVal=$('deleteConfirmInput').value.trim();const username=currentUser.email.split('@')[0];if(!confirmVal||confirmVal!==username&&confirmVal!==currentUser.email){deleteError('Type your username or email to confirm.');return}btn.disabled=true;btn.textContent='Deleting...';try{const {error}=await supabase.rpc('gidireads_delete_account');if(error)throw error;await supabase.auth.signOut();location.href='index.html'}catch(err){deleteError(err.message||'We could not delete your account. Please try again.');btn.disabled=false;btn.textContent='Delete my account forever'}});
supabase.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user??null;if(!currentUser){if($('dangerZone'))$('dangerZone').hidden=true;return}if($('dangerZone'))$('dangerZone').hidden=false;});