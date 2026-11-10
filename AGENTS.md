# Agent Instructions

Guidance for AI agents working in this repository.

## Changelog requirement

- **Update [`CHANGELOG.md`](CHANGELOG.md) for every version or release.** Any user-facing change, bug fix, migration, configuration change, or notable internal update included in a version/release must be recorded under that version's section.
- If work is in progress and not yet released, add entries under `## [Unreleased]`.
- When cutting or labeling a release, move the relevant `Unreleased` entries into a new version/date heading and leave `Unreleased` ready for future changes.
- Keep entries clear and specific: note what changed, where (files/areas) when helpful, and any required follow-up steps (migrations, environment/config updates, deploy actions).

## Project notes

- This is a static web app (HTML/CSS/JS ES modules) with Supabase for auth/data/storage, deployed on Vercel (no build step).
- The Supabase URL and publishable key are selected in `supabaseClient.js`. Production is default; Padres development is only used with `?env=dev`.
- Never place a `service_role`/secret key in client-side code.
- Prefer targeted changes consistent with existing structure, naming, and style. Treat unfamiliar files/changes as potential user work and investigate before overwriting or deleting.
