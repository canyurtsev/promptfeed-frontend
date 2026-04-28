/* ================================================================
   skill-library.js — Controller (CSP-compliant, no inline handlers)
   Fallback logic: GET /api/skill-documents -> GET /api/skills
   ================================================================ */
'use strict';

const API = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let activeFilters = { price: '', category: '', search: '' };
let searchTimer = null;

/* ── Utils ── */
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(msg, ok = true) {
  const t = document.createElement('div');
  t.className = 'pf-toast';
  t.textContent = msg;
  if (!ok) t.style.borderColor = 'var(--pf-danger)';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ── Gate Modal ── */
function closeGate() { document.getElementById('pf-gate').classList.remove('open'); }
function gotoSignin() { window.location.href = 'signin.html?returnUrl=' + encodeURIComponent(location.href); }
function requireAuth(label) {
  if (token && currentUser) return true;
  document.getElementById('gate-desc').textContent = 'Sign in to ' + label + '.';
  document.getElementById('pf-gate').classList.add('open');
  return false;
}

/* ── Auth ── */
async function initAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!token) {
    area.innerHTML = `<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
      <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
    showAds(); return;
  }
  try {
    const r = await fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (d.success && d.data) {
      currentUser = d.data;
      const plan = (currentUser.plan || 'free').toLowerCase();
      area.innerHTML = `
        <div class="pf-wallet-chip" title="Wallet balance">
          <span class="material-symbols-outlined pf-wallet-chip__icon">toll</span>
          <span>${esc(String(currentUser.walletBalance ?? '—'))}</span>
        </div>
        <div class="pf-avatar" id="user-avatar" title="Profile"
          style="${currentUser.avatarUrl ? 'background-image:url(' + esc(currentUser.avatarUrl) + ')' : ''}"
          data-action="goto-profile"></div>`;
      if (plan === 'free') showAds();
    } else { guestNav(area); showAds(); }
  } catch { guestNav(area); showAds(); }
}

function guestNav(a) {
  a.innerHTML = `<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
    <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
}

function showAds() {
  ['top-ad-banner', 'right-ad-slot', 'pro-box'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('pf-ad-banner--hidden');
  });
}

/* ── Filter ── */
function setFilter(el, type, val) {
  activeFilters[type] = val;

  const sectionLabels = Array.from(document.querySelectorAll('.pf-sidebar-label'));
  let labelIndex = -1;
  for (let i = 0; i < sectionLabels.length; i++) {
    if (sectionLabels[i].textContent.trim().toLowerCase().includes(type.toLowerCase())) {
      labelIndex = i; break;
    }
  }

  if (labelIndex !== -1) {
    let nextNode = sectionLabels[labelIndex].nextElementSibling;
    while (nextNode && !nextNode.classList.contains('pf-sidebar-label') && !nextNode.classList.contains('pf-sidebar-divider')) {
      if (nextNode.classList.contains('pf-sidebar-link')) nextNode.classList.remove('active');
      nextNode = nextNode.nextElementSibling;
    }
    el.classList.add('active');
  } else {
    el.parentNode.querySelectorAll('.pf-sidebar-link').forEach(l => l.classList.remove('active'));
    el.classList.add('active');
  }

  loadLibrary();
}

/* ── Card Actions ── */
async function handleCopy(id) {
  try {
    const res = await fetch(API + '/api/skills/' + id);
    const data = await res.json();
    if (data.success && data.data?.content) {
      await navigator.clipboard.writeText(data.data.content);
      toast('✅ Module content copied to clipboard!');
    } else {
      toast('⚠ Could not fetch content to copy.', false);
    }
  } catch {
    toast('⚠ Network error.', false);
  }
}

function handleDownload(name) {
  toast('📥 Downloading ' + name + '...', true);
}

