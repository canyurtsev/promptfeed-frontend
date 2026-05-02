/* ================================================================
   community.html - Page Controller
   Direct API calls only. No shared backend client. No mock data.
   Protected actions gate to signin.html?returnUrl=...
   ================================================================ */

const API = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let currentTab = 'featured';
let activeTag = null;
let searchTimer = null;

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtN(n) {
  n = Number(n) || 0;
  return Math.abs(n) > 999 ? (n / 1000).toFixed(1) + 'k' : n;
}

function ago(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'pf-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function displayName(user) {
  return user?.username || user?.fullName || user?.email || 'Account';
}

function initials(name) {
  const cleaned = String(name || '').trim();
  return cleaned ? cleaned.slice(0, 1).toUpperCase() : 'A';
}

function emptyHTML(title, sub) {
  return `<div class="pf-empty-state">
    <div class="pf-empty-state__icon"><span class="material-symbols-outlined">search_off</span></div>
    <h3>${esc(title)}</h3><p>${esc(sub)}</p>
  </div>`;
}

function errorHTML(title, detail) {
  return `<div class="pf-empty-state">
    <div class="pf-empty-state__icon"><span class="material-symbols-outlined">warning</span></div>
    <h3>${esc(title)}</h3>
    <p style="color:var(--pf-danger);font-size:12px">${esc(detail)}</p>
    <p style="margin-top:8px;font-size:12px;color:var(--pf-text-muted)">Ensure backend is running: <code>npm run dev</code></p>
  </div>`;
}

async function initAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!area) return;

  if (!token) {
    guestNav(area);
    return;
  }

  try {
    const r = await fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (!d.success) {
      guestNav(area);
      return;
    }

    currentUser = d.data;
    const plan = (currentUser.plan || 'free').toLowerCase();
    const name = displayName(currentUser);
    const wallet = currentUser.walletBalance;

    area.innerHTML = `
      ${wallet == null ? '' : `
        <a href="profile.html" class="pf-wallet-chip" title="Wallet balance">
          <span class="material-symbols-outlined pf-wallet-chip__icon">toll</span>
          <span>${esc(String(wallet))}</span>
        </a>`}
      <a href="profile.html" class="pf-user-chip" title="Profile">
        <span class="pf-avatar" id="user-avatar">${esc(initials(name))}</span>
        <span class="pf-user-chip__body">
          <span class="pf-user-chip__name">${esc(name)}</span>
          <span class="pf-user-chip__plan">${esc(plan)}</span>
        </span>
      </a>`;

    const avatar = document.getElementById('user-avatar');
    if (avatar && currentUser.avatarUrl) {
      avatar.textContent = '';
      avatar.style.backgroundImage = 'url("' + currentUser.avatarUrl.replace(/"/g, '%22') + '")';
    }

    if (plan === 'free') showAds();
  } catch {
    guestNav(area);
  }
}

