# Agent Instructions

Guidance for AI agents working in this repository.

## Changelog requirement

- **Update [`CHANGELOG.md`](CHANGELOG.md) for every version or release.** Any user-facing change, bug fix, migration, configuration change, or notable internal update included in a version/release must be recorded under that version's section.
- If work is in progress and not yet released, add entries under `## [Unreleased]`.
- When cutting or labeling a release, move the relevant `Unreleased` entries into a new version/date heading and leave `Unreleased` ready for future changes.
- Keep entries clear and specific: note what changed, where (files/areas) when helpful, and any required follow-up steps (migrations, environment/config updates, deploy actions).

## Project notes

- **Stack:** React 18 + React Router 6 SPA, built with Vite 6 (`@vitejs/plugin-react`). Supabase JS is bundled via npm (never load Supabase from `esm.sh` or a CDN).
- **Single entry:** `index.html` → `src/main.jsx` → `src/App.jsx` (all routes). There are **no per-page HTML files** for app routes; do not reintroduce them.
- **Routes:** every route is declared in `src/App.jsx`. Native React pages live in `src/pages/*.jsx`; remaining pages are generated wrappers in `src/pages/generated/*.jsx` that initialize legacy modules in `src/js/*` and should be progressively replaced with native React implementations.
- **Auth:** `RequireAuth` wraps protected routes and redirects to `/auth?returnTo=...`. Keep public/content routes (home, explore, story/reader, author, collection, rankings, community, terms, auth, reset-password) unprotected unless intentionally changed.
- **CSS:** all site CSS is imported centrally in `src/styles.js` (loaded from `src/main.jsx`). Do not add per-page `<link>` tags to `index.html`; add new stylesheets to `src/styles.js` instead.
- **Build/deploy:** `npm run build` emits to `dist/`; `postbuild` copies `dist/index.html` → `dist/404.html` for SPA fallback. Deployed to GitHub Pages via `.github/workflows/deploy-pages.yml` (build env `VITE_BASE` comes from `actions/configure-pages`; set `VITE_BASE=/` for custom-domain/root deployments). Vercel config (`vercel.json`) also exists for the same `dist/` output.
- **Supabase:** URL and publishable key are selected in `src/js/supabaseClient.js`. Production is default; Padres development is only used with `?env=dev`. Never place a `service_role`/secret key in client-side code.
- **Size/performance focus:** keep the bundle small — avoid adding heavy dependencies, avoid duplicating large assets, prefer lazy `import()` for route-level code splitting, and reuse shared components (header/footer/nav) instead of duplicating markup. The build already warns about a >500 kB chunk; treat that as a signal to code-split or trim.
- **Reusable chrome:** header/footer/nav should be shared React components (`src/components/*`), not duplicated per page. Most pages use one of two variations (full site chrome vs. custom/immersive shells like reader/studio/auth). Use `Layout` with `chrome` prop or a dedicated shell component rather than copying markup.
- Prefer targeted changes consistent with existing structure, naming, and style. Treat unfamiliar files/changes as potential user work and investigate before overwriting or deleting.
