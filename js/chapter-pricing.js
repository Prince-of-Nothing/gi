import { supabase } from './supabaseClient.js';

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = '') => { const node = document.createElement('span'); node.textContent = value ?? ''; return node.innerHTML; };
const storyId = new URLSearchParams(location.search).get('story');
let currentUser = null;
let context = null;
let chapters = [];
let prices = new Map();
let mode = 'automatic';
let priceGuide = [];

$('#menuButton')?.addEventListener('click', () => { $('#studioSidebar')?.classList.add('open'); $('#sidebarBackdrop')?.classList.add('show'); });
function closeSidebar() { $('#studioSidebar')?.classList.remove('open'); $('#sidebarBackdrop')?.classList.remove('show'); }
$('#sidebarClose')?.addEventListener('click', closeSidebar);
$('#sidebarBackdrop')?.addEventListener('click', closeSidebar);
document.querySelectorAll('.studio-nav-item').forEach(link => link.addEventListener('click', closeSidebar));

function say(message, isError = false) {
  const status = $('#methodStatus');
  status.textContent = message;
  status.style.color = isError ? '#d17e83' : '';
}
function wordCount(content = '') { return content.trim() ? content.trim().split(/\s+/).length : 0; }
function automaticPrice(words) {
  const band = priceGuide.find(item => words >= Number(item.min_words) && (item.max_words == null || words <= Number(item.max_words)));
  return Number(band?.price_g_coins ?? context?.min_price ?? 25);
}
function renderPriceGuide() {
  const host = document.querySelector('.price-guide-grid');
  if (!host) return;
  host.innerHTML = priceGuide.map(band => {
    const range = band.max_words == null ? `${Number(band.min_words).toLocaleString()}+ words` : `${Number(band.min_words).toLocaleString()}–${Number(band.max_words).toLocaleString()} words`;
    return `<div><span>${range}</span><strong>${Number(band.price_g_coins)} G Coins</strong></div>`;
  }).join('');
}
function labelForChapter(chapter, index) {
  if (chapter.title) return chapter.title;
  return chapter.content_type === 'chapter' || !chapter.content_type ? `Chapter ${chapter.chapter_number || index + 1}` : chapter.content_type[0].toUpperCase() + chapter.content_type.slice(1);
}

