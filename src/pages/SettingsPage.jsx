import React from 'react';
import { supabase } from '../js/supabaseClient.js';

const SITE_VARS = [
  ['--page-bg', 'Page background'], ['--surface', 'Surface'], ['--surface-2', 'Surface 2'], ['--text', 'Text'],
  ['--muted', 'Muted text'], ['--accent', 'Accent'], ['--line-color', 'Line'], ['--nav-surface', 'Nav surface'], ['--input-surface', 'Input surface'],
];
const SITE_DEFAULTS = {
  '--page-bg': '#100a16', '--surface': '#1b1024', '--surface-2': '#21142b', '--text': '#f7effb',
  '--muted': '#d0c1dc', '--accent': '#cda5f1', '--line-color': '#3a2a45', '--nav-surface': '#100a16', '--input-surface': '#100a16',
};
const READER_VARS = [
  ['--paper', 'Paper'], ['--panel', 'Panel'], ['--ink', 'Ink'], ['--muted', 'Muted'], ['--accent', 'Accent'], ['--line', 'Line'], ['--gold', 'Gold'],
];
const READER_DEFAULTS = { '--paper': '#100d14', '--panel': '#19131f', '--ink': '#f4edf7', '--muted': '#b7aabd', '--accent': '#c4a6df', '--line': '#3a2a45', '--gold': '#d8b36a' };

