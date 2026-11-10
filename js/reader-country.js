const SUPABASE_URL = 'https://mbikuyuhcttkcqpgiihr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0Z2sgGgw8f9RqCwxxJNCbw_mUrMQXfE';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Authorization');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const authorization = req.headers.authorization || '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return res.status(401).json({ ok: false, error: 'Sign-in required.' });
  }

  // Vercel supplies this country-level header at the edge. Never read, store,
  // or forward the visitor's IP address in this endpoint.
  const countryCode = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode) || ['XX', 'T1'].includes(countryCode)) {
    return res.status(200).json({ ok: false, reason: 'Country information is unavailable.' });
  }

  try {
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: authorization }
    });
    if (!userResponse.ok) return res.status(401).json({ ok: false, error: 'Session could not be verified.' });
    const user = await userResponse.json();
    if (!user?.id) return res.status(401).json({ ok: false, error: 'Session could not be verified.' });

    const saveResponse = await fetch(`${SUPABASE_URL}/rest/v1/reader_country_preferences?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: authorization,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        user_id: user.id,
        country_code: countryCode,
        analytics_opt_in: true,
        updated_at: new Date().toISOString()
      })
    });
    if (!saveResponse.ok) {
      const detail = await saveResponse.text();
      console.error('[reader-country] Country aggregate update failed:', saveResponse.status, detail.slice(0, 300));
      return res.status(503).json({ ok: false, error: 'Country statistics could not be updated.' });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[reader-country] Request failed:', error?.message || 'Unknown error');
    return res.status(503).json({ ok: false, error: 'Country statistics are temporarily unavailable.' });
  }
}
