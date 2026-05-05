/* ================================================================
   profile.html - Controller
   Dashboard-style user profile without mock data.
   ================================================================ */
'use strict';

const API = 'http://localhost:5000';
const AUTH_ENDPOINTS = ['/api/users/me', '/api/auth/me'];
const token = localStorage.getItem('accessToken');
let currentUser = null;
let userSource = null;

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function text(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function redirectToSignin() {
  window.location.href = 'signin.html?returnUrl=/profile.html';
}

function displayName(user) {
  return user?.username || user?.fullName || user?.name || user?.email || 'Account';
}

function initials(name) {
  const cleaned = String(name || '').trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

function formatPlan(plan) {
  return String(plan || 'free').toLowerCase();
}

function formatMoney(value) {
  if (value == null || value === '') return '$0.00';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return '$' + n.toFixed(2);
}

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString();
}

async function fetchCurrentUser() {
  for (const endpoint of AUTH_ENDPOINTS) {
    try {
      const r = await fetch(API + endpoint, { headers: { Authorization: 'Bearer ' + token } });
      if (r.status === 401 || r.status === 403) continue;
      if (!r.ok) continue;

      const d = await r.json();
      const user = d.data?.user || d.data || d.user;
      if (d.success !== false && user) {
        userSource = endpoint;
        return user;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function initAuth() {
  if (!token) {
    redirectToSignin();
    return;
  }

  currentUser = await fetchCurrentUser();
  if (!currentUser) {
    redirectToSignin();
    return;
  }

  renderNav();
  renderDashboard();
  loadMyPrompts();
  loadSavedPrompts();
  loadPurchasedPrompts();
}

function renderNav() {
  const area = document.getElementById('nav-auth-area');
  if (!area) return;

  const plan = formatPlan(currentUser.plan);
  const name = displayName(currentUser);
  const wallet = currentUser.walletBalance ?? currentUser.balance;

  area.innerHTML = `
    ${wallet == null ? '' : `
      <a href="profile.html" class="pf-wallet-chip" title="Wallet balance">
        <span class="material-symbols-outlined pf-wallet-chip__icon">toll</span>
        <span>${esc(formatMoney(wallet))}</span>
      </a>`}
    <a href="profile.html" class="pf-user-chip" title="Profile">
      <span class="pf-avatar" id="user-avatar">${esc(initials(name))}</span>
      <span class="pf-user-chip__body">
        <span class="pf-user-chip__name">${esc(name)}</span>
        <span class="pf-user-chip__plan">${esc(plan)}</span>
      </span>
    </a>`;

  applyAvatar('user-avatar', currentUser.avatarUrl, name);
}

function applyAvatar(id, avatarUrl, name) {
  const avatar = document.getElementById(id);
  if (!avatar) return;

  if (avatarUrl) {
    avatar.textContent = '';
    avatar.style.backgroundImage = 'url("' + String(avatarUrl).replace(/"/g, '%22') + '")';
    return;
  }

  avatar.style.backgroundImage = '';
  avatar.textContent = initials(name);
}

function renderDashboard() {
  const c = currentUser;
  const plan = formatPlan(c.plan);
  const name = displayName(c);
  const email = c.email || 'No email';
  const wallet = c.walletBalance ?? c.balance;

  // Header
  text('dash-name', name);
  text('dash-email', email);
  applyAvatar('dash-avatar', c.avatarUrl, name);

  // Summary cards
  const promptsCount = c._count?.prompts ?? c.promptsCount ?? 0;
  const savedCount = c._count?.savedPrompts ?? c.savedPromptsCount ?? 0;

  text('sum-prompts', promptsCount);
  text('sum-saved', savedCount);
  text('sum-wallet', formatMoney(wallet));

  // Plan badge
  const planEl = document.getElementById('sum-plan');
  if (planEl) {
    if (plan === 'pro') {
      planEl.className = 'dash-plan-badge dash-plan-badge--pro';
      planEl.innerHTML = '<span class="material-symbols-outlined dash-icon-sm">workspace_premium</span>PRO';
    } else {
      planEl.className = 'dash-plan-badge';
      planEl.innerHTML = '<span class="material-symbols-outlined dash-icon-sm">workspace_premium</span>FREE';
    }
  }

  // Account details
  text('detail-username', c.username || '—');
  text('detail-joined', formatDate(c.createdAt));
  text('wallet-display', formatMoney(wallet));

  // Upgrade box for free users
  const upgradeBox = document.getElementById('upgrade-box');
  if (upgradeBox) {
    if (plan === 'free') {
      upgradeBox.classList.remove('dash-hidden');
    } else {
      upgradeBox.classList.add('dash-hidden');
    }
  }

  // Show loading complete
  document.getElementById('init-loading').hidden = true;
  document.getElementById('page-content').hidden = false;

  if (userSource) {
    document.body.dataset.profileSource = userSource;
  }
}

function myPromptItemHTML(p) {
  const tags = Array.isArray(p.tags)
    ? p.tags
    : String(p.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  return `
    <div class="dash-prompt-item">
      <a href="prompt-detail.html?id=${esc(p.id)}" class="dash-prompt-item__link">
        <span class="dash-prompt-item__title">${esc(p.title)}</span>
        <span class="dash-prompt-item__meta">
          <span>${new Date(p.createdAt).toLocaleDateString()}</span>
          ${tags.slice(0, 2).map(tag => `<span class="pf-tag">${esc(tag)}</span>`).join('')}
        </span>
      </a>
      <div class="dash-prompt-item__score">
        <span class="material-symbols-outlined">arrow_upward</span>
        ${p.score || 0}
      </div>
    </div>`;
}

async function loadMyPrompts() {
  const el = document.getElementById('my-prompts-content');
  if (!el || !token) {
    if (el) {
      el.innerHTML = `<div class="dash-empty"><div class="dash-empty__icon"><span class="material-symbols-outlined">login</span></div><h3>Sign in to view your prompts</h3></div>`;
    }
    return;
  }

  try {
    const r = await fetch(API + '/api/users/me/prompts?limit=5', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const d = await r.json();

    if (!d.success) throw new Error(d.message || d.error?.message || 'Failed to load prompts');

    const items = d.data?.prompts || [];
    el.innerHTML = items.length
      ? items.map(myPromptItemHTML).join('')
      : `<div class="dash-empty">
          <div class="dash-empty__icon"><span class="material-symbols-outlined">edit_note</span></div>
          <h3>No prompts yet</h3>
          <p>Create your first prompt to share with the community.</p>
          <a href="create.html" class="pf-btn pf-btn--primary dash-mt-1">Create Prompt</a>
        </div>`;
  } catch (err) {
    el.innerHTML = `<div class="dash-empty">
      <div class="dash-empty__icon"><span class="material-symbols-outlined">warning</span></div>
      <h3>Unable to load prompts</h3>
      <p>${esc(err.message)}</p>
    </div>`;
  }
}

function savedPromptItemHTML(item) {
  const prompt = item.prompt || item;
  const tags = Array.isArray(prompt.tags)
    ? prompt.tags
    : String(prompt.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  return `
    <div class="dash-prompt-item">
      <a href="prompt-detail.html?id=${esc(prompt.id)}" class="dash-prompt-item__link">
        <span class="dash-prompt-item__title">${esc(prompt.title)}</span>
        <span class="dash-prompt-item__meta">
          <span>by ${esc(prompt.user?.username || 'unknown')}</span>
          ${tags.slice(0, 2).map(tag => `<span class="pf-tag">${esc(tag)}</span>`).join('')}
        </span>
      </a>
      <div class="dash-prompt-item__score">
        <span class="material-symbols-outlined">arrow_upward</span>
        ${prompt.score || 0}
      </div>
    </div>`;
}

async function loadSavedPrompts() {
  const el = document.getElementById('saved-prompts-content');
  if (!el || !token) {
    if (el) {
      el.innerHTML = `<div class="dash-empty"><div class="dash-empty__icon"><span class="material-symbols-outlined">login</span></div><h3>Sign in to view saved prompts</h3></div>`;
    }
    return;
  }

  try {
    const r = await fetch(API + '/api/users/me/saved-prompts', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const d = await r.json();

    if (!d.success) throw new Error(d.message || d.error?.message || 'Failed to load saved prompts');

    const items = d.data || [];
    el.innerHTML = items.length
      ? items.map(savedPromptItemHTML).join('')
      : `<div class="dash-empty">
          <div class="dash-empty__icon"><span class="material-symbols-outlined">bookmark_border</span></div>
          <h3>No saved prompts</h3>
          <p>Save prompts from the community to view them here.</p>
          <a href="community.html" class="pf-btn pf-btn--ghost dash-mt-1">Browse Community</a>
        </div>`;
  } catch (err) {
    el.innerHTML = `<div class="dash-empty">
      <div class="dash-empty__icon"><span class="material-symbols-outlined">warning</span></div>
      <h3>Unable to load saved prompts</h3>
      <p>${esc(err.message)}</p>
    </div>`;
  }
}

function purchasedPromptItemHTML(p) {
  const tags = Array.isArray(p.tags)
    ? p.tags
    : String(p.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  const price = p.price != null ? '$' + Number(p.price).toFixed(2) : '$0.00';

  return `
    <div class="dash-prompt-item">
      <a href="prompt-detail.html?id=${esc(p.id)}" class="dash-prompt-item__link">
        <span class="dash-prompt-item__title">${esc(p.title)}</span>
        <span class="dash-prompt-item__meta">
          <span>${new Date(p.createdAt).toLocaleDateString()}</span>
          ${tags.slice(0, 2).map(tag => `<span class="pf-tag">${esc(tag)}</span>`).join('')}
        </span>
      </a>
      <div class="dash-prompt-item__right">
        <span class="dash-prompt-item__price">${esc(price)}</span>
        <div class="dash-prompt-item__score">
          <span class="material-symbols-outlined">arrow_upward</span>
          ${p.score || 0}
        </div>
      </div>
    </div>`;
}

async function loadPurchasedPrompts() {
  const el = document.getElementById('purchased-prompts-content');
  if (!el || !token) {
    if (el) {
      el.innerHTML = `<div class="dash-empty"><div class="dash-empty__icon"><span class="material-symbols-outlined">login</span></div><h3>Sign in to view purchased prompts</h3></div>`;
    }
    return;
  }

  try {
    const r = await fetch(API + '/api/users/me/purchased-prompts', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const d = await r.json();

    if (!d.success) throw new Error(d.message || d.error?.message || 'Failed to load purchased prompts');

    const items = d.data?.prompts || [];
    el.innerHTML = items.length
      ? items.map(purchasedPromptItemHTML).join('')
      : `<div class="dash-empty">
          <div class="dash-empty__icon"><span class="material-symbols-outlined">shopping_cart</span></div>
          <h3>You haven't purchased any prompts yet</h3>
          <p>Browse the marketplace to find quality prompts.</p>
          <a href="marketplace.html" class="pf-btn pf-btn--primary dash-mt-1">Browse Marketplace</a>
        </div>`;
  } catch (err) {
    el.innerHTML = `<div class="dash-empty">
      <div class="dash-empty__icon"><span class="material-symbols-outlined">warning</span></div>
      <h3>Unable to load purchased prompts</h3>
      <p>${esc(err.message)}</p>
    </div>`;
  }
}

function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = 'signin.html?returnUrl=/profile.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('btn-logout')?.addEventListener('click', logout);
  await initAuth();
});