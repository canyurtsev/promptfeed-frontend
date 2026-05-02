/* ================================================================
   settings.html - Local preferences
   Frontend-only language preference. No backend calls.
   ================================================================ */
'use strict';

const LANGUAGE_KEY = 'appLanguage';
const SUPPORTED_LANGUAGES = new Set(['en', 'tr']);

const COPY = {
  en: {
    documentTitle: 'Settings - PromptFeed',
    navNews: 'News',
    navCommunity: 'Community',
    navMarketplace: 'Marketplace',
    navBenchmarks: 'Benchmarks',
    navSkills: 'Skills',
    navBounties: 'Bounties',
    navPricing: 'Pricing',
    navSettings: 'Settings',
    title: 'Settings',
    subtitle: 'Manage local preferences for this browser.',
    languageTitle: 'Language',
    languageDescription: 'Choose the interface language for supported pages.',
    languageLabel: 'Language',
    localNote: 'Language preference is saved locally. Full translation rollout coming soon.',
    saved: 'Saved locally.'
  },
  tr: {
    documentTitle: 'Ayarlar - PromptFeed',
    navNews: 'Haberler',
    navCommunity: 'Topluluk',
    navMarketplace: 'Pazar Yeri',
    navBenchmarks: 'Karşılaştırmalar',
    navSkills: 'Beceriler',
    navBounties: 'Ödüller',
    navPricing: 'Fiyatlandırma',
    navSettings: 'Ayarlar',
    title: 'Ayarlar',
    subtitle: 'Bu tarayıcı için yerel tercihleri yönetin.',
    languageTitle: 'Dil',
    languageDescription: 'Desteklenen sayfalar için arayüz dilini seçin.',
    languageLabel: 'Dil',
    localNote: 'Dil tercihi yerel olarak kaydedilir. Tam çeviri yayını yakında.',
    saved: 'Yerel olarak kaydedildi.'
  }
};

function normalizeLanguage(value) {
  return SUPPORTED_LANGUAGES.has(value) ? value : 'en';
}

function getStoredLanguage() {
  if (window.PromptFeedLanguage) return window.PromptFeedLanguage.getLanguage();
  return normalizeLanguage(localStorage.getItem(LANGUAGE_KEY));
}

function setStoredLanguage(language) {
  if (window.PromptFeedLanguage) return window.PromptFeedLanguage.setLanguage(language);
  const normalized = normalizeLanguage(language);
  localStorage.setItem(LANGUAGE_KEY, normalized);
  return normalized;
}

function applyLanguage(language, showSavedState) {
  const normalized = normalizeLanguage(language);
  const copy = COPY[normalized];

  document.documentElement.lang = normalized;
  document.title = copy.documentTitle;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (copy[key]) el.textContent = copy[key];
  });

  const select = document.getElementById('language-select');
  if (select) select.value = normalized;

  const saved = document.getElementById('settings-saved');
  if (saved) {
    saved.textContent = showSavedState ? copy.saved : '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const language = getStoredLanguage();
  const select = document.getElementById('language-select');

  applyLanguage(language, false);

  select?.addEventListener('change', e => {
    const savedLanguage = setStoredLanguage(e.target.value);
    applyLanguage(savedLanguage, true);
    window.PromptFeedLanguage?.applyNavbarLanguage(savedLanguage);
  });

  window.addEventListener('app-language-change', e => {
    applyLanguage(e.detail?.language, true);
  });
});
