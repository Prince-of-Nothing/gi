# GidiReads Resources — pre-deployment review

## What is in V5

- `resources.html`: author resources, opened from **Resources** in the Authors Studio hamburger menu.
- `reader-resources.html`: member resources, opened from **Resources** in the public profile footer (`author.html`).
- `resources-content.js`: 39 bundled guides with audience labels.
- `resources.js` and `resources.css`: shared search, category filters, article display, related guides, feedback prompt and responsive layout.
- `resources-admin.js` and `resources-admin.css`: Admin Dashboard → Resources editor.
- `supabase/migrations/20261102200000_author_resources.sql`: held migration for published content, audience filtering, public read access, admin editing and revision history.

## Guide visibility

- 28 guides appear in Authors Studio.
- 29 guides appear in member Resources.
- Shared guides appear in both places.
- Reader-only guides do not appear in Authors Studio. Author-only guides do not appear in member Resources.
- Draft articles remain private. Published articles are shown only to the audience selected by an admin.

## Checks completed

- 39 guide slugs are unique, and every bundled guide has a matching slug reference in the held migration.
- 51 JavaScript files pass `node --check`.
- 36 HTML pages parse with no duplicate IDs or missing local file references.
- 44 CSS files parse without syntax errors.
- The migration includes a public visitor read policy for published articles and admin-only article editing.
- No database migration was applied. No production or Padres database was changed. No Edge Function or Vercel deployment was performed.

## Authenticated tests after deployment

The user will perform the authenticated browser tests after V5 deployment. After the held migrations are applied, check:

1. Open a public profile and choose **Resources** in the footer. Confirm the member page opens and shows reader guides.
2. Search for a story, wallet or notification guide. Confirm the results change as the search text changes.
3. Choose a topic, open an article, use a related guide and return to the list.
4. Open Authors Studio, open its hamburger menu and choose **Resources**. Confirm author guides appear there.
5. In Admin Dashboard → Resources, confirm the guide list loads and the audience selector offers All members, Readers and Authors.
6. Create a draft for one audience and confirm it does not appear on the public pages. Publish it and confirm it appears only on the selected audience page.
7. Edit a published guide, then restore a previous version. Confirm the revision history is saved.
8. Check both pages at laptop and phone widths. The phone layout should remain readable without forcing the browser's Desktop site setting.

## Still held back

Apply `20261102200000_author_resources.sql` only after V5 deployment, in the agreed post-deployment migration sequence. Until then, both pages use the bundled guide content. Admin article storage and revision history will not work until the migration is applied.
