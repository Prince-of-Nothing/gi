import React from 'react';

const HTML = `


 <main role="main" style="max-width:640px;margin:40px auto;padding:0 24px;">
  <div class="settings-shell" style="background:var(--surface);border:1px solid var(--line-color);border-radius:20px;padding:32px;">
   <h2 style="font-family:var(--font-display);font-weight:600;font-size:1.6rem;margin:0 0 28px;letter-spacing:-0.02em;">Settings</h2>

   <!-- Theme Picker Card -->
   <div class="settings-card" style="margin-bottom:24px;">
    <h3 id="themeHeading" style="font-family:var(--font-display);font-weight:600;font-size:1.2rem;margin:0 0 8px;letter-spacing:-0.02em;">Theme</h3>
    <p class="sub" style="margin:0 0 20px;color:var(--muted);font-size:0.95rem;">Choose your preferred color theme</p>
    <div class="theme-options" role="radiogroup" aria-labelledby="themeHeading">
     <label class="theme-option">
      <input type="radio" name="siteTheme" value="dark">
      <span class="theme-swatch theme-swatch-dark" aria-hidden="true"></span>
      <span class="theme-option-copy"><strong>Dark</strong><small>Plum tones</small></span>
     </label>
     <label class="theme-option">
      <input type="radio" name="siteTheme" value="light">
      <span class="theme-swatch theme-swatch-light" aria-hidden="true"></span>
      <span class="theme-option-copy"><strong>Beige</strong><small>Warm paper</small></span>
     </label>
     <label class="theme-option">
      <input type="radio" name="siteTheme" value="amoled">
      <span class="theme-swatch theme-swatch-amoled" aria-hidden="true"></span>
      <span class="theme-option-copy"><strong>AMOLED</strong><small>Pure black</small></span>
     </label>
      <label class="theme-option">
       <input type="radio" name="siteTheme" value="greenbeige">
       <span class="theme-swatch theme-swatch-greenbeige" aria-hidden="true"></span>
       <span class="theme-option-copy"><strong>Green Beige</strong><small>Soft sage paper</small></span>
      </label>
      <label class="theme-option">
       <input type="radio" name="siteTheme" value="bluishbeige">
       <span class="theme-swatch theme-swatch-bluishbeige" aria-hidden="true"></span>
       <span class="theme-option-copy"><strong>Bluish Beige</strong><small>Cool paper</small></span>
      </label>
      <label class="theme-option">
       <input type="radio" name="siteTheme" value="custom">
       <span class="theme-swatch theme-swatch-custom" aria-hidden="true"></span>
       <span class="theme-option-copy"><strong>Custom</strong><small>Your own palette</small></span>
      </label>
    </div>
   </div>

   <!-- Custom Theme GUI -->
   <div class="settings-card" style="margin-bottom:24px;" id="customThemeGuiCard">
    <h3 style="font-family:var(--font-display);font-weight:600;font-size:1.2rem;margin:0 0 8px;letter-spacing:-0.02em;">Custom Theme (Color Picker)</h3>
    <p class="sub" style="margin:0 0 12px;color:var(--muted);font-size:0.9rem;">Pick colors for each part of the site. Changes apply when you click "Apply".</p>
    <div id="customColorGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"></div>
    <div style="display:flex;gap:8px;margin-top:12px;">
     <button type="button" class="gr-btn gr-btn-primary" id="applyCustomGui">Apply Custom Theme</button>
     <select id="customModeSelect" style="padding:6px 10px;border-radius:8px;border:1px solid var(--line-color);background:var(--input-surface);color:var(--text);">
      <option value="light">Light mode</option>
      <option value="dark">Dark mode</option>
     </select>
    </div>
    <p class="sub" id="customGuiStatus" style="margin-top:8px;color:var(--muted);font-size:0.85rem;"></p>
   </div>

   <!-- Reader Custom Appearance GUI -->
   <div class="settings-card" style="margin-bottom:24px;" id="readerCustomGuiCard">
    <h3 style="font-family:var(--font-display);font-weight:600;font-size:1.2rem;margin:0 0 8px;letter-spacing:-0.02em;">Reader Custom Appearance (Color Picker)</h3>
    <p class="sub" style="margin:0 0 12px;color:var(--muted);font-size:0.9rem;">Pick colors for the reading surface. Stored in cache (this device).</p>
    <div id="readerCustomColorGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"></div>
    <div style="display:flex;gap:8px;margin-top:12px;">
     <button type="button" class="gr-btn gr-btn-primary" id="applyReaderCustomGui">Apply Reader Custom</button>
    </div>
    <p class="sub" id="readerCustomGuiStatus" style="margin-top:8px;color:var(--muted);font-size:0.85rem;"></p>
   </div>

   <!-- Custom Theme Editor -->
   <div class="settings-card" style="margin-bottom:24px;" id="customThemeCard">
    <h3 style="font-family:var(--font-display);font-weight:600;font-size:1.2rem;margin:0 0 8px;letter-spacing:-0.02em;">Custom Theme (JSON)</h3>
    <p class="sub" style="margin:0 0 12px;color:var(--muted);font-size:0.9rem;">Paste a JSON object with "mode" ("light"/"dark") and "vars" (CSS variables). Example: {"mode":"light","vars":{"--page-bg":"#f0f0f0","--text":"#222"}}</p>
    <textarea id="customThemeJson" rows="6" style="width:100%;font-family:monospace;font-size:0.85rem;padding:8px;border:1px solid var(--line-color);border-radius:8px;background:var(--input-surface);color:var(--text);"></textarea>
    <div style="display:flex;gap:8px;margin-top:10px;">
     <button type="button" class="gr-btn gr-btn-primary" id="applyCustomTheme">Apply Custom Theme</button>
     <button type="button" class="gr-btn" id="clearCustomTheme">Clear</button>
    </div>
    <p class="sub" id="customThemeStatus" style="margin-top:8px;color:var(--muted);font-size:0.85rem;"></p>
   </div>

   <!-- Font Picker Card -->
   <div class="settings-card" style="margin-bottom:24px;">
    <h3 style="font-family:var(--font-display);font-weight:600;font-size:1.2rem;margin:0 0 8px;letter-spacing:-0.02em;">Font</h3>
    <p class="sub" style="margin:0 0 20px;color:var(--muted);font-size:0.95rem;">Choose the typeface used across the site</p>
    <div class="theme-options font-options" role="radiogroup" aria-label="Site font">
     <label class="theme-option font-option">
      <input type="radio" name="siteFont" value="editorial">
      <span class="font-sample font-sample-editorial">Aa</span>
      <span class="font-option-copy theme-option-copy"><strong>Editorial</strong><small>Fraunces + Inter</small></span>
     </label>
     <label class="theme-option font-option">
      <input type="radio" name="siteFont" value="classic">
      <span class="font-sample font-sample-classic">Aa</span>
      <span class="font-option-copy theme-option-copy"><strong>Classic</strong><small>Playfair + Open Sans</small></span>
     </label>
     <label class="theme-option font-option">
      <input type="radio" name="siteFont" value="literary">
      <span class="font-sample font-sample-literary">Aa</span>
      <span class="font-option-copy theme-option-copy"><strong>Literary</strong><small>Cormorant + Source Sans</small></span>
     </label>
     <label class="theme-option font-option">
      <input type="radio" name="siteFont" value="modern">
      <span class="font-sample font-sample-modern">Aa</span>
      <span class="font-option-copy theme-option-copy"><strong>Modern</strong><small>Inter throughout</small></span>
     </label>
    </div>
   </div>

       <!-- Language Card -->
    <div class="settings-card" style="margin-bottom:24px;">
     <h3 style="font-family:var(--font-display);font-weight:600;font-size:1.2rem;margin:0 0 8px;letter-spacing:-0.02em;">Language</h3>
     <p class="sub" style="margin:0 0 20px;color:var(--muted);font-size:0.95rem;">Choose language</p>
     <div class="theme-options" role="radiogroup" aria-label="Site language">
      <label class="theme-option">
       <input type="radio" name="siteLanguage" value="en">
       <span class="theme-option-copy"><strong data-no-i18n>English</strong><small>Base language</small></span>
      </label>
      <label class="theme-option">
       <input type="radio" name="siteLanguage" value="fr">
       <span class="theme-option-copy"><strong data-no-i18n>Français</strong><small>French</small></span>
      </label>
      <label class="theme-option">
       <input type="radio" name="siteLanguage" value="ru">
       <span class="theme-option-copy"><strong data-no-i18n>Русский</strong><small>Russian</small></span>
      </label>
     </div>
    </div>

    <!-- Danger Zone -->
   <section class="gr-panel gr-danger-zone" id="dangerZone" hidden style="margin-top:18px;border-color:#9c3f45;outline:2px solid #9c3f45;outline-offset:2px;">
    <h2 style="color:#9c3f45">Delete account</h2>
    <div class="gr-editor-footer">
     <button type="button" class="gr-btn gr-btn-danger" id="deleteAccountBtn">Delete my account</button>
    </div>
   </section>
   <div class="modal-overlay" id="deleteModal" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="deleteModalTitle">
     <div class="modal-header">
      <button class="modal-close" data-close="delete" aria-label="Close">&times;</button>
      <h2 id="deleteModalTitle" class="modal-title">Delete your account</h2>
      <p class="modal-sub">This permanently erases your account, profile, and everything tied to it. It cannot be undone.</p>
     </div>
     <div class="modal-body">
      <form id="deleteForm" class="modal-form">
       <label class="field">
        <span>Confirm your password</span>
        <input type="password" id="deletePassword" autocomplete="current-password" required />
       </label>
       <button type="button" id="verifyPasswordBtn" class="btn btn-outline btn-block">Verify password</button>
       <label class="field" id="deleteConfirmField" hidden>
        <span>Type your username to confirm</span>
        <input type="text" id="deleteConfirmInput" autocomplete="username" placeholder="e.g. your_username" />
        <small style="color:var(--muted)">This permanently erases your account and profile.</small>
       <p class="form-error" id="deleteError" hidden></p>
       <button type="submit" id="confirmDeleteBtn" class="btn btn-block" style="background:#9c3f45;color:#fff" hidden>Delete my account forever</button>
      </form>
     </div>
    </div>
   </div>
  </div>
 </main>

 

 




`;

