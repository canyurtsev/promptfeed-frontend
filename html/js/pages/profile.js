/* ================================================================
   profile.html — Controller
   Honest User Dashboard without Mock Data
   ================================================================ */
'use strict';

const API = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function requireAuth() {
  window.location.href = 'signin.html?returnUrl=profile.html';
}

/* —— Auth & Load —— */
async function initAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!token) {
    requireAuth();
    return;
  }

  try {
    const r = await fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (d.success && d.data) {
      currentUser = d.data;

      area.innerHTML = `
        <div class="pf-wallet-chip" title="Wallet balance">
          <span class="material-symbols-outlined pf-wallet-chip__icon">toll</span>
          <span>${esc(String(currentUser.walletBalance ?? '—'))}</span>
        </div>
        <div class="pf-avatar" id="user-avatar" title="Profile"
          style="${currentUser.avatarUrl ? 'background-image:url(' + esc(currentUser.avatarUrl) + ')' : ''}"
          data-action="goto-signin"></div>`;

      renderProfile();
    } else {
      requireAuth();
    }
  } catch {
    requireAuth();
  }
}

function renderProfile() {
  const c = currentUser;
  const plan = (c.plan || 'free').toLowerCase();

  document.getElementById('prof-name').textContent = c.username || 'Anonymous User';
  document.getElementById('prof-email').textContent = c.email || '';

  if (c.avatarUrl) {
    document.getElementById('prof-avatar').style.backgroundImage = 'url(' + esc(c.avatarUrl) + ')';
    document.getElementById('prof-avatar').innerHTML = '';
  }

  const planBadge = document.getElementById('prof-plan');
  planBadge.textContent = plan;
  planBadge.className = 'plan-badge ' + plan;

  if (c.createdAt) {
    document.getElementById('prof-joined').textContent = 'Joined ' + new Date(c.createdAt).toLocaleDateString();
  }

  let wb = c.walletBalance ?? 0;
  let wbStr = String(wb);
  if (!isNaN(parseFloat(wbStr))) wbStr = '$' + parseFloat(wbStr).toFixed(2);
  document.getElementById('wallet-display').textContent = wbStr;

  const saved = c._count?.savedPrompts ?? c.savedPromptsCount ?? '—';
  const published = c._count?.prompts ?? c.promptsCount ?? '—';
  const votes = c.votesUsedToday ?? '—';
  const runs = c.playgroundRuns ?? '—';

  document.getElementById('activity-grid').innerHTML = `
    <div class="stat-box"><div class="stat-box__val">${esc(String(saved))}</div><div class="stat-box__label">Saved Prompts</div></div>
    <div class="stat-box"><div class="stat-box__val">${esc(String(published))}</div><div class="stat-box__label">Published</div></div>
    <div class="stat-box"><div class="stat-box__val">${esc(String(votes))}</div><div class="stat-box__label">Votes Used</div></div>
    <div class="stat-box"><div class="stat-box__val">${esc(String(runs))}</div><div class="stat-box__label">Playground Runs</div></div>
  `;

  if (plan === 'creator') {
    document.getElementById('creator-panel').style.display = 'block';
  } else {
    document.getElementById('upgrade-box').classList.remove('pf-ad-banner--hidden');
  }

  if (plan === 'free') {
    document.getElementById('right-ad-slot').classList.remove('pf-ad-banner--hidden');
  }

  document.getElementById('init-loading').style.display = 'none';
  document.getElementById('page-content').style.display = 'grid';
}

/* —— Event Delegation + Init —— */
document.addEventListener('click', e => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  if (actionEl.dataset.action === 'goto-signin') {
    window.location.href = 'signin.html';
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
});
