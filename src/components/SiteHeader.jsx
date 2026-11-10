import React from 'react';
import { supabase } from '../../js/supabaseClient.js';

export default function SiteHeader() {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [authed, setAuthed] = React.useState(false);
  const path = typeof window !== 'undefined' ? (window.location.pathname.split('/').pop() || 'index.html').toLowerCase() : 'index.html';
  const active = (p) => (path === p ? 'active' : undefined);

  React.useEffect(() => {
    let mounted = true;
    async function sync() {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user || null;
        if (!mounted) return;
        setAuthed(!!user);
        if (!user) { setIsAdmin(false); return; }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (mounted) setIsAdmin(!!(profile && profile.role === 'admin'));
      } catch (_) {}
    }
    sync();
    const { data: sub } = supabase.auth.onAuthStateChange(() => sync());
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  return (
    <header className="site-nav home-nav">
      <div className="nav-inner">
        <a className="brand" href="/" aria-label="GidiReads home">
          <img className="brand-mark" src="assets/gidireads-logo.png" alt="GidiReads" />
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a className={active('community.html')} href="community.html">The Gathering</a>
        </nav>
        <div className="nav-actions">
          <a href="rankings.html" className={`rankings-nav-link ${path === 'rankings.html' ? 'active' : ''}`} aria-label="Check rankings">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8l-1 6-3 3-3-3-1-6Z"></path><path d="M8 6H4l1 5 4 2M16 6h4l-1 5-4 2M12 13v5M8 21h8M9 18h6"></path></svg>
            <span>Rankings</span>
          </a>
          <a href="explore.html" className="home-nav-search" aria-label="Search stories">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span>Search</span>
          </a>
          <a href="account.html" className="top-profile-btn home-profile-avatar" id="homeProfileAvatar" aria-label="Profile"><span className="home-profile-fallback" aria-hidden="true">G</span></a>
          {isAdmin ? <a className="btn btn-ghost" id="navAdminLink" href="admin.html">Admin Dashboard</a> : null}
          <button className="btn btn-ghost" id="loginBtn">{authed ? 'Log out' : 'Log in'}</button>
        </div>
      </div>
    </header>
  );
}
