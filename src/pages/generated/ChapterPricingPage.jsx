import React from 'react';

const HTML = `


<div class="studio-shell">
<aside class="studio-sidebar" id="studioSidebar" aria-label="Authors Studio navigation"><div class="studio-brand-block"><a class="studio-brand" href="index.html"><span class="brand-monogram"><span>G</span><span>R</span></span><span class="brand-word">GidiReads</span></a><div class="studio-label">AUTHORS STUDIO</div><button class="sidebar-close" id="sidebarClose" aria-label="Close menu">×</button></div><nav class="studio-nav"><a class="studio-nav-item" href="authors-studio.html"><span class="nav-mark">01</span><span>Home</span></a><a class="studio-nav-item" href="my-stories.html"><span class="nav-mark">02</span><span>My Stories</span></a><a class="studio-nav-item" href="contract-center.html"><span class="nav-mark">04</span><span>Contract Centre</span></a><a class="studio-nav-item" href="analytics.html"><span class="nav-mark">06</span><span>Analytics Centre</span></a></nav><div class="sidebar-bottom"><div class="sidebar-note"><span class="note-line"></span><p>Make room for the story.</p></div><a class="back-to-gidi" href="index.html">← Back to GidiReads</a></div></aside>
<div class="sidebar-backdrop" id="sidebarBackdrop"></div>
<main class="studio-main"><header class="studio-topbar"><button class="menu-button" id="menuButton" aria-label="Open menu"></button><div class="topbar-context"><span>GidiReads</span><i>/</i><strong>Authors Studio</strong><i>/</i><strong>Chapter Pricing</strong></div><div class="topbar-actions"><a href="notifications.html" class="top-icon" aria-label="Notifications"><span></span></a><button class="theme-toggle" id="themeToggle" type="button"><span class="theme-icon" aria-hidden="true">☀</span><span class="theme-label">Beige</span></button><a href="account.html" class="profile-link">Profile</a></div></header>
<div class="studio-content pricing-page"><a class="workspace-back" id="backToStory" href="my-stories.html">    Back to story</a><section class="pricing-hero"><p class="eyebrow">STORY MONETISATION</p><h1>Chapter pricing</h1><p id="pricingStoryTitle" class="pricing-subtitle">Checking this story…</p><p class="pricing-intro">Choose how readers will unlock paid chapters. You can keep any chapter free. Your contract sets the price range for this story.</p></section>
<section id="pricingBlocked" class="pricing-message" hidden role="status"><h2>Chapter pricing is not available</h2><p>This story needs an active non-exclusive or exclusive contract before you can set paid chapter prices.</p><a class="button button-quiet" href="contract-center.html">Open Contract Centre</a></section>
<div id="pricingWorkspace" hidden>
<section class="contract-summary" aria-live="polite"><div><span class="eyebrow">ACTIVE CONTRACT</span><strong id="contractTypeLabel">—</strong></div><div><span class="eyebrow">PRICE RANGE</span><strong id="contractPriceRange">—</strong></div></section>
<section class="pricing-method-section"><div class="pricing-section-heading"><div><p class="eyebrow">CHOOSE A METHOD</p><h2>Who sets the price?</h2><p>You can use GidiReads prices or set each price yourself.</p></div></div><div class="pricing-methods" role="group" aria-label="Pricing method"><button type="button" class="pricing-method active" data-mode="automatic" aria-pressed="true"><span class="method-number">01</span><strong>Let GidiReads set prices</strong><small>Prices are based on chapter length. The price will stay within your contract limit.</small></button><button type="button" class="pricing-method" data-mode="manual" aria-pressed="false"><span class="method-number">02</span><strong>I'll set prices myself</strong><small>Choose a price for each paid chapter. You cannot go below or above your contract limit.</small></button></div><p class="pricing-status" id="methodStatus" role="status">Loading your pricing settings…</p></section>
<section class="pricing-table-section"><div class="pricing-section-heading"><div><p class="eyebrow">YOUR MANUSCRIPT</p><h2>Set chapter prices</h2><p>Choose which chapters are free and which ones readers must unlock.</p></div><span class="chapter-count" id="chapterCount">0 chapters</span></div><div class="pricing-list" id="chapterPricingList"><p class="pricing-empty">Loading chapters…</p></div></section>
<section class="auto-guide" id="autoGuide"><div><p class="eyebrow">GIDIREADS PRICE GUIDE</p><h2>How automatic pricing works</h2><p>Longer chapters may cost more. The price is always kept within your contract's allowed range. You can update all paid chapter prices at once after choosing automatic pricing. G Coins are not cash; your actual earnings depend on the coin value and your contract share.</p></div><button type="button" class="pricing-save" id="updateAutomaticPrices">Update all paid chapter prices</button><div class="price-guide-grid"><div><span>Loading price guide…</span><strong>—</strong></div></div></section>
<p class="pricing-footnote">Saving a chapter price does not activate payments. Readers cannot buy paid chapters until GidiReads turns on and tests its payment system.</p>
</div></div></main></div>



`;

export default function ChapterPricingPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      try { await import("../../js/site-header.js"); } catch (e) { console.error('module load failed', "js/site-header.js", e); }
      try { await import("../../js/chapter-pricing.js?v=central-pricing-engine-01"); } catch (e) { console.error('module load failed', "js/chapter-pricing.js?v=central-pricing-engine-01", e); }
      try { await import("../../js/site-footer.js"); } catch (e) { console.error('module load failed', "js/site-footer.js", e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-chapter-pricing');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-chapter-pricing" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
