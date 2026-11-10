import React from 'react';

// Generic bridge: loads a static HTML page, injects its head assets/body content, and runs its scripts.
// Used to route legacy pages through the React SPA shell during incremental migration.
export default function LegacyHtmlPage({ src, bodyClass = '' }) {
  const [html, setHtml] = React.useState('');
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);
    setHtml('');
    const file = src && src.endsWith('.html') ? src.replace(/^\//, '') : '';
    const base = import.meta.env.BASE_URL || '/';
    const fetchSrc = file ? `${base}legacy-html/${file}` : src;
    fetch(fetchSrc, { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${fetchSrc} (${r.status})`);
        return r.text();
      })
      .then((text) => { if (!cancelled) setHtml(text); })
      .catch((e) => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, [src]);

  React.useEffect(() => {
    if (!html) return;
    const prevBodyClass = document.body.className;
    const prevOverflow = document.body.style.overflow;
    const prevTitle = document.title;
    let cancelled = false;
    const addedHeadNodes = [];

    const isSameHeadAsset = (el) => {
      if (el.tagName === 'LINK') {
        const rel = (el.getAttribute('rel') || '').toLowerCase();
        const href = el.getAttribute('href');
        if (!href) return false;
        return !!Array.from(document.head.querySelectorAll('link')).find((n) => n.getAttribute('href') === href && (n.getAttribute('rel') || '').toLowerCase() === rel);
      }
      if (el.tagName === 'SCRIPT') {
        const srcAttr = el.getAttribute('src');
        if (!srcAttr) return false;
        return !!Array.from(document.head.querySelectorAll('script')).find((n) => n.getAttribute('src') === srcAttr);
      }
      return false;
    };

    (async () => {
      try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const body = doc.body;

        // Apply page-specific head assets (stylesheets, scripts) not already present.
        Array.from(doc.head.querySelectorAll('link[rel="stylesheet"], link[rel="manifest"], link[rel="icon"], link[rel="apple-touch-icon"], script[src], meta[name="theme-color"]')).forEach((node) => {
          if (isSameHeadAsset(node)) return;
          const clone = node.cloneNode(true);
          clone.setAttribute('data-legacy-head', src);
          document.head.appendChild(clone);
          addedHeadNodes.push(clone);
        });
        const title = doc.querySelector('title')?.textContent;
        if (title) document.title = title;

        if (bodyClass) document.body.className = bodyClass;
        else document.body.className = body.className || '';

        const container = document.getElementById('legacy-page-root');
        if (!container) return;
        container.innerHTML = body.innerHTML;

        // Execute scripts in document order (including inline boot scripts)
        const scripts = Array.from(container.querySelectorAll('script'));
        for (const old of scripts) {
          if (cancelled) return;
          const s = document.createElement('script');
          for (const { name, value } of Array.from(old.attributes)) s.setAttribute(name, value);
          if (!old.src) s.textContent = old.textContent;
          const parent = old.parentNode;
          if (parent) parent.replaceChild(s, old);
          if (s.src && s.type !== 'module') {
            await new Promise((resolve) => {
              s.addEventListener('load', resolve, { once: true });
              s.addEventListener('error', resolve, { once: true });
            });
          }
        }
      } catch (e) {
        if (!cancelled) setError(e);
      }
    })();

    return () => {
      cancelled = true;
      document.body.className = prevBodyClass;
      document.body.style.overflow = prevOverflow;
      document.title = prevTitle;
      addedHeadNodes.forEach((n) => n.remove());
      const container = document.getElementById('legacy-page-root');
      if (container) container.innerHTML = '';
    };
  }, [html, bodyClass, src]);

  if (error) return <div style={{ padding: 24 }}>Failed to load page.</div>;
  if (!html) return <div style={{ padding: 24 }}>Loading…</div>;
  return <div id="legacy-page-root" />;
}
