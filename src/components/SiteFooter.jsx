import React from 'react';

export default function SiteFooter() {
  return (
    <footer role="contentinfo" className="site-footer gr-site-footer">
      <div className="footer-inner gr-footer-inner">
        <div className="gr-footer-top">
          <a className="gr-footer-logo" href="#" data-theme-toggle aria-label="Switch theme"><img className="brand-mark small" src="assets/gidireads-logo.png" alt="GidiReads" /></a>
        </div>
        <div className="gr-footer-text-row">
          <p className="footer-tagline">Not just stories, but a voice for all.</p>
          <p className="footer-origin">Born in Africa. Built for storytellers everywhere.</p>
        </div>
        <div className="footer-columns gr-footer-columns">
          <div className="footer-col"><h3>Discover</h3><a href="explore.html">Explore</a><a href="explore.html#genres">Genres</a><a href="explore.html#tropes">Tropes</a><a href="explore.html?sort=new">New releases</a><a href="explore.html?sort=trending">Trending</a></div>
          <div className="footer-col"><h3>Read</h3><a href="library.html">Library</a><a href="library.html">Continue reading</a><a href="explore.html">Echoes</a></div>
          <div className="footer-col"><h3>Create</h3><a href="my-stories.html">Write on GidiReads</a><a href="authors-studio.html">Authors Studio</a><a href="explore.html">Authors</a></div>
          <div className="footer-col"><h3>GidiReads</h3><span className="footer-static-item">About</span><span className="footer-static-item">Help</span><span className="footer-static-item">Contact</span><span className="footer-static-item">Privacy</span><span className="footer-static-item">Terms</span></div>
        </div>
        <div className="footer-bottom gr-footer-bottom"><p>GidiReads — Not just stories, but a voice for all.</p><span>© GidiReads</span></div>
      </div>
    </footer>
  );
}
