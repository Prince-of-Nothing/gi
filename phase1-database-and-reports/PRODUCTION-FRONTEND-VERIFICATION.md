# GidiReads Phase 1 — Production Frontend Verification

## Supabase project
The frontend client is configured to default to GidiReads production (`mbikuyuhcttkcqpgiihr`). The publishable key is already in `supabaseClient.js` and does not need to be entered into Supabase again. Never put a service-role or secret key in browser code.

## Frontend integration checked
- `reader.js` calls `start_gidireads_reading_session(p_story_id, p_chapter_id)`.
- `reader.js` calls `save_gidireads_reading_progress(p_story_id, p_chapter_id, p_progress, p_position_offset, p_session_id)`.
- `reader.js` calls `end_gidireads_reading_session(p_session_id)`.
- `reader.js` and `my-gidireads.js` call `refresh_my_achievements()`.
- `my-gidireads.js` calls `set_my_badge_visibility(p_badge_id, p_is_public)`.
- `admin-economy.js` calls `admin_award_badge(p_user_id, p_badge_id, p_note)`.
- All five checked JavaScript files passed `node --check` syntax validation.

## Live database checks
- 14 badge catalogue rows.
- 30 milestone catalogue rows: 24 published, 6 intentionally draft.
- Badge storage bucket exists with a 2 MiB file-size limit and PNG/JPEG/WebP/GIF/SVG allowlist.
- 12 Phase 1 public-schema RLS policies and 4 badge-storage policies found.
- Achievement refresh RPC exists.
- `chapters.published_at` exists for publication-day milestone calculations.
- PostgREST schema reload notification sent after the schema additions.

## Important test limitation
The database schema and function presence were verified live. A real browser-authenticated test of sign-in, page loading, reading completion, and award display has not been performed in this environment. Use a normal GidiReads account to test those flows before declaring the feature fully end-to-end verified.

## Files
This package contains the Phase 1 frontend files inspected for integration. Before replacing files in Acode, compare them with the newest versions in your project and preserve any later changes you have made. No service-role key is required.
