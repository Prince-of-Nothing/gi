-- Add theme preference to profiles (run in Supabase SQL Editor)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_pref text DEFAULT 'lilac';
