# GidiReads Phase 1 — Development Database Hardening

**Status:** Applied to development project `uyrsljueizptkgeqrawu` only. Production project `mbikuyuhcttkcqpgiihr` was not modified.

## What changed

- Replaced `public.guard_milestone_publish()` with explicit supported-rule checks.
- Founding Reader and Founding Author now require a valid `verification_config.before` timestamp and the Special / Once configuration.
- Event milestones require `verification_config.event_slug` and Event period.
- Membership milestones are allowed by the publishing guard with category/period validation. The six-month membership milestone is set to Once.
- Added indexes on `gidireads_event_participation.verified_by` and `gidireads_memberships.verified_by`.
- Removed the redundant `gidireads_event_participation_user_event_idx`; the unique constraint already covers `(user_id, event_slug)`.
- Reworked SELECT and admin write policies for `gidireads_event_participation` and `gidireads_memberships` to avoid overlapping ALL/SELECT policies.
- Consolidated SELECT policies on `badge_catalog`, `milestone_catalog`, and `user_badges`, retaining intended public/owner/admin access.
- Explicitly revoked RPC EXECUTE from `PUBLIC` and `anon`, and retained `authenticated` access for the app.

## Verification performed

- Confirmed the publishing guard includes cutoff and event-slug validation and no longer contains the previous blanket membership block.
- Ran transaction-rolled-back tests: founding milestones without cutoffs were rejected; an event milestone without an event slug was rejected; valid cutoff/event configuration passed the guard; membership milestones passed the guard.
- Confirmed both `verified_by` indexes exist.
- Inspected all six SECURITY DEFINER RPC definitions. They have pinned search paths and the expected authentication/ownership/admin checks. Anonymous EXECUTE is false; authenticated EXECUTE is true by design.
- Re-ran Supabase advisors. The security advisor still flags the six callable SECURITY DEFINER RPCs for review. Performance advisor reports four remaining overlapping-policy warnings and 33 informational unused-index findings. These are documented rather than suppressed.

## Important remaining items

- The two founding milestones remain drafts until the platform owner chooses the official cutoff timestamp.
- The event milestone remains draft until its real event slug is configured.
- Membership/event evidence tables currently require authorized admin maintenance; this is not an automatic billing-provider integration.
- Authenticated browser workflow, badge upload, and public-profile display have not been tested by the assistant and still require the user's browser checks.

## Do not upload this report as an application file

This is a record of database work already applied directly to the development project. No frontend JavaScript/CSS/HTML files were changed in this database-hardening pass, so there is no new Acode frontend file to replace from this step. Do not run old migration files against production.
