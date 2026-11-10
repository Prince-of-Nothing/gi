// check-site.js — automated site health checker
// Usage: node check-site.js [baseUrl]
// Default baseUrl: http://localhost:3000
// Requires the dev server to be running (node %TEMP%/opencode/server.js).

const baseUrl = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const pages = fs.readdirSync(root).filter(f => f.endsWith('.html')).sort();

async function fetchStatus(url) {
  try {
    const res = await fetch(url);
    return { status: res.status, ok: res.ok, size: (await res.text()).length };
  } catch (e) {
    return { status: 0, ok: false, error: String(e) };
  }
}

const report = { baseUrl, checkedAt: new Date().toISOString(), pages: [], summary: { pages: 0, ok: 0, failed: 0, missingAssets: 0 } };

(async () => {
  for (const page of pages) {
    const pageUrl = baseUrl + '/' + page;
    const r = await fetchStatus(pageUrl);
    const entry = { page, status: r.status, ok: r.ok, assets: [], missingAssets: [] };
    if (r.ok) {
      // fetch again to parse refs
      const html = await fetch(pageUrl).then(x => x.text());
      const refRe = /(?:href|src)=["']([^"']+)["']/g;
      const refs = new Set();
      let m;
      while ((m = refRe.exec(html)) !== null) {
        const u = m[1];
        if (u.startsWith('http') || u.startsWith('//') || u.startsWith('#') || u.startsWith('data:') || u.startsWith('javascript:')) continue;
        const clean = u.split('?')[0].split('#')[0];
        if (clean) refs.add(clean);
      }
      // also dynamic ./ refs (only bare filenames, not already foldered)
      const dynRe = /\.\/(?!js\/|css\/)([A-Za-z0-9_.-]+)/g;
      while ((m = dynRe.exec(html)) !== null) refs.add('js/' + m[1]); // best-effort
      for (const ref of refs) {
        const assetUrl = baseUrl + '/' + ref;
        const ar = await fetchStatus(assetUrl);
        entry.assets.push({ ref, status: ar.status, ok: ar.ok });
        if (!ar.ok) { entry.missingAssets.push(ref); report.summary.missingAssets++; }
      }
    }
    report.pages.push(entry);
    report.summary.pages++;
    if (entry.ok && entry.missingAssets.length === 0) report.summary.ok++;
    else report.summary.failed++;
    process.stdout.write(`${entry.ok && !entry.missingAssets.length ? 'OK  ' : 'FAIL'} ${page} (${r.status}) missing=${entry.missingAssets.length}\n`);
  }
  fs.writeFileSync(path.join(root, 'site-check-report.json'), JSON.stringify(report, null, 2));
  console.log('\nSummary:', JSON.stringify(report.summary));
  console.log('Report written to site-check-report.json');
})();
