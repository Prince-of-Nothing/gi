import React from 'react';

const HTML = `

<main class="rankings-main">
  <section class="rankings-intro">
    <p class="rankings-eyebrow">THE GIDIREADS CHARTS</p>
    <h1>Rankings</h1>
    <p>Discover novels through the reader activity they earn: reads, Echoes, collections and reviews.</p>
  </section>

  <section class="rankings-panel" aria-label="Rankings">
    <div class="rankings-type-tabs" role="tablist" aria-label="Leaderboard type">
      <button type="button" class="active" data-board="novels" role="tab" aria-selected="true">Novel Rankings</button>
      <button type="button" data-board="readers" role="tab" aria-selected="false">Readerboard</button>
    </div>
    <div class="rankings-controls">
      <div class="rankings-periods" role="group" aria-label="Ranking period">
        <button type="button" class="active" data-period="weekly">Weekly</button>
        <button type="button" data-period="monthly">Monthly</button>
        <button type="button" data-period="90d">90 days</button>
        <button type="button" data-period="180d">180 days</button>
        <button type="button" data-period="all">All time</button>
      </div>
      <label class="rankings-limit-label">Show top
        <select id="rankingLimit" aria-label="Number of rankings to show">
          <option value="100" selected>100</option>
          <option value="200">200</option>
          <option value="500">500</option>
        </select>
      </label>
    </div>
    <p class="rankings-explainer" id="rankingsExplainer">Novel scores combine four equally weighted signals for the selected period: Reads, Echoes, Collections and Reviews. Each contributes up to 25 points, scaled against the leading novel for that metric. Chapters are shown for information only. The figures on each novel card are lifetime totals.</p>
    <div class="rankings-status" id="rankingsStatus" role="status" aria-live="polite">Loading rankings…</div>
    <div class="rankings-list" id="rankingsList"></div>
    <div class="rankings-more-wrap"><button type="button" id="loadMoreRankings" hidden>Load more</button></div>
  </section>
</main>






`;

export default function RankingsPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "rankings-page";
    const _added = [];
    (async () => {
      try { await import("../../js/site-header.js"); } catch (e) { console.error('module load failed', "js/site-header.js", e); }
      try { await import("../../js/profile-nav.js"); } catch (e) { console.error('module load failed', "js/profile-nav.js", e); }
      try { await import("../../js/rankings.js?v=4"); } catch (e) { console.error('module load failed', "js/rankings.js?v=4", e); }
      try { await import("../../js/site-footer.js"); } catch (e) { console.error('module load failed', "js/site-footer.js", e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-rankings');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-rankings" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
