const fs = require('fs');
const path = require('path');

const dist = path.resolve('dist');
const legacyDir = path.join(dist, 'legacy-html');
fs.mkdirSync(legacyDir, { recursive: true });

const htmlFiles = fs.readdirSync(dist).filter(f => f.endsWith('.html'));
for (const file of htmlFiles) {
  if (file === 'index.html' || file === '404.html') continue;
  const src = path.join(dist, file);
  const dest = path.join(legacyDir, file);
  fs.copyFileSync(src, dest);

  const route = file.replace(/\.html$/i, '');
  const redirectHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redirecting…</title>
</head>
<body>
  <script>
    (function() {
      var route = ${JSON.stringify(route)};
      var parts = window.location.pathname.split('/');
      parts[parts.length - 1] = route;
      var target = parts.join('/') + window.location.search + window.location.hash;
      window.location.replace(target);
    })();
  </script>
  Redirecting…
</body>
</html>`;
  fs.writeFileSync(src, redirectHtml, 'utf8');
}

fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
console.log('postbuild: legacy html preserved and redirects created');
