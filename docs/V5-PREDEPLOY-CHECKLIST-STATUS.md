# GidiReads V5 — pre-deployment reconciliation

Read-only database inspection was performed against production project `mbikuyuhcttkcqpgiihr`. No production or Padres database changes were made. No Edge Function was deployed. No Vercel deployment was made.

## Database state found

- Latest production migration: `20261102031321 opportunity_applications_and_related_announcements`.
- `platform_announcements` and `platform_announcement_reads` already exist. Current audience constraint allows only `all`, `readers`, `authors`.
- `push_subscriptions` exists; one subscription row is currently stored. The deployed legacy `send-announcement-push` function is active at version 12. Its live code does not select `opportunity_id` or target Holiday Hearts participants/finalists. V5 calls a new slug, `send-targeted-announcement-push`, so it will not accidentally send a targeted announcement to the old function and the wrong audience. VAPID secrets cannot be verified from table/schema inspection.
- `platform_opportunities`: 1 row. `platform_opportunity_slides`: 5 rows.
- `holiday_hearts_entries`, `holiday_hearts_votes`, and `holiday_hearts_results`: 0 rows each at the time of inspection.
- `opportunity_applications`: 0 rows at the time of inspection.
- `story_likes` does not exist in production yet. Review likes and comment likes are separate tables and do not count story likes.
- `holiday_hearts_email_deliveries` and the winner-email Edge Function do not exist in production yet. Resend setup is pending the domain purchase/verification.

## V5 file reconciliation

| Item | Finding | V5 work in this package |
|---|---|---|
| Admin-written participant/finalist announcements | Existing in-app announcements; no participant/finalist audience options. Existing deployed push function only supports all/readers/authors. | Added participant/finalist audiences, opportunity-linked filtering in the in-app feed, and targeted push logic. Updated push Edge Function source is included for deployment after the migration. |
| Winner email | No winner email Edge Function or delivery log. | Added authenticated winner-email Edge Function and idempotency log table. Requires `RESEND_API_KEY`, verified-domain `RESEND_FROM_EMAIL`, and the actual `GIDIREADS_SITE_URL`. Not active until deployed and configured. |
| Story likes | No story-like table. | Added `story_likes` with RLS and a persistent story-page like button/count. |
| Contracted bar | Already present on story page and author profile; absent from Story Workspace. | Added the same contract lookup to the Story Workspace cover. |
| Application question keys | Keys were generated from question order (`q1_...`), so reordering changed keys. | Keys are preserved by question label and new questions receive stable IDs. Once any application exists, changing/reordering/removing the set is blocked. Duplicate labels are rejected. |
| Holiday Hearts rehearsal | Contest entry/review/finalist/vote/results features already exist. Live schedule is 15 Nov–15 Dec submissions, 16–22 Dec voting, 24 Dec results. | Added rehearsal-mode toggle and guarded cleanup for entries explicitly titled `TEST:`. Added a step-by-step rehearsal guide. |
| V5 ZIP layout | Previous package nested all files under `GidiReads-FULL-site-5/`. | Final package is flattened so `index.html` is at the ZIP root. |

## Pending database migrations

Apply in this order only after the V5 frontend is ready for the agreed release sequence:

1. `supabase/migrations/20261102170000_task_catalog_and_gift_search.sql` — task catalogue, task claims, gift-recipient search (from the previous V5 C/D/E/F work).
2. `supabase/migrations/20261102190000_story_likes_and_holiday_hearts_communications.sql` — story likes, participant/finalist announcement audiences, winner email delivery log, and rehearsal cleanup RPC.

Do not run the older DEV-ONLY gift/opportunities SQL against production.

## Edge Functions to deploy after migrations

- Update `send-targeted-announcement-push` from `supabase/functions/send-targeted-announcement-push/index.ts` (adds opportunity-linked participant/finalist targeting).
- Deploy `send-holiday-hearts-winner-email` from `supabase/functions/send-holiday-hearts-winner-email/index.ts` after Resend/domain setup is ready. It can be deployed earlier, but it will return `setup_required` until secrets are configured.

## Test and release limits

