// Holiday Hearts banner + horizontal story rail. Used on the homepage and on Explore.
import { supabase } from './supabaseClient.js';
import { HOLIDAY_SLUG, esc, safeImage, stageOf, fmtDate } from './opportunities-shared.js';

const PROMPT_LABEL = { snowed_in: 'Snowed In', one_last_christmas: 'One Last Christmas', the_royal_holiday: 'The Royal Holiday' };
const AWARD = { first_prize: 'Winner', second_prize: 'First runner-up', third_prize: 'Second runner-up' };

function dateRange(a, b) {
  if (!a || !b) return '';
  const f = (d, y) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', ...(y ? { year: 'numeric' } : {}), timeZone: 'Africa/Lagos' });
  return `${f(a)} – ${f(b)}`;
}

function action(opp, st) {
  const s = opp.settings || {};
  if (s.results_published) return ['holiday-hearts.html#results', 'See the winners'];
  if (st.key === 'voting') return ['holiday-hearts.html#finalists', 'Read and vote'];
  if (st.key === 'open' || st.key === 'closing') return ['holiday-hearts.html#enter', 'Enter the contest'];
  return ['holiday-hearts.html', st.key === 'upcoming' ? 'See the details' : 'View the contest'];
}

function card(e) {
  const st = e.stories || {}, cover = safeImage(st.cover_url), title = e.title || st.title || 'Untitled';
  const name = st.profiles?.display_name || st.profiles?.username || 'GidiReads author';
  const badge = AWARD[e.award] || (e.readers_choice ? 'Reader’s Choice' : e.is_finalist ? 'Finalist' : '');
  return `<a class="hhr-card" href="story.html?id=${encodeURIComponent(e.story_id)}">
    <div class="hhr-cover">${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" decoding="async">` : '<span>GR</span>'}${badge ? `<b class="hhr-badge">${esc(badge)}</b>` : ''}</div>
    <h3>${esc(title)}</h3><p>${esc(name)}</p><small>${esc(PROMPT_LABEL[e.prompt] || '')}</small></a>`;
}

export async function mountHolidayRail(mount, { compact = false } = {}) {
  if (!mount) return;
  try {
    const [{ data: opp, error }, { data: homeRow }] = await Promise.all([
      supabase.from('platform_opportunities').select('*').eq('slug', HOLIDAY_SLUG).eq('status', 'published').maybeSingle(),
      supabase.from('homepage_admin_settings').select('settings').eq('id', true).maybeSingle()
    ]);
    if (error || !opp) return;
    // Use the image selected in Admin → Homepage & Explore Manager for a
    // Holiday Hearts custom section. Keep the bundled campaign art as fallback.
    const homeSettings = homeRow?.settings || {};
    const holidaySection = (Array.isArray(homeSettings.custom_sections) ? homeSettings.custom_sections : [])
      .find(section => section && section.enabled !== false && /holiday\s*hearts/i.test(`${section.title || ''} ${section.kicker || ''} ${section.id || ''}`));
    const adminImage = String(holidaySection?.image_url || '').trim();
    const posterImage = /^https:\/\/[^\s"'()\\]+$/i.test(adminImage) ? adminImage : 'assets/Opportunities/holiday-hearts-main.jpg';
    const s = opp.settings || {}, st = stageOf(opp), [href, label] = action(opp, st);
    const { data: entries } = await supabase.from('holiday_hearts_entries')
      .select('id,story_id,prompt,title,award,readers_choice,is_finalist,submitted_at,stories(title,cover_url,profiles!stories_author_id_fkey(username,display_name))')
      .eq('opportunity_id', opp.id).eq('status', 'approved').not('story_id', 'is', null).order('submitted_at', { ascending: true }).limit(24);
    const order = { first_prize: 0, second_prize: 1, third_prize: 2 };
    const rows = (entries || []).sort((a, b) => (order[a.award] ?? (a.readers_choice ? 3 : a.is_finalist ? 4 : 5)) - (order[b.award] ?? (b.readers_choice ? 3 : b.is_finalist ? 4 : 5)));
    const facts = [
      ['Entries', dateRange(s.submission_opens_at, s.submission_closes_at)],
      ['Voting', dateRange(s.voting_opens_at, s.voting_closes_at)],
      ['Winners', s.winners_announced_at ? fmtDate(s.winners_announced_at) : '']
    ].filter((f) => f[1]);
    mount.innerHTML = `<div class="hhr${compact ? ' hhr-compact' : ''}">
      <article class="hhr-banner">
        <a class="hhr-poster" href="${href}" tabindex="-1" aria-hidden="true"><img src="${esc(posterImage)}" alt="" loading="lazy" decoding="async"></a>
        <div class="hhr-copy">
          <p class="hhr-eyebrow">GIDIREADS PRESENTS</p>
          <h2>Holiday <em>Hearts</em></h2>
          <p class="hhr-tag">The Holiday Romance Writing Contest</p>
          <p class="hhr-status"><span class="hhr-chip hhr-chip-${st.key}">${esc(st.label)}</span>${st.note ? `<span>${esc(st.note)}</span>` : ''}</p>
          ${compact ? '' : '<p class="hhr-lead">Three prompts, one story that is yours. The top three stories win contract offers.</p>'}
          ${facts.length ? `<ul class="hhr-facts">${facts.map(([k, v]) => `<li><span>${esc(k)}</span>${esc(v)}</li>`).join('')}</ul>` : ''}
          <div class="hhr-actions"><a class="hhr-btn" href="${href}">${esc(label)} <span aria-hidden="true">→</span></a><a class="hhr-btn hhr-btn-quiet" href="holiday-hearts.html#prompts">See the prompts</a></div>
        </div>
      </article>
      ${rows.length ? `<div class="hhr-head"><div><p class="hhr-eyebrow">THE COLLECTION</p><h3>Holiday Hearts stories</h3></div><a href="holiday-hearts.html#stories">See all <span aria-hidden="true">→</span></a></div>
        <div class="hhr-rail" role="list">${rows.map(card).join('')}</div>` : ''}
    </div>`;
    mount.hidden = false;
  } catch { /* the homepage must never break because of the contest banner */ }
}
