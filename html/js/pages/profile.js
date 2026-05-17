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
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
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
  loadWallet();
  loadEarnings();
}

function renderNav() {
  const area = document.getElementById('nav-auth-area');
  if (!area) return;

  const plan = formatPlan(currentUser.plan);
  const name = displayName(currentUser);
  const wallet = currentUser.wallet?.balance ?? currentUser.walletBalance ?? currentUser.balance;

  area.innerHTML = `
    ${wallet == null ? '' : `
      <div class="pf-wallet-chip" title="Wallet balance">
        <span class="material-symbols-outlined pf-wallet-chip__icon">toll</span>
        <span>${esc(formatMoney(wallet))}</span>
      </div>`}
    <div class="pf-user-chip" title="Profile">
      <span class="pf-avatar" id="user-avatar">${esc(initials(name))}</span>
      <span class="pf-user-chip__body">
        <span class="pf-user-chip__name">${esc(name)}</span>
        <span class="pf-user-chip__plan">${esc(plan)}</span>
      </span>
    </div>`;

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
  const wallet = c.wallet?.balance ?? c.walletBalance ?? c.balance;

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
      planEl.className = 'pr-plan-badge pr-plan-badge--pro';
      planEl.innerHTML = '<span class="material-symbols-outlined pr-plan-badge__icon" aria-hidden="true">workspace_premium</span>PRO';
    } else {
      planEl.className = 'pr-plan-badge';
      planEl.innerHTML = '<span class="material-symbols-outlined pr-plan-badge__icon" aria-hidden="true">workspace_premium</span>FREE';
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
      upgradeBox.classList.remove('pr-hidden');
    } else {
      upgradeBox.classList.add('pr-hidden');
    }
  }

  // Show loading complete
  document.getElementById('init-loading').hidden = true;
  document.getElementById('page-content').hidden = false;

  if (userSource) {
    document.body.dataset.profileSource = userSource;
  }
}

/* ── Card Rendering (Reusing Marketplace style) ── */
function isValidImageUrl(url) {
  if (!url) return false;
  try {
    const p = new URL(url);
    const path = p.pathname.toLowerCase();
    return /\.(png|jpe?g|webp|gif|avif|svg)$/.test(path) ||
           p.hostname.includes('unsplash.com') ||
           p.hostname.includes('cloudinary.com') ||
           p.hostname.includes('imgur.com');
  } catch { return false; }
}

function buildCardMediaHtml(p) {
  let html = '';
  const validImg = isValidImageUrl(p.imageUrl);
  if (validImg) {
    html += `<img class="mk-card__thumb" src="${esc(p.imageUrl)}" alt="Prompt thumbnail" loading="lazy"/>`;
  }
  if (p.resourceUrl && !validImg) {
    return `<div class="mk-card__resource-only"><a class="mk-card__resource-chip" href="${esc(p.resourceUrl)}" target="_blank" rel="noopener noreferrer"
      data-action="stopProp">
      <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
      ${esc(p.resourceUrl)}
    </a></div>`;
  }
  return html ? `<div class="mk-card__media">${html}</div>` : '';
}

function renderPromptCard(p) {
  const author = p.user?.username || 'unknown';
  const score = Math.max(0, p.score || 0);
  const numericPrice = parseFloat(p.price);
  const isPremium = numericPrice > 0;
  const priceStr = isPremium ? '$' + numericPrice.toFixed(2) : 'Free';
  const tags = Array.isArray(p.tags)
    ? p.tags.slice(0, 3)
    : (typeof p.tags === 'string' ? p.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3) : []);

  const badgeHtml = isPremium
    ? `<span class="mk-badge mk-badge--premium">Premium</span>`
    : `<span class="mk-badge mk-badge--free">Free</span>`;

  const tagsHtml = tags.map(t => `<span class="pf-tag">${esc(t)}</span>`).join('');
  const mediaHtml = buildCardMediaHtml(p);

  return `
  <div class="mk-card" data-action="gotoDetail" data-id="${esc(p.id)}">
    ${mediaHtml}
    <div class="mk-card__header">
      <div class="mk-card__title">${esc(p.title || 'Untitled')}</div>
      ${badgeHtml}
    </div>
    <div class="mk-card__meta">
      <span class="mk-card__author">by <strong>${esc(author)}</strong></span>
      <span class="mk-card__dot">·</span>
      <span class="mk-card__score">
        <span class="material-symbols-outlined mk-card__score-icon" aria-hidden="true">arrow_upward</span>
        ${score}
      </span>
    </div>
    ${tagsHtml ? `<div class="mk-card__tags">${tagsHtml}</div>` : ''}
    <div class="mk-card__footer" data-action="stopProp">
      <div class="mk-card__price ${isPremium ? 'mk-card__price--premium' : 'mk-card__price--free'}">${esc(priceStr)}</div>
      <div class="mk-card__actions">
        <button class="pf-btn pf-btn--ghost mk-card__btn"
          data-action="gotoDetail" data-id="${esc(p.id)}">View Details</button>
      </div>
    </div>
  </div>`;
}

function renderEmptyState(icon, title, desc, ctaHtml) {
  return `<div class="pr-empty">
    <div class="pr-empty__icon"><span class="material-symbols-outlined" aria-hidden="true">${icon}</span></div>
    <h3 class="pr-empty__title">${esc(title)}</h3>
    <p class="pr-empty__desc">${esc(desc)}</p>
    ${ctaHtml ? `<div class="pr-empty__cta">${ctaHtml}</div>` : ''}
  </div>`;
}

