# GidiReads Phase 1 — Verification Results

## Database: Padres development project only

- [PASS] Phase 1 tables and seeded catalogues verified: 14 badges; 30 milestones, all draft.
- [PASS] Achievement refresh, automatic badge award, notification, badge visibility toggle, admin award, idempotency, and rollback tested in a SQL transaction.
- [PASS] Storage bucket and four policies verified; 2 MiB limit and image MIME allow-list configured.
- [PASS] RLS enabled on the eight previously exposed tables: profiles, stories, chapters, reading_events, library_entries, comments, echoes, notifications.
- [PASS] Ownership/publication policies and least-privilege client grants applied. Public profile reads are allowed; users can only insert their own reader profile and update their own username, not their role.
- [PASS] Anonymous execute revoked from the catalogue editor trigger function.
- [WARN] Supabase security advisor still flags six SECURITY DEFINER RPCs callable by authenticated users. These are intentional application RPCs (reading sessions/progress, own badge visibility, own achievement refresh, and admin award); each function checks the authenticated identity and relevant ownership/admin role. Keep monitoring the advisor and do not grant these to anon.
- [PASS] Production project was not modified.

## Static frontend checks

- [PASS] Existing JavaScript syntax checks and HTML ID/reference checks passed in the prior test run.
- [PASS] Badge SVG assets passed XML validation in the prior test run.
- [PASS] Only Phase 1 frontend files and badge assets are provided at the archive root for replacement.

## Still requires the user's final browser pass

A real authenticated admin browser session, actual Storage upload, and public-profile badge display were not accessible in this environment. After copying the root files into Acode, test Admin Economy, upload one SVG/PNG, award a qualifying achievement, toggle public visibility, and inspect the public profile. Report any failure so it can be fixed before considering the Phase 1 release fully end-to-end verified.

## Scope / database safety

- The RLS hardening SQL in this folder records changes already applied to Padres development project `uyrsljueizptkgeqrawu`.
- Do not run development SQL on production project `mbikuyuhcttkcqpgiihr` without separate review and explicit approval.
- All 30 seeded milestones remain draft; publish only after reviewing their labels/targets.
