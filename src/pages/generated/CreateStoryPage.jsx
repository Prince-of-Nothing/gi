import React from 'react';

const HTML = `
<div class="shell"><aside class="sidebar" id="sidebar"><div><div class="brand"><a href="index.html"><span class="logo"><b>G</b><b>R</b></span><span>GidiReads</span></a><small>AUTHORS STUDIO</small><button id="closeMenu" type="button">×</button></div><nav><a href="authors-studio.html">01 <b>Home</b></a><a href="my-stories.html">02 <b>My Stories</b></a><a class="active" href="create-story.html">03 <b>Create Story</b></a><a href="contract-center.html">04 <b>Contract Center</b></a><a href="creator-earnings.html">05 <b>Earnings</b></a><a href="analytics.html">06 <b>Insights</b></a><hr><a class="studio-nav-item"  href="opportunities.html">07 <b>Opportunities</b></a><a href="notifications.html">09 <b>Notifications</b></a><a href="account.html">10 <b>Author Profile</b></a></nav></div><div class="bottom"><p>— Make room for the story.</p><a href="index.html">← Back to GidiReads</a></div></aside><div class="backdrop" id="backdrop"></div><main>
<div id="contestModeBanner" class="contest-mode-banner" hidden><strong>Holiday Hearts story setup</strong><p id="contestPromptNotice">Create your story here. You must publish it and submit it through Opportunities to enter the contest.</p><a href="opportunities.html#holiday-hearts">Read contest rules and submit entry</a></div>
<header><button id="menu" type="button" aria-label="Open menu">☰</button><div class="crumb">GidiReads <i>/</i> Authors Studio <i>/</i> <strong>Create Story</strong></div><div class="actions"><button id="theme" type="button"><span>☾</span> <b>Dark</b></button><a href="account.html">Profile</a></div></header><div class="content"><section class="intro"><div><p class="eyebrow">THE AUTHOR'S DESK · NEW WORK</p><h1>Build your story.</h1><p>Start with the shape of the book. You can refine the details as the story takes form.</p></div><div class="save" id="save" role="status" title="Your progress is saved automatically in this browser on this device.">● Autosave is on</div></section><section class="progress"><div class="ptop"><div><p class="eyebrow">CREATE STORY</p><strong id="stepTitle">01 · Basics</strong></div><span id="stepCount">1 of 8</span></div><div class="track"><span id="fill"></span></div><ol><li class="active"><span>01</span>Basics</li><li><span>02</span>Classification</li><li><span>03</span>Discovery</li><li><span>04</span>Audience</li><li><span>05</span>Setting &amp; Context</li><li><span>06</span>Story Cover</li><li><span>07</span>Content &amp; Rights</li><li><span>08</span>Review</li></ol></section><section class="grid"><article class="paper"><div class="heading"><div><small>01</small><h2>Begin with the basics</h2></div><p>These are the first details that define the work. Nothing is published from this screen.</p></div><div class="form"><label>Story title<input id="title" type="text" maxlength="120" placeholder="Give your story a name"><div class="meta"><small>A title can change later.</small><b id="titleCount">0 / 120</b></div></label><label>Synopsis<textarea id="description" maxlength="1500" rows="6" placeholder="What is this story about?"></textarea><div class="meta"><small>Your synopsis can be detailed enough to introduce the story.</small><b id="descriptionCount">0 / 1500</b></div></label><div class="row"><label>Language<select id="language"><option>English</option><option>French</option><option>Spanish</option><option>Portuguese</option><option>Other</option></select></label><fieldset><legend>Format</legend><div class="formats"><label><input type="radio" name="format" value="Novel" checked><span>Novel</span></label><label><input type="radio" name="format" value="Novella"><span>Novella</span></label><label><input type="radio" name="format" value="Short Story"><span>Short Story</span></label><label><input type="radio" name="format" value="Other"><span>Other</span></label></div></fieldset></div></div></article><article class="paper classification-paper" id="classificationPanel" hidden>
<div class="heading"><div><small>02</small><h2>Classify the story</h2></div><p>Choose the categories that best describe the work. Primary genre is required; secondary genres and subgenres are optional.</p></div>
<div class="classification-stack">
<section class="picker-section"><div class="picker-heading"><div><span class="picker-label">Primary genre</span><p>Choose one.</p></div><b id="primaryCount">0 / 1</b></div><div class="search-box"><input id="primarySearch" type="search" placeholder="Search genres…" autocomplete="off"></div><div class="term-grid" id="primaryTerms"></div><div class="selected-line" id="primarySelected">No primary genre selected.</div></section>
<section class="picker-section"><div class="picker-heading"><div><span class="picker-label">Secondary genres</span><p>Choose up to three.</p></div><b id="secondaryCount">0 / 3</b></div><div class="search-box"><input id="secondarySearch" type="search" placeholder="Search secondary genres…" autocomplete="off"></div><div class="term-grid" id="secondaryTerms"></div><div class="selected-chips" id="secondarySelected"></div></section>
<section class="picker-section"><div class="picker-heading"><div><span class="picker-label">Subgenres</span><p>Choose up to three.</p></div><b id="subgenreCount">0 / 3</b></div><div class="search-box"><input id="subgenreSearch" type="search" placeholder="Search subgenres…" autocomplete="off"></div><div class="term-grid" id="subgenreTerms"></div><div class="selected-chips" id="subgenreSelected"></div></section>
<div class="classification-message" id="classificationMessage" aria-live="polite"></div>
</div></article><article class="paper discovery-paper" id="discoveryPanel" hidden>
<div class="heading"><div><small>03</small><h2>Help readers find the story</h2></div><p>Use tropes and tags to describe the story more precisely. These choices help discovery without replacing the author's own voice.</p></div>
<div class="discovery-stack">
<div class="discovery-intro"><p>Choose only what genuinely fits. You can refine these later.</p></div>
<section class="discovery-section"><div class="discovery-heading"><div><span class="discovery-label">Tropes</span><p>Choose up to 20.</p></div><b id="tropeCount">0 / 20</b></div><div class="discovery-search"><input id="tropeSearch" type="search" placeholder="Search tropes…" autocomplete="off"></div><div class="discovery-results" id="tropeResults" aria-live="polite"></div><div class="discovery-chips" id="tropeSelected"></div></section>
<section class="discovery-section"><div class="discovery-heading"><div><span class="discovery-label">Tags</span><p>Choose up to 50.</p></div><b id="tagCount">0 / 50</b></div><div class="discovery-search"><input id="tagSearch" type="search" placeholder="Search tags…" autocomplete="off"></div><div class="discovery-results" id="tagResults" aria-live="polite"></div><div class="discovery-chips" id="tagSelected"></div></section>
<div class="discovery-message" id="discoveryMessage" aria-live="polite"></div>
</div></article><article class="paper audience-paper" id="audiencePanel" hidden>
<div class="heading"><div><small>04</small><h2>Know who the story is for</h2></div><p>Choose the audience that best reflects the story's intended readership. This helps GidiReads present the work appropriately.</p></div>
<div class="audience-stack">
<div class="audience-intro"><p>Select one audience. This is about the story's intended readership, not a judgment of the author's writing.</p></div>
<div class="audience-grid" id="audienceOptions" aria-live="polite"></div>
<div class="audience-message" id="audienceMessage" aria-live="polite"></div>
</div></article><article class="paper context-paper" id="contextPanel" hidden>
<div class="heading"><div><small>05</small><h2>Place the story.</h2></div><p>Tell readers where the story is rooted. Choose one primary setting and one region or cultural context.</p></div>
<div class="context-stack">
<section class="context-section"><div class="context-heading"><div><span class="context-label">Setting</span><p>Choose one. Use “Multiple Locations” when the story moves between significant settings.</p></div><b id="settingCount">0 / 1</b></div><div class="context-search"><input id="settingSearch" type="search" placeholder="Search settings…" autocomplete="off"></div><div class="context-results" id="settingResults" aria-live="polite"></div><div class="context-selected" id="settingSelected"></div></section>
<section class="context-section"><div class="context-heading"><div><span class="context-label">Region / Cultural Context</span><p>Choose the region or cultural context that best represents the story.</p></div><b id="regionCount">0 / 1</b></div><div class="context-search"><input id="regionSearch" type="search" placeholder="Search regions or cultural contexts…" autocomplete="off"></div><div class="context-results" id="regionResults" aria-live="polite"></div><div class="context-selected" id="regionSelected"></div></section>
<div class="context-message" id="contextMessage" aria-live="polite"></div>
</div></article><article class="paper cover-paper" id="coverPanel" hidden>
<div class="heading"><div><small>06</small><h2>Give the story its cover.</h2></div><p>Upload a portrait cover that represents the story. GidiReads recommends a 5:8 cover so the full artwork sits naturally in story cards without being cropped.</p></div>
<div class="cover-layout">
<section class="cover-upload-section">
<div class="cover-guidance"><span class="cover-kicker">COVER REQUIREMENT</span><strong>Recommended: 1600 × 2560 px</strong><p>That is a 5:8 portrait ratio. Other dimensions can still be uploaded; the preview will show how the complete cover fits inside the GidiReads frame.</p><ul><li>JPG, PNG or WebP</li><li>Use a clear, high-resolution portrait image</li><li>Your original image is preserved; this step does not crop it</li></ul></div>
<label class="cover-drop" id="coverDrop"><input id="coverInput" type="file" accept="image/jpeg,image/png,image/webp"><span class="cover-drop-icon">+</span><strong id="coverDropTitle">Choose a cover</strong><small id="coverDropText">Tap to upload a JPG, PNG or WebP image.</small></label>
<div class="cover-actions"><button type="button" class="cover-secondary" id="removeCover">Remove cover</button><span id="coverStatus" aria-live="polite">No cover selected yet.</span></div>
</section>
<section class="cover-preview-section">
<div class="cover-preview-heading"><div><span>Cover preview</span><small>5:8 display frame</small></div></div>
<div class="cover-preview-frame" id="coverPreviewFrame"><div class="cover-empty"><span>G</span><small>Your cover will appear here</small></div><img id="coverPreviewImage" alt="Story cover preview" hidden></div>
<div class="cover-fit-controls"><span>Fit</span><button type="button" class="fit-button active" data-fit="contain">Full cover</button><button type="button" class="fit-button" data-fit="cover">Fill frame</button></div>
<p class="cover-fit-note" id="coverFitNote">Full cover keeps the entire artwork visible. This is the default.</p>
<div class="cover-dimensions" id="coverDimensions">No image selected.</div>
</section>
</div></article>
<article class="paper rights-paper" id="rightsPanel" hidden>
<div class="heading"><div><small>07</small><h2>Content &amp; Rights</h2></div><p>Set the basic content and rights information that helps GidiReads handle the story responsibly and understand future creator opportunities.</p></div>
<div class="rights-stack">
<section class="rights-section"><div class="rights-heading"><div><span class="rights-label">Content rating</span><p>Choose the rating that best reflects the story's overall content.</p></div></div><div class="rights-options" id="ratingOptions" aria-live="polite">
<button type="button" class="rights-option selected" data-rating="General"><span><strong>General</strong><small>Suitable for a broad audience.</small></span><b>✓</b></button>
<button type="button" class="rights-option" data-rating="Teen"><span><strong>Teen</strong><small>Intended for teen readers and may contain age-appropriate mature themes.</small></span><b>+</b></button>
<button type="button" class="rights-option" data-rating="Mature"><span><strong>Mature</strong><small>Intended for adult readers. Accurate audience classification is required.</small></span><b>+</b></button>
</div></section>
<section class="rights-section"><div class="rights-heading"><div><span class="rights-label">Story rights</span><p>Confirm that you have the right to publish this work on GidiReads.</p></div></div><label class="rights-check"><input id="rightsConfirm" type="checkbox"><span><strong>I confirm that I own the rights to this story or have permission to publish it.</strong><small>GidiReads does not take ownership of your story simply because you publish it here.</small></span></label></section>
<section class="rights-section"><div class="rights-heading"><div><span class="rights-label">Adaptation availability</span><p>This helps future GidiReads Studios opportunities understand whether you are open to adaptation conversations.</p></div></div><div class="rights-options" id="adaptationOptions">
<button type="button" class="rights-option selected" data-adaptation="Not Available"><span><strong>Not Available</strong><small>I am not currently offering this story for adaptation.</small></span><b>✓</b></button>
<button type="button" class="rights-option" data-adaptation="Available"><span><strong>Available</strong><small>I am open to adaptation opportunities.</small></span><b>+</b></button>
<button type="button" class="rights-option" data-adaptation="Negotiable"><span><strong>Negotiable</strong><small>I may consider opportunities depending on the project and terms.</small></span><b>+</b></button>
</div><p class="rights-note">This is an availability signal, not a transfer of rights or a contract.</p></section>
<div class="rights-message" id="rightsMessage" aria-live="polite"></div>
</div></article>
<article class="paper review-paper" id="reviewPanel" hidden>
<div class="heading"><div><small>08</small><h2>Review the story.</h2></div><p>Check the details before the later save and publishing steps are connected.</p></div>
<div class="review-grid" id="reviewGrid"></div>
<div class="review-message" id="reviewMessage">Everything above is still local to this creation session. Creating the story will save it as a Draft in GidiReads.</div>
<div class="creation-state" id="creationState" hidden></div>
</article>
<aside class="preview"><div class="pk">LIVE PREVIEW <i></i></div><div class="book"><div class="cover"><strong id="initial">G</strong><small>GidiReads</small></div><div class="bookcopy"><small id="format">NOVEL</small><h3 id="previewTitle">Untitled story</h3><i></i><p id="previewDescription">Your synopsis will appear here as you shape the story.</p><span id="previewLanguage">English</span></div></div><div class="note"><b>01</b><p>This is a visual preview for Step 1. It does not create or publish a story yet.</p></div></aside></section></div></main></div>


`;

export default function CreateStoryPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "";
    const _added = [];
    (async () => {
      // skipped legacy site-header.js
      try { await import("../../js/create-story-step1.js"); } catch (e) { console.error('module load failed', "js/create-story-step1.js", e); }
      // skipped legacy site-footer.js
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-create-story');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-create-story" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
