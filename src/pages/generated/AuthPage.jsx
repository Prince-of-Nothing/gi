import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<main role="main" class="gr-auth-shell" id="main-content"><a class="gr-auth-brand" href="index.html"><img src="assets/gidireads-logo.png" alt=""><span>GidiReads</span></a><div class="gr-auth-layout"><section class="gr-auth-aside"><p class="gr-auth-eyebrow">STORIES BEGIN HERE</p><h1>Find your world.<br><em>Make it yours.</em></h1><p>Read what moves you. Write what only you can. Find your place among stories.</p><div class="gr-auth-aside-rule"></div><p class="gr-auth-aside-note">A home for web novels, fiction, fantasy, and the people who bring them to life.</p></section><section class="gr-auth-panel" aria-labelledby="authHeading"><div class="gr-auth-panel-head"><p class="gr-auth-eyebrow" id="authStepLabel">YOUR GIDIREADS ACCOUNT</p><h2 id="authHeading">Welcome back.</h2><p id="authSubheading">Pick up where your stories left off.</p></div><div id="authNotice" class="gr-auth-notice" role="status" aria-live="polite" hidden></div><form id="grAuthForm" novalidate><div id="loginFields"><label class="gr-field"><span>Email address</span><input id="loginEmail" type="email" autocomplete="email" placeholder="you@example.com" required></label><label class="gr-field"><span>Password</span><div class="gr-password-wrap"><input id="loginPassword" type="password" autocomplete="current-password" minlength="6" required><button type="button" class="gr-show-password" data-toggle-password="loginPassword" aria-label="Show password">Show</button></div></label><div class="gr-auth-row"><button type="button" class="gr-text-button" id="forgotPassword">Forgot password?</button></div><button type="submit" class="gr-auth-primary" id="loginSubmit">Log in <span aria-hidden="true">→</span></button></div>
<div id="signupFields" hidden><div class="gr-step-line"><span class="is-current" data-step-dot="1">1</span><i></i><span data-step-dot="2">2</span><i></i><span data-step-dot="3">3</span></div><section class="gr-signup-step" data-signup-step="1"><h3>First, the basics.</h3><p class="gr-step-desc">Set up the details for your GidiReads account.</p><label class="gr-field"><span>Username</span><input id="signupUsername" type="text" autocomplete="username" placeholder="e.g. amara_writes" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]+"></label><label class="gr-field"><span>Email address</span><input id="signupEmail" type="email" autocomplete="email" placeholder="you@example.com"></label><label class="gr-field"><span>Password</span><div class="gr-password-wrap"><input id="signupPassword" type="password" autocomplete="new-password" minlength="8"><button type="button" class="gr-show-password" data-toggle-password="signupPassword" aria-label="Show password">Show</button></div><small>Use at least 8 characters.</small></label><button type="button" class="gr-auth-primary" id="toRoleStep">Next <span aria-hidden="true">→</span></button></section>
<section class="gr-signup-step" data-signup-step="2" hidden><h3>What brings you here?</h3><p class="gr-step-desc">Choose the roles that fit you. You can do more than one.</p><div class="gr-role-options">
<label class="gr-role-option"><input type="radio" name="grRoleChoice" value="reader" checked><span class="gr-role-icon">⌕</span><span><strong>Reader</strong><small>Discover stories and build your library.</small></span><span class="gr-role-check"></span></label>
<label class="gr-role-option"><input type="radio" name="grRoleChoice" value="author"><span class="gr-role-icon">✎</span><span><strong>Author</strong><small>Write, publish, and manage your stories.</small></span><span class="gr-role-check"></span></label>
<label class="gr-role-option"><input type="radio" name="grRoleChoice" value="reader_author"><span class="gr-role-icon">✧</span><span><strong>Both — Reader and Author</strong><small>Read stories and publish your own.</small></span><span class="gr-role-check"></span></label>
<label class="gr-role-option is-unavailable"><input type="radio" name="grRoleChoice" value="creator" disabled><span class="gr-role-icon">◇</span><span><strong>Creator</strong><small>Adaptation tools are coming later.</small></span><span class="gr-role-check"></span></label>
<label class="gr-role-option is-unavailable"><input type="radio" name="grRoleChoice" value="reader_creator" disabled><span class="gr-role-icon">⌕</span><span><strong>Both — Reader and Creator</strong><small>Not available until Creator tools launch.</small></span><span class="gr-role-check"></span></label>
<label class="gr-role-option is-unavailable"><input type="radio" name="grRoleChoice" value="author_creator" disabled><span class="gr-role-icon">✎</span><span><strong>Both — Author and Creator</strong><small>Not available until Creator tools launch.</small></span><span class="gr-role-check"></span></label>
<label class="gr-role-option is-unavailable"><input type="radio" name="grRoleChoice" value="all" disabled><span class="gr-role-icon">✧</span><span><strong>All</strong><small>Not available until Creator tools launch.</small></span><span class="gr-role-check"></span></label>
</div><p class="gr-role-disabled">Creator choices are visible for clarity but disabled until those tools are available.</p><div class="gr-auth-actions"><button type="button" class="gr-auth-secondary" id="backToBasics">Back</button><button type="button" class="gr-auth-primary" id="toPhotoStep">Next <span aria-hidden="true">→</span></button></div></section>
<section class="gr-signup-step" data-signup-step="3" hidden><h3>Make it yours.</h3><p class="gr-step-desc">Add a profile picture now, or do it later in your account settings.</p><label class="gr-avatar-upload" for="signupAvatar"><span class="gr-avatar-preview" id="signupAvatarPreview">👤</span><span><strong>Choose profile picture</strong><small>JPG, PNG, or WebP · 5 MB max</small></span><input id="signupAvatar" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="gr-auth-small-note" id="avatarNote">Your picture will be saved after your account is created and signed in.</p><div class="gr-auth-actions"><button type="button" class="gr-auth-secondary" id="backToRole">Back</button><button type="submit" class="gr-auth-primary" id="signupSubmit">Create account <span aria-hidden="true">→</span></button></div></section></div><div id="verifyFields" hidden><label class="gr-field"><span>Verification code</span><input id="verifyCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit code"></label><p class="gr-auth-small-note" id="verifyHint">Enter the 6-digit code we emailed you.</p><div class="gr-auth-actions"><button type="button" class="gr-auth-secondary" id="resendCode">Resend code</button><button type="submit" class="gr-auth-primary" id="verifySubmit">Verify <span aria-hidden="true">→</span></button></div></div></form><div class="gr-auth-divider"><span>OR</span></div><p class="gr-auth-switch"><span id="authSwitchCopy">New to GidiReads?</span> <button type="button" id="switchAuth">Create an account</button></p><p class="gr-auth-legal">By continuing, you agree to use GidiReads respectfully and follow its platform rules.</p></section></div></main>




`;

export default function AuthPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "gr-auth-page";
    const _added = [];
    (async () => {
      try { await import("../../js/site-header.js"); } catch (e) { console.error('module load failed', "js/site-header.js", e); }
      try { await import("../../js/auth.js"); } catch (e) { console.error('module load failed', "js/auth.js", e); }
      try { await import("../../js/site-footer.js"); } catch (e) { console.error('module load failed', "js/site-footer.js", e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-auth');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-auth" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
