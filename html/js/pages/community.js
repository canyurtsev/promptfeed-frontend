/* ================================================================
   community.html — Page Controller
   Direct API calls only. No backend.js. No mock data.
   Protected actions gate to signin.html?returnUrl=...
   ================================================================ */

const API   = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let currentTab  = 'featured';
let activeTag   = null;
let searchTimer = null;

/* ── Helpers ── */
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtN(n) { n = Number(n)||0; return Math.abs(n)>999?(n/1000).toFixed(1)+'k':n; }
function ago(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d))/1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60)+'m ago';
  if (s < 86400) return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
}
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'pf-toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
function emptyHTML(title, sub) {
  return `<div class="pf-empty-state">
    <div class="pf-empty-state__icon">🔍</div>
    <h3>${esc(title)}</h3><p>${esc(sub)}</p>
  </div>`;
}
function errorHTML(title, detail) {
  return `<div class="pf-empty-state">
    <div class="pf-empty-state__icon">⚠️</div>
    <h3>${esc(title)}</h3>
    <p style="color:var(--pf-danger);font-size:12px">${esc(detail)}</p>
    <p style="margin-top:8px;font-size:12px;color:var(--pf-text-muted)">Ensure backend is running: <code>npm run dev</code></p>
  </div>`;
}

/* ── Auth ── */
async function initAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!token) {
    area.innerHTML = `
      <a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
      <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
    return;
  }
  try {
    const r = await fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (d.success) {
      currentUser = d.data;
      const plan = (currentUser.plan || 'free').toLowerCase();
      const bal  = currentUser.walletBalance ?? '—';
      area.innerHTML = `
        <div class="pf-wallet-chip" title="Wallet balance" id="wallet-chip">
          <span class="material-symbols-outlined pf-wallet-chip__icon">toll</span>
          <span>${esc(String(bal))}</span>
        </div>
        <button class="pf-btn--icon" id="notif-btn" title="Notifications">
          <span class="material-symbols-outlined" style="font-size:18px">notifications</span>
        </button>
        <div class="pf-avatar" id="user-avatar" title="Profile"
          style="${currentUser.avatarUrl ? 'background-image:url('+esc(currentUser.avatarUrl)+')' : ''}"></div>`;
      document.getElementById('notif-btn').onclick = openNotif;
      document.getElementById('user-avatar').onclick = () => { window.location.href = 'signin.html'; };
      if (plan === 'free') showAds();
    } else {
      guestNav(area);
    }
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
  ['top-ad-banner','right-ad-slot','pro-box'].forEach(id => {
    document.getElementById(id).classList.remove('pf-ad-banner--hidden');
  });
}

/* ── Gate ── */
function requireAuth(actionLabel) {
  if (token && currentUser) return true;
  document.getElementById('gate-desc').textContent = 'Sign in to ' + actionLabel + '.';
  document.getElementById('pf-gate').classList.add('open');
  return false;
}
function closeGate() { document.getElementById('pf-gate').classList.remove('open'); }
function gotoSignin() {
  window.location.href = 'signin.html?returnUrl=' + encodeURIComponent(location.href);
}




/* ── Notification Panel ── */
function openNotif() {
  document.getElementById('notif-panel').classList.add('open');
  document.getElementById('notif-overlay').classList.add('open');
}
function closeNotif() {
  document.getElementById('notif-panel').classList.remove('open');
  document.getElementById('notif-overlay').classList.remove('open');
}


/* ── Sidebar ── */
const CATS = [
  {name:'Prompt Engineering',color:'#00c2ff',tag:'prompt-engineering'},
  {name:'AI Agents',color:'#a371f7',tag:'agents'},
  {name:'Coding',color:'#3fb950',tag:'coding'},
  {name:'Marketing',color:'#d29922',tag:'marketing'},
  {name:'Research',color:'#58a6ff',tag:'research'},
  {name:'Security',color:'#f85149',tag:'security'},
  {name:'Automation',color:'#ffa657',tag:'automation'},
  {name:'Data',color:'#79c0ff',tag:'data'},
];
const TAGS = ['gpt-4o','claude','agents','rag','sql','automation','security'];

function renderSidebar() {
  document.getElementById('sidebar-cats').innerHTML = CATS.map(c =>
    `<button class="pf-sidebar-link" data-action="filterByTag" data-tag="${c.tag}">
       <span class="pf-sidebar-link__dot" style="background:${c.color}"></span>${esc(c.name)}
     </button>`).join('');
  document.getElementById('sidebar-tags').innerHTML = TAGS.map(t =>
    `<button class="pf-sidebar-link" data-action="filterByTag" data-tag="${t}">
       <span style="color:var(--pf-text-muted);font-size:12px">#</span>${esc(t)}
     </button>`).join('');
}

function filterByTag(tag) {
  activeTag = (activeTag === tag) ? null : tag;
  loadFeed();
}


/* ── Topic Row ── */
function topicRow(p) {
  const score   = p.score ?? p.upvotes ?? 0;
  const author  = p.user?.username || p.authorHandle || 'unknown';
  const tags    = Array.isArray(p.tags) ? p.tags.slice(0,3) : [];
  const cmts    = p.commentCount ?? p._count?.comments ?? 0;
  return `
  <div class="pf-topic-row">
    <div class="pf-topic-row__vote">
      <button class="pf-vote-btn" title="Upvote"   data-action="vote" data-id="${esc(p.id)}" data-value="1">▲</button>
      <span class="pf-vote-count" id="score-${esc(p.id)}">${fmtN(score)}</span>
      <button class="pf-vote-btn" title="Downvote" data-action="vote" data-id="${esc(p.id)}" data-value="-1">▼</button>
    </div>
    <div class="pf-topic-row__body">
      <a class="pf-topic-row__title" href="prompt-detail.html?id=${esc(p.id)}">${esc(p.title)}</a>
      <div class="pf-topic-row__meta">
        <span class="pf-topic-row__author">by <strong>${esc(author)}</strong></span>
        <span class="pf-topic-row__sep">·</span>
        <span class="pf-topic-row__author">${ago(p.createdAt)}</span>
        ${tags.map(t=>`<span class="pf-tag" data-action="filterByTag" data-tag="${esc(t)}">${esc(t)}</span>`).join('')}
      </div>
    </div>
    <div class="pf-topic-row__stats">
      <span class="pf-stat"><span class="material-symbols-outlined" style="font-size:13px">chat_bubble</span><span>${cmts}</span></span>
      <button class="pf-btn pf-btn--ghost" style="font-size:11px;padding:3px 8px;margin-top:4px"
        title="Bookmark this prompt"
        data-action="bookmark" data-id="${esc(p.id)}">🔖</button>
    </div>
  </div>`;
}

function skillRow(s, i) {
  return `
  <div class="pf-topic-row" data-action="gotoSkill" data-id="${esc(s.id)}" style="cursor:pointer">
    <div class="pf-topic-row__vote">
      <span class="pf-vote-count">${i+1}</span>
    </div>
    <div class="pf-topic-row__body">
      <span class="pf-topic-row__title">${esc(s.name)}</span>
      <div class="pf-topic-row__meta">
        <span class="pf-topic-row__author">by <strong>${esc(s.user?.username||'unknown')}</strong></span>
        ${s.slug?`<span class="pf-tag">${esc(s.slug)}</span>`:''}
      </div>
    </div>
    <div class="pf-topic-row__stats">
      <span class="pf-stat"><span>${s.downloads??0}</span> dl</span>
      <span class="pf-stat"><span>${s.stars??0}</span> ★</span>
    </div>
  </div>`;
}

/* ── Feed Loader ── */
async function loadFeed(query) {
  const el = document.getElementById('feed-container');
  el.innerHTML = '<div class="pf-loading"><div class="pf-spinner"></div></div>';

  if (currentTab === 'articles' || currentTab === 'questions') {
    el.innerHTML = `<div class="pf-empty-state">
      <div class="pf-empty-state__icon">🚧</div>
      <h3>${currentTab.charAt(0).toUpperCase()+currentTab.slice(1)} — Coming Soon</h3>
      <p>This section is under development. Check back soon.</p>
    </div>`;
    return;
  }

  if (currentTab === 'skills') {
    try {
      const r = await fetch(API + '/api/skills?limit=25');
      const d = await r.json();
      const items = d.data || [];
      el.innerHTML = items.length ? items.map(skillRow).join('') : emptyHTML('No skills yet','Be the first to publish a skill!');
    } catch(e) { el.innerHTML = errorHTML('Skills unavailable', e.message); }
    return;
  }

  try {
    const p = new URLSearchParams({ limit:'25' });
    if (currentTab === 'latest') p.set('sort','date');
    else p.set('sort','score');
    if (activeTag) p.set('tag', activeTag);
    if (query)    p.set('search', query);

    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const r = await fetch(API + '/api/prompts?' + p, { headers });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    if (!d.success) throw new Error(d.message || 'API error');

    const items = d.data?.prompts || d.data || [];
    el.innerHTML = items.length
      ? items.map(topicRow).join('')
      : emptyHTML('No prompts found', activeTag ? 'Try removing the tag filter.' : 'Be the first to share a prompt!');
  } catch(e) {
    el.innerHTML = errorHTML('Feed unavailable', e.message);
  }
}

/* ── Vote ── */
async function handleVote(promptId, value, e) {
  e.stopPropagation();
  if (!requireAuth('vote on prompts')) return;
  try {
    const r = await fetch(API + '/api/prompts/' + promptId + '/vote', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+token },
      body: JSON.stringify({ value })
    });
    const d = await r.json();
    if (d.success) {
      const el = document.getElementById('score-' + promptId);
      if (el) el.textContent = fmtN(d.data?.score ?? d.data?.newScore ?? 0);
    } else { toast('⚠ ' + (d.message || 'Vote failed')); }
  } catch { toast('⚠ Connection error'); }
}


/* ── Bookmark ── */
async function handleBookmark(promptId, e) {
  e.stopPropagation();
  if (!requireAuth('bookmark prompts')) return;
  try {
    const r = await fetch(API + '/api/prompts/' + promptId + '/bookmark', {
      method:'POST', headers:{ 'Authorization':'Bearer '+token }
    });
    const d = await r.json();
    toast(d.success ? '🔖 Bookmarked!' : '⚠ ' + (d.message||'Failed'));
  } catch { toast('⚠ Connection error'); }
}


/* ── Rail Skills ── */
async function loadRailSkills() {
  const el = document.getElementById('rail-skills');
  try {
    const r = await fetch(API + '/api/skills?limit=5');
    const d = await r.json();
    const items = (d.data || []).slice(0,5);
    if (!items.length) {
      el.innerHTML = '<p style="font-size:12px;color:var(--pf-text-muted)">No skills yet</p>';
      return;
    }
    el.innerHTML = items.map((s,i) =>
      `<div class="pf-rail-row" data-action="gotoSkill" data-id="${esc(s.id)}" style="cursor:pointer">
         <span class="pf-rail-row__rank">${i+1}</span>
         <div class="pf-rail-row__body">
           <div class="pf-rail-row__title">${esc(s.name)}</div>
           <div class="pf-rail-row__sub">${s.downloads??0} downloads</div>
         </div>
       </div>`).join('');
  } catch {
    el.innerHTML = '<p style="font-size:12px;color:var(--pf-text-muted)">API unavailable</p>';
  }
}

/* ── Tabs ── */
document.querySelectorAll('.pf-feed-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pf-feed-tab').forEach(b => {
      b.classList.remove('active'); b.setAttribute('aria-selected','false');
    });
    btn.classList.add('active'); btn.setAttribute('aria-selected','true');
    currentTab = btn.dataset.tab;
    activeTag  = null;
    loadFeed();
  });
});

/* ── Search ── */
document.getElementById('search-input').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadFeed(e.target.value.trim()), 420);
});

/* ── Init ── */
(async function init() {
  await initAuth();
  renderSidebar();
  loadFeed();
  loadRailSkills();
})();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-close-gate')?.addEventListener('click', closeGate);
  document.getElementById('btn-goto-signin')?.addEventListener('click', gotoSignin);
  document.getElementById('btn-close-notif')?.addEventListener('click', closeNotif);
  document.getElementById('notif-overlay')?.addEventListener('click', closeNotif);

  document.addEventListener('click', e => {
    if (e.target.id === 'pf-gate') { closeGate(); return; }

    const filterBtn = e.target.closest('[data-action="filterByTag"]');
    if (filterBtn) {
      e.stopPropagation();
      filterByTag(filterBtn.dataset.tag);
      return;
    }

    const voteBtn = e.target.closest('[data-action="vote"]');
    if (voteBtn) {
      e.stopPropagation();
      handleVote(voteBtn.dataset.id, parseInt(voteBtn.dataset.value), e);
      return;
    }

    const bookmarkBtn = e.target.closest('[data-action="bookmark"]');
    if (bookmarkBtn) {
      e.stopPropagation();
      handleBookmark(bookmarkBtn.dataset.id, e);
      return;
    }

    const skillRow = e.target.closest('[data-action="gotoSkill"]');
    if (skillRow) {
      window.location.href = 'skill-detail.html?id=' + skillRow.dataset.id;
      return;
    }
  });
});

