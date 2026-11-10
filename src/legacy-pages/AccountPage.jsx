import React from 'react';

const HTML = `


<main class="gr-edit-page">
 <div class="gr-profile-wrap">
  <header class="gr-editor-head"><p class="gr-section-kicker">Your corner of GidiReads</p><h1>Edit your profile</h1><p>Make your profile feel like yours. Your picture and your header artwork are separate, and changes appear in the preview before you save.</p></header>
  <div id="loggedOutState" class="gr-empty" hidden>Log in to edit your profile.</div>
  <div class="gr-editor-layout" id="editorLayout" hidden>
   <section class="gr-panel"><h2>Profile details</h2>
    <div class="gr-upload-row"><img id="avatarPreview" class="gr-upload-pfp" alt="Your profile picture preview"><div><div class="gr-upload-actions"><label class="gr-btn gr-btn-primary" for="avatarInput">Choose picture</label><input id="avatarInput" type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden><button class="gr-btn gr-btn-danger" type="button" id="removeAvatarBtn">Remove picture</button></div><p class="gr-status">Use a clear square image. Your header selection will not change your picture.</p></div></div>
    <form id="accountForm">
     <label class="gr-field"><span>Username</span><input id="accountUsername" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_]+" autocomplete="username"><small class="gr-status">Use 3–24 letters, numbers or underscores.</small></label>
     <label class="gr-field"><span>Display name</span><input id="accountDisplayName" maxlength="60" placeholder="How readers see your name"></label>
     <label class="gr-field"><span>Bio</span><textarea id="accountBio" rows="4" maxlength="280" placeholder="Tell readers a little about yourself"></textarea></label>
     <section class="gr-country-settings" aria-labelledby="countrySettingsTitle">
      <h3 id="countrySettingsTitle">Reader location statistics</h3>
      <p class="gr-status">When you read while signed in, our hosting platform determines your country from your connection IP address so GidiReads can prepare anonymous readership statistics. GidiReads stores only the country code for this feature, not your IP address. Authors only see grouped country totals for their own stories, and groups with fewer than five readers are hidden.</p>
     </section>
     <div class="gr-editor-footer"><p class="gr-status" id="accountStatus" role="status" aria-live="polite"></p><button type="submit" class="gr-btn gr-btn-primary" id="accountSaveBtn">Save changes</button></div>
    </form>
   </section>
   <div class="gr-editor-side">
    <section class="gr-panel"><h2>Choose your profile header</h2><p class="gr-status" style="margin:-8px 0 16px">Select an illustration. The preview uses the same full-quality image.</p><div class="gr-headers" id="headerChoices">
     <button type="button" class="gr-header-option" data-header="shadow-prince" aria-pressed="false"><img src="assets/profile-headers/shadow-prince.webp" alt="Kael, The Shadow Prince"><span>Kael — The Shadow Prince</span></button>
     <button type="button" class="gr-header-option" data-header="starweaver" aria-pressed="false"><img src="assets/profile-headers/starweaver.webp" alt="Elara, The Starweaver"><span>Elara — The Starweaver</span></button>
     <button type="button" class="gr-header-option" data-header="nightguard" aria-pressed="false"><img src="assets/profile-headers/nightguard.webp" alt="Zayden, The Nightguard"><span>Zayden — The Nightguard</span></button>
     <button type="button" class="gr-header-option" data-header="enchanted-forest" aria-pressed="false"><img src="assets/profile-headers/enchanted-forest.webp" alt="Enchanted Forest"><span>Enchanted Forest</span></button>
     <button type="button" class="gr-header-option" data-header="royal-library" aria-pressed="false"><img src="assets/profile-headers/royal-library.webp" alt="Royal Library"><span>Royal Library</span></button>
     <button type="button" class="gr-header-option" data-header="ice-profile-companion" aria-pressed="false"><img src="assets/profile-headers/ice-profile-companion.jpg" alt="Vesper, the Frostkeeper"><span>Vesper — The Frostkeeper</span></button>
     <button type="button" class="gr-header-option" data-header="cat-profile-companion" aria-pressed="false"><img src="assets/profile-headers/cat-profile-companion.jpg" alt="Nyx, the Night Familiar"><span>Nyx — The Night Familiar</span></button>
    </div></section>
    <section class="gr-panel" style="margin-top:18px"><h2>Live preview</h2><div class="gr-preview-cover" id="previewCover"></div><div class="gr-preview-body"><div class="gr-preview-user"><img id="previewPfp" alt="Preview profile picture"><div><strong id="previewName">Your display name</strong><small id="previewHandle">@username</small></div></div><p class="gr-preview-bio" id="previewBio">Your bio will appear here.</p></div></section>
   </div>
  </div>
  <div class="gr-actions" style="margin-top:20px"><a href="admin.html" id="adminLinkRow" class="gr-btn gr-btn-primary" hidden>Admin Dashboard</a><a href="my-gidireads.html" class="gr-btn gr-btn-primary">My GidiReads</a><a href="author.html" id="viewPublicProfile" class="gr-btn" hidden>View public profile</a><a href="library.html" class="gr-btn">My library</a><a href="my-stories.html" class="gr-btn">My stories</a><a href="index.html" class="gr-btn">Back to GidiReads</a></div>
 </div>
</main>



<div class="modal-overlay" id="authModal" hidden>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
    <div class="modal-header">
      <button class="modal-close" data-close="auth" aria-label="Close">&times;</button>
      <h2 id="authModalTitle" class="modal-title">Welcome to GidiReads</h2>
      <p class="modal-sub" id="authModalSub">Log in to publish and follow stories.</p>
    </div>
    <div class="modal-body">
      <form id="authForm" class="modal-form">
        <label class="field">
          <span>Username</span>
          <input type="text" id="authUsername" autocomplete="username" placeholder="e.g. amara_writes" required />
        </label>
        <label class="field">
          <span>Email</span>
          <input type="email" id="authEmail" autocomplete="email" required />
        </label>
        <label class="field">
          <span>Password</span>
          <input type="password" id="authPassword" autocomplete="current-password" minlength="6" required />
        </label>
        <button type="button" id="forgotPasswordBtn" class="forgot-password-link">Forgot password?</button>
        <p class="form-error" id="authError" hidden></p>
        <button type="submit" class="btn btn-primary btn-block" id="authSubmitBtn">Log in</button>
      </form>
      <p class="modal-switch">
        <span id="authSwitchPrompt">New to GidiReads?</span>
        <button type="button" id="authSwitchBtn">Create an account</button>
      </p>
    </div>
  </div>
</div>

<nav class="bottom-nav" aria-label="Primary mobile navigation">
  <a href="index.html" class="bottom-nav-item ">
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
    <span>Home</span>
  </a>
  <a href="explore.html" class="bottom-nav-item ">
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <span>Explore</span>
  </a>
  <a href="library.html" class="bottom-nav-item ">
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    <span>Library</span>
  </a>
  <button type="button" class="bottom-nav-item bottom-nav-write" id="writeNavBtn">
    <span class="write-fab"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span>
    <span>Write</span>
  </button>
  <a href="notifications.html" class="bottom-nav-item ">
    <span class="nav-icon-wrap">
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <span class="nav-badge" id="navUnreadBadge" hidden></span>
    </span>
    <span>Alerts</span>
  </a>
</nav>

<div class="write-sheet-overlay" id="writeSheetOverlay" hidden>
  <div class="write-sheet">
    <button class="write-sheet-close" id="writeSheetClose" aria-label="Close">&times;</button>
    <h3 class="write-sheet-title">What would you like to do?</h3>
    <button class="write-sheet-option" id="writeNewStory">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>
      Publish a new story
    </button>
    <button class="write-sheet-option" id="writeManageStories">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      Manage my stories
    </button>
  </div>
</div>






`;

export default function AccountPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/account.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/account.js"); } catch (e) { console.error('script load failed', "js/account.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/profile-nav.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/profile-nav.js"); } catch (e) { console.error('script load failed', "js/profile-nav.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-account');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-account" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
