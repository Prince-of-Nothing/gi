import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Home from './pages/Home.jsx';
import Explore from './pages/Explore.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AccountPage from './pages/generated/AccountPage.jsx';
import AdminEconomyPage from './pages/generated/AdminEconomyPage.jsx';
import AdminPage from './pages/generated/AdminPage.jsx';
import AeApplyPage from './pages/generated/AeApplyPage.jsx';
import AeAuthorFeedbackPage from './pages/generated/AeAuthorFeedbackPage.jsx';
import AeDraftReviewPage from './pages/generated/AeDraftReviewPage.jsx';
import AeReviewPage from './pages/generated/AeReviewPage.jsx';
import AePage from './pages/generated/AePage.jsx';
import AnalyticsPage from './pages/generated/AnalyticsPage.jsx';
import AuthorNotesPage from './pages/generated/AuthorNotesPage.jsx';
import AuthorPage from './pages/generated/AuthorPage.jsx';
import AuthorsStudioPage from './pages/generated/AuthorsStudioPage.jsx';
import ChapterEditorPage from './pages/generated/ChapterEditorPage.jsx';
import ChapterPricingPage from './pages/generated/ChapterPricingPage.jsx';
import CollectionPage from './pages/generated/CollectionPage.jsx';
import CommunitySpacePage from './pages/generated/CommunitySpacePage.jsx';
import CommunityPage from './pages/generated/CommunityPage.jsx';
import ContractCenterPage from './pages/generated/ContractCenterPage.jsx';
import CreateStoryPage from './pages/generated/CreateStoryPage.jsx';
import CreatorEarningsPage from './pages/generated/CreatorEarningsPage.jsx';
import ExplorePage from './pages/generated/ExplorePage.jsx';
import HolidayHeartsEntryPage from './pages/generated/HolidayHeartsEntryPage.jsx';
import HolidayHeartsPage from './pages/generated/HolidayHeartsPage.jsx';
import LibraryPage from './pages/generated/LibraryPage.jsx';
import ModeratorPage from './pages/generated/ModeratorPage.jsx';
import MyGidireadsPage from './pages/generated/MyGidireadsPage.jsx';
import MyStoriesPage from './pages/generated/MyStoriesPage.jsx';
import NotificationsPage from './pages/generated/NotificationsPage.jsx';
import OpportunitiesPage from './pages/generated/OpportunitiesPage.jsx';
import OpportunityPage from './pages/generated/OpportunityPage.jsx';
import PeoplePage from './pages/generated/PeoplePage.jsx';
import RankingsPage from './pages/generated/RankingsPage.jsx';
import ReaderPage from './pages/generated/ReaderPage.jsx';
import ReadingListPage from './pages/generated/ReadingListPage.jsx';
import ResetPasswordPage from './pages/generated/ResetPasswordPage.jsx';
import SettingsPage from './pages/generated/SettingsPage.jsx';
import StorePage from './pages/generated/StorePage.jsx';
import StoryBiblePage from './pages/generated/StoryBiblePage.jsx';
import StoryMetadataPage from './pages/generated/StoryMetadataPage.jsx';
import StoryPublishingPage from './pages/generated/StoryPublishingPage.jsx';
import StoryWorkspacePage from './pages/generated/StoryWorkspacePage.jsx';
import StoryPage from './pages/generated/StoryPage.jsx';
import TermsPage from './pages/generated/TermsPage.jsx';
import TestPage from './pages/generated/TestPage.jsx';
import WelcomePage from './pages/generated/WelcomePage.jsx';

