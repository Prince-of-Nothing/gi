-- Normalized theme token table: fewest edits, DB-driven colors/fonts
CREATE TABLE IF NOT EXISTS public.theme_tokens (
  token_key text PRIMARY KEY,
  token_value text NOT NULL,
  category text DEFAULT 'color',
  updated_at timestamp with time zone DEFAULT now()
);

-- Seed with current design tokens (normalize once)
INSERT INTO public.theme_tokens (token_key, token_value, category) VALUES
  ('ivory', '#FBF7F1', 'color'),
  ('ink', '#1C1420', 'color'),
  ('lilac', '#B79FD1', 'color'),
  ('plum', '#5C3A5E', 'color'),
  ('line', 'rgba(28, 20, 32, 0.10)', 'color'),
  ('font-family-display', "'Fraunces', serif", 'font'),
  ('font-family-body', "'Inter', sans-serif", 'font'),
  ('font-size-base', '16px', 'size'),
  ('line-height-body', '1.6', 'spacing'),
  ('border-radius', '6px', 'shape')
ON CONFLICT (token_key) DO NOTHING;

-- Link preset to tokens via preset_tokens if needed
CREATE TABLE IF NOT EXISTS public.preset_tokens (
  preset_id int REFERENCES public.theme_presets(id),
  token_key text REFERENCES public.theme_tokens(token_key),
  token_value_override text,
  PRIMARY KEY (preset_id, token_key)
);
