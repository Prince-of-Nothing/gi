# Holiday Hearts — pre-launch rehearsal guide

**Do this after the V5 site files and the V5 database migration are installed, and after the new `send-targeted-announcement-push` Edge Function has been deployed, but before 15 November 2026.** The rehearsal uses the real Holiday Hearts opportunity, so use test accounts and clearly mark every test entry and test announcement with `TEST:`.

## 1. Before touching the dates

In Admin → Opportunities, edit Holiday Hearts and write down the original schedule exactly as shown:

| Setting | Original date/time (Africa/Lagos, WAT) |
|---|---|
| Submissions open | 15 Nov 2026, 00:00 |
| Submissions close | 15 Dec 2026, 23:59 |
| Voting opens | 16 Dec 2026, 00:00 |
| Voting closes | 22 Dec 2026, 23:59 |
| Winners announced | 24 Dec 2026, 12:00 |

Turn on **Enable rehearsal mode** and save. Do not change the production dates until you are ready to run the test.

Use at least two test author accounts and two separate test reader accounts. Do not use founding authors' real entries. Every test entry title must begin exactly with `TEST:`. This is what allows the guarded cleanup to identify rehearsal data safely.

## 2. Test the Opportunity Centre presentation and admin controls

1. Open the public Opportunities page. Confirm the five Holiday Hearts slides load, the slide order is correct, and the primary action opens the Holiday Hearts opportunity details.
2. In Admin → Opportunities, edit the Holiday Hearts opportunity. Change a test-only summary or FAQ, save, and confirm the public opportunity page reflects the saved content. Restore the original copy after checking.
3. Open the Hero slideshow manager. Edit one existing slide, preview desktop/mobile, save, and confirm it appears in the correct order. If you test reordering, restore the original order before finishing. Do not delete the five production slides during rehearsal.
4. Check that the entry instructions, three prompts, word limits, terms, prize details, voting dates and winner date on the public opportunity page match the admin settings.

## 3. Test the author entry journey

1. In Admin → Opportunities → Holiday Hearts, temporarily set **Submissions open** to about 30 minutes before the current WAT time and **Submissions close** to about 60 minutes after the current WAT time.
2. Keep the other dates in the correct order: submission close, voting open, voting close, winners announced. Save.
3. Sign in as test author 1 and open Holiday Hearts → Enter. Choose a prompt, use a title beginning `TEST:`, add a synopsis, and create the manuscript. For a valid test, use 5,000–30,000 words and complete the rights/eligibility acknowledgements.
4. Submit. Confirm the author sees the submitted/pending state and a notification.
5. Repeat with test author 2 and a different `TEST:` title. This lets you test multiple entries and finalist selection.
6. From Admin → Opportunities → Review entries, check that both entries appear. Open each manuscript. Test **Mark under review**, **Approve and publish**, and (if you create a third test entry) **Reject** or **Disqualify** with a written reason. Approval publishes the test story into the public Holiday Hearts collection, so keep the `TEST:` prefix visible.
7. Confirm an approved test story appears in the Holiday Hearts collection and opens correctly. Confirm the author receives the decision notification.

## 4. Test participant and finalist announcements + push

1. Sign in on each test account using the deployed HTTPS site, open Notifications, and enable browser push. Push cannot be tested from an ordinary local Acode file preview; use the HTTPS deployment/preview and allow browser notifications.
2. In Admin → Announcements, create a title beginning `TEST:`. Choose **Holiday Hearts participants**, select the Holiday Hearts opportunity in **Related opportunity**, write the message, and publish now.
3. Check that the test entrants see the announcement in their in-app announcement feed. Test accounts that subscribed to push should receive a browser push. The admin result message reports whether push was configured and how many devices received it.
4. After selecting finalists in the next section, create a second `TEST:` announcement for **Holiday Hearts finalists**, linked to the same opportunity. Check that only finalist test accounts see that in-app announcement and receive push if subscribed.
5. If push says it is not configured, the existing `send-targeted-announcement-push` Edge Function needs the VAPID public/private keys and an HTTPS VAPID subject in its Supabase Edge Function secrets. A missing push subscription means that account will still see the in-app announcement but will not receive browser push.

