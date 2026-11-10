/* GidiReads theme + font engine — one preference for the whole site.
 *
 * The saved theme preference (`gidireads-theme`) is one of:
 *   "dark"   - plum dark (default)
 *   "light"  - warm beige
 *   "amoled" - pure black
 *
 * It drives both attributes used by the stylesheets:
 *   html[data-theme]       -> Authors Studio / Insights light + dark token sets
 *                             ("amoled" uses the dark set plus black overrides)
 *   html[data-site-theme]  -> public palette: plum (dark), lilac (beige) or
 *                             amoled (black)
 *   html[data-theme-name]  -> the exact theme name for theme-specific repairs
 *
 * The site font preference (`gidireads-site-font`) drives:
 *   html[data-site-font]   -> editorial | classic | literary | modern
 * The reader and community pages are excluded from the site font on purpose;
 * they keep their own typography.
 *
 * This file is deliberately dependency-free (no imports, no network) so the
 * switchers keep working even when the Supabase module or its CDN is slow or
 * unavailable. A tiny inline snippet in each page's <head> applies the saved
 * theme and font before first paint; this script upgrades it with live
 * switching. */
(function () {
  'use strict';

  var STORAGE_KEY = 'gidireads-theme';
  var LEGACY_KEY = 'gr-site-theme';
  var DEFAULT_THEME = 'dark';
  var THEMES = ['dark', 'light', 'greenbeige', 'bluishbeige', 'amoled', 'custom'];
  var CYCLE_THEMES = ['dark', 'light', 'amoled'];
  var LABELS = { dark: 'Dark', light: 'Beige', greenbeige: 'Green Beige', bluishbeige: 'Bluish Beige', amoled: 'AMOLED', custom: 'Custom' };
  var ICONS = { dark: '\u263E', light: '\u2600', greenbeige: '\u2618', bluishbeige: '\u2601', amoled: '\u25CF', custom: '\u270E' }; /* ☾ ☀ ☘ ☁ ● ✎ */
  var THEME_COLORS = { dark: '#100a16', light: '#fbf7f1', greenbeige: '#f4f7f0', bluishbeige: '#f2f5fa', amoled: '#000000', custom: '#fbf7f1' };
  var SITE_THEME = { dark: 'plum', light: 'lilac', greenbeige: 'greenbeige', bluishbeige: 'bluishbeige', amoled: 'amoled', custom: 'custom' };
  var DATA_THEME = { dark: 'dark', light: 'light', greenbeige: 'light', bluishbeige: 'light', amoled: 'dark', custom: 'light' };
  var TOGGLE_SELECTOR = '#themeToggle, #theme, .theme-toggle, [data-theme-toggle]';
  var RADIO_SELECTOR = 'input[name="siteTheme"]';
  var FONT_KEY = 'gidireads-site-font';
  var DEFAULT_FONT = 'editorial';
  var FONTS = ['editorial', 'classic', 'literary', 'modern'];
  var FONT_LABELS = { editorial: 'Editorial', classic: 'Classic', literary: 'Literary', modern: 'Modern' };
  var FONT_RADIO_SELECTOR = 'input[name="siteFont"]';
  var FONT_EXCLUDED = /(^|\/)community(?:-space)?(?:\.html)?\/?$/i;

  function normalize(value) {
    if (value === 'light' || value === 'beige' || value === 'lilac' || value === 'light-mode') return 'light';
    if (value === 'dark' || value === 'plum') return 'dark';
    if (value === 'amoled' || value === 'black' || value === 'oled') return 'amoled';
    if (value === 'greenbeige' || value === 'green-beige' || value === 'green') return 'greenbeige';
    if (value === 'bluishbeige' || value === 'bluebeige' || value === 'bluish-beige' || value === 'blue') return 'bluishbeige';
    if (value === 'custom') return 'custom';
    return null;
  }

  function readStored() {
    try {
      var direct = normalize(localStorage.getItem(STORAGE_KEY));
      if (direct) return direct;
      var legacy = normalize(localStorage.getItem(LEGACY_KEY));
      if (legacy) {
        try { localStorage.setItem(STORAGE_KEY, legacy); } catch (_) {}
        return legacy;
      }
    } catch (_) { /* storage may be unavailable */ }
    return null;
  }

  function current() {
    var fromAttr = normalize(document.documentElement.getAttribute('data-theme-name'))
      || normalize(document.documentElement.getAttribute('data-theme'));
    return fromAttr || readStored() || DEFAULT_THEME;
  }

  function nextTheme(theme) {
    var index = CYCLE_THEMES.indexOf(theme);
    if (index === -1) return DEFAULT_THEME;
    return CYCLE_THEMES[(index + 1) % CYCLE_THEMES.length];
  }

  function normalizeFont(value) {
    return FONTS.indexOf(value) === -1 ? null : value;
  }

  function readStoredFont() {
    try {
      return normalizeFont(localStorage.getItem(FONT_KEY));
    } catch (_) {
      return null;
    }
  }

  function currentFont() {
    return normalizeFont(document.documentElement.getAttribute('data-site-font'))
      || readStoredFont()
      || DEFAULT_FONT;
  }

  function fontAllowed() {
    return !FONT_EXCLUDED.test(window.location.pathname);
  }

  function updateToggle(button, theme) {
    var target = nextTheme(theme);
    var icon = button.querySelector('.theme-icon') || button.querySelector('span');
    var label = button.querySelector('.theme-label') || button.querySelector('b');
    var isBrandLogo = !!button.querySelector('img.brand-mark');
    if (isBrandLogo) {
      /* Keep the brand logo image intact; only update accessible labels. */
    } else {
      if (icon) icon.textContent = ICONS[target];
      if (label) label.textContent = LABELS[target];
      if (!icon && !label) button.textContent = LABELS[target] + ' mode';
    }
    button.removeAttribute('aria-pressed');
    button.setAttribute('aria-label', 'Switch to ' + LABELS[target] + ' theme');
    button.setAttribute('title', 'Switch to ' + LABELS[target] + ' theme (' + (LABELS[theme]) + ')');
    button.setAttribute('data-current-theme', theme);
    button.setAttribute('data-next-theme', target);
  }

  function updateRadios(theme) {
    var radios = document.querySelectorAll(RADIO_SELECTOR);
    for (var i = 0; i < radios.length; i += 1) {
      var radio = radios[i];
      var chosen = normalize(radio.value) === theme;
      radio.checked = chosen;
      var group = radio.closest ? radio.closest('label') : radio.parentElement;
      if (group) group.classList.toggle('is-selected', chosen);
    }
  }

  function updateFontRadios(font) {
    var radios = document.querySelectorAll(FONT_RADIO_SELECTOR);
    for (var i = 0; i < radios.length; i += 1) {
      var radio = radios[i];
      var chosen = normalizeFont(radio.value) === font;
      radio.checked = chosen;
      var group = radio.closest ? radio.closest('label') : radio.parentElement;
      if (group) group.classList.toggle('is-selected', chosen);
    }
  }

  function readCustomTheme() {
    try {
      var raw = localStorage.getItem('gidireads-custom-theme');
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) { return null; }
  }

  function customMode() {
    var c = readCustomTheme();
    return (c && c.mode === 'dark') ? 'dark' : 'light';
  }

  function injectCustomStyle() {
    var c = readCustomTheme();
    var vars = (c && c.vars && typeof c.vars === 'object') ? c.vars : {};
    var id = 'gidireads-custom-theme-style';
    var style = document.getElementById(id);
    if (!style) { style = document.createElement('style'); style.id = id; document.head.appendChild(style); }
    var css = 'html[data-site-theme="custom"] { ';
    for (var k in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, k)) {
        css += k + ':' + vars[k] + ';';
      }
    }
    css += ' }';
    style.textContent = css;
  }

  function apply(theme) {
    theme = normalize(theme) || DEFAULT_THEME;
    var root = document.documentElement;
    var isCustom = (theme === 'custom');
    var mode = isCustom ? customMode() : theme;
    root.setAttribute('data-theme', isCustom ? (mode === 'dark' ? 'dark' : 'light') : DATA_THEME[theme]);
    root.setAttribute('data-theme-name', theme);
    root.setAttribute('data-site-theme', SITE_THEME[theme]);
    root.style.colorScheme = (mode === 'light' || mode === 'greenbeige' || mode === 'bluishbeige' || mode === 'light') ? 'light' : 'dark';
    // Sync body class for pages using body.dark / body:not(.dark) (e.g., reader.css)
    // Skip on the immersive reader, which manages its own theme classes.
    var body = document.body;
    var isReaderPage = body && body.classList && body.classList.contains('reader-body');
    if (body && !isReaderPage) {
      if (mode === 'light' || mode === 'greenbeige' || mode === 'bluishbeige') {
        body.classList.remove('dark');
      } else {
        body.classList.add('dark');
      }
    }
    if (isCustom) { injectCustomStyle(); }

    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i += 1) {
      metas[i].setAttribute('content', isCustom ? (mode === 'dark' ? '#000000' : '#fbf7f1') : THEME_COLORS[theme]);
    }

    var toggles = document.querySelectorAll(TOGGLE_SELECTOR);
    for (var j = 0; j < toggles.length; j += 1) updateToggle(toggles[j], theme);

    updateRadios(theme);

    try {
      document.dispatchEvent(new CustomEvent('gidireads:themechange', { detail: { theme: theme } }));
    } catch (_) { /* older browsers */ }
    return theme;
  }

  function applyFont(font) {
    if (!fontAllowed()) return null;
    font = normalizeFont(font) || DEFAULT_FONT;
    document.documentElement.setAttribute('data-site-font', font);
    updateFontRadios(font);

    try {
      document.dispatchEvent(new CustomEvent('gidireads:fontchange', { detail: { font: font } }));
    } catch (_) { /* older browsers */ }
    return font;
  }

  function set(theme) {
    theme = normalize(theme) || DEFAULT_THEME;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
      /* Keep the legacy key in sync for old pages/bookmarks that still read it. */
      localStorage.setItem(LEGACY_KEY, SITE_THEME[theme]);
    } catch (_) { /* storage may be unavailable; still apply for this page */ }
    return apply(theme);
  }

  function setFont(font) {
    font = normalizeFont(font) || DEFAULT_FONT;
    try {
      localStorage.setItem(FONT_KEY, font);
    } catch (_) { /* storage may be unavailable; still apply for this page */ }
    return applyFont(font);
  }

  function cycle() {
    return set(nextTheme(current()));
  }

  function closestToggle(node) {
    while (node && node !== document) {
      if (node.nodeType === 1 && node.matches && node.matches(TOGGLE_SELECTOR)) return node;
      node = node.parentNode;
    }
    return null;
  }

  function wire() {
    document.addEventListener('click', function (event) {
      var button = closestToggle(event.target);
      if (!button) return;
      event.preventDefault();
      cycle();
    }, false);

    document.addEventListener('change', function (event) {
      var radio = event.target;
      if (!radio || !radio.matches) return;
      if (radio.matches(RADIO_SELECTOR)) {
        set(radio.value);
      } else if (radio.matches(FONT_RADIO_SELECTOR)) {
        setFont(radio.value);
      }
    }, false);

    window.addEventListener('storage', function (event) {
      if (!event.key || event.key === STORAGE_KEY || event.key === LEGACY_KEY) {
        apply(readStored() || DEFAULT_THEME);
      }
      if (!event.key || event.key === FONT_KEY) {
        applyFont(readStoredFont() || DEFAULT_FONT);
      }
    }, false);

    window.addEventListener('pageshow', function () {
      apply(current());
      applyFont(currentFont());
    }, false);
  }

  function init() {
    var stored = readStored();
    apply(stored || current());
    applyFont(readStoredFont() || currentFont());
    wire();
  }

  window.GidiReadsTheme = {
    key: STORAGE_KEY,
    themes: THEMES.slice(),
    cycleThemes: CYCLE_THEMES.slice(),
    get: current,
    set: set,
    apply: apply,
    toggle: cycle,
    next: nextTheme,
    normalize: normalize,
    labels: LABELS,
    defaultTheme: DEFAULT_THEME
  };

  window.GidiReadsFont = {
    key: FONT_KEY,
    fonts: FONTS.slice(),
    get: currentFont,
    set: setFont,
    apply: applyFont,
    normalize: normalizeFont,
    labels: FONT_LABELS,
    defaultFont: DEFAULT_FONT
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
