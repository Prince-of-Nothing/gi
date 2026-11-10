# GidiReads Phase 1 — Achievements, Badges & Milestones

## Current status

**Development database core: installed and transaction-tested. Frontend bundle: not yet approved for Acode installation. Production remains untouched.**

## Development database work completed

Applied to the Padres development project (`uyrsljueizptkgeqrawu`) only:

- Six achievement-related tables, RLS policies and grants.
- Public-read / administrator-write `gidireads-badges` Storage bucket and its policies.
- Fourteen badge catalogue records; Founding Reader and First Membership remain inactive.
- Chapter publication timestamp trigger and reading-session RPCs used by `reader.js`.
- Milestone publish guard and 29 milestone drafts. All remain drafts until reviewed and published by an administrator.
- `refresh_my_achievements()` with authenticated-only execute permission.
- A defensive validation in `admin_award_badge()` so a nonexistent badge ID returns a clear `Badge not found` exception instead of a database not-null error.

No schema or data changes were made to GidiReads production (`mbikuyuhcttkcqpgiihr`).

## Tests actually run

A transaction-scoped integration test created temporary reader, author and administrator profiles, a published story/chapter and a completed-chapter record. It then asserted:

1. `refresh_my_achievements()` computed a qualifying milestone and recorded exactly one achievement.
2. The linked automatic badge was awarded and the achievement notification was created.
3. `set_my_badge_visibility()` changed the earned badge to public.
4. `admin_award_badge()` awarded a second badge and created its notification.
5. A second refresh returned zero new achievements, confirming idempotency for the same milestone cycle.
6. The transaction was rolled back; follow-up checks confirmed there are no test profiles, achievement rows, user-badge rows, milestone-progress rows, or published milestones left behind.

The function definitions, signatures and security-definer flags were also verified in PostgreSQL metadata. RLS policy presence was inspected for all six new tables. This is a database-level test using the Supabase SQL execution role with simulated `auth.uid()` claims; it is **not** equivalent to a browser session under the real authenticated role.

## Dashboard integration limitation

The achievement/badge/milestone controls are integrated into `admin-economy.html` and `admin-economy.js`. The Padres development project does **not** contain the separate existing creator-economy tables queried by the rest of that dashboard: `contract_applications`, `creator_payout_requests`, `task_catalog`, `virtual_gifts`, and `admin_audit_log`. Therefore, a complete live browser workflow for the entire combined dashboard cannot be certified against this minimal dev project yet. The page code intentionally displays a warning when those tables are missing, while still populating the badge and milestone catalogues where permissions allow.

Storage uploads from a real administrator browser session and full browser end-to-end tests remain outstanding. Do not describe those as passed.

## Files

- `PHASE-1-ACHIEVEMENTS-REVIEW-ONLY.sql` — original full proposed migration; reference/review file, not executed as one complete migration.
- `PHASE-1-DEV-FOLLOWUP.sql` — incremental SQL for the newly installed refresh function and admin-award validation. Already applied to Padres; **do not run it again there unless intentionally reapplying/reviewing the function definitions**. It has not been applied to production.
- Frontend HTML, JS, CSS and SVG files — only the Phase 1 files changed or added.

## Installation status

Do not copy frontend files into the active Acode project yet. The database function work is complete and transaction-tested, but full dashboard browser integration and Storage upload checks are not complete. No SQL needs to be run manually in Padres for the work recorded above. Any future production migration requires a separate review and explicit approval.
