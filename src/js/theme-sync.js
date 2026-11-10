// theme-sync.js — persists the GLOBAL (site) theme to profiles.theme_pref.
// Reader theme (gidireads-reader-*) stays in cache (localStorage) only.
import { supabase } from './supabaseClient.js';

(function () {
  'use strict';

  async function currentUserId() {
    try {
      const { data } = await supabase.auth.getUser();
      return data && data.user ? data.user.id : null;
    } catch (_) { return null; }
  }

  async function pullTheme() {
    const uid = await currentUserId();
    if (!uid) return;
    try {
      const { data, error } = await supabase.from('profiles').select('theme_pref').eq('id', uid).maybeSingle();
      if (error || !data || !data.theme_pref) return;
      const pref = data.theme_pref;
      if (window.GidiReadsTheme && typeof window.GidiReadsTheme.set === 'function') {
        // normalize storage value via theme engine
        const normalized = window.GidiReadsTheme.normalize(pref);
        if (normalized) window.GidiReadsTheme.set(normalized);
      }
    } catch (_) { /* offline / no table */ }
  }

  async function pushTheme(theme) {
    const uid = await currentUserId();
    if (!uid) return;
    try {
      await supabase.from('profiles').update({ theme_pref: theme }).eq('id', uid);
    } catch (_) { /* offline / no table */ }
  }

  // Pull on load (after auth resolves).
  function schedulePull() {
    setTimeout(function () { pullTheme(); }, 800);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedulePull, { once: true });
  } else {
    schedulePull();
  }

  // Push on change.
  document.addEventListener('gidireads:themechange', function (e) {
    const theme = e && e.detail && e.detail.theme;
    if (theme) pushTheme(theme);
  });
})();