async function loadContext() {
  const { data, error } = await supabase.rpc('gidireads_get_story_pricing_context', { p_story_id: storyId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return row;
}

function updateModeUI() {
  document.querySelectorAll('.pricing-method').forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#autoGuide').hidden = mode !== 'automatic';
  renderChapters();
}

function renderChapters() {
  const host = $('#chapterPricingList');
  $('#chapterCount').textContent = `${chapters.length} ${chapters.length === 1 ? 'chapter' : 'chapters'}`;
  if (!chapters.length) {
    host.innerHTML = '<p class="pricing-empty">This story has no chapters yet. Add chapters in Story Workspace first.</p>';
    return;
  }
  host.innerHTML = chapters.map((chapter, index) => {
    const saved = prices.get(chapter.id);
    const paid = saved?.is_paid === true;
    const words = wordCount(chapter.content);
    const suggested = Math.min(Number(context.max_price), Math.max(Number(context.min_price), automaticPrice(words)));
    const shownPrice = saved?.price_g_coins ?? suggested;
    const priceControl = mode === 'manual'
      ? `<input type="number" min="${context.min_price}" max="${context.max_price}" step="1" value="${paid ? shownPrice : suggested}" aria-label="Price for ${escapeHtml(labelForChapter(chapter,index))}" data-price-input="${escapeHtml(chapter.id)}"  />`
      : `<span class="pricing-state">${suggested} G Coins</span>`;
    return `<article class="pricing-row" data-chapter-row="${escapeHtml(chapter.id)}">
      <div><div class="pricing-chapter-title">${escapeHtml(labelForChapter(chapter,index))}</div><div class="pricing-chapter-meta">${words.toLocaleString()} words · ${chapter.is_published ? 'Published' : 'Draft'}</div></div>
      <div class="pricing-controls"><span class="pricing-state">${paid ? 'PAID' : 'FREE'}</span>${priceControl}<button type="button" class="${paid ? '' : 'primary'}" data-action="${paid ? 'make-free' : 'make-paid'}" data-chapter="${escapeHtml(chapter.id)}">${paid ? 'Make free' : 'Make paid'}</button><button type="button" class="pricing-save" data-action="save" data-chapter="${escapeHtml(chapter.id)}" ${paid ? '' : 'disabled'}>Save</button></div>
      <div class="pricing-row-note" id="note-${escapeHtml(chapter.id)}">${paid ? `Current price: ${shownPrice} G Coins` : 'Readers can read this chapter for free.'}</div>
    </article>`;
  }).join('');
  host.querySelectorAll('button[data-action]').forEach(button => button.addEventListener('click', () => handleChapterAction(button)));
}

async function saveChapterPrice(chapterId, isPaid, price) {
  const { data, error } = await supabase.rpc('gidireads_set_chapter_price', {
    p_chapter_id: chapterId,
    p_price_g_coins: price,
    p_is_paid: isPaid
  });
  if (error) throw error;
  if (data) prices.set(chapterId, data);
  else await loadPrices();
}

async function handleChapterAction(button) {
  const chapterId = button.dataset.chapter;
  const action = button.dataset.action;
  const row = button.closest('.pricing-row');
  const note = row.querySelector('.pricing-row-note');
  const input = row.querySelector('[data-price-input]');
  const saved = prices.get(chapterId);
  const isPaid = action !== 'make-free';
  let price = Number(input?.value || saved?.price_g_coins || context.min_price);
  if (isPaid && mode === 'manual' && (!Number.isInteger(price) || price < Number(context.min_price) || price > Number(context.max_price))) {
    note.textContent = `Enter a whole number from ${context.min_price} to ${context.max_price} G Coins.`;
    note.classList.add('error');
    input?.focus();
    return;
  }
  button.disabled = true;
  note.classList.remove('error');
  note.textContent = 'Saving…';
  try {
    await saveChapterPrice(chapterId, isPaid, mode === 'automatic' ? Number(context.min_price) : price);
    const updated = prices.get(chapterId);
    note.textContent = isPaid ? `Saved at ${updated?.price_g_coins ?? price} G Coins.` : 'This chapter is now free.';
    await loadPrices();
    renderChapters();
    say('Your chapter pricing has been saved.');
  } catch (error) {
    const message = String(error?.message || '');
    if (message.includes('contract_required') || message.includes('contract_not_eligible')) note.textContent = 'This story needs an active non-exclusive or exclusive contract.';
    else if (message.includes('chapter_price_out_of_range')) note.textContent = `The price must be between ${context.min_price} and ${context.max_price} G Coins.`;
    else if (message.includes('chapter_not_owned')) note.textContent = 'You can only set prices for your own story.';
    else if (message.includes('pricing_mode_mismatch')) note.textContent = 'Your pricing method changed. Reload this page and try again.';
    else note.textContent = 'We could not save this price. Please try again.';
    note.classList.add('error');
    say(note.textContent, true);
  } finally {
    button.disabled = false;
  }
}

async function loadPrices() {
  if (!chapters.length) return;
  const { data, error } = await supabase.from('wallet_chapter_pricing').select('chapter_id,price_g_coins,is_paid').in('chapter_id', chapters.map(chapter => chapter.id));
  if (error) throw error;
  prices = new Map((data || []).map(row => [row.chapter_id, row]));
}

async function updateAutomaticPrices() {
  const button = $('#updateAutomaticPrices');
  if (!button) return;
  button.disabled = true;
  button.textContent = 'Updating prices…';
  try {
    const { data, error } = await supabase.rpc('gidireads_apply_automatic_chapter_prices', { p_story_id: storyId });
    if (error) throw error;
    await loadPrices();
    renderChapters();
    say(`Updated ${Number(data || 0)} paid chapter prices using the GidiReads price guide.`);
  } catch (error) {
    say('We could not update the chapter prices. Check that automatic pricing is selected and try again.', true);
  } finally {
    button.disabled = false;
    button.textContent = 'Update all paid chapter prices';
  }
}

async function changeMode(nextMode) {
  if (nextMode === mode) return;
  say('Saving your choice…');
  document.querySelectorAll('.pricing-method').forEach(button => button.disabled = true);
  try {
    const { error } = await supabase.rpc('gidireads_set_story_pricing_mode', { p_story_id: storyId, p_mode: nextMode });
    if (error) throw error;
    mode = nextMode;
    context.pricing_mode = nextMode;
    updateModeUI();
    say(nextMode === 'automatic' ? 'GidiReads will set prices based on chapter length.' : 'You can now set each paid chapter price yourself.');
  } catch (error) {
    say('We could not save this choice. Please try again.', true);
  } finally {
    document.querySelectorAll('.pricing-method').forEach(button => button.disabled = false);
  }
}

async function init() {
  if (!storyId) throw new Error('story_missing');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('login_required');
  currentUser = user;
  const { data: story, error: storyError } = await supabase.from('stories').select('id,title').eq('id', storyId).eq('author_id', currentUser.id).single();
  if (storyError || !story) throw new Error('story_not_owned');
  $('#pricingStoryTitle').textContent = story.title || 'Untitled story';
  $('#backToStory').href = `story-workspace.html?story=${encodeURIComponent(storyId)}`;
  $('#footerStoryLink').href = `story-workspace.html?story=${encodeURIComponent(storyId)}`;
  context = await loadContext();
  if (!context || !['non_exclusive', 'exclusive'].includes(context.contract_type)) {
    $('#pricingBlocked').hidden = false;
    $('#pricingWorkspace').hidden = true;
    return;
  }
  $('#pricingWorkspace').hidden = false;
  $('#pricingBlocked').hidden = true;
  $('#contractTypeLabel').textContent = context.contract_type === 'exclusive' ? 'Exclusive' : 'Non-exclusive';
  $('#contractPriceRange').textContent = `${context.min_price}–${context.max_price} G Coins`;
  mode = context.pricing_mode || 'automatic';
  const { data: guideRows, error: guideError } = await supabase.rpc('gidireads_get_automatic_price_guide', { p_story_id: storyId });
  if (guideError) throw guideError;
  priceGuide = guideRows || [];
  renderPriceGuide();
  const { data: chapterRows, error: chapterError } = await supabase.from('chapters').select('id,chapter_number,title,content,content_type,is_published').eq('story_id', storyId).order('chapter_number', { ascending: true });
  if (chapterError) throw chapterError;
  chapters = chapterRows || [];
  await loadPrices();
  updateModeUI();
  document.querySelectorAll('.pricing-method').forEach(button => button.addEventListener('click', () => changeMode(button.dataset.mode)));
  $('#updateAutomaticPrices')?.addEventListener('click', updateAutomaticPrices);
  say(mode === 'automatic' ? 'GidiReads will set prices based on chapter length.' : 'You are setting chapter prices yourself.');
}

init().catch(error => {
  const message = String(error?.message || '');
  $('#pricingStoryTitle').textContent = 'Pricing settings could not be opened';
  $('#pricingBlocked').hidden = false;
  $('#pricingWorkspace').hidden = true;
  $('#pricingBlocked h2').textContent = 'We could not open chapter pricing';
  $('#pricingBlocked p').textContent = message.includes('login_required') ? 'Log in to manage chapter prices.' : message.includes('story_not_owned') ? 'This story is not available from your author account.' : 'Please check your connection and try again. If this continues, contact GidiReads support.';
});
