import React from 'react';

const HTML = `

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
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      // skipped legacy site-header.js
      try { await import("../../js/reset-password.js"); } catch (e) { console.error('module load failed', "js/reset-password.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-reset-password');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-reset-password" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
