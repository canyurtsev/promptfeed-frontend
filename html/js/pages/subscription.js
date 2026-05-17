/* ================================================================
   subscription.html — Controller
   Honest user state mapping without mock data
   ================================================================ */
'use strict';

const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://promptfeed-backend.onrender.com";
const API = API_BASE_URL;
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
          <span>${esc(String(currentUser.wallet?.balance ?? currentUser.walletBalance ?? '—'))}</span>
        </div>
        <div class="pf-avatar" id="user-avatar" title="Profile"
          style="${currentUser.avatarUrl ? 'background-image:url(' + esc(currentUser.avatarUrl) + ')' : ''}"
          data-action="goto-profile">${currentUser.avatarUrl ? '' : esc(String(currentUser.username || currentUser.fullName || currentUser.email || 'A')[0].toUpperCase())}</div>`;

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
  const badgeFree = document.getElementById('badge-free');
  const badgePro = document.getElementById('badge-pro');

  btnFree.textContent = 'Downgrade to Free';
  btnFree.classList.replace('pf-btn--primary', 'pf-btn--ghost');

  btnPro.textContent = 'Upgrade to Pro';
  btnPro.classList.replace('pf-btn--ghost', 'pf-btn--primary');

  if (p === 'free') {
    btnFree.textContent = 'Current Plan';
    btnFree.disabled = true;
    document.getElementById('card-free').style.borderColor = 'var(--pf-success)';
    badgeFree.style.display = 'block';
  } else if (p === 'pro') {
    btnPro.textContent = 'Current Plan';
    btnPro.disabled = true;
    btnPro.classList.replace('pf-btn--primary', 'pf-btn--ghost');
    btnFree.classList.replace('pf-btn--primary', 'pf-btn--ghost');
    document.getElementById('card-pro').style.borderColor = 'var(--pf-success)';
    document.getElementById('card-pro').style.boxShadow = '0 0 0 2px var(--pf-success)';
    badgePro.style.display = 'block';
    badgeFree.style.display = 'block';
  } else {
    btnFree.textContent = 'Downgrade to Free';
    btnPro.textContent = 'Upgrade to Pro';
  }
}

/* —— Actions —— */
function handlePlanAction(targetPlan) {
  if (!token || !currentUser) {
    window.location.href = 'signin.html?returnUrl=' + encodeURIComponent(location.href);
    return;
  }

  const currentPlan = (currentUser.plan || 'free').toLowerCase();
  if (targetPlan === currentPlan) {
    return;
  }

  if (targetPlan === 'pro') {
    toast('Stripe checkout is coming soon! Check back later to upgrade to Pro.', false);
  } else if (targetPlan === 'free' && currentPlan !== 'free') {
    toast('Downgrade functionality coming soon.', false);
  }
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