export default function App() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loadingâ€¦</div>}>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/index.html" element={<Layout><Home /></Layout>} />
        <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="/account.html" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="/admin-economy" element={<RequireAuth><AdminEconomyPage /></RequireAuth>} />
        <Route path="/admin-economy.html" element={<RequireAuth><AdminEconomyPage /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
        <Route path="/admin.html" element={<RequireAuth><AdminPage /></RequireAuth>} />
        <Route path="/ae-apply" element={<AeApplyPage />} />
        <Route path="/ae-apply.html" element={<AeApplyPage />} />
        <Route path="/ae-author-feedback" element={<AeAuthorFeedbackPage />} />
        <Route path="/ae-author-feedback.html" element={<AeAuthorFeedbackPage />} />
        <Route path="/ae-draft-review" element={<AeDraftReviewPage />} />
        <Route path="/ae-draft-review.html" element={<AeDraftReviewPage />} />
        <Route path="/ae-review" element={<AeReviewPage />} />
        <Route path="/ae-review.html" element={<AeReviewPage />} />
        <Route path="/ae" element={<AePage />} />
        <Route path="/ae.html" element={<AePage />} />
        <Route path="/analytics" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
        <Route path="/analytics.html" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth.html" element={<AuthPage />} />
        <Route path="/author-notes" element={<RequireAuth><AuthorNotesPage /></RequireAuth>} />
        <Route path="/author-notes.html" element={<RequireAuth><AuthorNotesPage /></RequireAuth>} />
        <Route path="/author" element={<AuthorPage />} />
        <Route path="/author.html" element={<AuthorPage />} />
        <Route path="/authors-studio" element={<RequireAuth><AuthorsStudioPage /></RequireAuth>} />
        <Route path="/authors-studio.html" element={<RequireAuth><AuthorsStudioPage /></RequireAuth>} />
        <Route path="/chapter-editor" element={<RequireAuth><ChapterEditorPage /></RequireAuth>} />
        <Route path="/chapter-editor.html" element={<RequireAuth><ChapterEditorPage /></RequireAuth>} />
        <Route path="/chapter-pricing" element={<RequireAuth><ChapterPricingPage /></RequireAuth>} />
        <Route path="/chapter-pricing.html" element={<RequireAuth><ChapterPricingPage /></RequireAuth>} />
        <Route path="/collection" element={<CollectionPage />} />
        <Route path="/collection.html" element={<CollectionPage />} />
        <Route path="/community-space" element={<CommunitySpacePage />} />
        <Route path="/community-space.html" element={<CommunitySpacePage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community.html" element={<CommunityPage />} />
        <Route path="/contract-center" element={<RequireAuth><ContractCenterPage /></RequireAuth>} />
        <Route path="/contract-center.html" element={<RequireAuth><ContractCenterPage /></RequireAuth>} />
        <Route path="/create-story" element={<RequireAuth><CreateStoryPage /></RequireAuth>} />
        <Route path="/create-story.html" element={<RequireAuth><CreateStoryPage /></RequireAuth>} />
        <Route path="/creator-earnings" element={<RequireAuth><CreatorEarningsPage /></RequireAuth>} />
        <Route path="/creator-earnings.html" element={<RequireAuth><CreatorEarningsPage /></RequireAuth>} />
        <Route path="/explore" element={<Layout><Explore /></Layout>} />
        <Route path="/explore.html" element={<Layout><Explore /></Layout>} />
        <Route path="/holiday-hearts-entry" element={<HolidayHeartsEntryPage />} />
        <Route path="/holiday-hearts-entry.html" element={<HolidayHeartsEntryPage />} />
        <Route path="/holiday-hearts" element={<HolidayHeartsPage />} />
        <Route path="/holiday-hearts.html" element={<HolidayHeartsPage />} />
        <Route path="/library" element={<RequireAuth><LibraryPage /></RequireAuth>} />
        <Route path="/library.html" element={<RequireAuth><LibraryPage /></RequireAuth>} />
        <Route path="/moderator" element={<RequireAuth><ModeratorPage /></RequireAuth>} />
        <Route path="/moderator.html" element={<RequireAuth><ModeratorPage /></RequireAuth>} />
        <Route path="/my-gidireads" element={<RequireAuth><MyGidireadsPage /></RequireAuth>} />
        <Route path="/my-gidireads.html" element={<RequireAuth><MyGidireadsPage /></RequireAuth>} />
        <Route path="/my-stories" element={<RequireAuth><MyStoriesPage /></RequireAuth>} />
        <Route path="/my-stories.html" element={<RequireAuth><MyStoriesPage /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="/notifications.html" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/opportunities.html" element={<OpportunitiesPage />} />
        <Route path="/opportunity" element={<OpportunityPage />} />
        <Route path="/opportunity.html" element={<OpportunityPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/people.html" element={<PeoplePage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/rankings.html" element={<RankingsPage />} />
        <Route path="/reader" element={<ReaderPage />} />
        <Route path="/reader.html" element={<ReaderPage />} />
        <Route path="/reading-list" element={<ReadingListPage />} />
        <Route path="/reading-list.html" element={<ReadingListPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reset-password.html" element={<ResetPasswordPage />} />
        <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path="/settings.html" element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path="/store" element={<RequireAuth><StorePage /></RequireAuth>} />
        <Route path="/store.html" element={<RequireAuth><StorePage /></RequireAuth>} />
        <Route path="/story-bible" element={<RequireAuth><StoryBiblePage /></RequireAuth>} />
        <Route path="/story-bible.html" element={<RequireAuth><StoryBiblePage /></RequireAuth>} />
        <Route path="/story-metadata" element={<RequireAuth><StoryMetadataPage /></RequireAuth>} />
        <Route path="/story-metadata.html" element={<RequireAuth><StoryMetadataPage /></RequireAuth>} />
        <Route path="/story-publishing" element={<RequireAuth><StoryPublishingPage /></RequireAuth>} />
        <Route path="/story-publishing.html" element={<RequireAuth><StoryPublishingPage /></RequireAuth>} />
        <Route path="/story-workspace" element={<RequireAuth><StoryWorkspacePage /></RequireAuth>} />
        <Route path="/story-workspace.html" element={<RequireAuth><StoryWorkspacePage /></RequireAuth>} />
        <Route path="/story" element={<StoryPage />} />
        <Route path="/story.html" element={<StoryPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/terms.html" element={<TermsPage />} />
        <Route path="/test" element={<RequireAuth><TestPage /></RequireAuth>} />
        <Route path="/test.html" element={<RequireAuth><TestPage /></RequireAuth>} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/welcome.html" element={<WelcomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
