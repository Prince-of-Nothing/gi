// site-footer.js — injects the canonical site footer where missing.
(function(){
  'use strict';
  function ensureCss(href){
    if (document.querySelector('link[rel="stylesheet"][href*="'+href+'"]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }
  function inject(){
    if (document.querySelector('footer.site-footer')) return;
    ensureCss('css/style.css');
    ensureCss('css/footer-redesign.css');
    ensureCss('css/theme-light-fixes.css');
    const footer = `<footer role="contentinfo" class="site-footer gr-site-footer">
 <div class="footer-inner gr-footer-inner">
  <div class="gr-footer-top">
   <a class="gr-footer-logo" href="#" data-theme-toggle aria-label="Switch theme"><img class="brand-mark small" src="assets/gidireads-logo.png" alt="GidiReads" /></a>
  </div>
  <div class="gr-footer-text-row">
   <p class="footer-tagline">Not just stories, but a voice for all.</p>
   <p class="footer-origin">Born in Africa. Built for storytellers everywhere.</p>
  </div>
  <div class="footer-columns gr-footer-columns">
   <div class="footer-col"><h3>Discover</h3><a href="explore.html">Explore</a><a href="explore.html#genres">Genres</a><a href="explore.html#tropes">Tropes</a><a href="explore.html?sort=new">New releases</a><a href="explore.html?sort=trending">Trending</a></div>
   <div class="footer-col"><h3>Read</h3><a href="library.html">Library</a><a href="library.html">Continue reading</a><a href="explore.html">Echoes</a></div>
   <div class="footer-col"><h3>Create</h3><a href="my-stories.html">Write on GidiReads</a><a href="authors-studio.html">Authors Studio</a><a href="explore.html">Authors</a></div>
   <div class="footer-col"><h3>GidiReads</h3><span class="footer-static-item">About</span><span class="footer-static-item">Help</span><span class="footer-static-item">Contact</span><span class="footer-static-item">Privacy</span><span class="footer-static-item">Terms</span></div>
  </div>
  <div class="footer-bottom gr-footer-bottom"><p>GidiReads — Not just stories, but a voice for all.</p><span>© GidiReads</span></div>
 </div>
</footer>`;
    const div = document.createElement('div');
    div.innerHTML = footer;
    const el = div.firstElementChild;
    if (el) document.body.appendChild(el);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }
})();
