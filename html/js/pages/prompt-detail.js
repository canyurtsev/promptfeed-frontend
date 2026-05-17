/* ================================================================
   prompt-detail.html — Controller
   Direct API interactions for Buy, Save, Run, Vote
   ================================================================ */
'use strict';
const API = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let promptData = null;

function getPromptId() {
  const urlParams = new URLSearchParams(window.location.search);
  let id = urlParams.get('id');
  if (!id && window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    id = hashParams.get('id');
  }
  if (id && !/^[0-9]+$/.test(id) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    id = null;
  }
  return id;
}
const promptId = getPromptId();

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

function fmtPrice(p) {
  if (!p || p === '0' || p === '0.00') return 'Free';
  const n = parseFloat(p);
  return isNaN(n) ? String(p) : '$' + n.toFixed(2);
}

function timeAgo(d) {
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
  if (!token) {
    guestNav(area);
    return;
  }
  try {
    const r = await fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (d.success && d.data) {
      currentUser = d.data;
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
    } else {
      guestNav(area);
    }
  } catch { guestNav(area); }
}

function guestNav(a) {
  a.innerHTML = `<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
    <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
}

function requireAuth(label) {
  if (token && currentUser) return true;
  document.getElementById('gate-desc').textContent = 'Sign in to ' + label + '.';
  document.getElementById('pf-gate').classList.add('open');
  return false;
}
function closeGate() { document.getElementById('pf-gate').classList.remove('open'); }
function gotoSignin() { window.location.href = 'signin.html?returnUrl=' + encodeURIComponent(location.href); }

/* ── Load Prompt ── */
async function loadPrompt() {
  if (!promptId) { renderError('No Prompt ID provided.'); return; }
  try {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API + '/api/prompts/' + promptId, { headers });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || data.error?.message || 'Failed to load prompt');
    promptData = data.data;
    renderPage();
  } catch (err) {
    renderError(err.message);
  }
}

function renderError(msg) {
  document.getElementById('page-content').innerHTML = `
    <div class="pf-empty-state" style="grid-column:1/-1;margin-top:40px">
      <div class="pf-empty-state__icon"><span class="material-symbols-outlined">warning</span></div>
      <h3>Could not load prompt</h3>
      <p class="pf-error-detail">${esc(msg)}</p>
      <p class="pf-error-help">Ensure backend is running: <code>npm run dev</code></p>
      <a href="community.html" class="pf-btn pf-btn--ghost" style="margin-top:16px">Back to Community</a>
    </div>
  `;
}

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

/* ── Media panel ── */
function buildMediaPanelHtml(p) {
  const validImage = isValidImageUrl(p.imageUrl);
  const hasResource = Boolean(p.resourceUrl);
  if (!validImage && !hasResource) return '';

  let bodyHtml = '';
  if (validImage) {
    bodyHtml += `<img class="pd-media-img" src="${esc(p.imageUrl)}" alt="Prompt media" loading="lazy"/>`;
  }
  if (hasResource) {
    bodyHtml += `
      <a class="pd-media-resource" href="${esc(p.resourceUrl)}" target="_blank" rel="noopener noreferrer">
        <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
        ${esc(p.resourceUrl)}
      </a>`;
  }

  return `
    <div class="pd-media-panel">
      <div class="pd-media-panel__header">
        <span class="material-symbols-outlined" aria-hidden="true">perm_media</span>
        Media &amp; Resources
      </div>
      <div class="pd-media-panel__body">${bodyHtml}</div>
    </div>`;
}

/* ── Render Page ── */
function renderPage() {
  const p = promptData;
  const priceVal = parseFloat(p.price || 0);
  const isPaid = p.isPremium || p.isPaid || priceVal > 0 || false;
  const isPurchased = Boolean(p.isPurchased || p.hasPurchased);
  const isFree = !isPaid;
  const isOwned = p.isOwned || p.isOwner || (currentUser && currentUser.id === p.userId) || isPurchased;
  const author = p.user?.username || p.authorHandle || 'unknown';
  const tags = Array.isArray(p.tags)
    ? p.tags
    : (typeof p.tags === 'string' ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
  const effScore = p.efficiencyScore || p.benchmark?.efficiencyScore;
  const avgTok   = p.avgTokens    || p.benchmark?.avgTokens;
  const avgCost  = p.avgCost      || p.benchmark?.avgCost;
  const avgLat   = p.avgLatency   || p.benchmark?.avgLatency;
  const qScore   = p.qualityScore  || p.benchmark?.qualityScore;
  const sRate    = p.successRate   || p.benchmark?.successRate;

  const contentPreview = p.content || (isOwned || isFree ? '' : 'This premium prompt content is hidden. Purchase to unlock.');
  const showContent = isFree || isOwned;

  const plan   = currentUser ? (currentUser.plan || 'free').toLowerCase() : 'guest';
  const showAd = plan === 'free' || plan === 'guest';
  const isSaved = Boolean(p.isSaved);

  // Update breadcrumb title
  const bc = document.getElementById('pd-breadcrumb-title');
  if (bc) bc.textContent = p.title || 'Prompt';

  // ── Metrics ──
  let metricsHtml = '';
  if (effScore || avgTok || avgCost || avgLat || qScore || sRate) {
    metricsHtml = `
      <div class="pd-stat-grid">
        <div class="pd-stat"><span class="pd-stat__label">Efficiency</span><span class="pd-stat__val">${effScore ? Number(effScore).toFixed(1) : '—'}</span></div>
        <div class="pd-stat"><span class="pd-stat__label">Quality</span><span class="pd-stat__val">${qScore ? Number(qScore).toFixed(1) : '—'}</span></div>
        <div class="pd-stat"><span class="pd-stat__label">Avg Tokens</span><span class="pd-stat__val">${avgTok || '—'}</span></div>
        <div class="pd-stat"><span class="pd-stat__label">Avg Cost</span><span class="pd-stat__val">${avgCost ? ('$' + avgCost) : '—'}</span></div>
        <div class="pd-stat"><span class="pd-stat__label">Latency</span><span class="pd-stat__val">${avgLat ? Math.round(avgLat) + 'ms' : '—'}</span></div>
        <div class="pd-stat"><span class="pd-stat__label">Success</span><span class="pd-stat__val">${sRate ? Number(sRate).toFixed(1) + '%' : '—'}</span></div>
      </div>`;
  } else {
    metricsHtml = `<div class="pd-empty-note">Not benchmarked yet.</div>`;
  }

  // ── Action area (buy / owned) ──
  let actionHtml = '';
  if (isOwned) {
    actionHtml = `
      <div class="pd-owned-badge">
        <span class="material-symbols-outlined" aria-hidden="true">verified</span>
        ${isPurchased ? 'Purchased' : 'Owned'}
      </div>`;
  } else if (isPaid) {
    const priceStr = p.product?.price ? fmtPrice(p.product.price) : fmtPrice(p.price);
    actionHtml = `
      <button class="pd-buy-btn" id="buy-btn">
        <span class="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
        Buy Prompt — ${priceStr}
      </button>`;
  }

  // ── Vote state ──
  const voteActive = p.userVote === 1 ? ' pd-vote-btn--active' : '';

  // ── Tags ──
  const tagsHtml = tags.map(t => `<span class="pf-tag">#${esc(t)}</span>`).join('');
  const categoryHtml = p.category
    ? `<span class="pd-meta__dot">•</span><span class="pf-tag">${esc(p.category)}</span>`
    : '';

  // ── Save button state ──
  const saveActiveClass = isSaved ? ' pd-action-btn--active' : '';
  const saveIcon = isSaved ? 'bookmark_added' : 'bookmark';
  const saveLabel = isSaved ? 'Saved' : 'Save';

  document.getElementById('page-content').innerHTML = `
    <main class="pd-main" role="main">

      <!-- Header card: title, meta, description -->
      <article class="pd-header">
        <h1 class="pd-title">${esc(p.title)}</h1>
        <div class="pd-meta">
          <span class="pd-meta__author">by <strong>${esc(author)}</strong></span>
          <span class="pd-meta__dot">•</span>
          <span>${timeAgo(p.createdAt)}</span>
          ${categoryHtml}
          ${tagsHtml}
        </div>
        ${p.description ? `<div class="pd-desc">${esc(p.description)}</div>` : ''}
      </article>

      <!-- Prompt content -->
      <div class="pd-content-section">
        <div class="pd-section-header">
          <span class="material-symbols-outlined" aria-hidden="true">code</span>
          Prompt Content
        </div>
        <div class="pd-content-box${!showContent ? ' pd-content-box--locked' : ''}">
          ${esc(contentPreview)}
        </div>
        ${!showContent ? `
        <div class="pd-locked-overlay">
          <span class="material-symbols-outlined pd-locked-overlay__icon" aria-hidden="true">lock</span>
          <div class="pd-locked-overlay__title">Premium Content Locked</div>
          <div class="pd-locked-overlay__sub">Purchase to unlock this prompt.</div>
        </div>` : ''}
      </div>

      <!-- Media & Resources (only when present) -->
      ${buildMediaPanelHtml(p)}

      <!-- Community Discussion -->
      <div class="pd-panel">
        <div class="pd-panel__header">
          <span class="material-symbols-outlined" aria-hidden="true">forum</span>
          Community Discussion
        </div>
        <div class="pd-discussion-placeholder">
          <span class="material-symbols-outlined" aria-hidden="true">chat_bubble</span>
          <span class="pd-discussion-placeholder__text">Discussion coming soon.</span>
        </div>
      </div>

    </main>

    <aside class="pd-sidebar" aria-label="Prompt actions">

      <!-- Action card: price, buy/owned, run, save, vote -->
      <div class="pd-panel">
        <div class="pd-price-row">
          <span class="pd-badge ${isFree ? 'pd-badge--free' : 'pd-badge--premium'}">${isFree ? 'Free' : 'Premium'}</span>
          <span class="pd-price-value">${isPaid ? (p.product?.price ? fmtPrice(p.product.price) : fmtPrice(p.price)) : 'Free'}</span>
        </div>

        <div class="pd-actions">
          ${actionHtml}
          <div class="pd-action-row">
            ${isFree || isOwned ? `
            <button class="pd-action-btn" id="run-btn" aria-label="Open in Playground">
              <span class="material-symbols-outlined" aria-hidden="true">play_arrow</span>
              Run Prompt
            </button>` : ''}
            <button class="pd-action-btn${saveActiveClass}" id="save-btn"
              data-saved="${isSaved ? 'true' : 'false'}"
              aria-label="${saveLabel} this prompt">
              <span class="material-symbols-outlined" aria-hidden="true">${saveIcon}</span>
              <span class="save-label">${saveLabel}</span>
            </button>
          </div>
          <div class="pd-vote-row">
            <button class="pd-vote-btn${voteActive}" data-action="upvote" data-id="${esc(p.id)}" aria-label="Upvote this prompt">
              <span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
              Upvote
            </button>
            <span class="pd-vote-count" id="pd-vote-count">${Math.max(0, p.score || 0)}</span>
          </div>
        </div>
      </div>

      <!-- Performance profile -->
      <div class="pd-panel">
        <div class="pd-panel__header">
          <span class="material-symbols-outlined" aria-hidden="true">speed</span>
          Performance Profile
        </div>
        ${metricsHtml}
      </div>

      ${showAd ? `
      <div id="right-ad-slot" class="pf-ad-slot">
        <span class="pf-ad-slot__label">Advertisement</span>
        Sponsor slot available
      </div>` : ''}

    </aside>
  `;
}

