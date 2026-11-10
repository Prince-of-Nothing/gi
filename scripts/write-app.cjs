const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('src/pages/generated/manifest.json','utf8'));
const imports = manifest.map(m => `import ${m.comp} from './pages/generated/${m.comp}.jsx';`).join('\n');
const routes = manifest.map(m => {
  if (m.base === 'explore') {
    return `        <Route path="/explore" element={<Layout><Explore /></Layout>} />\n        <Route path="/explore.html" element={<Layout><Explore /></Layout>} />`;
  }
  return `        <Route path="${m.route}" element={<${m.comp} />} />\n        <Route path="/${m.base}.html" element={<${m.comp} />} />`;
}).join('\n');

const app = `import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Explore from './pages/Explore.jsx';
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
console.log('app written');
