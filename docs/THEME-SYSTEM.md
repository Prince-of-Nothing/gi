# GidiReads theme system

One saved theme preference controls the whole site (public pages, the community
pages, Authors Studio, Insights and the workspace pages). There are three themes:

| Theme | Storage value | `data-site-theme` | `data-theme` | Look |
| --- | --- | --- | --- | --- |
| Dark (default) | `dark` | `plum` | `dark` | plum-black |
| Beige | `light` | `lilac` | `light` | warm paper |
| AMOLED | `amoled` | `amoled` | `dark` + black overrides | pure black |

## Beige palette (canonical)

| Token | Value |
| --- | --- |
| Base background | `#fdfbf6` |
| Raised surface | `#fffcf7` |
| Soft surface / band | `#faf5ec` |
| Border / line | `#e7d7b8` |
| Ink text | `#30243a` |
| Muted text | `#65596b` |
| Light purple (accent) | `#8c639f` |
| Deep purple (accent strong) | `#63428a` |
| Warm gold | `#8a6420` |

The Beige theme is fully beige: chrome, heroes, cards, panels and footers are
warm paper surfaces with ink copy. Only content artwork (book covers,
illustrations, avatars) keeps its own pixels.

## AMOLED palette

Page `#000`, raised surfaces `#08080a`–`#0d0d10`, controls `#0a0a0c`, lines
`rgba(255,255,255,.10–.16)`, text `#f4f2f7`, muted `#b6b0c0`, accents
`#cdb6f2` / `#b98ef0` / `#e2c077`. Bright illustration panels are dimmed so
they do not glow on OLED.


## Preference

- Storage key: `gidireads-theme` with values `"dark"`, `"light"` or `"amoled"`.
- Default: `"dark"`.
- Legacy key `gr-site-theme` (`plum`/`lilac`/`dark`/`light-mode`/`amoled`) is read
  once for migration and kept in sync on every change for old bookmarks.
- The preference is applied to `<html>` as three attributes:
  - `data-theme="light" | "dark"` — Authors Studio / Insights token sets;
    AMOLED uses `dark` and then black overrides.
  - `data-site-theme="plum" | "lilac" | "amoled"` — the palette used by
    `theme.css` and the repair stylesheets.
  - `data-theme-name="dark" | "light" | "amoled"` — the exact theme name for
    theme-specific rules and debugging.

## Reading room theme