async function loadMyPrompts() {
  const el = document.getElementById('my-prompts-content');
  if (!el || !token) return;

  try {
    const r = await fetch(API + '/api/users/me/prompts?limit=6', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!r.ok) throw new Error('Failed to load prompts');
    const d = await r.json();

    const items = d.data?.prompts || [];
    if (!items.length) {
      el.innerHTML = renderEmptyState('edit_note', 'No prompts yet', 'Create your first prompt to share with the community.', '<a href="community.html?compose=1" class="pf-btn pf-btn--primary">Create Prompt</a>');
      return;
    }
    el.innerHTML = `<div class="mk-grid">${items.map(renderPromptCard).join('')}</div>`;
  } catch (err) {
    el.innerHTML = renderEmptyState('warning', 'Unable to load prompts', err.message);
  }
}

async function loadSavedPrompts() {
  const el = document.getElementById('saved-prompts-content');
  if (!el || !token) return;

  try {
    const r = await fetch(API + '/api/users/me/saved-prompts', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!r.ok) throw new Error('Failed to load saved prompts');
    const d = await r.json();

    const items = d.data || [];
    if (!items.length) {
      el.innerHTML = renderEmptyState('bookmark_border', 'No saved prompts', 'Save prompts from the community to view them here.', '<a href="community.html" class="pf-btn pf-btn--ghost">Browse Community</a>');
      return;
    }
    // Saved prompts usually return just the prompt under item.prompt, check data structure
    const promptList = items.map(item => item.prompt || item);
    el.innerHTML = `<div class="mk-grid">${promptList.map(renderPromptCard).join('')}</div>`;
  } catch (err) {
    el.innerHTML = renderEmptyState('warning', 'Unable to load saved prompts', err.message);
  }
}

async function loadPurchasedPrompts() {
  const el = document.getElementById('purchased-prompts-content');
  if (!el || !token) return;

  try {
    const r = await fetch(API + '/api/users/me/purchased-prompts', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!r.ok) throw new Error('Failed to load purchased prompts');
    const d = await r.json();

    const items = d.data?.prompts || [];
    if (!items.length) {
      el.innerHTML = renderEmptyState('shopping_cart', 'No purchased prompts', 'Browse the marketplace to find premium prompts.', '<a href="marketplace.html" class="pf-btn pf-btn--primary">Browse Marketplace</a>');
      return;
    }
    el.innerHTML = `<div class="mk-grid">${items.map(renderPromptCard).join('')}</div>`;
  } catch (err) {
    el.innerHTML = renderEmptyState('warning', 'Unable to load purchased prompts', err.message);
  }
}

async function loadWallet() {
  if (!token) return;
  try {
    const r = await fetch(API + '/api/users/me/wallet', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!r.ok) throw new Error('Failed to load wallet');
    const d = await r.json();

    const balance = d.data?.balance ?? 0;
    text('sum-wallet', formatMoney(balance));
    text('wallet-display', formatMoney(balance));

    const walletChip = document.querySelector('.pf-wallet-chip');
    if (walletChip) {
      walletChip.innerHTML = `<span class="material-symbols-outlined pf-wallet-chip__icon">toll</span><span>${formatMoney(balance)}</span>`;
    }
  } catch (err) {
    console.error('Failed to load wallet:', err);
  }
}

function earningsItemHTML(sale) {
  return `
    <div class="pr-earning-item">
      <a href="prompt-detail.html?id=${esc(sale.promptId)}#id=${esc(sale.promptId)}" class="pr-earning-item__link">
        <span class="pr-earning-item__title">${esc(sale.title)}</span>
        <span class="pr-earning-item__date">${new Date(sale.createdAt).toLocaleDateString()}</span>
      </a>
      <div class="pr-earning-item__price">${esc(formatMoney(sale.pricePaid))}</div>
    </div>`;
}

async function loadEarnings() {
  const el = document.getElementById('creator-content');
  if (!el || !token) return;

  try {
    const r = await fetch(API + '/api/users/me/earnings', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!r.ok) throw new Error('Failed to load earnings');
    const d = await r.json();

    const { totalEarnings, sales } = d.data || { totalEarnings: 0, sales: [] };

    const summaryHtml = `
      <div class="pr-earnings-summary">
        <div class="pr-earnings-total">
          <span class="pr-earnings-label">Total Earnings</span>
          <span class="pr-earnings-amount">${formatMoney(totalEarnings)}</span>
        </div>
      </div>`;

    if (!sales || sales.length === 0) {
      el.innerHTML = summaryHtml + renderEmptyState('shopping_bag', 'No sales yet', 'List your prompts on the marketplace to start earning.', '<a href="community.html?compose=1" class="pf-btn pf-btn--primary">Sell a Prompt</a>');
    } else {
      el.innerHTML = summaryHtml + `
        <div class="pr-earnings-list">
          <div class="pr-earnings-list-header">Recent Sales</div>
          ${sales.map(earningsItemHTML).join('')}
        </div>`;
    }
  } catch (err) {
    el.innerHTML = renderEmptyState('warning', 'Unable to load earnings', err.message);
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

  document.addEventListener('click', e => {
    const detailBtn = e.target.closest('[data-action="gotoDetail"]');
    if (detailBtn) {
      window.location.href = 'prompt-detail.html?id=' + detailBtn.dataset.id;
      return;
    }

    if (e.target.closest('[data-action="stopProp"]')) {
      e.stopPropagation();
    }
  });
});