/* ── Actions ── */
async function handleBuy() {
  if (!requireAuth('purchase this prompt')) return;
  const btn = document.getElementById('buy-btn');
  if (!btn) return;
  btn.textContent = 'Purchasing…';
  btn.disabled = true;
  try {
    const res = await fetch(API + `/api/prompts/${promptId}/buy`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    const reqIdStr = data.error?.requestId ? ` [Req: ${data.error.requestId}]` : '';
    if (data.success) {
      toast('✅ Purchase successful!');
      await refreshWallet();
      await loadPrompt();
    } else {
      toast('⚠ Purchase failed: ' + (data.message || data.error?.message || 'Unknown error') + reqIdStr, false);
      btn.textContent = 'Buy Prompt';
      btn.disabled = false;
    }
  } catch {
    toast('⚠ Network error. Please try again.', false);
    btn.textContent = 'Buy Prompt';
    btn.disabled = false;
  }
}

async function refreshWallet() {
  try {
    const r = await fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (d.success && d.data) {
      currentUser = d.data;
      const wb = document.getElementById('wallet-bal');
      if (wb) wb.textContent = String(d.data.wallet?.balance ?? d.data.walletBalance ?? '—');
    }
  } catch (e) { console.error('Wallet refresh failed', e); }
}

function handleRun() {
  if (!requireAuth('run this prompt')) return;
  window.location.href = `playground.html?id=${promptId}#id=${promptId}`;
}

async function handleSave() {
  const btn = document.getElementById('save-btn');
  const isSaved = btn?.dataset.saved === 'true';
  if (!requireAuth('save this prompt')) return;
  try {
    const res = await fetch(API + `/api/prompts/${promptId}/save`, {
      method: isSaved ? 'DELETE' : 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.success) {
      const nextSaved = !isSaved;
      if (btn) {
        btn.dataset.saved = nextSaved ? 'true' : 'false';
        if (nextSaved) btn.classList.add('pd-action-btn--active');
        else btn.classList.remove('pd-action-btn--active');
        const icon = btn.querySelector('.material-symbols-outlined');
        const label = btn.querySelector('.save-label');
        if (icon) icon.textContent = nextSaved ? 'bookmark_added' : 'bookmark';
        if (label) label.textContent = nextSaved ? 'Saved' : 'Save';
        btn.setAttribute('aria-label', (nextSaved ? 'Saved' : 'Save') + ' this prompt');
      }
      if (promptData) promptData.isSaved = nextSaved;
      toast(nextSaved ? 'Saved' : 'Removed from saved prompts');
    } else {
      toast('Failed to update saved prompt.', false);
    }
  } catch { toast('Network error.', false); }
}

async function handleVote(promptIdToVote) {
  if (!requireAuth('vote on this prompt')) return;
  const btn = document.querySelector('[data-action="upvote"]');
  const isActive = btn?.classList.contains('pd-vote-btn--active');
  if (btn) btn.disabled = true;
  try {
    const res = await fetch(API + `/api/prompts/${promptIdToVote}/upvote`, {
      method: isActive ? 'DELETE' : 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.success) {
      const scoreEl = document.getElementById('pd-vote-count');
      if (scoreEl) scoreEl.textContent = Math.max(0, data.data?.score || 0);
      if (btn) btn.classList.toggle('pd-vote-btn--active');
    } else {
      toast(data.message || 'Vote failed', false);
    }
  } catch { toast('Network error.', false); }
  finally { if (btn) btn.disabled = false; }
}

/* ── Init ── */
(async function init() {
  await initAuth();
  await loadPrompt();
}());

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-close-gate')?.addEventListener('click', closeGate);
  document.getElementById('btn-goto-signin')?.addEventListener('click', gotoSignin);

  document.addEventListener('click', e => {
    if (e.target.id === 'pf-gate') { closeGate(); return; }

    if (e.target.closest('#user-avatar') || e.target.closest('#user-avatar-btn')) {
      window.location.href = 'profile.html';
      return;
    }
    if (e.target.closest('#buy-btn'))  { handleBuy();  return; }
    if (e.target.closest('#run-btn'))  { handleRun();  return; }
    if (e.target.closest('#save-btn')) { handleSave(); return; }

    const voteBtn = e.target.closest('[data-action="upvote"]');
    if (voteBtn) { handleVote(voteBtn.dataset.id); return; }
  });
});
