/* ================================================================
   index.html — Landing Page Controller
   No shared backend client. No mock data. Direct API calls.
   ================================================================ */
const API   = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');

/* ── Auth Nav ── */
async function initAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!token) {
    area.innerHTML = `
      <a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
      <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
    document.getElementById('top-ad-banner').classList.remove('pf-ad-banner--hidden');
    return;
  }
  try {
    const r = await fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (d.success && d.data) {
      const u    = d.data;
      const plan = (u.plan || 'free').toLowerCase();
      area.innerHTML = `
        <div class="pf-wallet-chip" title="Wallet balance">
          <span class="material-symbols-outlined pf-wallet-chip__icon">toll</span>
          <span>${esc(String(u.walletBalance ?? '—'))}</span>
        </div>
        <div class="pf-avatar" id="user-avatar" title="Profile"
          style="${u.avatarUrl ? 'background-image:url('+esc(u.avatarUrl)+')' : ''}"
          id="user-avatar-btn"></div>`;
      if (plan === 'free') {
        document.getElementById('top-ad-banner').classList.remove('pf-ad-banner--hidden');
      }
    } else {
      guestNav(area);
    }
  } catch {
    guestNav(area);
    document.getElementById('top-ad-banner').classList.remove('pf-ad-banner--hidden');
  }
}

function guestNav(area) {
  area.innerHTML = `
    <a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
    <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtN(n) { n=Number(n)||0; return Math.abs(n)>999?(n/1000).toFixed(1)+'k':n; }
function ago(d) {
  if (!d) return '';
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if (s<60) return 'just now';
  if (s<3600) return Math.floor(s/60)+'m ago';
  if (s<86400) return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
}
function emptyRow(msg, href) {
  return `<div class="lp-empty-row">
    <span style="font-size:22px">🔍</span>
    <span>${esc(msg)}</span>
    ${href?`<a href="${esc(href)}" style="color:var(--pf-accent);font-size:12px;font-weight:600">Explore →</a>`:''}
  </div>`;
}
function errRow(href) {
  return `<div class="lp-empty-row">
    <span style="font-size:20px">⚠️</span>
    <span style="color:var(--pf-text-muted);font-size:12px">Backend offline — start with <code>npm run dev</code></span>
    <a href="${esc(href)}" style="color:var(--pf-accent);font-size:12px;font-weight:600">View all →</a>
  </div>`;
}

/* ── Latest Community Posts ── */
async function loadFeaturedPosts() {
  const el = document.getElementById('feat-posts');
  try {
    const r = await fetch(API + '/api/prompts?sort=date&limit=4');
    const d = await r.json();
    const items = d.data?.prompts || d.data || [];
    if (!items.length) { el.innerHTML = emptyRow('No posts yet', 'community.html'); return; }
    el.innerHTML = items.slice(0,4).map(p => `
      <a class="lp-featured__row" href="prompt-detail.html?id=${esc(p.id)}">
        <span class="lp-featured__row-title">${esc(p.title)}</span>
        <span class="lp-featured__row-meta">${fmtN(p.score??0)} pts · ${ago(p.createdAt)}</span>
      </a>`).join('');
  } catch { el.innerHTML = errRow('community.html'); }
}

/* ── Popular Skills ── */
async function loadFeaturedSkills() {
  const el = document.getElementById('feat-skills');
  try {
    const r = await fetch(API + '/api/skills?limit=4');
    const d = await r.json();
    const items = d.data || [];
    if (!items.length) { el.innerHTML = emptyRow('No skills yet', 'skill-library.html'); return; }
    el.innerHTML = items.slice(0,4).map(s => `
      <a class="lp-featured__row" href="skill-detail.html?id=${esc(s.id)}">
        <span class="lp-featured__row-title">${esc(s.name)}</span>
        <span class="lp-featured__row-meta">${s.downloads??0} dl</span>
      </a>`).join('');
  } catch { el.innerHTML = errRow('skill-library.html'); }
}

/* ── Open Bounties ── */
async function loadFeaturedBounties() {
  const el = document.getElementById('feat-bounties');
  try {
    const r = await fetch(API + '/api/bounties?limit=3');
    const d = await r.json();
    const items = d.data?.bounties || d.data || [];
    if (!items.length) { el.innerHTML = emptyRow('No open bounties', 'bounty-board.html'); return; }
    el.innerHTML = items.slice(0,3).map(b => `
      <a class="lp-featured__row" href="bounty-board.html">
        <span class="lp-featured__row-title">${esc(b.title)}</span>
        <span class="lp-featured__row-meta" style="color:var(--pf-success);font-weight:700">${b.reward ?? b.escrowAmount ?? '?'} credits</span>
      </a>`).join('');
  } catch { el.innerHTML = errRow('bounty-board.html'); }
}

/* ── Init ── */
(async function init() {
  await initAuth();
  loadFeaturedPosts();
  loadFeaturedSkills();
  loadFeaturedBounties();
})();

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        window.location.href = 'community.html?q=' + encodeURIComponent(e.target.value);
      }
    });
  }

  document.addEventListener('click', e => {
    if (e.target.closest('#user-avatar') || e.target.closest('#user-avatar-btn')) {
      window.location.href = 'signin.html';
      return;
    }
  });
});