function guestNav(area) {
  area.innerHTML = `
    <a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
    <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
}

function showAds() {
  ['top-ad-banner', 'pro-box'].forEach(id => {
    document.getElementById(id)?.classList.remove('pf-ad-banner--hidden');
  });
}

function requireAuth(actionLabel) {
  if (token && currentUser) return true;
  document.getElementById('gate-desc').textContent = 'Sign in to ' + actionLabel + '.';
  document.getElementById('pf-gate').classList.add('open');
  return false;
}

function closeGate() {
  document.getElementById('pf-gate').classList.remove('open');
}

function gotoSignin() {
  window.location.href = 'signin.html?returnUrl=' + encodeURIComponent(location.href);
}

const CATS = [
  { name: 'Prompt Engineering', color: '#00c2ff', tag: 'prompt-engineering' },
  { name: 'AI Agents', color: '#a371f7', tag: 'agents' },
  { name: 'Coding', color: '#3fb950', tag: 'coding' },
  { name: 'Marketing', color: '#d29922', tag: 'marketing' },
  { name: 'Research', color: '#58a6ff', tag: 'research' },
  { name: 'Security', color: '#f85149', tag: 'security' },
  { name: 'Automation', color: '#ffa657', tag: 'automation' },
  { name: 'Data', color: '#79c0ff', tag: 'data' },
];
const TAGS = ['gpt-4o', 'claude', 'agents', 'rag', 'sql', 'automation', 'security'];

function renderSidebar() {
  document.getElementById('sidebar-cats').innerHTML = CATS.map(c =>
    `<button class="pf-sidebar-link" data-action="filterByTag" data-tag="${esc(c.tag)}">
       <span class="pf-sidebar-link__dot" style="background:${esc(c.color)}"></span>${esc(c.name)}
     </button>`).join('');
  document.getElementById('sidebar-tags').innerHTML = TAGS.map(t =>
    `<button class="pf-sidebar-link" data-action="filterByTag" data-tag="${esc(t)}">
       <span class="pf-sidebar-link__hash">#</span>${esc(t)}
     </button>`).join('');
}

function filterByTag(tag) {
  activeTag = activeTag === tag ? null : tag;
  loadFeed();
}

function topicRow(p) {
  const score = p.score ?? p.upvotes ?? 0;
  const author = p.user?.username || p.authorHandle || 'unknown';
  const tags = Array.isArray(p.tags) ? p.tags.slice(0, 3) : [];
  const cmts = p.commentCount ?? p._count?.comments ?? 0;
  return `
  <div class="pf-topic-row">
    <div class="pf-topic-row__vote">
      <button class="pf-vote-btn" title="Upvote" data-action="vote" data-id="${esc(p.id)}" data-value="1">▲</button>
      <span class="pf-vote-count" id="score-${esc(p.id)}">${fmtN(score)}</span>
      <button class="pf-vote-btn" title="Downvote" data-action="vote" data-id="${esc(p.id)}" data-value="-1">▼</button>
    </div>
    <div class="pf-topic-row__body">
      <a class="pf-topic-row__title" href="prompt-detail.html?id=${esc(p.id)}">${esc(p.title)}</a>
      <div class="pf-topic-row__meta">
        <span class="pf-topic-row__author">by <strong>${esc(author)}</strong></span>
        <span class="pf-topic-row__sep">·</span>
        <span class="pf-topic-row__author">${ago(p.createdAt)}</span>
        ${tags.map(t => `<span class="pf-tag" data-action="filterByTag" data-tag="${esc(t)}">${esc(t)}</span>`).join('')}
      </div>
    </div>
    <div class="pf-topic-row__stats">
      <span class="pf-stat"><span class="material-symbols-outlined" style="font-size:13px">chat_bubble</span><span>${cmts}</span></span>
      <button class="pf-btn pf-btn--ghost" style="font-size:11px;padding:3px 8px;margin-top:4px"
        title="Bookmark this prompt"
        data-action="bookmark" data-id="${esc(p.id)}">
        <span class="material-symbols-outlined" style="font-size:14px">bookmark</span>
      </button>
    </div>
  </div>`;
}

function skillRow(s, i) {
  return `
  <div class="pf-topic-row" data-action="gotoSkill" data-id="${esc(s.id)}" style="cursor:pointer">
    <div class="pf-topic-row__vote">
      <span class="pf-vote-count">${i + 1}</span>
    </div>
    <div class="pf-topic-row__body">
      <span class="pf-topic-row__title">${esc(s.name)}</span>
      <div class="pf-topic-row__meta">
        <span class="pf-topic-row__author">by <strong>${esc(s.user?.username || 'unknown')}</strong></span>
        ${s.slug ? `<span class="pf-tag">${esc(s.slug)}</span>` : ''}
      </div>
    </div>
    <div class="pf-topic-row__stats">
      <span class="pf-stat"><span>${s.downloads ?? 0}</span> dl</span>
      <span class="pf-stat"><span>${s.stars ?? 0}</span> stars</span>
    </div>
  </div>`;
}

async function loadFeed(query) {
  const el = document.getElementById('feed-container');
  el.innerHTML = '<div class="pf-loading"><div class="pf-spinner"></div></div>';

  if (currentTab === 'skills') {
    try {
      const r = await fetch(API + '/api/skills?limit=25');
      const d = await r.json();
      const items = d.data || [];
      el.innerHTML = items.length ? items.map(skillRow).join('') : emptyHTML('No skills yet', 'Be the first to publish a skill!');
    } catch (e) {
      el.innerHTML = errorHTML('Skills unavailable', e.message);
    }
    return;
  }

  try {
    const p = new URLSearchParams({ limit: '25' });
    if (currentTab === 'latest') p.set('sort', 'date');
    else p.set('sort', 'score');
    if (activeTag) p.set('tag', activeTag);
    if (query) p.set('search', query);

    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;

    const r = await fetch(API + '/api/prompts?' + p, { headers });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    if (!d.success) throw new Error(d.message || 'API error');

    const items = d.data?.prompts || d.data || [];
    el.innerHTML = items.length
      ? items.map(topicRow).join('')
      : emptyHTML('No prompts found', activeTag ? 'Try removing the tag filter.' : 'Be the first to share a prompt!');
  } catch (e) {
    el.innerHTML = errorHTML('Feed unavailable', e.message);
  }
}

async function handleVote(promptId, value, e) {
  e.stopPropagation();
  if (!requireAuth('vote on prompts')) return;
  try {
    const r = await fetch(API + '/api/prompts/' + promptId + '/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ value })
    });
    const d = await r.json();
    if (d.success) {
      const el = document.getElementById('score-' + promptId);
      if (el) el.textContent = fmtN(d.data?.score ?? d.data?.newScore ?? 0);
    } else {
      toast((d.message || 'Vote failed'));
    }
  } catch {
    toast('Connection error');
  }
}

async function handleBookmark(promptId, e) {
  e.stopPropagation();
  if (!requireAuth('bookmark prompts')) return;
  try {
    const r = await fetch(API + '/api/prompts/' + promptId + '/bookmark', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    const d = await r.json();
    toast(d.success ? 'Bookmarked' : (d.message || 'Failed'));
  } catch {
    toast('Connection error');
  }
}

async function loadRailSkills() {
  const el = document.getElementById('rail-skills');
  if (!el) return;
  try {
    const r = await fetch(API + '/api/skills?limit=5');
    const d = await r.json();
    const items = (d.data || []).slice(0, 5);
    if (!items.length) {
      el.innerHTML = '<p class="pf-muted-note">No skills yet</p>';
      return;
    }
    el.innerHTML = items.map((s, i) =>
      `<div class="pf-rail-row" data-action="gotoSkill" data-id="${esc(s.id)}" style="cursor:pointer">
         <span class="pf-rail-row__rank">${i + 1}</span>
         <div class="pf-rail-row__body">
           <div class="pf-rail-row__title">${esc(s.name)}</div>
           <div class="pf-rail-row__sub">${s.downloads ?? 0} downloads</div>
         </div>
       </div>`).join('');
  } catch {
    el.innerHTML = '<p class="pf-muted-note">API unavailable</p>';
  }
}

document.querySelectorAll('.pf-feed-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    document.querySelectorAll('.pf-feed-tab').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    currentTab = btn.dataset.tab;
    activeTag = null;
    loadFeed();
  });
});

document.getElementById('search-input').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadFeed(e.target.value.trim()), 420);
});

(async function init() {
  await initAuth();
  renderSidebar();
  loadFeed();
  loadRailSkills();
})();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-close-gate')?.addEventListener('click', closeGate);
  document.getElementById('btn-goto-signin')?.addEventListener('click', gotoSignin);

  document.addEventListener('click', e => {
    if (e.target.id === 'pf-gate') {
      closeGate();
      return;
    }

    const filterBtn = e.target.closest('[data-action="filterByTag"]');
    if (filterBtn) {
      e.stopPropagation();
      filterByTag(filterBtn.dataset.tag);
      return;
    }

    const voteBtn = e.target.closest('[data-action="vote"]');
    if (voteBtn) {
      e.stopPropagation();
      handleVote(voteBtn.dataset.id, parseInt(voteBtn.dataset.value, 10), e);
      return;
    }

    const bookmarkBtn = e.target.closest('[data-action="bookmark"]');
    if (bookmarkBtn) {
      e.stopPropagation();
      handleBookmark(bookmarkBtn.dataset.id, e);
      return;
    }

    const skill = e.target.closest('[data-action="gotoSkill"]');
    if (skill) {
      window.location.href = 'skill-detail.html?id=' + skill.dataset.id;
    }
  });
});
