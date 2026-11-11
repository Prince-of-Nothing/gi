import React from 'react';
import { supabase } from '../js/supabaseClient.js';
import { showToast, refreshUnreadBadge } from '../js/ui.js';

const HEADERS = [
  { key: 'shadow-prince', label: 'Kael — The Shadow Prince', src: 'assets/profile-headers/shadow-prince.webp' },
  { key: 'starweaver', label: 'Elara — The Starweaver', src: 'assets/profile-headers/starweaver.webp' },
  { key: 'nightguard', label: 'Zayden — The Nightguard', src: 'assets/profile-headers/nightguard.webp' },
  { key: 'enchanted-forest', label: 'Enchanted Forest', src: 'assets/profile-headers/enchanted-forest.webp' },
  { key: 'royal-library', label: 'Royal Library', src: 'assets/profile-headers/royal-library.webp' },
  { key: 'ice-profile-companion', label: 'Vesper — The Frostkeeper', src: 'assets/profile-headers/ice-profile-companion.jpg' },
  { key: 'cat-profile-companion', label: 'Nyx — The Night Familiar', src: 'assets/profile-headers/cat-profile-companion.jpg' },
];
const DEFAULT_AVATAR_URL = 'assets/gidireads-logo.png';
function headerUrl(key) {
  const jpg = { 'ice-profile-companion': 'ice-profile-companion', 'cat-profile-companion': 'cat-profile-companion' };
  if (jpg[key]) return `assets/profile-headers/${jpg[key]}.jpg`;
  return `assets/profile-headers/${['moonveil', 'shadow-prince', 'starweaver', 'nightguard', 'enchanted-forest', 'royal-library'].includes(key) ? key : 'shadow-prince'}.webp`;
}

