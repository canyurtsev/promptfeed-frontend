/* ================================================================
   skill-detail.html — Controller
   Fallback logic: GET /api/skill-documents/:id -> GET /api/skills/:id
   CSP-compliant: no inline handlers
   ================================================================ */
'use strict';

const API = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let skillData = null;

const urlParams = new URLSearchParams(window.location.search);
const skillId = urlParams.get('id');

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function toast(msg, ok = true) {
  const t = document.createElement('div');
  t.className = 'pf-toast';
  t.textContent = msg;
  if (!ok) t.style.borderColor = 'var(--pf-danger)';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
function fmtPrice(p) {
  if (!p || p === '0' || p === '0.00') return 'Free';
  const n = parseFloat(p);
  return isNaN(n) ? String(p) : '$' + n.toFixed(2);
}

/* —— Auth —— */
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
          <span id="wallet-bal">${esc(String(currentUser.walletBalance ?? '—'))}</span>
        </div>
        <div class="pf-avatar" id="user-avatar" title="Profile"
          style="${currentUser.avatarUrl ? 'background-image:url(' + esc(currentUser.avatarUrl) + ')' : ''}"
          data-action="goto-profile"></div>`;
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

function requireAuth(label) {
  if (token && currentUser) return true;
  document.getElementById('gate-desc').textContent = 'Sign in to ' + label + '.';
  document.getElementById('pf-gate').classList.add('open');
  return false;
}
function closeGate() { document.getElementById('pf-gate').classList.remove('open'); }
function gotoSignin() { window.location.href = 'signin.html?returnUrl=' + encodeURIComponent(location.href); }

/* —— Load Skill —— */
async function loadSkill() {
  if (!skillId) {
    renderError('No Skill ID provided.');
    return;
  }

  try {
    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;

    let res;
    let data;
    let fallbackUsed = false;

    try {
      res = await fetch(API + '/api/skill-documents/' + skillId, { headers });
      if (!res.ok && res.status === 404) throw new Error('Not found');
      data = await res.json();
    } catch (e) {
      fallbackUsed = true;
      res = await fetch(API + '/api/skills/' + skillId, { headers });
      data = await res.json();
    }

    if (!data.success) throw new Error(data.message || data.error?.message || 'Failed to load skill');
    skillData = data.data;
    skillData._fallback = fallbackUsed;
    renderPage();
  } catch (err) {
    renderError(err.message);
  }
}

function renderError(msg) {
  document.getElementById('page-content').innerHTML = `
    <div class="pf-empty-state" style="grid-column: 1/-1; margin-top:40px;">
      <div class="pf-empty-state__icon">⚠️</div>
      <h3>Could not load skill details</h3>
      <p style="color:var(--pf-danger);font-size:13px">${esc(msg)}</p>
      <p style="margin-top:12px;font-size:12px;color:var(--pf-text-muted)">Ensure backend is running: <code>npm run dev</code></p>
      <a href="skill-library.html" class="pf-btn pf-btn--ghost" style="margin-top:16px">Back to Library</a>
    </div>
  `;
}

function switchTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const btn = document.getElementById('btn-' + id);
  const tab = document.getElementById('content-' + id);
  if (btn) btn.classList.add('active');
  if (tab) tab.classList.add('active');
}

function renderPage() {
  const s = skillData;
  const isFree = (s.price === '0' || s.price === '0.00' || !s.price);
  const isOwned = s.isOwned || s.isOwner;
  const isOwner = s.isOwner || (currentUser && s.userId === currentUser.id);
  const author = s.user?.username || s.authorHandle || s.sellerName || 'unknown';
  const tags = Array.isArray(s.tags) ? s.tags : [];

  const contentSkill = s.content || s.skillMd || null;
  const contentExample = s.examples || s.examplesMd || null;
  const contentNotes = s.notes || s.changelog || null;

  const showContent = isFree || isOwned;

  const dl = s.downloads || s.salesCount || 0;
  const rating = s.rating || s.avgRating;
  const ver = s.version || 'v1.0.0';
  const compat = s.compatibility || 'Universal';
  const files = Array.isArray(s.files) ? s.files : ['skill.md'];

  const plan = currentUser ? (currentUser.plan || 'free').toLowerCase() : 'guest';
  const showAd = (plan === 'free' || plan === 'guest');

  let actionHtml = '';
  if (isOwner) {
    actionHtml = `<button class="pf-btn pf-btn--ghost" style="width:100%;margin-bottom:10px" data-action="edit-skill">Open in Skill Editor</button>`;
  } else if (!isFree && !isOwned) {
    actionHtml = `<button class="pf-btn pf-btn--primary" style="width:100%;margin-bottom:10px" id="buy-btn" data-action="buy-skill">Buy Package — ${fmtPrice(s.price)}</button>`;
  }

  document.getElementById('page-content').innerHTML = `
    <main class="sd-main">
      <article class="sd-header">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="sd-title">${esc(s.name || s.title)}</div>
          <div class="sd-badge ${isFree ? 'sd-badge--free' : 'sd-badge--premium'}">${isFree ? 'Free' : 'Premium'}</div>
        </div>
        <div class="sd-meta">
          <span style="color:var(--pf-text-primary)">by <strong>${esc(author)}</strong></span>
          <span>•</span>
          <span>${timeAgo(s.createdAt)}</span>
          ${s.category ? `<span>•</span><span class="pf-tag">${esc(s.category)}</span>` : ''}
          ${tags.map(t => `<span class="pf-tag">#${esc(t)}</span>`).join('')}
        </div>
        <div class="sd-desc">${esc(s.description)}</div>
      </article>

      <div style="position:relative">
        <div class="tab-nav">
          <button class="tab-btn active" id="btn-skill" data-action="switch-tab" data-tab="skill">skill.md</button>
          ${contentExample ? `<button class="tab-btn" id="btn-example" data-action="switch-tab" data-tab="example">examples.md</button>` : ''}
          ${contentNotes ? `<button class="tab-btn" id="btn-notes" data-action="switch-tab" data-tab="notes">Changelog</button>` : ''}
        </div>

        <div id="content-skill" class="tab-content active">
          ${renderContentBox(contentSkill, showContent)}
        </div>

        ${contentExample ? `
        <div id="content-example" class="tab-content">
          ${renderContentBox(contentExample, showContent)}
        </div>` : ''}

        ${contentNotes ? `
        <div id="content-notes" class="tab-content">
          ${renderContentBox(contentNotes, true)}
        </div>` : ''}

        ${!showContent ? `
        <div style="position:absolute;top:60px;left:0;right:0;bottom:0;background:rgba(13,17,23,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;border-radius:var(--pf-radius)">
          <span class="material-symbols-outlined" style="font-size:32px;color:var(--pf-pro);margin-bottom:12px">lock</span>
          <div style="font-weight:600;color:var(--pf-text-primary)">Premium Content Locked</div>
          <div style="font-size:13px;color:var(--pf-text-muted);margin-top:4px">Purchase to unlock this package.</div>
        </div>` : ''}
      </div>

      ${s._fallback ? `
        <div style="background:var(--pf-surface);border:1px solid var(--pf-border);padding:12px;border-radius:var(--pf-radius);font-size:12px;margin-top:16px">
          <strong style="color:var(--pf-warning)">Backend Notice:</strong>
          Loaded via fallback <code>/api/skills</code>. Expected <code>GET /api/skill-documents</code>.
        </div>
      ` : ''}
    </main>

    <aside class="pd-sidebar">
      <div class="sd-panel" style="margin-bottom:24px">
        <div class="sd-panel__header">
          <span class="material-symbols-outlined" style="font-size:18px">info</span>
          Package Details
        </div>
        <div class="sd-stat-list">
          <div class="sd-stat-list__item"><span>Compatibility</span> <strong>${esc(compat)}</strong></div>
          <div class="sd-stat-list__item"><span>Version</span> <strong>${esc(ver)}</strong></div>
          <div class="sd-stat-list__item"><span>License</span> <strong>${esc(s.license || 'Proprietary')}</strong></div>
          <div class="sd-stat-list__item"><span>Downloads</span> <strong>${dl}</strong></div>
          <div class="sd-stat-list__item"><span>Rating</span> <strong>${rating ? Number(rating).toFixed(1) + '/5.0' : 'No ratings'}</strong></div>
          <div class="sd-stat-list__item"><span>Updated</span> <strong>${timeAgo(s.updatedAt || s.createdAt)}</strong></div>
        </div>

        <div class="sd-files" style="margin-top:8px">
          <div style="font-size:11px;font-weight:700;color:var(--pf-text-muted);text-transform:uppercase;margin-bottom:4px">Included Files</div>
          ${files.map(f => `
            <div class="sd-file">
              <span class="material-symbols-outlined" style="font-size:14px;color:var(--pf-accent)">description</span> ${esc(f)}
            </div>
          `).join('')}
        </div>

        <div style="margin-top:16px">
          ${actionHtml}
          ${(showContent && !isOwner) ? `
          <div style="display:flex;gap:10px">
            <button class="pf-btn pf-btn--ghost" data-action="copy-skill" style="flex:1;font-size:12px;padding:6px">Copy skill.md</button>
            <button class="pf-btn pf-btn--ghost" data-action="download-skill" style="flex:1;font-size:12px;padding:6px">Download</button>
          </div>
          ` : ''}
          <div style="margin-top:10px">
            <button class="pf-btn pf-btn--ghost" data-action="bookmark-skill" style="width:100%;font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px">
              <span class="material-symbols-outlined" style="font-size:16px">bookmark</span> Save Package
            </button>
          </div>
        </div>
      </div>

      ${showAd ? `
      <div id="right-ad-slot" class="pf-ad-slot">
        <span class="pf-ad-slot__label">Advertisement</span>
        Sponsor slot available
      </div>` : ''}

      <div class="pf-pro-box">
        <span class="pf-pro-box__badge">🚀 Creator</span>
        <div class="pf-pro-box__title">Publish Your Own</div>
        <ul class="pf-pro-box__list">
          <li>Share complete workflow modules</li>
          <li>Earn from premium packages</li>
        </ul>
        <a href="subscription.html" class="pf-pro-btn">Become a Creator</a>
      </div>
    </aside>
  `;
}

function renderContentBox(content, isVisible) {
  if (!content) {
    return '<div style="padding:32px;text-align:center;color:var(--pf-text-muted);font-size:13px;background:var(--pf-surface);border:1px dashed var(--pf-border);border-radius:var(--pf-radius)">No content available yet.</div>';
  }
  return `<pre class="sd-content-box" style="${!isVisible ? 'filter:blur(4px);user-select:none' : ''}">${esc(content)}</pre>`;
}

/* —— Actions —— */
async function handleBuy() {
  if (!requireAuth('purchase this package')) return;
  const btn = document.getElementById('buy-btn');
  if (!btn) return;
  btn.textContent = 'Purchasing...';
  btn.disabled = true;

  try {
    const res = await fetch(API + '/api/marketplace/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ productId: skillId })
    });
    const data = await res.json();

    if (data.success) {
      toast('✅ Purchase successful!');
      await initAuth();
      await loadSkill();
    } else {
      const reqIdStr = data.error?.requestId ? ` [Req: ${data.error.requestId}]` : '';
      toast('⚠ Purchase failed: ' + (data.message || data.error?.message || 'Unknown error') + reqIdStr, false);
      btn.textContent = 'Buy Package — ' + fmtPrice(skillData.price);
      btn.disabled = false;
    }
  } catch (err) {
    toast('⚠ Network error. Please try again.', false);
    btn.textContent = 'Buy Package — ' + fmtPrice(skillData.price);
    btn.disabled = false;
  }
}

function handleCopy() {
  if (!skillData.content && !skillData.skillMd) {
    toast('⚠ No content to copy.', false);
    return;
  }
  navigator.clipboard.writeText(skillData.content || skillData.skillMd);
  toast('✅ Copied to clipboard!');
}

function handleDownload() {
  toast('📥 Downloading ' + (skillData.name || skillData.title) + ' package...', true);
}

function handleEdit() {
  toast('Skill Editor is Coming Soon.', true);
}

async function handleBookmark() {
  if (!requireAuth('save this package')) return;
  try {
    const res = await fetch(API + `/api/skills/${skillId}/bookmark`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.success) {
      toast('🔖 Package saved!');
    } else {
      toast('⚠ Failed to save.', false);
    }
  } catch (err) {
    toast('⚠ Save feature Coming Soon or Network Error.', false);
  }
}

/* —— Event Delegation + Init —— */
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', e => {
    if (e.target.id === 'pf-gate') {
      closeGate();
      return;
    }

    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    if (action === 'close-gate') { closeGate(); return; }
    if (action === 'goto-signin') { gotoSignin(); return; }
    if (action === 'goto-profile') { window.location.href = 'signin.html'; return; }
    if (action === 'switch-tab') { switchTab(actionEl.dataset.tab); return; }
    if (action === 'buy-skill') { handleBuy(); return; }
    if (action === 'copy-skill') { handleCopy(); return; }
    if (action === 'download-skill') { handleDownload(); return; }
    if (action === 'edit-skill') { handleEdit(); return; }
    if (action === 'bookmark-skill') { handleBookmark(); }
  });

  (async function init() {
    await initAuth();
    await loadSkill();
  })();
});
