/* ================================================================
   tags.html — Controller
   Fallback logic: GET /api/tags -> Extract from /api/prompts & /api/skills
   ================================================================ */
'use strict';

const API = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let activeGroup = '';
let searchTimer = null;
let rawTagsData = [];

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* —— Auth —— */
async function initAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!token) {
    area.innerHTML = `<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
      <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
    showAds();
    return;
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
    } else {
      guestNav(area);
      showAds();
    }
  } catch {
    guestNav(area);
    showAds();
  }
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

function requireAuth(label) {
  if (token && currentUser) return true;
  document.getElementById('gate-desc').textContent = 'Sign in to ' + label + '.';
  document.getElementById('pf-gate').classList.add('open');
  return false;
}

function closeGate() { document.getElementById('pf-gate').classList.remove('open'); }
function gotoSignin() { window.location.href = 'signin.html?returnUrl=' + encodeURIComponent(location.href); }

/* —— Filter —— */
function setFilter(grp) {
  activeGroup = grp;

  const links = document.querySelectorAll('.pf-sidebar-left .pf-sidebar-link');
  links.forEach(l => l.classList.remove('active'));

  for (const l of links) {
    if (grp === '') {
      if (l.textContent.includes('All Tags')) { l.classList.add('active'); break; }
    } else {
      if (l.textContent.includes(grp)) { l.classList.add('active'); break; }
    }
  }

  renderTags();
}

/* —— Render —— */
function renderCard(t) {
  const name = t.name || t.id || 'unknown';
  const desc = t.description || '';
  const count = t.count;
  const group = t.group || '';

  return `
  <div class="tg-card">
    <div class="tg-header">
      <div class="tg-name">#${esc(name)}</div>
      ${count !== undefined ? `<div class="tg-count" title="${esc(String(count))} items">${esc(String(count))}</div>` : ''}
    </div>
    
    ${group ? `<div style="font-size:11px;color:var(--pf-text-muted);text-transform:uppercase;margin-bottom:4px">${esc(group)}</div>` : ''}
    
    <div class="tg-desc">${esc(desc)}</div>
    
    <div class="tg-actions">
      <button class="pf-btn pf-btn--ghost" style="font-size:13px;width:100%;display:block;text-align:center" data-action="view-tag" data-tag="${esc(name)}">
        View Content
      </button>
    </div>
  </div>`;
}

function renderTags() {
  const el = document.getElementById('tags-container');
  const q = document.getElementById('search-input').value.trim().toLowerCase();

  let filtered = rawTagsData;
  if (activeGroup) {
    filtered = filtered.filter(t => (t.group || '').toLowerCase() === activeGroup.toLowerCase());
  }
  if (q) {
    filtered = filtered.filter(t => (t.name || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
  }

  if (!filtered.length) {
    el.innerHTML = `
      <div class="pf-empty-state" style="grid-column: 1/-1;margin-top:20px;padding:40px">
        <div class="pf-empty-state__icon">ğŸ·ï¸</div>
        <h3>No tags found yet.</h3>
        <p>No topics matched your search or selection.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = filtered.map(renderCard).join('');
}

async function fetchTagsFallback() {
  const tagMap = new Map();
  let foundSomething = false;

  const processItems = (items) => {
    if (!Array.isArray(items)) return;
    items.forEach(it => {
      foundSomething = true;
      if (Array.isArray(it.tags)) {
        it.tags.forEach(tag => {
          if (!tagMap.has(tag)) tagMap.set(tag, { name: tag, count: 0 });
          tagMap.get(tag).count++;
        });
      }
    });
  };

  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;

  try {
    const [pRes, sRes] = await Promise.all([
      fetch(API + '/api/prompts', { headers }).catch(() => null),
      fetch(API + '/api/skills', { headers }).catch(() => null)
    ]);

    if (pRes && pRes.ok) {
      const pd = await pRes.json();
      processItems(Array.isArray(pd.data) ? pd.data : pd.data?.prompts);
    }
    if (sRes && sRes.ok) {
      const sd = await sRes.json();
      processItems(Array.isArray(sd.data) ? sd.data : sd.data?.skills);
    }

    if (!foundSomething) throw new Error('Could not extract any content data');
  } catch (e) {
    throw e;
  }

  const result = Array.from(tagMap.values());
  result.sort((a, b) => b.count - a.count);
  return result;
}

async function loadTags() {
  const el = document.getElementById('tags-container');
  el.innerHTML = '<div class="pf-loading" style="grid-column: 1/-1"><div class="pf-spinner"></div></div>';

  try {
    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;

    let data;
    let fallbackUsed = false;

    try {
      const res = await fetch(API + '/api/tags', { headers });
      if (!res.ok && res.status === 404) throw new Error('Endpoint not found');
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load tags');
      data = Array.isArray(json.data) ? json.data : (json.data?.tags || []);
    } catch (err) {
      fallbackUsed = true;
      data = await fetchTagsFallback();
    }

    rawTagsData = data;

    if (!rawTagsData.length) {
      el.innerHTML = `
        <div class="pf-empty-state" style="grid-column: 1/-1;margin-top:20px;padding:40px">
          <div class="pf-empty-state__icon">ğŸ·ï¸</div>
          <h3>No tags found yet.</h3>
          <p>No content has been tagged in the system.</p>
          ${fallbackUsed ? `
            <div style="margin-top:16px;background:var(--pf-surface);border:1px solid var(--pf-border);padding:12px;border-radius:var(--pf-radius);text-align:left;font-size:12px">
              <strong style="color:var(--pf-warning)">Backend Notice:</strong><br>
              Extracted tags via fallback.<br>
              Required endpoint: <code>GET /api/tags</code>
            </div>
          ` : ''}
        </div>
      `;
      return;
    }

    renderTags();

    if (fallbackUsed) {
      const notice = document.createElement('div');
      notice.style.gridColumn = '1/-1';
      notice.innerHTML = `
        <div style="background:var(--pf-surface);border:1px solid var(--pf-border);padding:12px;border-radius:var(--pf-radius);text-align:left;font-size:12px;margin-bottom:16px">
          <strong style="color:var(--pf-warning)">Backend Notice:</strong><br>
          Tags extracted dynamically via fallback.<br>
          Required endpoint: <code>GET /api/tags</code>
        </div>
      `;
      el.prepend(notice);
    }
  } catch (err) {
    el.innerHTML = `
      <div class="pf-empty-state" style="grid-column: 1/-1;margin-top:20px;padding:40px">
        <div class="pf-empty-state__icon">âš ï¸</div>
        <h3>Could not load tags</h3>
        <p style="color:var(--pf-danger);font-size:13px">${esc(err.message)}</p>
        <p style="margin-top:12px;font-size:12px;color:var(--pf-text-muted)">Ensure backend is running: <code>npm run dev</code></p>
      </div>
    `;
  }
}

/* —— Event Delegation + Init —— */
document.addEventListener('click', e => {
  if (e.target.id === 'pf-gate') {
    closeGate();
    return;
  }

  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;

  if (action === 'close-gate') {
    closeGate();
    return;
  }
  if (action === 'goto-signin') {
    gotoSignin();
    return;
  }
  if (action === 'set-filter') {
    setFilter(actionEl.dataset.filter || '');
    return;
  }
  if (action === 'goto-profile') {
    window.location.href = 'signin.html';
    return;
  }
  if (action === 'view-tag') {
    window.location.href = 'community.html?tag=' + encodeURIComponent(actionEl.dataset.tag || '');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => renderTags(), 300);
    });
  }

  (async function init() {
    await initAuth();
    loadTags();
  })();
});
