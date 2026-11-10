import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../js/supabaseClient.js';

export default function RequireAuth({ children }) {
  const location = useLocation();
  const [state, setState] = React.useState({ loading: true, authed: false });

  React.useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setState({ loading: false, authed: !!data?.session?.user });
      } catch {
        if (mounted) setState({ loading: false, authed: false });
      }
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setState({ loading: false, authed: !!session?.user });
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  if (state.loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!state.authed) {
    const returnTo = location.pathname + location.search + location.hash;
    return <Navigate to={`/auth?mode=login&returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  return children;
}
