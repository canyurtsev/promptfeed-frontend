/* ================================================================
   subscription.html — Controller
   Honest user state mapping without mock data
   ================================================================ */
'use strict';

const API = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function toast(msg, ok = true) {
  const t = document.createElement('div');
  t.className = 'pf-toast';
  t.textContent = msg;
  if (!ok) t.style.borderColor = 'var(--pf-danger)';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* —— Auth & Plan Loading —— */
async function initAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!token) {
    area.innerHTML = `<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
      <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
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
          data-action="goto-profile"></div>`;

      applyPlanState(currentUser.plan || 'free');
    } else {
      guestNav(area);
    }
  } catch {
    guestNav(area);
  }
}

function guestNav(a) {
  a.innerHTML = `<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
    <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
}

function applyPlanState(plan) {
  const p = plan.toLowerCase();

  const banner = document.getElementById('current-plan-banner');
  const nameSpan = document.getElementById('current-plan-name');
  banner.style.display = 'block';
  nameSpan.textContent = p;

  const btnFree = document.getElementById('btn-free');
  const btnPro = document.getElementById('btn-pro');
  const btnCreator = document.getElementById('btn-creator');

  btnFree.textContent = 'Downgrade to Free';
  btnFree.classList.replace('pf-btn--primary', 'pf-btn--ghost');

  btnPro.textContent = 'Upgrade to Pro';
  btnPro.classList.replace('pf-btn--ghost', 'pf-btn--primary');

  btnCreator.textContent = 'Become a Creator';

  if (p === 'free') {
    btnFree.textContent = 'Current Plan';
    btnFree.disabled = true;
    document.getElementById('card-free').style.borderColor = 'var(--pf-success)';
  } else if (p === 'pro') {
    btnPro.textContent = 'Current Plan';
    btnPro.disabled = true;
    btnPro.classList.replace('pf-btn--primary', 'pf-btn--ghost');
    btnFree.classList.replace('pf-btn--primary', 'pf-btn--ghost');
    document.getElementById('card-pro').style.borderColor = 'var(--pf-success)';
    document.getElementById('card-pro').style.boxShadow = '0 0 0 2px var(--pf-success)';
  } else if (p === 'creator') {
    btnCreator.textContent = 'Current Plan';
    btnCreator.disabled = true;
    btnFree.classList.replace('pf-btn--primary', 'pf-btn--ghost');
    btnPro.classList.replace('pf-btn--primary', 'pf-btn--ghost');
    document.getElementById('card-creator').style.borderColor = 'var(--pf-success)';
  }
}

/* —— Actions —— */
function handlePlanAction(targetPlan) {
  if (!token || !currentUser) {
    window.location.href = 'signin.html?returnUrl=' + encodeURIComponent(location.href);
    return;
  }

  toast('Checkout integration is Coming Soon.', false);
}

/* —— Event Delegation + Init —— */
document.addEventListener('click', e => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;
  if (action === 'plan-action') {
    handlePlanAction(actionEl.dataset.plan || '');
    return;
  }
  if (action === 'goto-profile') {
    window.location.href = 'signin.html';
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
});