export default function AccountPage() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [username, setUsername] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [header, setHeader] = React.useState('shadow-prince');
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [role, setRole] = React.useState(null);
  const [status, setStatus] = React.useState({ msg: '', type: '' });
  const [saving, setSaving] = React.useState(false);
  const avatarFileRef = React.useRef(null);
  const removeAvatarRef = React.useRef(false);
  const previewName = displayName.trim() || username.trim() || 'Your display name';
  const previewHandle = '@' + (username.trim() || 'username');
  const previewBio = bio.trim() || 'Your bio will appear here.';

  React.useEffect(() => {
    document.title = 'Edit your profile — GidiReads';
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user || null;
      if (!mounted) return;
      setUser(u);
      if (u) await loadProfile(u);
      else setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) loadProfile(u);
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  async function loadProfile(u) {
    try {
      const { data: p, error } = await supabase.from('profiles').select('id,username,display_name,bio,avatar_url,role,profile_header').eq('id', u.id).maybeSingle();
      if (error || !p) { setStatus({ msg: 'Could not load your profile. Please refresh.', type: 'error' }); setLoading(false); return; }
      setUsername(p.username || '');
      setDisplayName(p.display_name || '');
      setBio(p.bio || '');
      setHeader(p.profile_header === 'moonveil' || !p.profile_header ? 'shadow-prince' : p.profile_header);
      setAvatarUrl(p.avatar_url || DEFAULT_AVATAR_URL);
      setRole(p.role || null);
    } catch { setStatus({ msg: 'Could not load your profile. Please refresh.', type: 'error' }); }
    setLoading(false);
  }

  function onAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setStatus({ msg: 'Choose an image file.', type: 'error' }); return; }
    if (file.size > 6 * 1024 * 1024) { setStatus({ msg: 'Please choose an image under 6 MB.', type: 'error' }); return; }
    avatarFileRef.current = file;
    removeAvatarRef.current = false;
    setAvatarUrl(URL.createObjectURL(file));
    setStatus({ msg: 'Picture selected. Save changes to publish it.', type: '' });
  }
  function onRemoveAvatar() {
    avatarFileRef.current = null;
    removeAvatarRef.current = true;
    setAvatarUrl(DEFAULT_AVATAR_URL);
    setStatus({ msg: 'Picture will be removed when you save.', type: '' });
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (saving || !user) return;
    setSaving(true);
    setStatus({ msg: 'Saving your profile…', type: '' });
    try {
      const cleanUsername = username.trim();
      if (!/^[A-Za-z0-9_]{3,24}$/.test(cleanUsername)) throw Error('Username must be 3–24 characters using letters, numbers or underscores.');
      const updates = { username: cleanUsername, display_name: displayName.trim() || null, bio: bio.trim() || null, profile_header: header };
      if (avatarFileRef.current) {
        const ext = (avatarFileRef.current.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFileRef.current, { upsert: false, contentType: avatarFileRef.current.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
        updates.avatar_url = pub.publicUrl;
      } else if (removeAvatarRef.current) {
        updates.avatar_url = null;
      }
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      avatarFileRef.current = null;
      removeAvatarRef.current = false;
      setStatus({ msg: 'Profile saved successfully.', type: 'success' });
      showToast('Profile saved');
      try { await refreshUnreadBadge(supabase, user.id); } catch {}
      setTimeout(() => { window.location.href = `author.html?id=${encodeURIComponent(user.id)}`; }, 650);
    } catch (err) {
      const message = String(err.message || '');
      setStatus({ msg: /profiles_username_(lower_)?key|duplicate key.*username|username.*already exists/i.test(message) ? 'That username is already in use. Please choose another.' : (message || 'Could not save your profile. Please try again.'), type: 'error' });
    } finally { setSaving(false); }
  }

  return (
    <main className="gr-edit-page">
      <div className="gr-profile-wrap">
        <header className="gr-editor-head">
          <p className="gr-section-kicker">Your corner of GidiReads</p>
          <h1>Edit your profile</h1>
          <p>Make your profile feel like yours. Your picture and your header artwork are separate, and changes appear in the preview before you save.</p>
        </header>

        {!user && !loading && <div className="gr-empty">Log in to edit your profile.</div>}

        {user && (
          <div className="gr-editor-layout">
            <section className="gr-panel">
              <h2>Profile details</h2>
              <div className="gr-upload-row">
                <img className="gr-upload-pfp" src={avatarUrl} alt="Your profile picture preview" />
                <div>
                  <div className="gr-upload-actions">
                    <label className="gr-btn gr-btn-primary" htmlFor="avatarInput">Choose picture</label>
                    <input id="avatarInput" type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden onChange={onAvatarChange} />
                    <button className="gr-btn gr-btn-danger" type="button" onClick={onRemoveAvatar}>Remove picture</button>
                  </div>
                  <p className="gr-status">Use a clear square image. Your header selection will not change your picture.</p>
                </div>
              </div>

              <form onSubmit={onSubmit}>
                <label className="gr-field"><span>Username</span><input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" autoComplete="username" /><small className="gr-status">Use 3–24 letters, numbers or underscores.</small></label>
                <label className="gr-field"><span>Display name</span><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} placeholder="How readers see your name" /></label>
                <label className="gr-field"><span>Bio</span><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={280} placeholder="Tell readers a little about yourself" /></label>

                <section className="gr-country-settings" aria-labelledby="countrySettingsTitle">
                  <h3 id="countrySettingsTitle">Reader location statistics</h3>
                  <p className="gr-status">When you read while signed in, our hosting platform determines your country from your connection IP address so GidiReads can prepare anonymous readership statistics. GidiReads stores only the country code for this feature, not your IP address. Authors only see grouped country totals for their own stories, and groups with fewer than five readers are hidden.</p>
                </section>

                <div className="gr-editor-footer">
                  <p className={`gr-status${status.type ? ' ' + status.type : ''}`} role="status" aria-live="polite">{status.msg}</p>
                  <button type="submit" className="gr-btn gr-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                </div>
              </form>
            </section>

            <div className="gr-editor-side">
              <section className="gr-panel">
                <h2>Choose your profile header</h2>
                <p className="gr-status" style={{ margin: '-8px 0 16px' }}>Select an illustration. The preview uses the same full-quality image.</p>
                <div className="gr-headers">
                  {HEADERS.map((h) => (
                    <button key={h.key} type="button" className="gr-header-option" aria-pressed={header === h.key} onClick={() => { setHeader(h.key); setStatus({ msg: 'Header selected. Save changes to apply it.', type: '' }); }}>
                      <img src={h.src} alt={h.label} /><span>{h.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="gr-panel" style={{ marginTop: 18 }}>
                <h2>Live preview</h2>
                <div className="gr-preview-cover" style={{ backgroundImage: `url("${headerUrl(header)}")` }}></div>
                <div className="gr-preview-body">
                  <div className="gr-preview-user">
                    <img src={avatarUrl} alt="Preview profile picture" />
                    <div><strong>{previewName}</strong><small>{previewHandle}</small></div>
                  </div>
                  <p className="gr-preview-bio">{previewBio}</p>
                </div>
              </section>
            </div>
          </div>
        )}

        <div className="gr-actions" style={{ marginTop: 20 }}>
          {role === 'admin' ? <a href="admin.html" className="gr-btn gr-btn-primary">Admin Dashboard</a> : null}
          <a href="my-gidireads.html" className="gr-btn gr-btn-primary">My GidiReads</a>
          {user ? <a href={`author.html?id=${encodeURIComponent(user.id)}`} className="gr-btn">View public profile</a> : null}
          <a href="library.html" className="gr-btn">My library</a>
          <a href="my-stories.html" className="gr-btn">My stories</a>
          <a href="index.html" className="gr-btn">Back to GidiReads</a>
        </div>
      </div>
    </main>
  );
}
