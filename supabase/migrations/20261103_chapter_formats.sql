-- Chapter-level format settings (reverses profile-level theme; aligned with author studio)
CREATE TABLE IF NOT EXISTS public.chapter_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  format_key text NOT NULL DEFAULT 'default',
  font_family text DEFAULT 'Fraunces',
  font_size int DEFAULT 18,
  text_color text DEFAULT '#1C1420',
  bg_color text DEFAULT '#FBF7F1',
  letter_spacing text DEFAULT 'normal',
  line_height text DEFAULT '1.6',
  alignment text DEFAULT 'left',
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(chapter_id, format_key)
);
