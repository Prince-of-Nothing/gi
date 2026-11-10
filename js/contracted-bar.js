// Adds a "Contracted" side bar to covers of novels that have an accepted GidiReads contract.
import { supabase } from './supabaseClient.js';

async function contractedSet(ids) {
  const list = [...new Set(ids.filter(Boolean))];
  if (!list.length) return new Set();
  const { data } = await supabase.rpc('contracted_story_ids', { p_story_ids: list });
  return new Set((data || []).map((x) => (typeof x === 'string' ? x : x?.contracted_story_ids)).filter(Boolean));
}
function addBar(coverEl) {
  if (!coverEl || coverEl.querySelector(':scope > .contract-bar')) return;
  if (getComputedStyle(coverEl).position === 'static') coverEl.style.position = 'relative';
  const bar = document.createElement('span');
  bar.className = 'contract-bar'; bar.textContent = 'Contracted'; bar.title = 'This novel is under a GidiReads contract';
  coverEl.appendChild(bar);
}

/** Story page: one cover. */
export async function markStoryPage(storyId, coverWrap) {
  try { if ((await contractedSet([storyId])).has(storyId)) addBar(coverWrap); } catch { /* decoration only */ }
}

/** Any grid of cards that link to story.html?id=... */
export function markCardGrid(grid, coverSelector) {
  if (!grid) return;
  const run = async () => {
    const links = [...grid.querySelectorAll('a[href*="story.html?id="]')];
    const idOf = (a) => new URL(a.getAttribute('href'), location.href).searchParams.get('id');
    const set = await contractedSet(links.map(idOf)).catch(() => new Set());
    links.forEach((a) => { if (set.has(idOf(a))) addBar(a.querySelector(coverSelector)?.parentElement || a.querySelector(coverSelector)); });
  };
  let timer; new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(run, 150); }).observe(grid, { childList: true, subtree: true });
  run();
}
