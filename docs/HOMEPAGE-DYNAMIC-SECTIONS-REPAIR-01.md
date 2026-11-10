# GidiReads Homepage + Dynamic Sections Repair 01

## Scope
- Repairs homepage story shelf loading and empty/error states.
- Featured shelf now uses only stories explicitly marked `is_admin_featured`; it no longer silently substitutes popular stories.
- New releases sort by `first_published_at` (with `created_at` as a secondary sort).
- Recently updated, Trending, and New releases display distinct load-failure messages and log the underlying query error for diagnosis.
- Enabled custom homepage sections now render their selected stories directly on the homepage, preserving the admin-defined story order.
- Custom homepage sections use a more spacious editorial layout with a dark plum/blue treatment and responsive mobile stacking.
- Admin-controlled section visibility, headings, and order remain in place.
- Cache-busting query versions updated for the homepage JS and custom-section CSS.

## Database
No database schema, migration, or production data changes were made for this repair.
The existing `homepage_admin_settings` and `stories` fields were inspected. `stories.first_published_at` exists in production.

## Deploy
Deploy the complete project folder to the existing GidiReads Vercel project. Keep the existing production Supabase connection and environment variables. Do not create a new Supabase project and do not run a migration for this batch.

## Test checklist
1. Open the homepage in a fresh tab / hard refresh.
2. Confirm the hero and existing sections load.
3. Confirm Featured contains only stories marked as admin-featured, excluding stories assigned to enabled custom sections.
4. Confirm Trending shows stories ordered by Echo count.
5. Confirm Recently updated loads and New releases sorts by first publication date.
6. Confirm Holiday Hearts (or another enabled custom section) shows its selected story cards below the banner and that each card opens the correct story.
7. In Admin homepage settings, disable one shelf and change the order of two shelves; save and reload to confirm visibility/order.
8. Test on a narrow mobile screen and desktop.

## Verification limits
JavaScript syntax and HTML structure are checked locally. Authenticated live browser testing and visual testing on the deployed site still need to be completed after deployment.
