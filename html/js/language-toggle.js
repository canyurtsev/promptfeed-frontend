/* ================================================================
   PromptFeed navbar language toggle
   Shared frontend-only language preference via localStorage.appLanguage.
   ================================================================ */
'use strict';

(function () {
  if (window.PromptFeedLanguage?.initialized) return;

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
      create: 'Olu\u015ftur',
      profile: 'Profil',
      pricing: 'Fiyatland\u0131rma'
    }
  };

  let initialized = false;

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
      if (el.textContent !== text) el.textContent = text;
    });
  }

  function setTitle(selector, text) {
    document.querySelectorAll(selector).forEach(el => {
      if (el.title !== text) el.title = text;
      if (el.getAttribute('aria-label') !== text) el.setAttribute('aria-label', text);
    });
  }

  function applyNavbarLanguage(language) {
    const normalized = normalizeLanguage(language);
    const copy = NAV_COPY[normalized];

    if (document.documentElement.lang !== normalized) {
      document.documentElement.lang = normalized;
    }

    setText('.pf-topnav__nav a[href="community.html"], .nav a[href="community.html"]', copy.community);
    setText('.pf-topnav__nav a[href="create.html"], .nav a[href="create.html"]', copy.create);
    setText('.pf-topnav__nav a[href="subscription.html"], .nav a[href="subscription.html"]', copy.pricing);
    setText('.pf-topnav__actions a[href="profile.html"].pf-btn', copy.profile);
    setTitle('.pf-topnav__actions a[href="profile.html"], .pf-topnav__actions .pf-avatar, .pf-topnav__actions [data-action="goto-profile"]', copy.profile);

    document.querySelectorAll('.pf-language-toggle__option').forEach(option => {
      const isActive = option.dataset.language === normalized;
      const pressed = String(isActive);

      if (option.classList.contains('active') !== isActive) {
        option.classList.toggle('active', isActive);
      }
      if (option.getAttribute('aria-pressed') !== pressed) {
        option.setAttribute('aria-pressed', pressed);
      }
    });
  }

  function ensureToggle() {
    const existing = document.getElementById('language-toggle');
    if (existing) return existing;

    const topnav = document.querySelector('.pf-topnav__inner') || document.querySelector('.nav');
    if (!topnav) return null;

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
    return toggle;
  }

  function handleClick(event) {
    const button = event.target.closest('.pf-language-toggle__option');
    if (!button) return;

    const language = setLanguage(button.dataset.language);
    applyNavbarLanguage(language);
    window.dispatchEvent(new CustomEvent('app-language-change', { detail: { language } }));
  }

  function init() {
    if (initialized) return;
    initialized = true;

    const toggle = ensureToggle();
    applyNavbarLanguage(getLanguage());
    toggle?.addEventListener('click', handleClick);
  }

  window.PromptFeedLanguage = {
    key: LANGUAGE_KEY,
    initialized: true,
    normalizeLanguage,
    getLanguage,
    setLanguage,
    applyNavbarLanguage
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Global image error handler (CSP safe, no inline JS)
  window.addEventListener('error', function(e) {
    if (e.target && e.target.tagName === 'IMG') {
      e.target.classList.add('pf-img-broken');
      
      // Cleanly collapse wrappers if the broken image was the only visual element
      const wrapper = e.target.closest('.mk-card__media, .pd-media-panel, .pf-topic-row__media');
      if (wrapper) {
        // If the wrapper contains no other visible links/chips, hide the entire wrapper
        const hasOtherContent = Array.from(wrapper.children).some(c => c !== e.target && !c.classList.contains('pf-img-broken'));
        if (!hasOtherContent) {
          wrapper.classList.add('pf-img-broken');
        }
      }
    }
  }, true); // Use capture to catch resource loading errors
})();
