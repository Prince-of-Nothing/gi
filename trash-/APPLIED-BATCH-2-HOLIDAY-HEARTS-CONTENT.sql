-- =====================================================================
-- GidiReads - Holiday Hearts, Batch 2
-- REVIEW ONLY. NOT applied to any database.
--
-- Updates ONE row's settings (slug 'holiday-hearts-2026') so the public page
-- shows the current rules and the 70% / 30% scoring direction from your roadmap.
-- It only merges new keys into the existing settings JSON; every other
-- setting, date and column stays as it is. No tables are created or dropped.
--
-- Until this is applied, the page uses its built-in default rules and the
-- 70/30 wording, so nothing public is wrong either way.
--
-- IMPORTANT: the existing row still says 50% readers / 50% judges and mentions
-- a story-completion percentage. This replaces the public rules text only.
-- The old judging weights are left untouched for now and are replaced in Batch 4
-- (voting and scoring), when the scoring method is documented and versioned.
-- =====================================================================
begin;

update public.platform_opportunities
set settings = settings
  || jsonb_build_object(
       'rules_version', 2,
       'terms', jsonb_build_array(
         'Write an original holiday romance based on one of the three official prompts.',
         'One entry per author. You must own or control the rights to the work.',
         'Your story must be between 5,000 and 30,000 words.',
         'Submit before the deadline. Late entries cannot be accepted.',
         'You will confirm the required eligibility, originality and rights declarations when you enter.',
         'Entries are reviewed for eligibility before they appear publicly. Entries that are withdrawn, invalid or disqualified are not shown.',
         'Suspicious or coordinated voting and artificial engagement may be reviewed and excluded. Rule violations can lead to disqualification.',
         'Contract offers are subject to eligibility, editorial review, rights checks and your acceptance of the actual contract terms. The contest does not by itself require exclusivity.'
       ),
       'scoring', jsonb_build_object('voting_weight', 70, 'engagement_weight', 30),
       'prizes', jsonb_build_array(
         jsonb_build_object('title','Winner (1st place)','text','Contract offer, hero and homepage features, social promotion and a winner badge.'),
         jsonb_build_object('title','First runner-up (2nd place)','text','Contract offer, homepage feature, social promotion and a winner badge.'),
         jsonb_build_object('title','Second runner-up (3rd place)','text','Contract offer, a featured spot in the Holiday Hearts collection and a winner badge.'),
         jsonb_build_object('title','Reader''s Choice','text','A Reader''s Choice badge and a newsletter shout-out.'),
         jsonb_build_object('title','Every eligible participant','text','A participant badge and a place in the Holiday Hearts section.')
       )
     )
where slug = 'holiday-hearts-2026';

commit;
-- To undo, restore the previous settings JSON from a backup; take one before applying.
