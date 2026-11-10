-- Theme presets reference table (id = numeric preset)
CREATE TABLE IF NOT EXISTS public.theme_presets (
  id int PRIMARY KEY,
  name text NOT NULL,
  value text NOT NULL DEFAULT 'lilac'
);

INSERT INTO public.theme_presets (id, name, value) VALUES
  (1, 'Lilac / Ivory', 'lilac'),
  (2, 'Plum / Deep', 'plum'),
  (3, 'Shadow Prince', 'shadow-prince'),
  (4, 'Starweaver', 'starweaver'),
  (5, 'Nightguard', 'nightguard'),
  (6, 'Enchanted Forest', 'enchanted-forest'),
  (7, 'Royal Library', 'royal-library'),
  (8, 'Frostkeeper', 'ice-profile-companion'),
  (9, 'Night Familiar', 'cat-profile-companion')
ON CONFLICT (id) DO NOTHING;

-- Link profiles.theme_pref to preset id (integer reference)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_pref integer DEFAULT 1;
