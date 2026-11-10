import React from 'react';

const HTML = `
<main><section id="modDenied" class="section" hidden><div class="section-inner"><div class="mod-denied"><p class="mod-kicker">STAFF ACCESS</p><h1>Community moderation</h1><p id="modDeniedText">Sign in with an authorised staff account to continue.</p><a class="btn btn-primary" href="account.html">Sign in</a></div></div></section><div id="modWorkspace" hidden><section class="mod-hero"><div class="section-inner"><p class="mod-kicker">GIDIREADS · COMMUNITY SAFETY</p><h1>Moderation workspace</h1><p>Review reports carefully, document actions, and escalate decisions that need the Owner.</p><div class="mod-scope-note"><strong>Your scope</strong><span>Reports and permitted moderation actions only. Contracts, earnings, payouts, financial settings, and owner controls remain restricted.</span></div></div></section><section class="section"><div class="section-inner"><div class="mod-stats" id="modStats"></div><div class="mod-toolbar"><div><h2>Report queue</h2><p>Review new reports and track their status.</p></div><label class="mod-filter"><span>Show</span><select id="modStatusFilter"><option value="open">Open reports</option><option value="all">All reports</option><option value="pending">Pending</option><option value="under_review">Under review</option><option value="escalated">Escalated</option><option value="resolved">Resolved</option><option value="rejected">Rejected</option></select></label></div><div id="modReports" class="mod-report-list"><p class="mod-empty">Loading reports…</p></div><div class="mod-toolbar" style="margin-top:34px"><div><h2>Acquisition Editor reports</h2><p>Private reports submitted by contracted authors about their assigned editors.</p></div></div><div id="modAeReports" class="mod-report-list"><p class="mod-empty">Loading AE reports…</p></div></div></section></div></main>


`;

export default function ModeratorPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    let cancelled = false;
    (async () => {
      try { await import(/* @vite-ignore */ "../../js/moderator.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/moderator.js"); } catch (e) { console.error('script load failed', "js/moderator.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/site-footer.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/site-footer.js"); } catch (e) { console.error('script load failed', "js/site-footer.js", e); } }
      try { await import(/* @vite-ignore */ "../../js/theme-sync.js"); } catch (_) { try { await import(/* @vite-ignore */ "js/theme-sync.js"); } catch (e) { console.error('script load failed', "js/theme-sync.js", e); } }
    })();
    return () => {
      cancelled = true;
      document.body.className = prevClass;
      document.title = prevTitle;
      const root = document.getElementById('legacy-page-moderator');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="legacy-page-moderator" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
