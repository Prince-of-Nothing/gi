import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';

function LegacyRedirect({ to }) {
  React.useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return <div style={{ padding: 24 }}>Loading…</div>;
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/index.html" element={<Home />} />
          {/* Incremental migration: routes not yet ported fall back to existing static pages */}
          <Route path="*" element={<LegacyRedirect to={window.location.pathname + window.location.search + window.location.hash} />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
