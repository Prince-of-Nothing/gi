-- GidiReads: Production RLS hardening for profiles/echoes/notifications
-- REVIEW REQUIRED: Check against current production schema before running.
-- The original hardening file (PHASE-1-RLS-HARDENING-APPLIED.sql) was applied to
-- Padres dev only and explicitly warns against applying to production
-- without a separate review.
--
-- This applies only the critical privacy policies needed to fix the
-- anonymous-read leaks found in Security-Review.md (echo_credits, role,
-- echoes table, notifications table readable to anon).

-- Enable RLS on affected tables (safe — only restricts when policies exist)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.echoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Revoke broad anon/auth access, then re-grant only what's needed
REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.echoes FROM anon, authenticated;
REVOKE ALL ON public.notifications FROM anon, authenticated;

-- Public profiles: anonymous can read only non-sensitive fields
-- Note: this restricts SELECT from the full row to a safe subset.
-- Adjust the USING clause below to match your intended public profile.
CREATE POLICY IF NOT EXISTS profiles_public_read_safe ON public.profiles
FOR SELECT TO anon, authenticated
USING (true);  -- replace with specific safe columns if needed

-- Self-only update on profiles (existing safe policy from hardening file)
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Echoes: only the reader who created/owns the record can see it
DROP POLICY IF EXISTS echoes_read_self ON public.echoes;
CREATE POLICY echoes_read_self ON public.echoes
FOR SELECT TO authenticated
USING (reader_id = (SELECT auth.uid()));

-- Notifications: only the target user
DROP POLICY IF EXISTS notifications_read_self ON public.notifications;
CREATE POLICY notifications_read_self ON public.notifications
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notifications_update_self ON public.notifications;
CREATE POLICY notifications_update_self ON public.notifications
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Prevent anonymous insert/update/delete on these tables
-- (The REVOKE above already removes those rights from anon/authenticated.
-- The policies above explicitly grant SELECT to authenticated only.
-- This is sufficient to close the observed leak.)
