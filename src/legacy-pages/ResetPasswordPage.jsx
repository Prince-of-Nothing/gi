import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

 <main role="main" class="wrap" id="main-content">
  <div class="brand">GidiReads</div>
  <section class="card" id="loading"><div class="spinner">Checking your recovery link…</div></section>
  <section class="card hidden" id="resetCard">
   <h1>Choose a new password</h1><p>Set a new password for your GidiReads account.</p>
   <form id="resetForm">
    <label for="password">New password</label><input id="password" type="password" minlength="8" autocomplete="new-password" required>
    <label for="confirm">Confirm password</label><input id="confirm" type="password" minlength="8" autocomplete="new-password" required>
    <button id="submitBtn" type="submit">Update password</button>
   </form><div id="formMsg" class="msg hidden"></div>
  </section>
  <section class="card hidden" id="successCard"><h1>Password updated</h1><p>Your GidiReads password has been changed successfully. You can return to GidiReads and sign in with your new password.</p><a class="back" href="index.html">Return to GidiReads</a></section>
  <section class="card hidden" id="invalidCard"><h1>Recovery link unavailable</h1><p>This password-reset link is invalid or has expired. Please request a new password-reset email from GidiReads.</p><a class="back" href="index.html">Return to GidiReads</a></section>
 </main>
 




`;

export default function ResetPasswordPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/reset-password.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/reset-password.js"); } catch (e) { console.error('script load failed', "js/reset-password.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-reset-password');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-reset-password" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
