/* ================================================================
   PromptFeed navbar language toggle
   Shared frontend-only language preference via localStorage.appLanguage.
   ================================================================ */
'use strict';

(function () {
  const LANGUAGE_KEY = 'appLanguage';
  const SUPPORTED_LANGUAGES = new Set(['en', 'tr']);
  const NAV_COPY = {
    en: {
      community: 'Community',
      create: 'Create',
      profile: 'Profile',
      pricing: 'Pricing'
    },
    tr: {
      community: 'Topluluk',
      create: 'Oluştur',
      profile: 'Profil',
      pricing: 'Fiyatlandırma'
    }
  };

  function normalizeLanguage(value) {
    return SUPPORTED_LANGUAGES.has(value) ? value : 'en';
  }

  function getLanguage() {
    return normalizeLanguage(localStorage.getItem(LANGUAGE_KEY));
  }

  function setLanguage(language) {
    const normalized = normalizeLanguage(language);
    localStorage.setItem(LANGUAGE_KEY, normalized);
    return normalized;
  }

  function setText(selector, text) {
    document.querySelectorAll(selector).forEach(el => {
      el.textContent = text;
    });
  }

  function setTitle(selector, text) {
    document.querySelectorAll(selector).forEach(el => {
      el.title = text;
      el.setAttribute('aria-label', text);
    });
  }

  function applyNavbarLanguage(language) {
    const normalized = normalizeLanguage(language);
    const copy = NAV_COPY[normalized];

    document.documentElement.lang = normalized;
    setText('.pf-topnav__nav a[href="community.html"], .nav a[href="community.html"]', copy.community);
    setText('.pf-topnav__nav a[href="create.html"], .nav a[href="create.html"]', copy.create);
    setText('.pf-topnav__nav a[href="subscription.html"], .nav a[href="subscription.html"]', copy.pricing);
    setText('.pf-topnav__actions a[href="profile.html"].pf-btn', copy.profile);
    setTitle('.pf-topnav__actions a[href="profile.html"], .pf-topnav__actions .pf-avatar, .pf-topnav__actions [data-action="goto-profile"]', copy.profile);

    document.querySelectorAll('.pf-language-toggle__option').forEach(option => {
      const isActive = option.dataset.language === normalized;
      option.classList.toggle('active', isActive);
      option.setAttribute('aria-pressed', String(isActive));
    });
  }

  function ensureToggle() {
    if (document.getElementById('language-toggle')) return;

    const topnav = document.querySelector('.pf-topnav__inner') || document.querySelector('.nav');
    if (!topnav) return;

    const toggle = document.createElement('div');
    toggle.id = 'language-toggle';
    toggle.className = 'pf-language-toggle';
    toggle.setAttribute('role', 'group');
    toggle.setAttribute('aria-label', 'Language');
    toggle.innerHTML = [
      '<button type="button" class="pf-language-toggle__option" data-language="en">EN</button>',
      '<button type="button" class="pf-language-toggle__option" data-language="tr">TR</button>'
    ].join('');

    topnav.appendChild(toggle);
  }

  function handleClick(event) {
    const button = event.target.closest('.pf-language-toggle__option');
    if (!button) return;

    const language = setLanguage(button.dataset.language);
    applyNavbarLanguage(language);
    window.dispatchEvent(new CustomEvent('app-language-change', { detail: { language } }));
  }

  function init() {
    ensureToggle();
    applyNavbarLanguage(getLanguage());
    document.addEventListener('click', handleClick);

    const observer = new MutationObserver(() => applyNavbarLanguage(getLanguage()));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.PromptFeedLanguage = {
    key: LANGUAGE_KEY,
    normalizeLanguage,
    getLanguage,
    setLanguage,
    applyNavbarLanguage
  };

  document.addEventListener('DOMContentLoaded', init);
})();
