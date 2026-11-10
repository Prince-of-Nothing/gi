import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Explore from './pages/Explore.jsx';
import LegacyHtmlPage from './pages/LegacyHtmlPage.jsx';

const legacyPages = [
  { file: 'account.html', path: '/account', cls: '' },
  { file: 'admin-economy.html', path: '/admin-economy', cls: '' },
  { file: 'admin.html', path: '/admin', cls: '' },
  { file: 'ae-apply.html', path: '/ae-apply', cls: '' },
  { file: 'ae-author-feedback.html', path: '/ae-author-feedback', cls: '' },
  { file: 'ae-draft-review.html', path: '/ae-draft-review', cls: '' },
  { file: 'ae-review.html', path: '/ae-review', cls: '' },
  { file: 'ae.html', path: '/ae', cls: '' },
  { file: 'analytics.html', path: '/analytics', cls: '' },
  { file: 'auth.html', path: '/auth', cls: 'gr-auth-page' },
  { file: 'author-notes.html', path: '/author-notes', cls: '' },
  { file: 'author.html', path: '/author', cls: 'author-profile-page' },
  { file: 'authors-studio.html', path: '/authors-studio', cls: '' },
  { file: 'chapter-editor.html', path: '/chapter-editor', cls: '' },
  { file: 'chapter-pricing.html', path: '/chapter-pricing', cls: '' },
  { file: 'collection.html', path: '/collection', cls: '' },
  { file: 'community-space.html', path: '/community-space', cls: '' },
  { file: 'community.html', path: '/community', cls: '' },
  { file: 'contract-center.html', path: '/contract-center', cls: '' },
  { file: 'create-story.html', path: '/create-story', cls: '' },
  { file: 'creator-earnings.html', path: '/creator-earnings', cls: '' },
  { file: 'explore.html', path: '/explore-legacy', cls: 'explore-page' },
  { file: 'holiday-hearts-entry.html', path: '/holiday-hearts-entry', cls: '' },
  { file: 'holiday-hearts.html', path: '/holiday-hearts', cls: '' },
  { file: 'library.html', path: '/library', cls: 'library-page' },
  { file: 'moderator.html', path: '/moderator', cls: '' },
  { file: 'my-gidireads.html', path: '/my-gidireads', cls: '' },
  { file: 'my-stories.html', path: '/my-stories', cls: '' },
  { file: 'notifications.html', path: '/notifications', cls: '' },
  { file: 'opportunities.html', path: '/opportunities', cls: '' },
  { file: 'opportunity.html', path: '/opportunity', cls: '' },
  { file: 'people.html', path: '/people', cls: '' },
  { file: 'rankings.html', path: '/rankings', cls: '' },
  { file: 'reader.html', path: '/reader', cls: 'reader-body' },
  { file: 'reading-list.html', path: '/reading-list', cls: '' },
  { file: 'reset-password.html', path: '/reset-password', cls: '' },
  { file: 'settings.html', path: '/settings', cls: '' },
  { file: 'store.html', path: '/store', cls: '' },
  { file: 'story-bible.html', path: '/story-bible', cls: '' },
  { file: 'story-metadata.html', path: '/story-metadata', cls: '' },
  { file: 'story-publishing.html', path: '/story-publishing', cls: '' },
  { file: 'story-workspace.html', path: '/story-workspace', cls: '' },
  { file: 'story.html', path: '/story', cls: '' },
  { file: 'terms.html', path: '/terms', cls: '' },
  { file: 'test.html', path: '/test', cls: '' },
  { file: 'welcome.html', path: '/welcome', cls: '' },
];

function LegacyRoute({ file, cls }) {
  return (
    <Layout chrome={false}>
      <LegacyHtmlPage src={'/' + file} bodyClass={cls} />
    </Layout>
  );
}

function FallbackToStatic() {
  React.useEffect(() => {
    window.location.replace(window.location.pathname + window.location.search + window.location.hash);
  }, []);
  return <div style={{ padding: 24 }}>Loading…</div>;
}

export default function App() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/index.html" element={<Layout><Home /></Layout>} />
        <Route path="/explore" element={<Layout><Explore /></Layout>} />
        {legacyPages.map((p) => (
          <Route key={p.path} path={p.path} element={<LegacyRoute file={p.file} cls={p.cls} />} />
        ))}
        {legacyPages.map((p) => (
          <Route key={p.file} path={'/' + p.file} element={<LegacyRoute file={p.file} cls={p.cls} />} />
        ))}
        {/* Safety fallback for anything unexpected */}
        <Route path="*" element={<FallbackToStatic />} />
      </Routes>
    </Suspense>
  );
}
