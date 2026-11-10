// Published announcements linked to an opportunity ("Latest updates").
const esc = (v) => { const e = document.createElement('span'); e.textContent = v ?? ''; return e.innerHTML; };
export async function relatedUpdatesMarkup(supabase, opportunityId) {
  try {
    const now = new Date().toISOString();
    const { data } = await supabase.from('platform_announcements').select('id,title,message,priority,publish_at,link_url')
      .eq('opportunity_id', opportunityId).eq('status', 'published').lte('publish_at', now).or(`expires_at.is.null,expires_at.gt.${now}`).order('publish_at', { ascending: false }).limit(5);
    if (!data?.length) return '';
    const when = (d) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' });
    const ok = (u) => /^(https:\/\/|[a-z0-9][a-z0-9._\/?=&#%-]*$)/i.test(String(u || ''));
    return `<section class="od-section" id="updates"><h2>Latest updates</h2><div class="od-prizes">${data.map((a) => `<div class="od-prize"><strong>${esc(a.title)} <small style="color:#a592b3;font-weight:500">· ${esc(when(a.publish_at))}</small></strong><span>${esc(a.message)}${ok(a.link_url) && a.link_url ? ` <a href="${esc(a.link_url)}" style="color:#cda5f1">Read more →</a>` : ''}</span></div>`).join('')}</div></section>`;
  } catch { return ''; }
}
