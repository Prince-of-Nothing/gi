import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<main role="main" class="ce-wrap" id="main-content"><section class="ce-hero"><p class="ce-eyebrow">CREATOR FINANCE</p><h1>Creator Earnings</h1><p>Track eligible creator revenue separately from your reader wallet. Earnings appear only after valid revenue entries are recorded by trusted server-side processes.</p></section><div id="earnNotice" class="ce-notice" role="status">Loading earnings…</div><section id="earnLogin" class="ce-card" hidden><h2>Sign in to continue</h2><a class="ce-btn" href="account.html">Go to login</a></section><section id="earnMain" hidden>
<div class="ce-stats"><article class="ce-stat"><span>Pending</span><strong id="earnPending">    </strong><small>Awaiting eligibility checks</small></article><article class="ce-stat"><span>Available</span><strong id="earnAvailable">    </strong><small>Eligible for payout request</small></article><article class="ce-stat"><span>Paid</span><strong id="earnPaid">    </strong><small>Marked paid by admin</small></article></div>
<section class="ce-section"><div class="ce-heading"><div><p class="ce-eyebrow">PAYOUT REQUEST</p><h2>Request available earnings</h2><p>Minimum payout request: ₦5,000. A request includes all currently available earnings. Processing is manual until a verified payout provider is configured.</p></div></div><form id="payoutForm" class="ce-card ce-form"><label>Bank name<input name="bank_name" autocomplete="organization" required minlength="2" placeholder="Your bank"></label><label>Account name<input name="account_name" autocomplete="name" required minlength="2" placeholder="Name on the account"></label><label>Account number<input name="account_number" inputmode="numeric" autocomplete="off" required pattern="[0-9]{10,}" minlength="10" maxlength="15" placeholder="Account number"></label><p class="ce-muted">Bank details are stored for payout processing. Only submit details for an account you are authorised to use.</p><button class="ce-btn" type="submit" id="payoutSubmit">Request payout</button></form></section>
<section class="ce-section"><div class="ce-heading"><div><p class="ce-eyebrow">LEDGER</p><h2>Earnings history</h2></div></div><div id="earnLedger" class="ce-list"></div></section><section class="ce-section"><div class="ce-heading"><div><p class="ce-eyebrow">PAYOUTS</p><h2>Request history</h2></div></div><div id="payoutHistory" class="ce-list"></div></section>
<div class="ce-card ce-disclaimer"><h2>Revenue transparency</h2><p>Each earning entry should identify its source, eligible gross amount, creator share, contract, and status. The platform must publish the final definition of net eligible revenue and applicable rates before monetisation begins. No real-money purchases or payouts are enabled by this page alone.</p></div></section></main>
<nav class="bottom-nav" aria-label="Primary mobile navigation" role="navigation">
  <a href="index.html" class="bottom-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg><span>Home</span></a>
  <a href="explore.html" class="bottom-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span>Explore</span></a>
  <a href="library.html" class="bottom-nav-item"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><span>Library</span></a>
  <button type="button" class="bottom-nav-item bottom-nav-write" id="writeNavBtn"><span class="write-fab"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span><span>Write</span></button>
  <a href="notifications.html" class="bottom-nav-item"><span class="nav-icon-wrap"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="nav-badge" id="navUnreadBadge" hidden></span></span><span>Alerts</span></a>
</nav>



`;

export default function CreatorEarningsPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      // skipped legacy site-header.js
      try { await import("../../js/creator-earnings.js"); } catch (e) { console.error('module load failed', "js/creator-earnings.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-creator-earnings');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-creator-earnings" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