function ColorGrid({ id, vars, defaults, values, onChange }) {
  return (
    <div id={id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {vars.map(([v, label]) => (
        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', color: 'var(--text)' }}>
          <span style={{ flex: 1 }}>{label}</span>
          <input type="color" data-var={v} value={values[v] || defaults[v] || '#888888'} onChange={(e) => onChange(v, e.target.value)} style={{ width: 44, height: 32, border: '1px solid var(--line-color)', borderRadius: 6, background: 'var(--input-surface)', padding: 2 }} />
        </label>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = React.useState(null);
  const [theme, setTheme] = React.useState(() => localStorage.getItem('gr-site-theme') || 'dark');
  const [font, setFont] = React.useState(() => localStorage.getItem('gidireads-site-font') || 'editorial');
  const [lang, setLang] = React.useState(() => localStorage.getItem('gr-site-lang') || 'en');
  const [customMode, setCustomMode] = React.useState('light');
  const [siteVars, setSiteVars] = React.useState({ ...SITE_DEFAULTS });
  const [readerVars, setReaderVars] = React.useState({ ...READER_DEFAULTS });
  const [customJson, setCustomJson] = React.useState('');
  const [status, setStatus] = React.useState({});
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteStep, setDeleteStep] = React.useState(1); // 1 verify, 2 confirm
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleteConfirm, setDeleteConfirm] = React.useState('');
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');

  React.useEffect(() => {
    document.title = 'Settings — GidiReads';
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) setUser(session?.user || null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (mounted) setUser(session?.user || null); });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  function setStatusFor(key, msg) { setStatus(prev => ({ ...prev, [key]: msg })); }
  function pickTheme(name) {
    setTheme(name);
    try { localStorage.setItem('gr-site-theme', name); } catch {}
    if (window.GidiReadsTheme?.set) window.GidiReadsTheme.set(name);
  }
  function pickFont(value) {
    setFont(value);
    try { localStorage.setItem('gidireads-site-font', value); } catch {}
    document.documentElement.setAttribute('data-site-font', value);
  }
  function pickLang(value) {
    setLang(value);
    try { localStorage.setItem('gr-site-lang', value); } catch {}
  }
  function applyCustomGui() {
    try {
      localStorage.setItem('gidireads-custom-theme', JSON.stringify({ mode: customMode, vars: siteVars }));
      if (window.GidiReadsTheme?.set) window.GidiReadsTheme.set('custom');
      setStatusFor('customGui', 'Custom theme applied.');
    } catch { setStatusFor('customGui', 'Could not save custom theme.'); }
  }
  function applyCustomTheme() {
    try {
      const parsed = JSON.parse(customJson || '{}');
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid object');
      if (!parsed.vars || typeof parsed.vars !== 'object') parsed.vars = {};
      if (parsed.mode !== 'dark' && parsed.mode !== 'light') parsed.mode = 'light';
      localStorage.setItem('gidireads-custom-theme', JSON.stringify(parsed));
      if (window.GidiReadsTheme?.set) window.GidiReadsTheme.set('custom');
      setStatusFor('customTheme', 'Custom theme applied.');
    } catch (e) { setStatusFor('customTheme', 'Invalid JSON: ' + (e.message || 'parse error')); }
  }
  function clearCustomTheme() {
    try { localStorage.removeItem('gidireads-custom-theme'); } catch {}
    if (window.GidiReadsTheme?.set) window.GidiReadsTheme.set('dark');
    setCustomJson('');
    setStatusFor('customTheme', 'Custom theme cleared.');
  }
  function applyReaderCustom() {
    try {
      localStorage.setItem('gidireads-reader-custom-theme', JSON.stringify({ vars: readerVars }));
      localStorage.setItem('gidireads-reader-custom-theme', JSON.stringify({ vars: readerVars }));
      setStatusFor('readerCustom', 'Reader custom appearance saved.');
    } catch { setStatusFor('readerCustom', 'Could not save reader custom appearance.'); }
  }

  async function verifyDeletePassword() {
    if (!user) return;
    if (!deletePassword) { setDeleteError('Enter your password to continue.'); return; }
    setDeleteBusy(true); setDeleteError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: deletePassword });
      if (error) throw Error('That password is incorrect. Please try again.');
      setDeleteStep(2);
    } catch (e) { setDeleteError(e.message || 'We could not verify your password.'); }
    finally { setDeleteBusy(false); }
  }
  async function confirmDeleteAccount() {
    if (!user) return;
    const username = user.email.split('@')[0];
    const val = deleteConfirm.trim();
    if (!val || (val !== username && val !== user.email)) { setDeleteError('Type your username or email to confirm.'); return; }
    setDeleteBusy(true); setDeleteError('');
    try {
      const { error } = await supabase.rpc('gidireads_delete_account');
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.href = 'index.html';
    } catch (e) { setDeleteError(e.message || 'We could not delete your account. Please try again.'); setDeleteBusy(false); }
  }

  return (
    <main role="main" style={{ maxWidth: 640, margin: '40px auto', padding: '0 24px' }}>
      <div className="settings-shell" style={{ background: 'var(--surface)', border: '1px solid var(--line-color)', borderRadius: 20, padding: 32 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.6rem', margin: '0 0 28px', letterSpacing: '-0.02em' }}>Settings</h2>

        <div className="settings-card" style={{ marginBottom: 24 }}>
          <h3 id="themeHeading" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.2rem', margin: '0 0 8px' }}>Theme</h3>
          <p className="sub" style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: '0.95rem' }}>Choose your preferred color theme</p>
          <div className="theme-options" role="radiogroup" aria-labelledby="themeHeading">
            {[['dark', 'Dark', 'Plum tones'], ['light', 'Beige', 'Warm paper'], ['amoled', 'AMOLED', 'Pure black'], ['greenbeige', 'Green Beige', 'Soft sage paper'], ['bluishbeige', 'Bluish Beige', 'Cool paper'], ['custom', 'Custom', 'Your own palette']].map(([value, label, subLabel]) => (
              <label key={value} className="theme-option">
                <input type="radio" name="siteTheme" value={value} checked={theme === value} onChange={() => pickTheme(value)} />
                <span className={`theme-swatch theme-swatch-${value}`} aria-hidden="true"></span>
                <span className="theme-option-copy"><strong>{label}</strong><small>{subLabel}</small></span>
              </label>
            ))}
          </div>
        </div>

        <div className="settings-card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.2rem', margin: '0 0 8px' }}>Custom Theme (Color Picker)</h3>
          <p className="sub" style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: '0.9rem' }}>Pick colors for each part of the site. Changes apply when you click "Apply".</p>
          <ColorGrid id="customColorGrid" vars={SITE_VARS} defaults={SITE_DEFAULTS} values={siteVars} onChange={(v, val) => setSiteVars(prev => ({ ...prev, [v]: val }))} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" className="gr-btn gr-btn-primary" onClick={applyCustomGui}>Apply Custom Theme</button>
            <select value={customMode} onChange={(e) => setCustomMode(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line-color)', background: 'var(--input-surface)', color: 'var(--text)' }}>
              <option value="light">Light mode</option>
              <option value="dark">Dark mode</option>
            </select>
          </div>
          <p className="sub" style={{ marginTop: 8, color: 'var(--muted)', fontSize: '0.85rem' }}>{status.customGui || ''}</p>
        </div>

        <div className="settings-card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.2rem', margin: '0 0 8px' }}>Reader Custom Appearance (Color Picker)</h3>
          <p className="sub" style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: '0.9rem' }}>Pick colors for the reading surface. Stored in cache (this device).</p>
          <ColorGrid id="readerCustomColorGrid" vars={READER_VARS} defaults={READER_DEFAULTS} values={readerVars} onChange={(v, val) => setReaderVars(prev => ({ ...prev, [v]: val }))} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" className="gr-btn gr-btn-primary" onClick={applyReaderCustom}>Apply Reader Custom</button>
          </div>
          <p className="sub" style={{ marginTop: 8, color: 'var(--muted)', fontSize: '0.85rem' }}>{status.readerCustom || ''}</p>
        </div>

        <div className="settings-card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.2rem', margin: '0 0 8px' }}>Custom Theme (JSON)</h3>
          <p className="sub" style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: '0.9rem' }}>Paste a JSON object with "mode" ("light"/"dark") and "vars" (CSS variables).</p>
          <textarea rows={6} value={customJson} onChange={(e) => setCustomJson(e.target.value)} style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', padding: 8, border: '1px solid var(--line-color)', borderRadius: 8, background: 'var(--input-surface)', color: 'var(--text)' }}></textarea>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" className="gr-btn gr-btn-primary" onClick={applyCustomTheme}>Apply Custom Theme</button>
            <button type="button" className="gr-btn" onClick={clearCustomTheme}>Clear</button>
          </div>
          <p className="sub" style={{ marginTop: 8, color: 'var(--muted)', fontSize: '0.85rem' }}>{status.customTheme || ''}</p>
        </div>

        <div className="settings-card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.2rem', margin: '0 0 8px' }}>Font</h3>
          <p className="sub" style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: '0.95rem' }}>Choose the typeface used across the site</p>
          <div className="theme-options font-options" role="radiogroup" aria-label="Site font">
            {[['editorial', 'Editorial', 'Fraunces + Inter'], ['classic', 'Classic', 'Playfair + Open Sans'], ['literary', 'Literary', 'Cormorant + Source Sans'], ['modern', 'Modern', 'Inter throughout']].map(([value, label, subLabel]) => (
              <label key={value} className="theme-option font-option">
                <input type="radio" name="siteFont" value={value} checked={font === value} onChange={() => pickFont(value)} />
                <span className={`font-sample font-sample-${value}`}>Aa</span>
                <span className="font-option-copy theme-option-copy"><strong>{label}</strong><small>{subLabel}</small></span>
              </label>
            ))}
          </div>
        </div>

        <div className="settings-card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.2rem', margin: '0 0 8px' }}>Language</h3>
          <p className="sub" style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: '0.95rem' }}>Choose language</p>
          <div className="theme-options" role="radiogroup" aria-label="Site language">
            {[['en', 'English', 'Base language'], ['fr', 'Français', 'French'], ['ru', 'Русский', 'Russian']].map(([value, label, subLabel]) => (
              <label key={value} className="theme-option">
                <input type="radio" name="siteLanguage" value={value} checked={lang === value} onChange={() => pickLang(value)} />
                <span className="theme-option-copy"><strong data-no-i18n>{label}</strong><small>{subLabel}</small></span>
              </label>
            ))}
          </div>
        </div>

        {user && (
          <section className="gr-panel" style={{ marginTop: 18, borderColor: '#9c3f45', outline: '2px solid #9c3f45', outlineOffset: 2 }}>
            <h2 style={{ color: '#9c3f45' }}>Delete account</h2>
            <div className="gr-editor-footer">
              <button type="button" className="gr-btn gr-btn-danger" onClick={() => { setDeleteOpen(true); setDeleteStep(1); setDeleteError(''); setDeletePassword(''); setDeleteConfirm(''); }}>Delete my account</button>
            </div>
          </section>
        )}
      </div>

      {deleteOpen && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="deleteModalTitle">
            <div className="modal-header">
              <button className="modal-close" aria-label="Close" onClick={() => setDeleteOpen(false)}>&times;</button>
              <h2 id="deleteModalTitle" className="modal-title">Delete your account</h2>
              <p className="modal-sub">This permanently erases your account, profile, and everything tied to it. It cannot be undone.</p>
            </div>
            <div className="modal-body">
              {deleteStep === 1 ? (
                <form onSubmit={(e) => { e.preventDefault(); verifyDeletePassword(); }} className="modal-form">
                  <label className="field"><span>Confirm your password</span><input type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} required /></label>
                  <button type="submit" className="btn btn-outline btn-block" disabled={deleteBusy}>{deleteBusy ? 'Verifying…' : 'Verify password'}</button>
                  {deleteError ? <p className="form-error">{deleteError}</p> : null}
                </form>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); confirmDeleteAccount(); }} className="modal-form">
                  <label className="field"><span>Type your username to confirm</span><input type="text" autoComplete="username" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="e.g. your_username" /><small style={{ color: 'var(--muted)' }}>This permanently erases your account and profile.</small></label>
                  {deleteError ? <p className="form-error">{deleteError}</p> : null}
                  <button type="submit" className="btn btn-block" style={{ background: '#9c3f45', color: '#fff' }} disabled={deleteBusy}>{deleteBusy ? 'Deleting…' : 'Delete my account forever'}</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
