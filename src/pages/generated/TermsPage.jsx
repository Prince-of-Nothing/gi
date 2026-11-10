import React from 'react';

const HTML = `

<a class="skip-link" href="#main-content">Skip to main content</a>
<div class="doc-draft-notice" aria-label="Draft notice">This page is a draft and may change before final release.</div>



<main role="main" id="main-content">
 <div class="page-container">
  <section class="doc-section" aria-labelledby="termsTitle">
   <h1 id="termsTitle">Terms of Service</h1>
   <p class="doc-eyebrow">TERMS &amp; CONDITIONS</p>
   <p>Last updated: November 2026</p>
  </section>

  <section class="doc-section" aria-labelledby="acceptTitle">
   <h2 id="acceptTitle">Acceptance of terms</h2>
   <p>By accessing or using GidiReads, you agree to these terms of service. If you do not agree, you may not use the platform.</p>
  </section>

  <section class="doc-section" aria-labelledby="useTitle">
   <h2 id="useTitle">Use of the platform</h2>
   <p>You may use GidiReads to read, write, and share stories. You are responsible for the content you post and must not upload content you do not have the right to share.</p>
  </section>

  <section class="doc-section" aria-labelledby="contentTitle">
   <h2 id="contentTitle">Content ownership</h2>
   <p>You retain ownership of your stories and other content you publish on GidiReads. By publishing, you grant GidiReads a licence to display and distribute your content on the platform.</p>
  </section>

  <section class="doc-section" aria-labelledby="conductTitle">
   <h2 id="conductTitle">Community standards</h2>
   <p>Be respectful to other users. Harassment, hate speech, and illegal content are not permitted and may result in account suspension or removal.</p>
  </section>

  <section class="doc-section" aria-labelledby="changesTitle">
   <h2 id="changesTitle">Changes to these terms</h2>
   <p>We may update these terms from time to time. Continued use of GidiReads after changes are posted means you accept the new terms.</p>
  </section>

  <section class="doc-section" aria-labelledby="contactTermsTitle">
   <h2 id="contactTermsTitle">Questions?</h2>
   <p>If you have questions about these terms, contact us.</p>
  </section>
 </div>
</main>







`;

export default function TermsPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "gr-page";
    const _added = [];
    (async () => {
      try { await import("../../js/site-header.js"); } catch (e) { console.error('module load failed', "js/site-header.js", e); }
      try { await import("../../js/theme.js"); } catch (e) { console.error('module load failed', "js/theme.js", e); }
      try { await import("../../js/site-footer.js"); } catch (e) { console.error('module load failed', "js/site-footer.js", e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-terms');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-terms" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