The reader (`reader.html`) has its own reading-surface picker with four
choices: **Light** (warm paper), **Beige** (the site's light palette),
**Dark** and **Darkness**. It is stored separately in
`gidireads-reader-theme` with values `"light"`, `"beige"`, `"dark"` or
`"darkness"` so a reader can keep a different surface for long reading
sessions.

- If the reader preference has never been set, the reader inherits the site
  theme once: Beige → Beige, AMOLED → Darkness, anything else → Dark.
- The choice is applied to `<html data-reader-theme>` by a tiny pre-paint script
  in `reader.html`, before `js/reader.js` runs, so a saved theme never flashes
  another palette on load.
- Reader theme changes do **not** change the site-wide theme. Changes made in one
  reader tab sync to other open reader tabs.

## Site font presets

Settings also has a **Font** picker. It is a separate preference from the reader
font control: the reader (`reader.html`) and the community pages
(`community.html`, `community-space.html`) are intentionally excluded so their
custom layouts keep their own typography.

| Preset | Storage value | Display font (`--font-display`) | Body font (`--font-body`) |
| --- | --- | --- | --- |
| Editorial (default) | `editorial` | Fraunces | Inter |
| Classic | `classic` | Playfair Display | Open Sans |
| Literary | `literary` | Cormorant Garamond | Source Sans Pro |
| Modern | `modern` | Inter | Inter |

The preference is stored in `gidireads-site-font` and applied to
`<html data-site-font="...">`. The inline head snippet applies it before first
paint; `js/theme.js` keeps it in sync across tabs and updates the Settings radio
inputs (`name="siteFont"`). All self-hosted fonts come from `css/fonts.css`, and
site CSS uses `var(--font-display)` / `var(--font-body)` rather than hard-coded
families so every preset reaches the whole page.

## Files

- `js/theme.js` — dependency-free engine (no imports / no network). Applies the
  theme and site font, cycles every theme toggle (Dark → Beige → AMOLED → Dark),
  updates the Settings radio pickers, syncs across tabs, and updates all
  `<meta name="theme-color">` tags. Exposes `window.GidiReadsTheme`
  (`get`, `set`, `toggle`, `next`, `apply`, `normalize`, `themes`) and
  `window.GidiReadsFont` (`get`, `set`, `apply`, `normalize`, `fonts`,
  `defaultFont`).
- Inline `data-gr-theme-init` snippet in each page `<head>` — sets the theme
  attributes, `color-scheme` and saved `data-site-font` **before first paint**,
  so a saved theme or font never flashes another choice (and the theme still
  applies if `js/theme.js` or the Supabase CDN cannot load).
- `css/theme.css` — palettes, global token application (plum, lilac, amoled,
  plus unused legacy presets) and the typography defaults/presets. Contains the
  Settings picker selected state (`.theme-option.is-selected`) and font card
  styles.
- `css/theme-light-fixes.css` — makes the **Beige** theme fully beige on public
  pages (scoped to `html[data-site-theme="lilac"]`).
- `css/theme-light-fixes-studio.css` — makes the **Beige** theme fully beige on
  Authors Studio / Insights (scoped to `html[data-theme="light"]`).
- `css/theme-amoled-fixes.css` — the **AMOLED** pure-black theme across all
  pages (scoped to `html[data-site-theme="amoled"]`).

## Adding a switcher to a page

Add a button with `id="themeToggle"` (or class `theme-toggle`, `id="theme"`, or
`data-theme-toggle`) containing optional `.theme-icon` and `.theme-label`
children. `js/theme.js` wires it with click delegation and keeps the icon,
label, `aria-label` and `title` in sync. The visible label always shows the mode
the button switches **to**; one click advances Dark → Beige → AMOLED → Dark.
Text-only toggles (like the Insights one) are supported too.

Settings uses radio inputs `name="siteTheme"` with values
`dark`/`light`/`amoled`; the engine keeps them checked and marks the enclosing
`.theme-option` label with `.is-selected`.

## Manual verification checklist

1. Open `settings.html` and choose each of **Dark**, **Beige** and **AMOLED**;
   then visit `index.html`, `authors-studio.html`, `my-stories.html` and
   `story.html` — the chosen theme must persist after navigation and reload.
2. Use the theme button in Authors Studio / Insights: one click must go
   Dark → Beige, the next Beige → AMOLED, the next AMOLED → Dark, and it must
   stay in sync with the Settings radios.
3. Beige mode should be warm beige across the whole page (nav, hero blocks,
   cards, footer), not beige with leftover dark panels. AMOLED mode should be
   pure black with near-black surfaces, not plum-dark.
4. Simulate a slow/blocked CDN (DevTools → block `*esm.sh*`) and reload a
   studio page: the saved theme must still be applied before first paint, with
   no flash of the wrong palette.
5. Open two tabs and toggle in one — the other tab should follow.
6. Confirm Dark mode is visually unchanged (the Beige/AMOLED repair files are
   scoped to their own `data-site-theme`/`data-theme` values).
7. In Settings, choose each **Font** preset and check `index.html`,
   `authors-studio.html`, `analytics.html` and `resources.html`; the heading and
   body fonts must change and the choice must survive a reload.
8. Open `community.html`, `community-space.html` and `reader.html` after choosing
   a non-default font: none of them should receive `data-site-font`, and their
   own typography must stay unchanged.
9. Open `community.html` and `community-space.html` after choosing each theme:
   both must follow the saved site theme (only their typography stays fixed).
