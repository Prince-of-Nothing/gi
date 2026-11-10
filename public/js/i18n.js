/* i18n.js — site language engine + chooser.
 * Base language is English. Dictionaries live in assets/language/<lang>.json.
 * Works without touching HTML: known English phrases in text nodes are replaced,
 * and placeholder/title/aria-label/alt attributes are translated through the
 * "attrs" map. Elements can opt out with data-no-i18n.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'gr-site-lang';
  var LANGS = {
    en: { name: 'English', native: 'English', short: 'EN' },
    fr: { name: 'French', native: 'Français', short: 'FR' },
    ru: { name: 'Russian', native: 'Русский', short: 'RU' }
  };
  var FALLBACK = 'en';

  var currentLang = FALLBACK;
  var dictionary = { strings: {}, phrases: {}, attrs: {} };
  var exactMap = new Map();
  var multiMap = new Map();
  var multiRegex = null;
  var attrExactMap = new Map();
  var attrMultiMap = new Map();
  var attrMultiRegex = null;
  var observer = null;

  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function getLang() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return LANGS[v] ? v : FALLBACK;
    } catch (e) { return FALLBACK; }
  }

  function storeLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  function loadDictionary(lang) {
    if (!lang || lang === FALLBACK) return Promise.resolve({ strings: {}, phrases: {}, attrs: {} });
    return fetch('assets/language/' + lang + '.json', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .catch(function () { return { strings: {}, phrases: {}, attrs: {} }; });
  }

  function prepareEntries() {
    var p = dictionary.phrases || {};
    var a = dictionary.attrs || {};
    var multi = [];
    exactMap = new Map();
    multiMap = new Map();
    attrExactMap = new Map();
    attrMultiMap = new Map();
    multiRegex = null;
    attrMultiRegex = null;

    Object.keys(p).forEach(function (k) {
      var v = p[k];
      if (!v) return;
      if (k.indexOf(' ') === -1) exactMap.set(k, v);
      else { multi.push(k); multiMap.set(k, v); }
    });
    multi.sort(function (x, y) { return y.length - x.length; });
    if (multi.length) multiRegex = new RegExp(multi.map(escapeRegex).join('|'), 'g');

    var attrMulti = [];
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (!v) return;
      if (k.indexOf(' ') === -1) attrExactMap.set(k, v);
      else { attrMulti.push(k); attrMultiMap.set(k, v); }
    });
    attrMulti.sort(function (x, y) { return y.length - x.length; });
    if (attrMulti.length) attrMultiRegex = new RegExp(attrMulti.map(escapeRegex).join('|'), 'g');
  }

  function isSkipped(el) {
    return !!(el && el.closest && el.closest('[data-no-i18n], .gr-lang-switcher'));
  }

  function translateTextNode(node) {
    var text = node.nodeValue;
    if (!text || !text.trim()) return;
    var changed = false;
    if (multiRegex) {
      var next = text.replace(multiRegex, function (m) { return multiMap.get(m) || m; });
      if (next !== text) { text = next; changed = true; }
    }
    var trimmed = text.trim();
    if (exactMap.has(trimmed)) {
      text = text.replace(trimmed, exactMap.get(trimmed));
      changed = true;
    }
    if (changed) node.nodeValue = text;
  }

  function translateElement(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA' || tag === 'CODE' || tag === 'PRE') return NodeFilter.FILTER_REJECT;
        if (isSkipped(p)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (var i = 0; i < nodes.length; i++) translateTextNode(nodes[i]);
  }

  function translateAttributes(root) {
    var scope = root || document;
    var els = scope.querySelectorAll('[placeholder],[title],[aria-label],[alt]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (isSkipped(el)) continue;
      var attrs = ['placeholder', 'title', 'aria-label', 'alt'];
      for (var j = 0; j < attrs.length; j++) {
        var attr = attrs[j];
        var val = el.getAttribute(attr);
        if (!val) continue;
        var next = val;
        if (attrMultiRegex) next = next.replace(attrMultiRegex, function (m) { return attrMultiMap.get(m) || m; });
        var trimmed = next.trim();
        if (attrExactMap.has(trimmed)) next = next.replace(trimmed, attrExactMap.get(trimmed));
        if (next !== val) el.setAttribute(attr, next);
      }
    }
  }

  function applyDataAttrs() {
    var strings = dictionary.strings || {};
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      if (strings[key] != null) nodes[i].textContent = strings[key];
    }
    var ph = document.querySelectorAll('[data-i18n-ph]');
    for (var j = 0; j < ph.length; j++) {
      var k = ph[j].getAttribute('data-i18n-ph');
      if (strings[k] != null) ph[j].placeholder = strings[k];
    }
  }

  function applyTranslations() {
    if (currentLang === FALLBACK) return;
    applyDataAttrs();
    translateElement(document.body);
    translateAttributes(document.body);
  }

  function observeDynamic() {
    if (observer || currentLang === FALLBACK || !document.body) return;
    observer = new MutationObserver(function (mutations) {
      if (getLang() !== currentLang) return;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        for (var j = 0; j < m.addedNodes.length; j++) {
          var node = m.addedNodes[j];
          if (node.nodeType === Node.TEXT_NODE) {
            if (node.parentElement && !isSkipped(node.parentElement)) translateTextNode(node);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (isSkipped(node)) continue;
            translateElement(node);
            translateAttributes(node);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------------ */
  /* Language chooser                                                    */
  /* ------------------------------------------------------------------ */

  var SWITCHER_CSS = `
.gr-lang-switcher{position:relative;display:inline-flex;align-items:center;font-family:inherit}
.gr-lang-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:9px;border:1px solid rgba(185,155,218,.28);background:rgba(185,155,218,.08);color:inherit;cursor:pointer;font:inherit;font-size:.8rem;font-weight:600;line-height:1}
.gr-lang-btn:hover{border-color:rgba(185,155,218,.55)}
.gr-lang-btn svg{width:16px;height:16px;flex:0 0 16px}
.gr-lang-menu{position:absolute;top:calc(100% + 6px);right:0;min-width:160px;padding:6px;border-radius:10px;border:1px solid var(--line-color,rgba(216,184,240,.2));background:var(--surface-2,#21142b);box-shadow:0 12px 30px rgba(0,0,0,.35);z-index:120}
.gr-lang-menu button{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:8px 10px;border:0;background:transparent;color:inherit;border-radius:7px;cursor:pointer;font:inherit;font-size:.85rem;text-align:left}
.gr-lang-menu button:hover,.gr-lang-menu button.active{background:rgba(185,155,218,.18)}
.gr-lang-menu button .gr-lang-check{display:none;color:var(--accent,#b99bda);font-weight:700}
.gr-lang-menu button.active .gr-lang-check{display:inline}
.gr-lang-switcher.is-fixed{position:fixed;right:16px;bottom:96px;z-index:80}
@media(max-width:560px){.gr-lang-switcher.is-fixed{bottom:88px;right:10px}}
`;

  function ensureStyles() {
    if (document.getElementById('gr-i18n-style')) return;
    var style = document.createElement('style');
    style.id = 'gr-i18n-style';
    style.textContent = SWITCHER_CSS;
    document.head.appendChild(style);
  }

  function switcherHtml() {
    var options = Object.keys(LANGS).map(function (code) {
      var l = LANGS[code];
      return '<button type="button" role="option" data-lang="' + code + '" aria-selected="' + (code === currentLang) + '">' +
        '<span>' + l.native + '</span><span class="gr-lang-check">✓</span></button>';
    }).join('');
    return '<div class="gr-lang-switcher" data-no-i18n>' +
      '<button type="button" class="gr-lang-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Language">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9s1.3-6.4 3.8-9z"/></svg>' +
      '<span class="gr-lang-current">' + (LANGS[currentLang] ? LANGS[currentLang].short : 'EN') + '</span>' +
      '</button>' +
      '<div class="gr-lang-menu" role="listbox" hidden>' + options + '</div>' +
      '</div>';
  }

  function updateSwitcher() {
    var current = document.querySelector('.gr-lang-switcher .gr-lang-current');
    if (current) current.textContent = LANGS[currentLang] ? LANGS[currentLang].short : 'EN';
    var btns = document.querySelectorAll('.gr-lang-switcher [data-lang]');
    for (var i = 0; i < btns.length; i++) {
      var active = btns[i].getAttribute('data-lang') === currentLang;
      btns[i].classList.toggle('active', active);
      btns[i].setAttribute('aria-selected', active ? 'true' : 'false');
    }
    var radios = document.querySelectorAll('[name="siteLanguage"]');
    for (var j = 0; j < radios.length; j++) {
      radios[j].checked = radios[j].value === currentLang;
    }
  }

  function changeLang(lang) {
    if (!LANGS[lang] || lang === currentLang) return;
    storeLang(lang);
    // Reload so the whole page is re-translated from a clean English DOM.
    window.location.reload();
  }

  function injectSwitcher() {
    if (document.querySelector('.gr-lang-switcher')) return;
    // Only show language switcher on the Settings page.
    var isSettingsPage = location.pathname.split('/').pop() === 'settings.html';
    if (!isSettingsPage) return;
    // The immersive reader has no site header, so the floating picker would be
    // the only site chrome on the page. Keep translations, skip the chooser.
    if (document.body && document.body.classList.contains('reader-body')) return;
    ensureStyles();
    var host = document.querySelector('.nav-actions, .topbar-actions, .top-actions, .an-top-actions, .ws-top-actions, .gathering-top nav, .studio-topbar .topbar-actions');
    var el = document.createElement('div');
    el.innerHTML = switcherHtml();
    var switcher = el.firstElementChild;
    if (host) {
      host.appendChild(switcher);
    } else {
      switcher.classList.add('is-fixed');
      document.body.appendChild(switcher);
    }
    wireSwitcher(switcher);
  }

  function wireSwitcher(switcher) {
    var btn = switcher.querySelector('.gr-lang-btn');
    var menu = switcher.querySelector('.gr-lang-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !menu.hidden;
      menu.hidden = open;
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    document.addEventListener('click', function () {
      if (!menu.hidden) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    });
    var options = menu.querySelectorAll('[data-lang]');
    for (var i = 0; i < options.length; i++) {
      options[i].addEventListener('click', function () {
        menu.hidden = true;
        changeLang(this.getAttribute('data-lang'));
      });
    }
  }

  function wireSettings() {
    var radios = document.querySelectorAll('[name="siteLanguage"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener('change', function () {
        changeLang(this.value);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  function boot() {
    currentLang = getLang();
    document.documentElement.lang = currentLang;
    document.documentElement.setAttribute('data-lang', currentLang);

    injectSwitcher();
    updateSwitcher();
    wireSettings();

    loadDictionary(currentLang).then(function (dict) {
      dictionary = dict || { strings: {}, phrases: {}, attrs: {} };
      prepareEntries();
      applyTranslations();
      observeDynamic();
    });
  }

  // Set the language attribute as early as possible to avoid a wrong-lang flash.
  document.documentElement.setAttribute('data-lang', getLang());
  document.documentElement.lang = getLang();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  // Expose a tiny API for future expansion.
  window.GidiReadsI18n = {
    getLang: getLang,
    setLang: changeLang,
    languages: LANGS
  };
})();