export default function SettingsPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      // skipped legacy site-header.js
      try { await import("../../js/settings.js"); } catch (e) { console.error('module load failed', "js/settings.js", e); }
      // skipped legacy site-footer.js
      try { (0,eval)("\r\n(function(){\r\n  var vars=[\r\n    {key:'--page-bg', label:'Page background', desc:'Main page background color'},\r\n    {key:'--surface', label:'Surface', desc:'Card/panel background'},\r\n    {key:'--surface-2', label:'Raised surface', desc:'Raised/elevated surface'},\r\n    {key:'--text', label:'Main text', desc:'Primary text color'},\r\n    {key:'--muted', label:'Muted text', desc:'Secondary/muted text'},\r\n    {key:'--accent', label:'Accent', desc:'Accent color (buttons, links)'},\r\n    {key:'--accent-strong', label:'Accent (strong)', desc:'Stronger accent variant'},\r\n    {key:'--nav-surface', label:'Nav background', desc:'Navigation bar background'},\r\n    {key:'--input-surface', label:'Input background', desc:'Form input background'},\r\n    {key:'--line-color', label:'Border/line', desc:'Borders and dividers'}\r\n  ];\r\n  var defaults={light:{'--page-bg':'#fbf7f1','--surface':'#f3ebe1','--surface-2':'#fffdfb','--text':'#1c1420','--muted':'#5e5263','--accent':'#8e6fb0','--accent-strong':'#68478c','--nav-surface':'#fffcf7','--input-surface':'#fffdfb','--line-color':'#e7d7b8'}, dark:{'--page-bg':'#100a16','--surface':'#1b1024','--surface-2':'#21142b','--text':'#f7effb','--muted':'#d0c1dc','--accent':'#cda5f1','--accent-strong':'#a77bd0','--nav-surface':'rgba(16,10,22,.96)','--input-surface':'#100a16','--line-color':'rgba(216,184,240,.20)'}};\r\n  var grid=document.getElementById('customColorGrid');\r\n  var inputs={};\r\n  if(grid){\r\n    vars.forEach(function(v){\r\n      var row=document.createElement('div');\r\n      row.style.cssText='display:flex;flex-direction:column;gap:4px;padding:8px;border:1px solid var(--line-color);border-radius:8px;background:var(--surface);';\r\n      var lbl=document.createElement('label');\r\n      lbl.style.cssText='font-size:0.85rem;font-weight:600;color:var(--text);';\r\n      lbl.textContent=v.label;\r\n      var desc=document.createElement('small');\r\n      desc.style.cssText='font-size:0.75rem;color:var(--muted);';\r\n      desc.textContent=v.desc;\r\n      var wrap=document.createElement('div');\r\n      wrap.style.cssText='display:flex;gap:6px;align-items:center;';\r\n      var color=document.createElement('input');\r\n      color.type='color';\r\n      color.value='#fbf7f1';\r\n      color.style.cssText='width:40px;height:32px;border:none;padding:0;background:transparent;cursor:pointer;';\r\n      var text=document.createElement('input');\r\n      text.type='text';\r\n      text.placeholder='#hex or rgba';\r\n      text.style.cssText='flex:1;padding:6px 8px;border:1px solid var(--line-color);border-radius:6px;background:var(--input-surface);color:var(--text);font-family:monospace;font-size:0.8rem;';\r\n      // load stored\r\n      try{\r\n        var raw=localStorage.getItem('gidireads-custom-theme');\r\n        if(raw){ var o=JSON.parse(raw); if(o && o.vars && o.vars[v.key]) text.value=o.vars[v.key]; }\r\n      }catch(_){}\r\n      if(!text.value) text.value=defaults.light[v.key];\r\n      color.value=text.value.match(/^#[0-9a-fA-F]{6}$/) ? text.value : '#fbf7f1';\r\n      color.addEventListener('input', function(){ text.value=color.value; });\r\n      text.addEventListener('input', function(){ if(/^#[0-9a-fA-F]{6}$/.test(text.value)) color.value=text.value; });\r\n      wrap.appendChild(color);\r\n      wrap.appendChild(text);\r\n      row.appendChild(lbl);\r\n      row.appendChild(desc);\r\n      row.appendChild(wrap);\r\n      grid.appendChild(row);\r\n      inputs[v.key]=text;\r\n    });\r\n  }\r\n  var applyGui=document.getElementById('applyCustomGui');\r\n  var modeSelect=document.getElementById('customModeSelect');\r\n  var guiStatus=document.getElementById('customGuiStatus');\r\n  if(applyGui) applyGui.addEventListener('click', function(){\r\n    try{\r\n      var vars={};\r\n      for(var k in inputs){ vars[k]=inputs[k].value; }\r\n      var mode=modeSelect ? modeSelect.value : 'light';\r\n      var obj={mode:mode, vars:vars};\r\n      localStorage.setItem('gidireads-custom-theme', JSON.stringify(obj));\r\n      localStorage.setItem('gidireads-custom-mode', mode);\r\n      var ta=document.getElementById('customThemeJson');\r\n      if(ta) ta.value=JSON.stringify(obj);\r\n      if(window.GidiReadsTheme) window.GidiReadsTheme.set('custom');\r\n      if(guiStatus) guiStatus.textContent='Custom theme applied.';\r\n    }catch(e){ if(guiStatus) guiStatus.textContent='Error: '+e.message; }\r\n  });\r\n\r\n  var ta=document.getElementById('customThemeJson');\r\n  var status=document.getElementById('customThemeStatus');\r\n  var applyBtn=document.getElementById('applyCustomTheme');\r\n  var clearBtn=document.getElementById('clearCustomTheme');\r\n  // load existing\r\n  try{ var raw=localStorage.getItem('gidireads-custom-theme'); if(raw) ta.value=raw; }catch(_){}\r\n\r\n  // Reader custom appearance GUI\r\n  var readerVars=[\r\n    {key:'--paper', label:'Paper background', desc:'Reading surface background'},\r\n    {key:'--ink', label:'Text color', desc:'Main reading text'},\r\n    {key:'--panel', label:'Panel background', desc:'Panels/cards in reader'},\r\n    {key:'--muted', label:'Muted text', desc:'Secondary text'},\r\n    {key:'--accent', label:'Accent', desc:'Links and highlights'},\r\n    {key:'--line', label:'Border/line', desc:'Borders and dividers'}\r\n  ];\r\n  var readerDefaults={'--paper':'#f4efe7','--ink':'#251e27','--panel':'#fffdf9','--muted':'#756d75','--accent':'#8e73a8','--line':'rgba(37,30,39,.13)'};\r\n  var readerGrid=document.getElementById('readerCustomColorGrid');\r\n  var readerInputs={};\r\n  if(readerGrid){\r\n    readerVars.forEach(function(v){\r\n      var row=document.createElement('div');\r\n      row.style.cssText='display:flex;flex-direction:column;gap:4px;padding:8px;border:1px solid var(--line-color);border-radius:8px;background:var(--surface);';\r\n      var lbl=document.createElement('label');\r\n      lbl.style.cssText='font-size:0.85rem;font-weight:600;color:var(--text);';\r\n      lbl.textContent=v.label;\r\n      var desc=document.createElement('small');\r\n      desc.style.cssText='font-size:0.75rem;color:var(--muted);';\r\n      desc.textContent=v.desc;\r\n      var wrap=document.createElement('div');\r\n      wrap.style.cssText='display:flex;gap:6px;align-items:center;';\r\n      var color=document.createElement('input');\r\n      color.type='color';\r\n      color.value='#f4efe7';\r\n      color.style.cssText='width:40px;height:32px;border:none;padding:0;background:transparent;cursor:pointer;';\r\n      var text=document.createElement('input');\r\n      text.type='text';\r\n      text.placeholder='#hex or rgba';\r\n      text.style.cssText='flex:1;padding:6px 8px;border:1px solid var(--line-color);border-radius:6px;background:var(--input-surface);color:var(--text);font-family:monospace;font-size:0.8rem;';\r\n      try{\r\n        var raw=localStorage.getItem('gidireads-reader-custom-theme');\r\n        if(raw){ var o=JSON.parse(raw); if(o && o.vars && o.vars[v.key]) text.value=o.vars[v.key]; }\r\n      }catch(_){}\r\n      if(!text.value) text.value=readerDefaults[v.key];\r\n      color.value=text.value.match(/^#[0-9a-fA-F]{6}$/) ? text.value : '#f4efe7';\r\n      color.addEventListener('input', function(){ text.value=color.value; });\r\n      text.addEventListener('input', function(){ if(/^#[0-9a-fA-F]{6}$/.test(text.value)) color.value=text.value; });\r\n      wrap.appendChild(color);\r\n      wrap.appendChild(text);\r\n      row.appendChild(lbl);\r\n      row.appendChild(desc);\r\n      row.appendChild(wrap);\r\n      readerGrid.appendChild(row);\r\n      readerInputs[v.key]=text;\r\n    });\r\n  }\r\n  var applyReaderGui=document.getElementById('applyReaderCustomGui');\r\n  var readerGuiStatus=document.getElementById('readerCustomGuiStatus');\r\n  if(applyReaderGui) applyReaderGui.addEventListener('click', function(){\r\n    try{\r\n      var vars={};\r\n      for(var k in readerInputs){ vars[k]=readerInputs[k].value; }\r\n      var obj={vars:vars};\r\n      localStorage.setItem('gidireads-reader-custom-theme', JSON.stringify(obj));\r\n      if(readerGuiStatus) readerGuiStatus.textContent='Reader custom appearance saved (use Custom in reader drawer).';\r\n    }catch(e){ if(readerGuiStatus) readerGuiStatus.textContent='Error: '+e.message; }\r\n  });\r\n  if(applyBtn) applyBtn.addEventListener('click', function(){\r\n    try {\r\n      var obj=JSON.parse(ta.value);\r\n      if(!obj || typeof obj!=='object') throw new Error('Invalid JSON');\r\n      if(!obj.mode) obj.mode='light';\r\n      if(!obj.vars || typeof obj.vars!=='object') obj.vars={};\r\n      localStorage.setItem('gidireads-custom-theme', JSON.stringify(obj));\r\n      localStorage.setItem('gidireads-custom-mode', obj.mode);\r\n      if(window.GidiReadsTheme) window.GidiReadsTheme.set('custom');\r\n      if(status) status.textContent='Custom theme applied.';\r\n    } catch(e){ if(status) status.textContent='Error: '+e.message; }\r\n  });\r\n  if(clearBtn) clearBtn.addEventListener('click', function(){\r\n    try{ localStorage.removeItem('gidireads-custom-theme'); localStorage.removeItem('gidireads-custom-mode'); ta.value=''; if(status) status.textContent='Cleared.'; }catch(_){}\r\n  });\r\n})();\r\n"); } catch(e){ console.error('inline script failed', e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-settings');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-settings" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
