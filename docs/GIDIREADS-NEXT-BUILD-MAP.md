# GidiReads Next Build Map (from the supplied development ZIP + current Supabase schema)

## Guardrails
- Work on the development copy and staging deployment first; do not replace the live site until smoke tests pass.
- Preserve current real stories and author data. Do not seed invented novels, authors, or stats.
- Reuse existing story/chapter/taxonomy tables and flows where possible. Do not create duplicate systems.
- No database changes are included in this first patch.

## Build 1 — Studio foundation (started in this patch)
**Files:** `authors-studio.html`, `authors-studio.js`, `authors-studio.css`, `global-dark-plum.css`, `my-stories.html`, `create-story.html`, `story-workspace.html`, `chapter-editor.html`, `story-publishing.html`.
- Repair theme layering so `data-theme="light"` can override the forced dark-plum layer on Studio pages.
- Connect Studio Create Story navigation and New Story shortcuts to the existing `create-story.html` flow.
- Next within Build 1: Story Bible and Notes UI/data model; Metadata should edit the existing story fields and `story_taxonomy` links, not create duplicate metadata records.

## Build 2 — Explore taxonomy results
**Files:** `explore.html`, `explore.js`, `taxonomy.js`, `taxonomy.css`, story-card rendering/navigation; new taxonomy results page or route.
**Existing DB:** `gidireads_taxonomy_terms` (category/name/slug/is_active/sort_order/parent_id), `story_taxonomy` (story_id/term_id/relationship_type), `stories`, `chapters`.
- Implement a term-specific route, preferably query-based `taxonomy-results.html?category=genre&slug=romance` for static hosting.
- Query active taxonomy term by category+slug, then resolve related story IDs through `story_taxonomy`; show only eligible published stories and paginate/sort results.
- Verify relationship_type conventions and published-status columns before final query implementation.

## Build 3 — Account and profiles
**Files:** `account.html`, `account.js`, `reset-password.html`, `reset-password.js`, `author.html`, `author.js`, `people.html`, `people.js`, profile CSS files.
**Existing DB:** `profiles`, `followers`, `stories`, `reviews`, `review_replies`, `library_entries`, `reading_progress`, `notifications`.
- Expand authentication states and error/success feedback; validate email confirmation/reset redirect flows.
- Add profile privacy and role-aware display. Never expose private reading history or balances on public profiles.

## Build 4 — Admin dashboard
**Files:** `admin.html`, `admin.js`, `global-dark-plum.css`; add admin-specific CSS/module as needed.
**Existing DB:** `profiles`, `stories`, `chapters`, `reports`, `admin_audit_log`, `gidireads_taxonomy_terms`, `story_taxonomy`.
- Rebuild navigation and responsive layout, retain verified existing admin actions, and add taxonomy management.
- Verify every privileged RPC's internal authorization before surfacing it in the UI. Do not trust client-side role checks alone.
- Security review required for SECURITY DEFINER functions, function search_path, and leaked-password protection before financial modules.

## Build 5 — Studio tools and insight
- **Story Bible:** new per-story structured records for characters, locations, worldbuilding, timeline and plot threads; owner-only RLS.
- **Notes:** private author notes, linked optionally to story/chapter; owner-only RLS.
- **Metadata:** existing `stories` columns + `story_taxonomy`/`gidireads_taxonomy_terms`.
- **Insights:** existing `reading_events`, `reading_sessions`, `reading_daily_stats`, `reading_discovery_daily` and story read tracking. Verify metric semantics before displaying numbers.
- **Resources / Opportunities:** curated content and programme records, manageable from admin.
- **AI Assistant:** secure server-side provider integration; never put provider secret keys in browser JavaScript.

## Build 6 — Contract and monetisation foundation
- New schema likely required for agreements, monetisation enrolments, coin wallets/transactions, chapter entitlements, payment reconciliation, Echoes classification, earnings ledger and payout records.
- Keep purchased vs promotional Echoes separate; idempotent payment callbacks; never allow client-side balance changes.
- Contract Center must record agreement version, scope, acceptance time and status.

## Build 7 — Community and adaptation expansion
- Community spaces, posts, replies, memberships and moderation; adaptation creator verification, per-medium rights availability, proposals and project-specific agreements.
- Readerboards and memberships after ranking integrity and unit economics are defined.

## First patch applied
- Added `authors-studio-theme-fix.css` after `global-dark-plum.css` on Studio pages.
- Connected Authors Studio and My Stories Create Story links to the existing `create-story.html` flow.
- Removed the two alert-based Create Story handlers.

## Smoke tests for this patch
1. Open `authors-studio.html`; toggle light/dark twice and reload in each theme.
2. Repeat on My Stories, Create Story, Workspace, Chapter Editor, and Publishing.
3. Tap Create Story from Studio nav, main action, and New Story shortcut; each should open `create-story.html`.
4. Confirm no database rows or live deployment were changed by this patch.
