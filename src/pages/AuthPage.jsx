import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../js/supabaseClient.js';

export default function AuthPage() {
  const navigate = useNavigate();
  const params = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const [mode, setMode] = React.useState(params.get('mode') === 'signup' ? 'signup' : 'login');
  const [signupStep, setSignupStep] = React.useState(1);
  const [notice, setNoticeState] = React.useState({ msg: '', kind: 'info' });
  const [busy, setBusy] = React.useState(false);
  const [verifyEmail, setVerifyEmail] = React.useState(() => sessionStorage.getItem('gr-verifyEmail') || '');
  const [avatarDataUrl, setAvatarDataUrl] = React.useState('');
  const [avatarPreview, setAvatarPreview] = React.useState('');
  const [showLoginPw, setShowLoginPw] = React.useState(false);
  const [showSignupPw, setShowSignupPw] = React.useState(false);

  const loginEmail = React.useRef(null);
  const loginPassword = React.useRef(null);
  const signupUsername = React.useRef(null);
  const signupEmail = React.useRef(null);
  const signupPassword = React.useRef(null);
  const signupAvatar = React.useRef(null);
  const avatarFileRef = React.useRef(null);

  const setNotice = (msg, kind = 'info') => setNoticeState({ msg: msg || '', kind });
  const returnTo = (() => {
    const rt = params.get('returnTo');
    return rt && /^[\w.\-]+(\?[^#]*)?(#.*)?$/.test(rt) ? rt : '/';
  })();

  React.useEffect(() => {
    const prevClass = document.body.className;
    document.body.className = 'gr-auth-page';
    document.title = 'GidiReads — Sign in';
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const pending = localStorage.getItem('gr-onboarding-pending');
        if (pending || params.get('verified') === '1') {
          localStorage.removeItem('gr-onboarding-pending');
          sessionStorage.removeItem('gr-verifyEmail');
          navigate('/', { replace: true });
        }
      } else if (params.has('verified')) {
        setNotice('Email confirmed. Welcome back.', 'info');
      }
    })();
    return () => { document.body.className = prevClass; };
  }, [navigate, params]);

  React.useEffect(() => {
    if (params.get('intent') === 'author') {
      const el = document.querySelector('input[name="grRoleChoice"][value="author"]');
      if (el) el.checked = true;
    }
  }, [params, mode, signupStep]);

  function chosenRoles() {
    const choice = document.querySelector('input[name="grRoleChoice"]:checked')?.value || 'reader';
    return choice === 'reader_author' ? ['reader', 'author'] : [choice];
  }

  function normalizeEmail(email) {
    const at = email.lastIndexOf('@');
    if (at <= 0) return email;
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    return local.split('+')[0] + '@' + domain;
  }

  async function validateBasics() {
    const username = signupUsername.current.value.trim();
    const rawEmail = signupEmail.current.value.trim();
    const password = signupPassword.current.value;
    const usernameTaken = supabase.from('profiles').select('username').eq('username', username).maybeSingle();
    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) throw Error('Username must be 3–24 characters using letters, numbers, or underscores.');
    const email = normalizeEmail(rawEmail);
    if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email)) throw Error('Enter a valid email address.');
    if (password.length < 8) throw Error('Your password must be at least 8 characters.');
    const emailTaken = supabase.rpc('gidireads_email_exists', { p_email: email });
    const { data: existingUser } = await usernameTaken;
    if (existingUser) throw Error('That username is already taken.');
    const { data: emailExists } = await emailTaken;
    if (emailExists) throw Error('Already registered with email. Log in.');
    if (rawEmail !== email) signupEmail.current.value = email;
  }

  async function uploadAvatar(user) {
    const file = avatarFileRef.current;
    if (!file || !user) return false;
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    if (updateError) throw updateError;
    return true;
  }

  async function uploadPendingAvatar(user) {
    const saved = localStorage.getItem('gr-avatar-pending-data');
    if (!saved || !user) return;
    const res = await fetch(saved);
    const blob = await res.blob();
    const file = new File([blob], 'profile.webp', { type: blob.type || 'image/webp' });
    avatarFileRef.current = file;
    const ok = await uploadAvatar(user);
    if (ok) {
      localStorage.removeItem('gr-avatar-pending-data');
      localStorage.removeItem('gr-avatar-upload-reminder');
    } else {
      localStorage.setItem('gr-avatar-upload-reminder', '1');
    }
  }

  async function makeDefaultAvatar(username, user) {
    const initials = (username || 'U').slice(0, 2).toUpperCase();
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 400; const ctx = canvas.getContext('2d');
    const colors = ['#cda5f1', '#a77bd0', '#e8c16b', '#b79fd1', '#8e6fb0', '#5c3a5e'];
    ctx.fillStyle = colors[initials.charCodeAt(0) % colors.length]; ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 150px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(initials, 200, 210);
    const dataUrl = canvas.toDataURL('image/webp', 0.85);
    const blob = await fetch(dataUrl).then(r => r.blob());
    avatarFileRef.current = new File([blob], 'default-profile.webp', { type: 'image/webp' });
    return uploadAvatar(user);
  }

  function showVerifyScreen(email) {
    setVerifyEmail(email);
    setMode('verify');
    setNotice('Your account is created. Confirm your email to step inside.', 'info');
    sessionStorage.setItem('gr-verifyEmail', email);
  }

  function onAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) { avatarFileRef.current = null; setAvatarDataUrl(''); setAvatarPreview(''); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      e.target.value = '';
      setNotice('Choose a JPG, PNG, or WebP image under 5 MB.', 'error');
      return;
    }
    avatarFileRef.current = file;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 400 / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/webp', 0.78);
        setAvatarDataUrl(dataUrl);
        setAvatarPreview(dataUrl);
      };
      img.onerror = () => setNotice('We could not preview that image. Please choose another.', 'error');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'verify') {
        localStorage.removeItem('gr-onboarding-pending');
        sessionStorage.removeItem('gr-verifyEmail');
        window.location.href = returnTo;
        return;
      }
      if (mode === 'login') {
        const email = loginEmail.current.value.trim();
        const password = loginPassword.current.value;
        if (!email || !password) throw Error('Enter your email and password.');
        const { data: loginData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!loginData.user?.email_confirmed_at) {
          setNotice('Confirm your email first. Check your inbox for the link — then log in.', 'error');
          return;
        }
        if (loginData.user && localStorage.getItem('gr-avatar-pending-data')) {
          try { await uploadPendingAvatar(loginData.user); } catch (_) { localStorage.setItem('gr-avatar-upload-reminder', '1'); }
        }
        window.location.href = returnTo;
        return;
      }
      await validateBasics();
      const roles = chosenRoles();
      if (!roles.length) throw Error('Choose Reader, Author, or both to continue.');
      const username = signupUsername.current.value.trim();
      const email = normalizeEmail(signupEmail.current.value.trim());
      const password = signupPassword.current.value;
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}${window.location.pathname.replace(/auth\.html$/, '')}auth.html?verified=1`,
          data: { username, gidireads_roles: roles, preferred_role: roles.length > 1 ? 'reader_author' : roles[0] }
        }
      });
      if (error) throw error;
      if (!data.session && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setSignupStep(1);
        setNotice('Already registered with email. Log in.', 'error');
        return;
      }
      if (data.session && data.user) {
        if (avatarFileRef.current) {
          try { await uploadAvatar(data.user); } catch (_) { localStorage.setItem('gr-avatar-upload-reminder', '1'); }
        } else {
          try { await makeDefaultAvatar(username, data.user); } catch (_) { localStorage.setItem('gr-avatar-upload-reminder', '1'); }
        }
        localStorage.setItem('gr-onboarding-pending', JSON.stringify({ roles, version: 1 }));
        navigate('/', { replace: true });
        return;
      }
      localStorage.setItem('gr-onboarding-pending', JSON.stringify({ roles, version: 1 }));
      if (avatarDataUrl) {
        try { localStorage.setItem('gr-avatar-pending-data', avatarDataUrl); } catch (_) {}
      } else {
        try {
          const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 400; const ctx = canvas.getContext('2d');
          const initials = username.slice(0, 2).toUpperCase();
          const colors = ['#cda5f1', '#a77bd0', '#e8c16b', '#b79fd1', '#8e6fb0', '#5c3a5e'];
          ctx.fillStyle = colors[initials.charCodeAt(0) % colors.length]; ctx.fillRect(0, 0, 400, 400);
          ctx.fillStyle = '#ffffff'; ctx.font = 'bold 150px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(initials, 200, 210);
          localStorage.setItem('gr-avatar-pending-data', canvas.toDataURL('image/webp', 0.85));
        } catch (_) {}
      }
      showVerifyScreen(email);
    } catch (err) {
      const m = String(err.message || '');
      if (mode === 'signup') {
        setSignupStep(1);
        setNotice(/already registered|already exists/i.test(m) ? 'Already registered with email. Log in.' : (m || 'Account creation failed. Please try again.'), 'error');
      } else if (mode === 'login' && /invalid login credentials/i.test(m)) {
        setNotice('Email or password is incorrect. If you signed up before, choose Forgot password to reset it.', 'error');
      } else {
        setNotice(m || 'Something went wrong. Please try again.', 'error');
      }
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    const email = loginEmail.current?.value.trim();
    if (!email) { setNotice('Enter your email address first, then choose Forgot password again.', 'error'); loginEmail.current?.focus(); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password.html' });
      if (error) throw error;
      setNotice('If an account uses that email, a password reset link is on its way.');
    } catch (e) { setNotice(e.message || 'Could not send the reset email.', 'error'); }
    finally { setBusy(false); }
  }

  async function resendCode() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: verifyEmail });
      if (error) throw error;
      setNotice('A new confirmation link is on its way. It may take a minute.', 'info');
    } catch (e) { setNotice(e.message || 'We could not resend. Try again shortly.', 'error'); }
    finally { setBusy(false); }
  }

  const isLogin = mode === 'login';
  const isSignup = mode === 'signup';
  const isVerify = mode === 'verify';
  const stepTitle = ['', 'The basics.', 'Your place in GidiReads.', 'Make it yours.'][signupStep];
  const stepSub = ['', 'Start with your account details.', 'Choose the role or roles that fit you.', 'A profile picture helps people recognise you.'][signupStep];

  return (
    <main role="main" className="gr-auth-shell" id="main-content">
      <a className="gr-auth-brand" href="/"><img src="assets/gidireads-logo.png" alt="" /><span>GidiReads</span></a>
      <div className="gr-auth-layout">
        <section className="gr-auth-aside">
          <p className="gr-auth-eyebrow">STORIES BEGIN HERE</p>
          <h1>Find your world.<br /><em>Make it yours.</em></h1>
          <p>Read what moves you. Write what only you can. Find your place among stories.</p>
          <div className="gr-auth-aside-rule"></div>
          <p className="gr-auth-aside-note">A home for web novels, fiction, fantasy, and the people who bring them to life.</p>
        </section>

        <section className="gr-auth-panel" aria-labelledby="authHeading">
          <div className="gr-auth-panel-head">
            <p className="gr-auth-eyebrow">{isLogin ? 'YOUR GIDIREADS ACCOUNT' : isVerify ? 'VERIFY YOUR EMAIL' : 'CREATE YOUR GIDIREADS ACCOUNT'}</p>
            <h2 id="authHeading">{isLogin ? 'Welcome back.' : isVerify ? 'Check your inbox.' : stepTitle}</h2>
            <p id="authSubheading">{isLogin ? 'Pick up where your stories left off.' : isVerify ? `We emailed a confirmation link to ${verifyEmail}. Click the link in the email to finish.` : stepSub}</p>
          </div>

          <div className="gr-auth-notice" role="status" aria-live="polite" data-kind={notice.kind} hidden={!notice.msg}>{notice.msg}</div>

          <form id="grAuthForm" noValidate onSubmit={onSubmit}>
            {isLogin && (
              <div id="loginFields">
                <label className="gr-field"><span>Email address</span><input ref={loginEmail} type="email" autoComplete="email" placeholder="you@example.com" required /></label>
                <label className="gr-field"><span>Password</span>
                  <div className="gr-password-wrap">
                    <input ref={loginPassword} type={showLoginPw ? 'text' : 'password'} autoComplete="current-password" minLength={6} required />
                    <button type="button" className="gr-show-password" onClick={() => setShowLoginPw(v => !v)}>{showLoginPw ? 'Hide' : 'Show'}</button>
                  </div>
                </label>
                <div className="gr-auth-row"><button type="button" className="gr-text-button" onClick={forgotPassword} disabled={busy}>Forgot password?</button></div>
                <button type="submit" className="gr-auth-primary" disabled={busy}>Log in <span aria-hidden="true">→</span></button>
              </div>
            )}

            {isSignup && (
              <div id="signupFields">
                <div className="gr-step-line">
                  <span className={signupStep === 1 ? 'is-current' : signupStep > 1 ? 'is-done' : ''}>1</span><i></i>
                  <span className={signupStep === 2 ? 'is-current' : signupStep > 2 ? 'is-done' : ''}>2</span><i></i>
                  <span className={signupStep === 3 ? 'is-current' : ''}>3</span>
                </div>

                <section className="gr-signup-step" hidden={signupStep !== 1}>
                  <h3>First, the basics.</h3>
                  <p className="gr-step-desc">Set up the details for your GidiReads account.</p>
                  <label className="gr-field"><span>Username</span><input ref={signupUsername} type="text" autoComplete="username" placeholder="e.g. amara_writes" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" /></label>
                  <label className="gr-field"><span>Email address</span><input ref={signupEmail} type="email" autoComplete="email" placeholder="you@example.com" /></label>
                  <label className="gr-field"><span>Password</span>
                    <div className="gr-password-wrap">
                      <input ref={signupPassword} type={showSignupPw ? 'text' : 'password'} autoComplete="new-password" minLength={8} />
                      <button type="button" className="gr-show-password" onClick={() => setShowSignupPw(v => !v)}>{showSignupPw ? 'Hide' : 'Show'}</button>
                    </div>
                    <small>Use at least 8 characters.</small>
                  </label>
                  <button type="button" className="gr-auth-primary" disabled={busy} onClick={async () => { setBusy(true); try { await validateBasics(); setSignupStep(2); setNotice(''); } catch (e) { setNotice(e.message, 'error'); } finally { setBusy(false); } }}>Next <span aria-hidden="true">→</span></button>
                </section>

                <section className="gr-signup-step" hidden={signupStep !== 2}>
                  <h3>What brings you here?</h3>
                  <p className="gr-step-desc">Choose the roles that fit you. You can do more than one.</p>
                  <div className="gr-role-options">
                    <label className="gr-role-option"><input type="radio" name="grRoleChoice" value="reader" defaultChecked /><span className="gr-role-icon">⌕</span><span><strong>Reader</strong><small>Discover stories and build your library.</small></span><span className="gr-role-check"></span></label>
                    <label className="gr-role-option"><input type="radio" name="grRoleChoice" value="author" /><span className="gr-role-icon">✎</span><span><strong>Author</strong><small>Write, publish, and manage your stories.</small></span><span className="gr-role-check"></span></label>
                    <label className="gr-role-option"><input type="radio" name="grRoleChoice" value="reader_author" /><span className="gr-role-icon">✧</span><span><strong>Both — Reader and Author</strong><small>Read stories and publish your own.</small></span><span className="gr-role-check"></span></label>
                    <label className="gr-role-option is-unavailable"><input type="radio" name="grRoleChoice" value="creator" disabled /><span className="gr-role-icon">◇</span><span><strong>Creator</strong><small>Adaptation tools are coming later.</small></span><span className="gr-role-check"></span></label>
                    <label className="gr-role-option is-unavailable"><input type="radio" name="grRoleChoice" value="reader_creator" disabled /><span className="gr-role-icon">⌕</span><span><strong>Both — Reader and Creator</strong><small>Not available until Creator tools launch.</small></span><span className="gr-role-check"></span></label>
                    <label className="gr-role-option is-unavailable"><input type="radio" name="grRoleChoice" value="author_creator" disabled /><span className="gr-role-icon">✎</span><span><strong>Both — Author and Creator</strong><small>Not available until Creator tools launch.</small></span><span className="gr-role-check"></span></label>
                    <label className="gr-role-option is-unavailable"><input type="radio" name="grRoleChoice" value="all" disabled /><span className="gr-role-icon">✧</span><span><strong>All</strong><small>Not available until Creator tools launch.</small></span><span className="gr-role-check"></span></label>
                  </div>
                  <p className="gr-role-disabled">Creator choices are visible for clarity but disabled until those tools are available.</p>
                  <div className="gr-auth-actions">
                    <button type="button" className="gr-auth-secondary" onClick={() => { setSignupStep(1); setNotice(''); }}>Back</button>
                    <button type="button" className="gr-auth-primary" onClick={() => { if (!chosenRoles().length) { setNotice('Choose Reader, Author, or both to continue.', 'error'); return; } setSignupStep(3); setNotice(''); }}>Next <span aria-hidden="true">→</span></button>
                  </div>
                </section>

                <section className="gr-signup-step" hidden={signupStep !== 3}>
                  <h3>Make it yours.</h3>
                  <p className="gr-step-desc">Add a profile picture now, or do it later in your account settings.</p>
                  <label className="gr-avatar-upload" htmlFor="signupAvatar">
                    <span className="gr-avatar-preview">{avatarPreview ? <img alt="Profile picture preview" src={avatarPreview} /> : '👤'}</span>
                    <span><strong>Choose profile picture</strong><small>JPG, PNG, or WebP · 5 MB max</small></span>
                    <input id="signupAvatar" ref={signupAvatar} type="file" accept="image/png,image/jpeg,image/webp" onChange={onAvatarChange} />
                  </label>
                  <p className="gr-auth-small-note">Your picture will be saved after your account is created and signed in.</p>
                  <div className="gr-auth-actions">
                    <button type="button" className="gr-auth-secondary" onClick={() => { setSignupStep(2); setNotice(''); }}>Back</button>
                    <button type="submit" className="gr-auth-primary" disabled={busy}>Create account <span aria-hidden="true">→</span></button>
                  </div>
                </section>
              </div>
            )}

            {isVerify && (
              <div id="verifyFields">
                <label className="gr-field"><span>Verification code</span><input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); }} /></label>
                <p className="gr-auth-small-note">Check your inbox. Click the confirmation link we sent you. It may take a minute to arrive.</p>
                <div className="gr-auth-actions">
                  <button type="button" className="gr-auth-secondary" onClick={resendCode} disabled={busy}>Resend code</button>
                  <button type="submit" className="gr-auth-primary" disabled={busy}>Verify <span aria-hidden="true">→</span></button>
                </div>
              </div>
            )}
          </form>

          {!isVerify && <div className="gr-auth-divider"><span>OR</span></div>}
          <p className="gr-auth-switch">
            <span>{isLogin ? 'New to GidiReads?' : isVerify ? 'Entered the wrong address?' : 'Already have an account?'}</span>{' '}
            <button type="button" onClick={() => {
              if (mode === 'verify') { sessionStorage.removeItem('gr-verifyEmail'); setMode('signup'); setSignupStep(1); setNotice(''); return; }
              setMode(isLogin ? 'signup' : 'login'); setSignupStep(1); setNotice('');
            }}>{isLogin ? 'Create an account' : isVerify ? 'Start over' : 'Log in'}</button>
          </p>
          <p className="gr-auth-legal">By continuing, you agree to use GidiReads respectfully and follow its platform rules.</p>
        </section>
      </div>
    </main>
  );
}
