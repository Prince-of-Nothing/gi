# GidiReads — The Gathering completion package

## Included

- Separate public portal (`community.html`) and signed-in workspace (`community-space.html`).
- Community home, discussions, replies, follows, likes/reactions and reporting.
- Public and private reading circles, owner-created circles, join requests, approval/decline, member posting, milestones and leave-circle flow.
- Weekly prompts, one submission per member per prompt, and editing an existing submission while the prompt is open.
- Admin-managed Author's Corner and Community Spotlight features.
- Moderator-only moderation desk, report review/dismissal, hide/restore content and lock/unlock discussions, with an audit row for actions.
- Community profile auto-creation and avatar synchronisation from the main GidiReads profile.
- Role checks use the active `staff_assignments.role_key='community_moderator'` assignment plus admin role.

## Database status

The base Gathering schema was already applied to the production Supabase project in the earlier approved migration batch. This package includes the additive workflow-completion migration at:

`supabase/migrations/20261103163000_gathering_workflow_completion.sql`

That migration was applied successfully to the production Supabase project on 3 November 2026. It adds secure circle request/leave RPCs, moderation action RPC, moderator permission lookup through `staff_assignments`, and authenticated reaction reads. Do not apply it a second time manually unless you are applying the package to a different database; it is designed to be rerunnable.

## Deployment

1. Deploy the full project contents to the existing Vercel project using the same project/root settings as the current site.
2. Do not create a new Supabase project. The app remains connected to the existing production project through its current `supabaseClient.js` configuration/environment setup.
3. After deployment, sign in with a normal reader account and open `community.html`.
4. Enter The Gathering; verify the workspace loads and the tour starts inside the workspace.

## Manual smoke test checklist

### Reader account
- Create a discussion; confirm it appears in the discussions list and community home.
- Open it, add a reply, follow it, like it, and report it.
- Open a reply and test its like/report actions.
- Create a public reading circle; join it from a second account; post a circle update; add a milestone as owner; leave as member.
- Create a private circle; request access from a second account; approve and reject requests from the owner account.
- Submit a weekly prompt entry, edit it, and confirm a closed/expired prompt rejects changes.
- Update community display name, username and bio; change the main GidiReads avatar and revisit The Gathering to verify avatar sync.

### Moderator account
- Confirm the Moderation tab is visible only for the active Community Moderator assignment or an admin.
- Review and dismiss a report.
- Apply hide/restore to a discussion or reply and lock/unlock a discussion.
- Confirm actions appear in the moderation action history table.

### Admin account
- Publish a weekly prompt.
- Publish an Author's Corner feature and a Community Spotlight feature.
- Confirm published items appear to members.

## Known test boundary

Source checks and database migration verification passed. I cannot truthfully claim an authenticated end-to-end browser test has passed: it requires signing in as separate reader, circle owner, moderator and admin accounts on the deployed site. Complete the checklist above before moving to the next repair.
