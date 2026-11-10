import React from 'react';

const HTML = `
<main class="ae-shell"><header class="ae-header"><a href="authors-studio.html">← Authors Studio</a><span>YOUR STORY FEEDBACK</span><a href="my-stories.html">My Stories</a></header><section class="ae-hero"><p class="ae-kicker">AUTHOR SUPPORT</p><h1>Review your AE</h1><p>Rate the Acquisition Editor supporting your contracted work, share feedback, or raise a confidential concern. You can also read and reply to editorial feedback here.</p></section><div id="authorFeedbackNotice" class="ae-notice" role="status" hidden></div><section class="ae-pane" id="aeEvaluationPanel">
<h2>Review your Acquisition Editor</h2>
<p class="ae-muted">Your review helps GidiReads assess how well editors support contracted authors. Your editor cannot see your individual rating or confidential report. You can update your rating while this assignment remains active.</p>
<div id="assignedAeCard"><p>Checking your current editor assignment…</p></div>
<div id="aeEvaluationNotice" class="ae-notice" role="status" hidden></div>
</section>
<section id="authorFeedbackList" class="ae-pane"><p>Loading feedback…</p></section></main>


`;

export default function AeAuthorFeedbackPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      // skipped legacy site-header.js
      try { await import("../../js/ae-author-feedback.js"); } catch (e) { console.error('module load failed', "js/ae-author-feedback.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-ae-author-feedback');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-ae-author-feedback" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
