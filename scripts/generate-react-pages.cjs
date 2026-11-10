const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, 'src', 'pages', 'generated');
fs.mkdirSync(outDir, { recursive: true });

function pascal(name) {
  return name.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '') + 'Page';
}
function getAttr(tag, attr) {
  const m = tag.match(new RegExp(attr + "=[\"']([^\"']*)[\"']", 'i'));
  return m ? m[1] : '';
}

const files = fs.readdirSync(root).filter(f => f.endsWith('.html') && f !== 'index.html').sort();
const manifest = [];

for (const file of files) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) continue;
  const bodyTag = bodyMatch[1] || '';
  const bodyClass = getAttr(bodyTag, 'class');
  let bodyInner = bodyMatch[2] || '';

  const scripts = [];
  bodyInner = bodyInner.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs) => {
    const src = getAttr(attrs, 'src');
    const type = (getAttr(attrs, 'type') || '').toLowerCase();
    const content = src ? null : (full.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i) || ['', ''])[1];
    scripts.push({ src, type, content });
    return '';
  });

  const headScripts = [];
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch) {
    headMatch[1].replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs) => {
      const src = getAttr(attrs, 'src');
      const type = (getAttr(attrs, 'type') || '').toLowerCase();
      if (src && type === 'module' && /^(\.?\/)?js\//.test(src)) {
        headScripts.push({ src, type, content: null });
      }
      return '';
    });
  }
  const allScripts = [...headScripts, ...scripts];

  const base = file.replace(/\.html$/i, '');
  const comp = pascal(base);
  const route = '/' + base;
  const escaped = bodyInner.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

  const runners = allScripts.map(s => {
    if (s.src) {
      const srcNorm = s.src.replace(/^\.\//, '');
      if (s.type === 'module') {
        if (/^js\//.test(srcNorm)) {
          const rel = '../../' + srcNorm; // from src/pages/generated
          return `      try { await import(${JSON.stringify(rel)}); } catch (e) { console.error('module load failed', ${JSON.stringify(srcNorm)}, e); }`;
        }
        return `      try { await import(/* @vite-ignore */ ${JSON.stringify(s.src)}); } catch (e) { console.error('module load failed', ${JSON.stringify(s.src)}, e); }`;
      }
      return `      await new Promise((resolve)=>{ const el=document.createElement('script'); el.src=${JSON.stringify(s.src)}; el.async=false; el.onload=resolve; el.onerror=resolve; document.body.appendChild(el); _added.push(el); });`;
    }
    if (s.content && s.content.trim()) {
      if (s.type === 'module') {
        return `      try { const blob=new Blob([${JSON.stringify(s.content)}],{type:'text/javascript'}); const u=URL.createObjectURL(blob); await import(/* @vite-ignore */ u); URL.revokeObjectURL(u); } catch(e){ console.error('inline module failed', e); }`;
      }
      return `      try { (0,eval)(${JSON.stringify(s.content)}); } catch(e){ console.error('inline script failed', e); }`;
    }
    return null;
  }).filter(Boolean).join('\n');

  const jsx = `import React from 'react';

const HTML = \`
${escaped}
\`;

export default function ${comp}() {
  React.useEffect(() => {
    const prevTitle = document.title;
    const prevClass = document.body.className;
    document.body.className = ${JSON.stringify(bodyClass || '')};
    const _added = [];
    (async () => {
${runners || '      // no scripts'}
    })();
    return () => {
      document.body.className = prevClass;
      document.title = prevTitle;
      _added.forEach(n => n.remove());
      const root = document.getElementById('page-${base}');
      if (root) root.innerHTML = '';
    };
  }, []);

  return <div id="page-${base}" dangerouslySetInnerHTML={{ __html: HTML }} />;
}
`;
  fs.writeFileSync(path.join(outDir, comp + '.jsx'), jsx, 'utf8');
  manifest.push({ file, base, route, comp, bodyClass });
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('generated', manifest.length);
