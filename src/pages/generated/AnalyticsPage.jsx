import React from 'react';

const HTML = `


<div class="an-shell">
<header class="an-top"><a href="authors-studio.html" class="an-back">← Authors Studio</a><div class="an-heading"><span>GIDIREADS / AUTHORS STUDIO</span><h1>Analytics Centre</h1><p>Understand how readers find, read and respond to your stories.</p></div><div class="an-top-actions"><a href="notifications.html" class="an-notice">Notifications</a><button id="themeToggle" type="button" class="an-theme-toggle">Beige mode</button></div></header>
<main class="an-main">
<section class="an-toolbar" aria-label="Analytics filters"><div class="an-filter"><label for="storySelect">Choose a story</label><select id="storySelect"><option value="">Loading your contracted stories…</option></select></div><div class="an-filter"><label for="periodSelect">Time period</label><select id="periodSelect"><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option><option value="0">All time</option></select></div><div class="an-contract-wrap"><span class="an-contract-label">CONTRACT</span><strong id="contractLabel">Checking your agreement…</strong></div><button id="refreshAnalytics" class="an-refresh" type="button">    Refresh</button></section>
<div id="status" class="an-status" role="status" aria-live="polite">Loading your analytics…</div>
<section id="dashboard" hidden>
<div class="an-section-head"><div><span class="an-kicker">YOUR STORY AT A GLANCE</span><h2 id="selectedStoryTitle">Story performance</h2><p id="storySub">These figures update when you change the story or time period.</p></div><span id="contractType" class="an-pill"></span></div>
<div class="an-metrics" id="metricCards"></div>
<section class="an-panel"><div class="an-panel-head"><div><span class="an-kicker">ACTIVITY OVER TIME</span><h2>Reader activity</h2><p>Each line has its own colour, so you can compare activity without mixing the figures.</p></div><span class="an-chart-key">Daily activity</span></div><div class="an-charts" id="charts"></div></section>
<div class="an-two-col"><section class="an-panel"><div class="an-panel-head"><div><span class="an-kicker">CHAPTER-BY-CHAPTER</span><h2>Chapter performance</h2><p>Compare chapter opens, qualifying reads and comments.</p></div></div><div id="chapterChart" class="an-chapter-chart"></div><div id="chapterTable" class="an-table-wrap"></div></section>
<section class="an-panel"><span class="an-kicker">READER FEEDBACK</span><h2>Review ratings</h2><p>Average scores readers gave across the main parts of your story.</p><div id="reviewRatings" class="an-rating-bars"></div><div id="reviewSummary" class="an-review-summary"></div></section></div>
<div class="an-two-col an-lower-grid"><section class="an-panel"><span class="an-kicker">READER SUPPORT</span><h2>Echoes and appreciators</h2><p>See how many readers supported this story with Echoes.</p><div id="appreciatorStats" class="an-support-grid"></div><p class="an-help" id="purchaseNote"></p></section>
<section class="an-panel"><span class="an-kicker">YOUR AUTHOR AUDIENCE</span><h2>Followers and gifts</h2><div id="followerContent" class="an-audience-grid"></div><p class="an-help">Followers and gifts are shown at author level. They are not assigned to this story.</p></section></div>
<section class="an-panel" id="subscriberPanel"><span class="an-kicker">PAID CHAPTER ACCESS</span><h2>Locked-chapter subscribers</h2><p>Readers who unlocked at least one paid chapter in this story during the selected period.</p><div id="subscriberContent" class="an-subscriber-value"></div></section>
<div class="an-two-col"><section class="an-panel"><span class="an-kicker">READER LOCATIONS</span><h2>Geographical distribution</h2><div id="countryPanel" class="an-country"><strong>Country data is not available yet.</strong><p>We will only show locations when GidiReads has a reliable, consent-based country source. We will not guess from IP addresses.</p></div></section><section class="an-panel"><span class="an-kicker">HOW TO READ THESE FIGURES</span><h2>Metric notes</h2><div id="metricNotes" class="an-notes"></div></section></div>
</section>
</main></div>




`;

export default function AnalyticsPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      // skipped legacy site-header.js
      try { await import("../../js/analytics.js"); } catch (e) { console.error('module load failed', "js/analytics.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-analytics');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-analytics" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
