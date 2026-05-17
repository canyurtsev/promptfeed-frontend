/* ================================================================
   marketplace.html — Page Controller
   Uses GET /api/prompts/marketplace
   ================================================================ */
'use strict';
const API   = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser  = null;
let searchTimer  = null;

/* ── State ── */
let currentPage        = 1;
let currentLimit       = 12;
let currentSort        = 'trending';
let currentTag         = '';
let currentSearch      = '';
let currentPriceFilter = '';

/* ── Helpers ── */
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function toast(msg, ok) {
  const t = document.createElement('div');
  t.className = 'pf-toast';
  t.textContent = msg;
  if (!ok) t.style.borderColor = 'var(--pf-danger)';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
function fmtPrice(p) {
  if (!p || p === '0' || p === '0.00') return 'Free';
  const n = parseFloat(p);
  return isNaN(n) ? String(p) : '$' + Number(p).toFixed(2);
}
function ago(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

/* ── Auth ── */
async function initAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!token) { guestNav(area); showAds(); return; }
  area.innerHTML = '<div class="pf-spinner" style="width:20px;height:20px;margin:5px"></div>';
  try {
    const r = await fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (d.success && d.data) {
      currentUser = d.data;
      const plan = (currentUser.plan || 'free').toLowerCase();
      const walBal = esc(String(currentUser.wallet?.balance ?? currentUser.walletBalance ?? '—'));
      const avatarStyle = currentUser.avatarUrl
        ? 'background-image:url(' + esc(currentUser.avatarUrl) + ')'
        : '';
      area.innerHTML = `
        <div class="pf-wallet-chip" title="Wallet balance">
          <span class="material-symbols-outlined pf-wallet-chip__icon">toll</span>
          <span id="wallet-bal">${walBal}</span>
        </div>
        <div class="pf-avatar" id="user-avatar" title="Profile" style="${avatarStyle}">${currentUser.avatarUrl ? '' : esc(String(currentUser.username || currentUser.fullName || currentUser.email || 'A')[0].toUpperCase())}</div>
        <button id="btn-logout" class="pf-btn pf-btn--ghost" style="font-size:12px;padding:4px 10px">Logout</button>`;
      document.getElementById('btn-logout')?.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = 'signin.html';
      });
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
    document.getElementById(id)?.classList.remove('pf-ad-banner--hidden');
  });
}

/* ── Gate ── */
function requireAuth(label) {
  if (token && currentUser) return true;
  document.getElementById('gate-desc').textContent = 'Sign in to ' + label + '.';
  document.getElementById('pf-gate').classList.add('open');
  return false;
}
function closeGate()  { document.getElementById('pf-gate').classList.remove('open'); }
function gotoSignin() { window.location.href = 'signin.html?returnUrl=' + encodeURIComponent(location.href); }

/* ── Media helpers ── */
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

/* ── Render Card ── */
function renderCard(p) {
  const priceStr     = fmtPrice(p.price);
  const author       = p.user?.username || 'unknown';
  const score        = Math.max(0, p.score || 0);
  const numericPrice = parseFloat(p.price);
  const isPremium    = numericPrice > 0;
  const tags         = Array.isArray(p.tags)
    ? p.tags.slice(0, 3)
    : (typeof p.tags === 'string' ? p.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3) : []);

  const badgeHtml = isPremium
    ? `<span class="mk-badge mk-badge--premium">Premium</span>`
    : `<span class="mk-badge mk-badge--free">Free</span>`;

  const tagsHtml = tags.map(t => `<span class="pf-tag">${esc(t)}</span>`).join('');
  const categoryHtml = p.category
    ? `<span class="mk-card__cat">${esc(p.category)}</span>`
    : '';

  const mediaHtml = buildCardMediaHtml(p);

  return `
  <div class="mk-card" data-action="gotoDetail" data-id="${esc(p.id)}">
    ${mediaHtml}
    <div class="mk-card__header">
      <div class="mk-card__title">${esc(p.title || 'Untitled')}</div>
      ${badgeHtml}
    </div>
    ${p.description ? `<div class="mk-card__desc">${esc(p.description)}</div>` : ''}
    <div class="mk-card__meta">
      <span class="mk-card__author">by <strong>${esc(author)}</strong></span>
      <span class="mk-card__dot">·</span>
      <span class="mk-card__score">
        <span class="material-symbols-outlined mk-card__score-icon" aria-hidden="true">arrow_upward</span>
        ${score}
      </span>
      ${categoryHtml}
    </div>
    ${tagsHtml ? `<div class="mk-card__tags">${tagsHtml}</div>` : ''}
    <div class="mk-card__footer" data-action="stopProp">
      <div class="mk-card__price ${isPremium ? 'mk-card__price--premium' : 'mk-card__price--free'}">${esc(priceStr)}</div>
      <div class="mk-card__actions">
        <button class="pf-btn pf-btn--ghost mk-card__btn"
          data-action="gotoDetail" data-id="${esc(p.id)}">Details</button>
        <button class="pf-btn pf-btn--primary mk-card__btn"
          data-action="buy"
          data-id="${esc(p.id)}"
          data-title="${esc(p.title || '')}"
          data-price="${esc(String(p.price || '0'))}">Buy</button>
      </div>
    </div>
  </div>`;
}

