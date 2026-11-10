import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<header role="banner" class="top"><a class="brand" href="index.html"><span class="logo">G</span><span>GidiReads<small>Born in Africa. Built for storytellers everywhere.</small></span></a><a class="back" href="my-gidireads.html">← My GidiReads</a></header><main role="main" class="wrap" id="main-content"><div class="intro"><p class="eyebrow">THE GIDIREADS STORE</p><h1>A little more room for stories.</h1><p>Unlock chapters, support the creators you love, and send a thoughtful gift.</p></div><div id="status" class="status" role="status" hidden></div><section class="balance-grid" aria-label="Your balances"><article class="balance coin"><span>G Coins</span><strong id="coins">    </strong><small>For paid chapter unlocks</small></article><article class="balance echo"><span>Purchased Support Echoes</span><strong id="purchased">    </strong><small>For supporting creators</small></article><article class="balance echo2"><span>Promotional Echoes</span><strong id="promo">    </strong><small>Subject to reward rules</small></article><article class="balance echo3"><span>Free appreciation Echoes</span><strong id="free">    </strong><small>Non-cash appreciation</small></article></section><nav class="store-tabs" aria-label="Store categories" role="navigation"><button class="tab active" data-view="coinsView">G Coins</button><button class="tab" data-view="echoView">Echoes</button><button class="tab" data-view="giftsView">Gift Store</button><button class="tab" data-view="pricingView">Chapter Pricing</button></nav><section id="coinsView" class="store-view"><div class="section-head"><div><p class="eyebrow">CHAPTER CURRENCY</p><h2>Choose a G Coins package</h2><p>Bonus coins are included in the package total shown below.</p></div></div><div class="package-grid" id="coinPackages"></div></section><section id="echoView" class="store-view" hidden><div class="section-head"><div><p class="eyebrow">SUPPORT THE STORIES</p><h2>Echoes packages</h2><p>Purchased Support Echoes are separate from free appreciation and promotional Echoes.</p></div></div><div class="package-grid" id="echoPackages"></div></section><section id="giftsView" class="store-view" hidden><div class="section-head"><div><p class="eyebrow">A SMALL GESTURE, A BIG ENCOURAGEMENT</p><h2>Send a story gift</h2><p>Choose a gift and enter a creator username. Gifts use purchased Support Echoes already in your wallet; no real-money payment is involved.</p></div></div><div class="recipient-picker"><label class="field" for="recipient">Find a creator<input id="recipient" type="text" autocomplete="off" placeholder="Start typing a username or display name" aria-autocomplete="list" aria-controls="recipientSuggestions"></label><div id="recipientSuggestions" class="recipient-suggestions" role="listbox" hidden></div><small id="recipientHelp" class="muted">Choose a creator from the suggestions to avoid username mistakes.</small></div><div class="gift-grid" id="giftGrid"></div><p id="giftSelection" class="selection" aria-live="polite">Choose a gift to see its details.</p><button id="sendGift" class="primary" disabled>Not ready for use yet</button></section><section id="pricingView" class="store-view" hidden><div class="section-head"><div><p class="eyebrow">FOR ELIGIBLE AUTHORS</p><h2>Chapter pricing</h2><p>Paid chapters can be priced from 10 to 100 G Coins. Monetisation approval and secure server-side validation are required.</p></div></div><div class="pricing-panel"><label class="field">Your story<select id="storySelect"><option value="">Loading your stories…</option></select></label><label class="field">Chapter<select id="chapterSelect" disabled><option value="">Choose a story first</option></select></label><label class="field">Price in G Coins<input id="chapterPrice" type="number" min="10" max="100" step="1" value="10" disabled></label><p id="pricingNote" class="muted">Choose one of your chapters to load its current price. Paid pricing requires an approved monetisation contract.</p><button id="savePrice" class="primary" disabled>Not ready for use yet</button></div><div class="pricing-panel reader-unlock"><h3>Reader chapter unlock</h3><p>Readers will see the price before confirming. Existing purchases remain unlocked and must never be charged twice.</p><p class="muted">Real-money payments are disabled while the payment service provider is being selected. Chapter pricing can be saved, but paid chapter purchases and unlocks cannot be tested until payments are enabled.</p></div></section><section class="activity"><div class="section-head"><div><p class="eyebrow">YOUR RECORD</p><h2>Recent wallet activity</h2></div><a href="my-gidireads.html">Full transaction history ↗</a></div><div id="activityList" class="activity-list"><p class="muted">Sign in to load your wallet activity.</p></div></section></main>



`;

export default function StorePage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/store.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/store.js"); } catch (e) { console.error('script load failed', "js/store.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-store');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-store" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