## 5. Test finalist selection and voting

1. In the Finalists, voting and results panel, set a finalist count of 2 and write the public finalist criteria. Save.
2. Select the two approved `TEST:` entries and choose **Save finalists**. Confirm the selected entries remain selected after the panel reloads.
3. Choose **Announce finalists**. Confirm the finalist authors receive their system notification. This locks the finalist list until rehearsal cleanup; do not use real entries in this run.
4. Edit the Holiday Hearts schedule again. Set submission close to a time a few minutes in the past, voting open to a time just after that, also in the past, voting close to about 10–15 minutes in the future, and winners announced after voting close. Keep the date order valid and save.
5. From the two test reader accounts, open the finalist/voting page and vote. Confirm each account can vote and sees the correct state. Try changing a vote if the interface permits it.
6. In Admin → Finalists, voting and results, inspect vote totals. Exclude one test vote with a reason of at least 10 characters, then restore it. Confirm the vote audit state changes. Recalculate results after any vote change.
7. Wait until the temporary voting-close time has passed. Choose **Calculate results**, inspect the scores and flags, then choose **Confirm and publish official results**. The RPC requires voting to be closed and the latest calculation to be after the close time.
8. Confirm the public results page shows the published result and test winner/runner-up placements. If Resend is not configured yet, the winner-email action will report setup required; that is expected until you buy the domain and configure the verified sender.

## 6. Test cleanup — do not skip this

The rehearsal reset is deliberately guarded. It only works when rehearsal mode is enabled, **every entry in Holiday Hearts is selected**, and every entry title begins `TEST:`. It refuses to run if a real/non-test entry exists or if a test story has a contract record.

1. Go back to Admin → Opportunities → Review entries.
2. Set the filter to **All entries**. Select the cleanup checkbox on every `TEST:` entry.
3. Choose **Clean up selected TEST: entries and reset rehearsal** and confirm. This removes the test entries, their test votes/results/manuscripts, the approved test stories, their related notifications, `TEST:` opportunity announcements, and test winner-email delivery records. It also clears the finalist-announced/results-published lock so the real contest can start cleanly.
4. If cleanup is blocked, stop. Do not delete anything manually. Read the message; a contract record or a non-test entry needs review first.
5. Edit Holiday Hearts again. Restore the five original dates from the table above, confirm the word limits and completion percentage are unchanged, turn **Enable rehearsal mode** off, and save.
6. Re-open the public Holiday Hearts page and confirm the normal future schedule is displayed. Keep the original dates in the launch checklist.

## 7. What cannot be fully tested until the domain is ready

The winner email is implemented as an authenticated Edge Function and is idempotency-logged. After buying the domain and verifying it with Resend, configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `GIDIREADS_SITE_URL` in Supabase Edge Function Secrets, deploy `send-holiday-hearts-winner-email`, and use **Send winner email** in the published results panel. Do not put the Resend key in a browser file or in the ZIP's public JavaScript.

## 8. Other V5 checks connected to this release

- **Contracted bar:** open Story Workspace for a story that has an accepted GidiReads contract. The same vertical Contracted strip shown on the public story page and author profile should now appear on the workspace cover. A story without an accepted contract should not show it.
- **Application question stability:** for a non-contest test opportunity, save two distinct application questions, submit one test application, then try to reorder or rename the questions. Saving should be blocked after the first application. Existing labels and answers should remain paired. Archive the test opportunity when finished.
- **Story likes:** on a published story page, check the count, like it from a signed-in reader, reload, and unlike it. The count should increase/decrease once and the liked state should persist. The same reader cannot create duplicate likes for one story.

## 9. Release check

- Rehearsal mode is off.
- Original dates are restored.
- No `TEST:` entries remain.
- No test-only announcements remain.
- Push has been checked on HTTPS with a subscribed test device.
- Winner email is marked **pending domain setup** until Resend is verified.
