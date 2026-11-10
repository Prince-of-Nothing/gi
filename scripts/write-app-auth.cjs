const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('src/pages/generated/manifest.json','utf8'));
const publicBases = new Set(['explore','story','reader','author','collection','rankings','community','community-space','terms','welcome','auth','reset-password','holiday-hearts','holiday-hearts-entry','people','opportunities','opportunity','ae','ae-apply','ae-author-feedback','ae-draft-review','ae-review','reading-list']);
const imports = manifest.map(m => `import ${m.comp} from './pages/generated/${m.comp}.jsx';`).join('\n');
function wrap(base, el) { return publicBases.has(base) ? el : `<RequireAuth>${el}</RequireAuth>`; }
const routes = manifest.map(m => {
  if (m.base === 'explore') {
    return `        <Route path="/explore" element={<Layout><Explore /></Layout>} />\n        <Route path="/explore.html" element={<Layout><Explore /></Layout>} />`;
  }
  if (m.base === 'auth') {
    return `        <Route path="/auth" element={<AuthPage />} />\n        <Route path="/auth.html" element={<AuthPage />} />`;
  }
  const el = `<${m.comp} />`;
  const wrapped = wrap(m.base, el);
  return `        <Route path="${m.route}" element={${wrapped}} />\n        <Route path="/${m.base}.html" element={${wrapped}} />`;
}).join('\n');

const app = `import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Home from './pages/Home.jsx';
import Explore from './pages/Explore.jsx';
import AuthPage from './pages/AuthPage.jsx';
${imports}

export default function App() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/index.html" element={<Layout><Home /></Layout>} />
${routes}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
`;
fs.writeFileSync('src/App.jsx', app, 'utf8');
console.log('updated app');
