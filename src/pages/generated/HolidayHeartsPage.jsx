import React from 'react';

const HTML = `


<div id="pageTransition" class="page-transition"></div>

<main role="main" class="hh" id="hhMain" id="main-content">
 <p class="hh-back"><a href="opportunities.html">    All opportunities</a></p>

 <section class="hh-hero" id="hhHero" aria-labelledby="hhTitle">
  <div class="hh-hero-poster"><img src="assets/Opportunities/holiday-hearts-main.jpg" alt="Holiday Hearts: a couple dancing at a winter orchestra. Pick your prompt." fetchpriority="high" decoding="async"></div>
  <div class="hh-hero-copy">
   <p class="oc-eyebrow">GIDIREADS PRESENTS</p>
   <h1 id="hhTitle">Holiday <em>Hearts</em></h1>
   <p class="hh-tagline">The Holiday Romance Writing Contest</p>
   <p class="hh-lead">Three prompts. One story that is yours. Write a holiday romance of 5,000 to 30,000 words, and the top three stories receive contract offers.</p>
   <div class="hh-stage" id="hhStage" role="status" aria-live="polite"><span class="hh-stage-dot"></span><div><strong id="hhStageLabel">Loading…</strong><span id="hhStageNote"></span></div></div>
   <div class="hh-hero-actions" id="hhHeroActions"></div>
   <ul class="hh-facts"><li><strong>Free</strong> to enter</li><li><strong>5,000–30,000</strong> words</li><li><strong>One</strong> entry per author</li></ul>
  </div>
 </section>

 <section class="hh-section" aria-labelledby="hhTimelineTitle">
  <p class="oc-eyebrow">THE TIMELINE</p><h2 id="hhTimelineTitle">Key dates</h2>
  <p class="hh-sub">All times are Lagos time (WAT).</p>
  <ol class="hh-timeline" id="hhTimeline"></ol>
 </section>

 <section class="hh-section" id="prompts" aria-labelledby="hhPromptsTitle">
  <p class="oc-eyebrow">CHOOSE YOUR PROMPT</p><h2 id="hhPromptsTitle">Three prompts. Pick one.</h2>
  <p class="hh-sub">Every entry follows exactly one official prompt. You can enter once.</p>
  <div class="hh-prompts" id="hhPrompts"></div>
 </section>

 <section class="hh-section hh-prize" id="prizes" aria-labelledby="hhPrizeTitle">
  <div class="hh-prize-poster"><img src="assets/Opportunities/holiday-hearts-contest.jpg" alt="Holiday Hearts: win a contract offer" loading="lazy" decoding="async"></div>
  <div class="hh-prize-copy">
   <p class="oc-eyebrow">THE PRIZE</p><h2 id="hhPrizeTitle">Win a contract offer</h2>
   <p class="hh-sub">The top three stories each receive a contract offer, plus promotion on GidiReads.</p>
   <div class="hh-prize-list" id="hhPrizes"></div>
   <p class="hh-fine">A contract offer is not an automatically signed contract. It depends on eligibility, editorial review, rights checks and your acceptance of the actual terms.</p>
  </div>
 </section>

 <section class="hh-section" id="enter" aria-labelledby="hhEnterTitle" hidden>
  <p class="oc-eyebrow">YOUR ENTRY</p><h2 id="hhEnterTitle">Enter Holiday Hearts</h2>
  <div id="hhEnterBody"></div>
 </section>

 <section class="hh-section" aria-labelledby="hhHowTitle">
  <p class="oc-eyebrow">HOW WINNERS ARE CHOSEN</p><h2 id="hhHowTitle">Readers decide, backed by real engagement</h2>
  <div class="hh-score" id="hhScore"></div>
  <p class="hh-fine" id="hhScoreNote"></p>
 </section>

 <section class="hh-section" aria-labelledby="hhRulesTitle">
  <p class="oc-eyebrow">THE RULES</p><h2 id="hhRulesTitle">Rules and eligibility</h2>
  <ul class="hh-rules" id="hhRules"></ul>
 </section>

 <section class="hh-section" id="stories" aria-labelledby="hhStoriesTitle">
  <p class="oc-eyebrow" id="hhStoriesEyebrow">THE STORIES</p><h2 id="hhStoriesTitle">Meet the stories</h2>
  <p class="hh-sub" id="hhStoriesSub">Approved entries appear here. Eligible participants may be publicly acknowledged.</p>
  <div class="hh-stories" id="hhStories" aria-live="polite"><p class="oc-state">Loading stories…</p></div>
 </section>

 <p class="oc-note"><strong>Fair play:</strong> The GidiReads team checks eligibility, reviews suspicious activity and confirms the official results. Entries that break the rules may be disqualified.</p>
</main>







`;

export default function HolidayHeartsPage() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = "oc-body hh-body";
    const _added = [];
    (async () => {
      try { await import("../../js/preload.js"); } catch (e) { console.error('module load failed', "js/preload.js", e); }
      try { await import("../../js/site-header.js"); } catch (e) { console.error('module load failed', "js/site-header.js", e); }
      try { await import("../../js/holiday-hearts.js"); } catch (e) { console.error('module load failed', "js/holiday-hearts.js", e); }
      try { await import("../../js/site-footer.js"); } catch (e) { console.error('module load failed', "js/site-footer.js", e); }
      try { await import("../../js/theme-sync.js"); } catch (e) { console.error('module load failed', "js/theme-sync.js", e); }
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-holiday-hearts');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-holiday-hearts" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
