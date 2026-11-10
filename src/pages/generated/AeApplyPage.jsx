import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<main role="main" class="ae-public-wrap" id="main-content"><a class="ae-back" href="authors-studio.html">    Back to Authors Studio</a><section class="ae-panel ae-apply-panel"><img class="ae-apply-art" src="assets/ae/ae-editor-hero.jpg" alt="Illustration of an editor working at her laptop"><p class="ae-kicker">GIDIREADS TEAM</p><h1>Apply to become an Acquisitions & Developmental Editor</h1><p class="ae-lead">Tell us about your experience and how you would support writers. Applications are reviewed by the GidiReads admin team.</p><div id="aeApplyNotice" class="ae-notice" role="status"></div><form id="aeApplyForm" class="ae-form"><label>Your editing or publishing experience <small>Tell us what you have done so far. You can include writing, editing, beta reading or publishing work.</small><textarea name="experience" minlength="30" maxlength="2500" required></textarea></label><label>How would you help a writer improve a story? <small>Explain how you would give clear, useful feedback without taking over the writer's work.</small><textarea name="approach" minlength="40" maxlength="2500" required></textarea></label><label>What do you understand about GidiReads and the AE role? <small>Tell us what you think the role involves and how it fits the platform.</small><textarea name="platform_understanding" minlength="30" maxlength="2000" required></textarea></label><label>Short sample of your feedback <small>In a few sentences, show how you might explain a story issue and suggest an improvement. Do not use another writer's private work.</small><textarea name="sample_feedback" minlength="30" maxlength="1800" required></textarea></label><label>How much time can you give each week?<select name="availability" required><option value="">Choose one</option><option>1–3 hours</option><option>4–6 hours</option><option>7–10 hours</option><option>More than 10 hours</option></select></label><label>Relevant links (optional)<small>Portfolio, published work or professional profile. Do not include private account details.</small><input name="links" type="url" maxlength="500" placeholder="https://"></label><label class="ae-check"><input type="checkbox" name="truthful" required> I confirm that my answers are honest and that I understand this application does not guarantee a role.</label><button class="ae-button" id="aeSubmit" type="submit">Send application</button></form><p class="ae-small">Only the GidiReads admin team can review your application. Your answers will not be shown publicly.</p></section></main>




`;

export default function AeApplyPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      try { await import("../../js/site-header.js"); } catch (e) { console.error('module load failed', "js/site-header.js", e); }
      try { await import("../../js/ae-apply.js"); } catch (e) { console.error('module load failed', "js/ae-apply.js", e); }
      try { await import("../../js/site-footer.js"); } catch (e) { console.error('module load failed', "js/site-footer.js", e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-ae-apply');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-ae-apply" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
