/* ================================================================
   profile.html - Controller
   Honest user dashboard without mock data.
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
  if (value == null || value === '') return 'Unavailable';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return '$' + n.toFixed(2);
}

function formatDate(value) {
  if (!value) return 'Joined date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Joined date unavailable';
  return 'Joined ' + date.toLocaleDateString();
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
  renderProfile();
  loadSavedPrompts();
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

function statHTML(label, value) {
  const rendered = value == null || value === '' ? 'Unavailable' : String(value);
  return `<div class="stat-box"><div class="stat-box__val">${esc(rendered)}</div><div class="stat-box__label">${esc(label)}</div></div>`;
}

function renderProfile() {
  const c = currentUser;
  const plan = formatPlan(c.plan);
  const name = displayName(c);
  const email = c.email || 'Email unavailable';
  const wallet = c.walletBalance ?? c.balance;

  text('prof-name', name);
  text('prof-email', email);
  text('prof-joined', formatDate(c.createdAt));
  text('detail-username', c.username || 'Unavailable');
  text('detail-email', c.email || 'Unavailable');
  text('detail-plan', plan);
  text('detail-wallet', formatMoney(wallet));
  text('wallet-display', formatMoney(wallet));

  applyAvatar('prof-avatar', c.avatarUrl, name);

  const planBadge = document.getElementById('prof-plan');
  if (planBadge) {
    planBadge.textContent = plan;
    planBadge.className = 'plan-badge ' + esc(plan);
  }

  document.getElementById('activity-grid').innerHTML = [
    statHTML('Saved Prompts', c._count?.savedPrompts ?? c.savedPromptsCount),
    statHTML('Published', c._count?.prompts ?? c.promptsCount),
    statHTML('Votes Used', c.votesUsedToday),
    statHTML('Playground Runs', c.playgroundRuns)
  ].join('');

  renderCreatorState(plan);
  renderUpgradeState(plan);

  document.getElementById('init-loading').hidden = true;
  document.getElementById('page-content').hidden = false;

  if (userSource) {
    document.body.dataset.profileSource = userSource;
  }
}

function renderCreatorState(plan) {
  const el = document.getElementById('creator-content');
  if (!el) return;

  if (plan === 'creator') {
    el.innerHTML = `
      <div class="pf-empty-state pd-empty">
        <div class="pf-empty-state__icon"><span class="material-symbols-outlined">query_stats</span></div>
        <h3>Creator analytics unavailable</h3>
        <p>This account has creator access, but no creator dashboard data was returned by the account API.</p>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="pf-empty-state pd-empty">
      <div class="pf-empty-state__icon"><span class="material-symbols-outlined">lock</span></div>
      <h3>Creator tools locked</h3>
      <p>Creator sections require a creator plan.</p>
    </div>`;
}

function renderUpgradeState(plan) {
  if (plan === 'free') {
    document.getElementById('upgrade-box')?.classList.remove('pf-ad-banner--hidden');
  }
}

function savedPromptHTML(item) {
  const prompt = item.prompt || item;
  const author = prompt.user?.username || prompt.user?.fullName || 'unknown';
  const tags = Array.isArray(prompt.tags)
    ? prompt.tags
    : String(prompt.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  return `
    <a href="prompt-detail.html?id=${esc(prompt.id)}" class="pf-topic-row pf-topic-row--clickable">
      <div class="pf-topic-row__body">
        <div class="pf-topic-row__title">${esc(prompt.title)}</div>
        <div class="pf-topic-row__meta">
          <span>by <strong>${esc(author)}</strong></span>
          ${tags.slice(0, 3).map(tag => `<span class="pf-tag">${esc(tag)}</span>`).join('')}
        </div>
      </div>
    </a>`;
}

async function loadSavedPrompts() {
  const el = document.getElementById('saved-prompts-content');
  if (!el || !token) return;

  try {
    const r = await fetch(API + '/api/users/me/saved-prompts', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const d = await r.json();

    if (!d.success) throw new Error(d.message || d.error?.message || 'Failed to load saved prompts');

    const items = d.data || [];
    el.innerHTML = items.length
      ? items.map(savedPromptHTML).join('')
      : `<div class="pf-empty-state pd-empty">
          <div class="pf-empty-state__icon"><span class="material-symbols-outlined">bookmark_border</span></div>
          <h3>No saved prompts</h3>
          <p>Prompts you save from the community or detail pages will appear here.</p>
        </div>`;
  } catch (err) {
    el.innerHTML = `<div class="pf-empty-state pd-empty">
      <div class="pf-empty-state__icon"><span class="material-symbols-outlined">warning</span></div>
      <h3>Saved prompts unavailable</h3>
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
