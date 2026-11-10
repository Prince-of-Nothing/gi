const DEFAULT_BANDS = [
  { contract_type: 'non_exclusive', min_words: 0, max_words: 999, price_g_coins: 25 },
  { contract_type: 'non_exclusive', min_words: 1000, max_words: 1499, price_g_coins: 30 },
  { contract_type: 'non_exclusive', min_words: 1500, max_words: 2499, price_g_coins: 35 },
  { contract_type: 'non_exclusive', min_words: 2500, max_words: 3499, price_g_coins: 40 },
  { contract_type: 'non_exclusive', min_words: 3500, max_words: 4499, price_g_coins: 50 },
  { contract_type: 'non_exclusive', min_words: 4500, max_words: null, price_g_coins: 60 },
  { contract_type: 'exclusive', min_words: 0, max_words: 999, price_g_coins: 25 },
  { contract_type: 'exclusive', min_words: 1000, max_words: 1499, price_g_coins: 30 },
  { contract_type: 'exclusive', min_words: 1500, max_words: 2499, price_g_coins: 35 },
  { contract_type: 'exclusive', min_words: 2500, max_words: 3499, price_g_coins: 40 },
  { contract_type: 'exclusive', min_words: 3500, max_words: 4499, price_g_coins: 50 },
  { contract_type: 'exclusive', min_words: 4500, max_words: null, price_g_coins: 70 }
];

export async function renderChapterPricingAdmin({ supabase, currentUser, adminTabContent, logAdminAction }) {
  adminTabContent.innerHTML = `
    <section class="cp-admin-wrap">
      <header class="cp-admin-head"><p class="cp-admin-eyebrow">PLATFORM SETTINGS</p><h2>Chapter pricing guide</h2><p>Set the automatic price for each chapter length. GidiReads uses this guide for every eligible novel. The limits in each author's contract still apply.</p></header>
      <div class="cp-admin-note"><strong>Keep prices fair.</strong><span>Longer chapters can cost more, but prices should still be within reach for readers. These prices are suggestions for automatic pricing, not a promise of author earnings. Before purchases are enabled, GidiReads must also set a fair G Coin value and author payment share.</span></div>
      <form id="cpAdminForm" class="cp-admin-grid">
        <section class="cp-admin-card"><div class="cp-admin-card-head"><div><h3>Non-exclusive novels</h3><p>Allowed price: 25–60 G Coins</p></div><span class="cp-admin-tag">NON-EXCLUSIVE</span></div><div id="cpNonExclusiveRows" class="cp-admin-rows"></div></section>
        <section class="cp-admin-card"><div class="cp-admin-card-head"><div><h3>Exclusive novels</h3><p>Allowed price: 25–100 G Coins</p></div><span class="cp-admin-tag">EXCLUSIVE</span></div><div id="cpExclusiveRows" class="cp-admin-rows"></div></section>
        <div class="cp-admin-actions"><p id="cpAdminStatus" role="status">Loading the current price guide…</p><button class="btn btn-primary" type="submit" id="cpAdminSave">Save price guide</button></div>
      </form>
      <div class="cp-admin-foot"><h3>How this works</h3><ul><li>GidiReads checks the chapter's word count when its price is set.</li><li>When an author edits a paid chapter using automatic pricing, only that chapter's price is checked again.</li><li>Changing this guide will not silently change prices readers already see. An admin must plan any wider price update.</li><li>Manual prices still follow the author's contract limit.</li></ul></div>
    </section>`;

  const status = document.getElementById('cpAdminStatus');
  const form = document.getElementById('cpAdminForm');
  let rows = [];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const wordLabel = row => row.max_words == null ? `${Number(row.min_words).toLocaleString()}+ words` : `${Number(row.min_words).toLocaleString()}–${Number(row.max_words).toLocaleString()} words`;

  function paint() {
    for (const [type, target] of [['non_exclusive','cpNonExclusiveRows'],['exclusive','cpExclusiveRows']]) {
      const host = document.getElementById(target);
      host.innerHTML = rows.filter(row => row.contract_type === type).map((row,index) => `
        <label class="cp-admin-row"><span>${esc(wordLabel(row))}</span><span class="cp-admin-input-wrap"><input type="number" min="25" max="${type==='exclusive'?100:60}" step="1" required value="${Number(row.price_g_coins)}" data-contract="${type}" data-min-words="${Number(row.min_words)}" aria-label="Price for ${esc(wordLabel(row))}"><small>G Coins</small></span></label>`).join('');
    }
  }

  try {
    const { data, error } = await supabase.rpc('gidireads_admin_get_pricing_schedule');
    if (error) throw error;
    rows = (data || []).map(row => ({contract_type:row.contract_type,min_words:Number(row.min_words),max_words:row.max_words==null?null:Number(row.max_words),price_g_coins:Number(row.price_g_coins)}));
    if (rows.length !== 12) throw new Error('The pricing guide is not ready yet. Apply the held pricing migration after V5 deployment.');
    paint();
    status.textContent = 'Current guide loaded. Changes apply to automatic pricing after you save.';
  } catch (error) {
    rows = DEFAULT_BANDS.map(row => ({...row}));
    paint();
    form.querySelectorAll('input').forEach(input => input.disabled = true);
    document.getElementById('cpAdminSave').disabled = true;
    status.textContent = 'The central pricing guide is not connected yet. The proposed starting prices are shown for review only. After V5 deployment, the held migration will enable saving.';
  }

  form.addEventListener('input', event => {
    const input = event.target.closest('input[data-contract]');
    if (!input) return;
    const row = rows.find(item => item.contract_type===input.dataset.contract && item.min_words===Number(input.dataset.minWords));
    if (row) row.price_g_coins = Number(input.value);
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (rows.length !== 12) return;
    const button = document.getElementById('cpAdminSave');
    const inputs = [...form.querySelectorAll('input[data-contract]')];
    for (const input of inputs) {
      const value = Number(input.value);
      const max = input.dataset.contract === 'exclusive' ? 100 : 60;
      if (!Number.isInteger(value) || value < 25 || value > max) {
        status.textContent = `Enter a whole number from 25 to ${max} G Coins.`;
        input.focus();
        return;
      }
    }
    for (const type of ['non_exclusive','exclusive']) {
      const values = rows.filter(row=>row.contract_type===type).sort((a,b)=>a.min_words-b.min_words).map(row=>row.price_g_coins);
      if (values.some((value,index)=>index>0 && value<values[index-1])) {
        status.textContent = 'Prices should stay the same or rise as chapters get longer.';
        return;
      }
    }
    button.disabled = true;
    status.textContent = 'Saving the new price guide…';
    try {
      const payload = rows.map(({contract_type,min_words,max_words,price_g_coins})=>({contract_type,min_words,max_words,price_g_coins}));
      const { data, error } = await supabase.rpc('gidireads_admin_save_pricing_schedule',{p_rows:payload});
      if (error) throw error;
      await logAdminAction?.('chapter_pricing_schedule_updated','chapter_pricing_schedule',null,`Updated ${Number(data||0)} pricing bands`);
      status.textContent = 'The automatic price guide has been saved. Existing chapter prices have not been changed.';
    } catch (error) {
      status.textContent = error?.message?.includes('price_out_of_contract_range') ? 'One or more prices are outside the contract limit.' : 'The guide could not be saved. Please check the values and try again.';
    } finally { button.disabled = false; }
  });
}
