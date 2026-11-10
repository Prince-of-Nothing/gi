import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Explore from './pages/Explore.jsx';
import AccountPage from './pages/generated/AccountPage.jsx';
import AdminEconomyPage from './pages/generated/AdminEconomyPage.jsx';
import AdminPage from './pages/generated/AdminPage.jsx';
import AeApplyPage from './pages/generated/AeApplyPage.jsx';
import AeAuthorFeedbackPage from './pages/generated/AeAuthorFeedbackPage.jsx';
import AeDraftReviewPage from './pages/generated/AeDraftReviewPage.jsx';
import AeReviewPage from './pages/generated/AeReviewPage.jsx';
import AePage from './pages/generated/AePage.jsx';
import AnalyticsPage from './pages/generated/AnalyticsPage.jsx';
import AuthPage from './pages/generated/AuthPage.jsx';
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
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/index.html" element={<Layout><Home /></Layout>} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account.html" element={<AccountPage />} />
        <Route path="/admin-economy" element={<AdminEconomyPage />} />
        <Route path="/admin-economy.html" element={<AdminEconomyPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin.html" element={<AdminPage />} />
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
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/analytics.html" element={<AnalyticsPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth.html" element={<AuthPage />} />
        <Route path="/author-notes" element={<AuthorNotesPage />} />
        <Route path="/author-notes.html" element={<AuthorNotesPage />} />
        <Route path="/author" element={<AuthorPage />} />
        <Route path="/author.html" element={<AuthorPage />} />
        <Route path="/authors-studio" element={<AuthorsStudioPage />} />
        <Route path="/authors-studio.html" element={<AuthorsStudioPage />} />
        <Route path="/chapter-editor" element={<ChapterEditorPage />} />
        <Route path="/chapter-editor.html" element={<ChapterEditorPage />} />
        <Route path="/chapter-pricing" element={<ChapterPricingPage />} />
        <Route path="/chapter-pricing.html" element={<ChapterPricingPage />} />
        <Route path="/collection" element={<CollectionPage />} />
        <Route path="/collection.html" element={<CollectionPage />} />
        <Route path="/community-space" element={<CommunitySpacePage />} />
        <Route path="/community-space.html" element={<CommunitySpacePage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community.html" element={<CommunityPage />} />
        <Route path="/contract-center" element={<ContractCenterPage />} />
        <Route path="/contract-center.html" element={<ContractCenterPage />} />
        <Route path="/create-story" element={<CreateStoryPage />} />
        <Route path="/create-story.html" element={<CreateStoryPage />} />
        <Route path="/creator-earnings" element={<CreatorEarningsPage />} />
        <Route path="/creator-earnings.html" element={<CreatorEarningsPage />} />
        <Route path="/explore" element={<Layout><Explore /></Layout>} />
        <Route path="/explore.html" element={<Layout><Explore /></Layout>} />
        <Route path="/holiday-hearts-entry" element={<HolidayHeartsEntryPage />} />
        <Route path="/holiday-hearts-entry.html" element={<HolidayHeartsEntryPage />} />
        <Route path="/holiday-hearts" element={<HolidayHeartsPage />} />
        <Route path="/holiday-hearts.html" element={<HolidayHeartsPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library.html" element={<LibraryPage />} />
        <Route path="/moderator" element={<ModeratorPage />} />
        <Route path="/moderator.html" element={<ModeratorPage />} />
        <Route path="/my-gidireads" element={<MyGidireadsPage />} />
        <Route path="/my-gidireads.html" element={<MyGidireadsPage />} />
        <Route path="/my-stories" element={<MyStoriesPage />} />
        <Route path="/my-stories.html" element={<MyStoriesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/notifications.html" element={<NotificationsPage />} />
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
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings.html" element={<SettingsPage />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/store.html" element={<StorePage />} />
        <Route path="/story-bible" element={<StoryBiblePage />} />
        <Route path="/story-bible.html" element={<StoryBiblePage />} />
        <Route path="/story-metadata" element={<StoryMetadataPage />} />
        <Route path="/story-metadata.html" element={<StoryMetadataPage />} />
        <Route path="/story-publishing" element={<StoryPublishingPage />} />
        <Route path="/story-publishing.html" element={<StoryPublishingPage />} />
        <Route path="/story-workspace" element={<StoryWorkspacePage />} />
        <Route path="/story-workspace.html" element={<StoryWorkspacePage />} />
        <Route path="/story" element={<StoryPage />} />
        <Route path="/story.html" element={<StoryPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/terms.html" element={<TermsPage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/test.html" element={<TestPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/welcome.html" element={<WelcomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