async function handleBuy(id, title, price, btn) {
  if (!requireAuth('purchase this package')) return;
  const origText = btn.textContent;
  btn.textContent = 'Buying...'; btn.disabled = true;
  try {
    const r = await fetch(API + '/api/marketplace/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ productId: id })
    });
    const d = await r.json();
    if (d.success) {
      toast('✅ Purchase successful! "' + title + '" is now yours.');
      initAuth();
      loadLibrary();
    } else {
      toast('⚠ Purchase failed: ' + (d.message || d.error?.message || 'Unknown error'), false);
    }
  } catch (e) {
    toast('⚠ Connection error: ' + e.message, false);
  }
  btn.textContent = origText; btn.disabled = false;
}

/* ── Render ── */
function renderCard(p) {
  const isFree = (p.price === '0' || p.price === '0.00' || !p.price);
  const author = p.user?.username || p.authorHandle || p.sellerName || 'unknown';
  const dl = p.downloads || p.salesCount || 0;
  const ver = p.version || 'v1.0.0';
  const compat = p.compatibility || 'Universal';
  const rating = p.rating || p.avgRating;
  const files = Array.isArray(p.files) ? p.files : ['skill.md'];

  let actionHtml = '';
  if (isFree || p.isOwned) {
    actionHtml = `
      <button class="pf-btn pf-btn--ghost" style="font-size:13px;padding:6px 14px"
        data-action="copy-skill" data-id="${esc(p.id)}">Copy skill.md</button>
      <button class="pf-btn pf-btn--primary" style="font-size:13px;padding:6px 14px"
        data-action="download-skill" data-name="${esc(p.name || p.title)}">Download Package</button>
    `;
  } else {
    actionHtml = `
      <button class="pf-btn pf-btn--primary" style="font-size:13px;padding:6px 14px"
        data-action="buy-skill" data-id="${esc(p.id)}"
        data-title="${esc(p.name || p.title)}" data-price="${esc(p.price)}">Buy Package — $${Number(p.price).toFixed(2)}</button>
    `;
  }

  return `
  <div class="sl-card" data-action="goto-skill" data-id="${esc(p.id)}" style="cursor:pointer">
    <div class="sl-card__header">
      <div>
        <div class="sl-card__title">${esc(p.name || p.title)}</div>
        <div class="sl-card__author">by <strong style="color:var(--pf-text-primary)">${esc(author)}</strong></div>
      </div>
      <div class="sl-badge ${isFree ? 'sl-badge--free' : 'sl-badge--premium'}">
        ${isFree ? 'Free' : 'Premium'}
      </div>
    </div>

    <div class="sl-card__desc">${esc(p.description || 'No description provided.')}</div>

    <div class="sl-card__meta">
      <span class="sl-badge" style="background:transparent;padding:0"><span class="material-symbols-outlined" style="font-size:14px">psychology</span> ${esc(p.category || 'Module')}</span>
      <span>•</span>
      <span>${esc(ver)}</span>
      <span>•</span>
      <span>Compat: ${esc(compat)}</span>
      <span>•</span>
      <span><span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle">download</span> ${dl}</span>
      ${rating ? `<span>•</span><span>⭐ ${Number(rating).toFixed(1)}</span>` : ''}
    </div>

    <div class="sl-files">
      <div class="sl-files__title">Included Files</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        ${files.map(f => `
          <div class="sl-file">
            <span class="material-symbols-outlined" style="font-size:14px;color:var(--pf-accent)">description</span>
            ${esc(f)}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="sl-card__actions">
      <button class="pf-btn pf-btn--ghost" style="font-size:13px;padding:6px 14px"
        data-action="goto-skill" data-id="${esc(p.id)}">View Details</button>
      ${actionHtml}
    </div>
  </div>`;
}

/* ── Load ── */
async function loadLibrary() {
  const el = document.getElementById('skills-container');
  const cnt = document.getElementById('skill-count');
  el.innerHTML = '<div class="pf-loading"><div class="pf-spinner"></div></div>';
  cnt.textContent = '';

  try {
    const params = new URLSearchParams();
    if (activeFilters.category) params.set('category', activeFilters.category);
    if (activeFilters.search) params.set('search', activeFilters.search);
    if (activeFilters.price === 'free') params.set('free', 'true');
    if (activeFilters.price === 'premium') params.set('premium', 'true');

    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let res, data;
    let endpoint = '/api/skill-documents';

    try {
      res = await fetch(API + endpoint + '?' + params.toString(), { headers });
      if (!res.ok && res.status === 404) throw new Error('Endpoint not found');
      data = await res.json();
    } catch {
      endpoint = '/api/skills';
      res = await fetch(API + endpoint + '?' + params.toString(), { headers });
      data = await res.json();
    }

    if (!data.success) throw new Error(data.message || data.error?.message || 'Failed to load skills');

    const items = Array.isArray(data.data) ? data.data : (data.data?.skills || data.data?.documents || []);

    if (!items.length) {
      el.innerHTML = `
        <div class="pf-empty-state" style="margin-top:20px;padding:40px">
          <div class="pf-empty-state__icon">🔍</div>
          <h3>No skill packages found</h3>
          <p>We couldn't find any modules matching your criteria.</p>
          ${endpoint === '/api/skills' ? `
            <div style="margin-top:16px;background:var(--pf-surface);border:1px solid var(--pf-border);padding:12px;border-radius:var(--pf-radius);text-align:left;font-size:12px">
              <strong style="color:var(--pf-warning)">Backend Notice:</strong><br>
              Currently using fallback <code>/api/skills</code>.<br>
              Required endpoint: <code>GET /api/skill-documents</code>
            </div>
          ` : ''}
        </div>
      `;
      cnt.textContent = '0 packages';
      return;
    }

    cnt.textContent = items.length + ' package' + (items.length !== 1 ? 's' : '');
    el.innerHTML = items.map(renderCard).join('');

  } catch (err) {
    el.innerHTML = `
      <div class="pf-empty-state" style="margin-top:20px;padding:40px">
        <div class="pf-empty-state__icon">⚠️</div>
        <h3>Could not load skill library</h3>
        <p style="color:var(--pf-danger);font-size:13px">${esc(err.message)}</p>
        <p style="margin-top:12px;font-size:12px;color:var(--pf-text-muted)">Ensure backend is running: <code>npm run dev</code></p>
      </div>
    `;
    cnt.textContent = '';
  }
}

/* ── Event Delegation ── */
document.addEventListener('DOMContentLoaded', () => {

  // Gate modal
  const gateOverlay = document.getElementById('pf-gate');
  gateOverlay.addEventListener('click', e => {
    if (e.target.id === 'pf-gate') { closeGate(); return; }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'close-gate') closeGate();
    if (action === 'goto-signin') gotoSignin();
  });

  // Sidebar filter buttons
  document.querySelector('.pf-sidebar-left').addEventListener('click', e => {
    const btn = e.target.closest('[data-filter-type]');
    if (!btn) return;
    setFilter(btn, btn.dataset.filterType, btn.dataset.filterVal);
  });

  // Search
  document.getElementById('search-input').addEventListener('input', e => {
    activeFilters.search = e.target.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadLibrary(), 400);
  });

  // Skills container (card clicks + action buttons)
  document.getElementById('skills-container').addEventListener('click', e => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    if (action === 'goto-skill') {
      // Only navigate if the click wasn't on a button inside the card
      if (e.target.closest('button')) return;
      window.location.href = 'skill-detail.html?id=' + encodeURIComponent(actionEl.dataset.id);
      return;
    }
    if (action === 'copy-skill') {
      e.stopPropagation();
      handleCopy(actionEl.dataset.id);
      return;
    }
    if (action === 'download-skill') {
      e.stopPropagation();
      handleDownload(actionEl.dataset.name);
      return;
    }
    if (action === 'buy-skill') {
      e.stopPropagation();
      handleBuy(actionEl.dataset.id, actionEl.dataset.title, actionEl.dataset.price, actionEl);
      return;
    }
  });

  // Nav auth area (avatar -> profile)
  document.getElementById('nav-auth-area').addEventListener('click', e => {
    if (e.target.closest('[data-action="goto-profile"]')) {
      window.location.href = 'signin.html';
    }
  });

  // Init
  initAuth().then(() => loadLibrary());
});