- Static checks before the Resources review: 48 JavaScript files pass `node --check`; 34 HTML pages have no duplicate IDs or missing local script/style/image references; 42 CSS files parse without syntax errors. After the Resources review: 51 JavaScript files pass `node --check`; 36 HTML pages parse with no duplicate IDs or missing local references; 44 CSS files parse without syntax errors.
- TypeScript Edge Function files were inspected with `tsc`; no syntax diagnostics appeared, but full type-checking is not available in this environment because Deno globals and Supabase npm specifiers are not installed locally.
- No authenticated browser end-to-end tests were performed. The user will perform these with the included rehearsal guide.
- Browser push requires HTTPS, an active deployed Edge Function, VAPID secrets and subscribed devices. It cannot be fully tested in a local Acode file preview.
- Winner email cannot be delivered until the domain is purchased and verified with Resend and the secrets are configured.

## Resources review and member Resources page added before V5 deployment

- The Authors Studio hamburger menu links to `resources.html` with the plain label **Resources**. No extra branded title was added.
- Added a separate member-facing page at `reader-resources.html`. It is linked from the **Help & Resources** link in the public profile footer. The page is for readers and other members, not an author-only help page.
- Both pages use the same simple dark-plum layout, search, topic filters, article view, related guides and helpful/not-yet prompt. Each page only shows guides intended for its audience.
- Added 39 plain-English guides in total: 28 appear in Authors Studio and 29 appear in member Resources, with shared guides appearing in both. Topics cover account setup, profiles, finding and reading stories, libraries and lists, writing and publishing, Story Workspace, engagement, Echoes, gifts, G Coins, GidiPass, contracts, earnings, opportunities, Holiday Hearts, communities, privacy, reporting and common problems.
- Guides use direct, simple instructions and clear availability warnings. They do not present real-money purchases, paid chapter checkout or cash payouts as active before those services are configured and announced.
- Admin Dashboard → Resources now includes an audience choice: all members, readers or authors. Admins can create, edit, save drafts, publish and restore previous versions. Database revision history is enabled by the held migration.
- Updated `supabase/migrations/20261102200000_author_resources.sql` to add the audience field, allow public visitors to read published guides, keep drafts private, protect admin editing, and seed all 39 guides. This migration is held and must be applied only after V5 deployment.
- Both pages include bundled guide content. They can display the built-in guides before the resource-table migration is applied; after migration, published database articles become the live source of truth.
- The PWA manifest permits any orientation. An installed app can use the wide desktop layout on a laptop and the responsive phone layout on a phone. It cannot force a mobile browser's own Desktop site setting.

## Additional held migration

3. `supabase/migrations/20261102200000_author_resources.sql` — member and author resource articles, audience filtering, public read access, admin publishing, revision history, and initial guide content.

The user will perform authenticated browser checks after deployment. No database migration was applied during this review.

## Build 4 — AE Editor Space (complete locally; migration and authenticated tests pending)
- [x] Short AE application form with relevant questions and applicant status display.
- [x] Admin application queue with In Review, Approved and Rejected decisions and internal notes.
- [x] Approval grants the acquisitions_editor role through a protected RPC; pending and rejected applicants do not receive access.
- [x] Admin assignment and removal of authors with active contracts.
- [x] AE dashboard: Overview, My Authors, Editorial Desk, Author Scouting, Promotions and Performance.
- [x] Read-only assigned-story review page showing published chapters only.
- [x] Editorial feedback submission; authors can read and reply from Authors Studio > Editorial Feedback.
- [x] Scouting lead records and status updates.
- [x] Promotion recommendations with admin approval or rejection.
- [x] Authors Studio Resource Guide updated in simple language for the AE role and the latest author workflows.
- [x] Local JavaScript syntax, HTML parsing, required-file and ZIP integrity checks passed. `index.html` is the first ZIP entry.
- [ ] Review and apply `BUILD-04-AE-EDITOR-SPACE-MIGRATION.sql` only after approved V5 deployment.
- [ ] Test application submission, admin decisions, AE access, author assignment/removal, feedback, scouting and promotions with authenticated accounts after deployment.
- No live database or Vercel changes were made for Build 4.