/* ── Load Products ── */
async function loadProducts() {
  const el  = document.getElementById('products-container');
  const cnt = document.getElementById('product-count');
  const pag = document.getElementById('pagination-controls');
  if (!el) return;

  el.innerHTML = '<div class="mk-loading"><div class="pf-spinner"></div></div>';
  if (cnt) cnt.textContent = '';
  if (pag) pag.innerHTML = '';

  try {
    const p = new URLSearchParams();
    p.set('page', currentPage);
    p.set('limit', currentLimit);
    p.set('sort', currentSort);
    if (currentTag) p.set('tag', currentTag);
    if (currentSearch) p.set('search', currentSearch);
    if (currentPriceFilter) p.set('priceFilter', currentPriceFilter);

    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const r = await fetch(API + '/api/prompts/marketplace?' + p, { headers });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    if (!d.success) throw new Error(d.message || 'API error');

    const items = d.data?.prompts || [];
    const meta  = d.data?.pagination || {};

    if (cnt) {
      const total = meta.total !== undefined ? meta.total : items.length;
      cnt.textContent = `${total} listing${total !== 1 ? 's' : ''}`;
    }

    if (!items.length) {
      el.innerHTML = `
        <div class="pf-empty-state mk-empty">
          <span class="material-symbols-outlined pf-empty-state__icon">search_off</span>
          <h3>No listings found</h3>
          <p>Try adjusting your filters or search terms.</p>
        </div>`;
      return;
    }

    el.innerHTML = items.map(renderCard).join('');

    // Pagination
    if (pag && meta.totalPages > 1) {
      pag.innerHTML = `
        <button class="pf-pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
          <span class="material-symbols-outlined pf-pagination-btn__icon" aria-hidden="true">chevron_left</span>
          Previous
        </button>
        <div class="pf-pagination-info">Page ${currentPage} of ${meta.totalPages}</div>
        <button class="pf-pagination-btn" ${currentPage >= meta.totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
          Next
          <span class="material-symbols-outlined pf-pagination-btn__icon" aria-hidden="true">chevron_right</span>
        </button>`;
    }

  } catch (e) {
    el.innerHTML = `
      <div class="pf-empty-state mk-empty">
        <span class="material-symbols-outlined pf-empty-state__icon">warning</span>
        <h3>Could not load marketplace</h3>
        <p class="mk-error-detail">${esc(e.message)}</p>
      </div>`;
    if (cnt) cnt.textContent = '';
  }
}

/* ── Buy Handler ── */
async function handleBuy(btn) {
  if (!requireAuth('purchase prompts')) return;
  if (!btn) return;
  const { id: productId, title } = btn.dataset;
  const origText = btn.textContent;
  btn.textContent = 'Buying…';
  btn.disabled = true;
  try {
    const r = await fetch(API + '/api/marketplace/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ productId })
    });
    const d = await r.json();
    const rid = d.requestId ? ` [${d.requestId}]` : '';
    if (d.success) {
      toast('✅ Purchase successful! "' + title + '" is now yours.');
      await refreshWallet();
    } else {
      toast('⚠ Purchase failed: ' + (d.message || 'Unknown error') + rid, false);
    }
  } catch (e) {
    toast('⚠ Connection error: ' + e.message, false);
  }
  btn.textContent = origText;
  btn.disabled = false;
}

async function refreshWallet() {
  try {
    const u  = await fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } });
    const ud = await u.json();
    if (ud.success && ud.data) {
      currentUser = ud.data;
      const wb = document.getElementById('wallet-bal');
      if (wb) wb.textContent = String(ud.data.wallet?.balance ?? ud.data.walletBalance ?? '—');
    }
  } catch (e) { console.error('Wallet refresh failed', e); }
}

/* ── Init ── */
(async function () {
  await initAuth();
  loadProducts();
}());

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-close-gate')?.addEventListener('click', closeGate);
  document.getElementById('btn-goto-signin')?.addEventListener('click', gotoSignin);

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentSearch = searchInput.value.trim();
      currentPage = 1;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadProducts(), 420);
    });
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      currentPage = 1;
      loadProducts();
    });
  }

  document.addEventListener('click', e => {
    if (e.target.id === 'pf-gate') { closeGate(); return; }

    if (e.target.closest('#user-avatar') || e.target.closest('#user-avatar-btn')) {
      window.location.href = 'profile.html';
      return;
    }

    const filterBtn = e.target.closest('[data-action="setCategory"]');
    if (filterBtn) {
      document.querySelectorAll('[data-action="setCategory"]').forEach(b => b.classList.remove('active'));
      filterBtn.classList.add('active');
      currentTag = filterBtn.dataset.val;
      currentPage = 1;
      loadProducts();
      return;
    }

    const priceBtn = e.target.closest('[data-action="setPrice"]');
    if (priceBtn) {
      document.querySelectorAll('[data-action="setPrice"]').forEach(b => b.classList.remove('active'));
      priceBtn.classList.add('active');
      currentPriceFilter = priceBtn.dataset.val;
      currentPage = 1;
      loadProducts();
      return;
    }

    const pagBtn = e.target.closest('.pf-pagination-btn');
    if (pagBtn && !pagBtn.disabled) {
      currentPage = parseInt(pagBtn.dataset.page, 10);
      loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const buyBtn = e.target.closest('[data-action="buy"]');
    if (buyBtn) { e.stopPropagation(); handleBuy(buyBtn); return; }

    const detailBtn = e.target.closest('[data-action="gotoDetail"]');
    if (detailBtn) { window.location.href = 'prompt-detail.html?id=' + detailBtn.dataset.id + '#id=' + detailBtn.dataset.id; return; }

    if (e.target.closest('[data-action="stopProp"]')) { e.stopPropagation(); }
  });
});
