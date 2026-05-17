/* ================================================================
   community.html - Page Controller
   Direct API calls only. No shared backend client. No mock data.
   Protected actions gate to signin.html?returnUrl=...
   ================================================================ */
'use strict';

const API = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let currentTab = 'featured';
let activeTag = null;
let searchTimer = null;

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  return '<div class="pf-empty-state">'
    + '<div class="pf-empty-state__icon"><span class="material-symbols-outlined">search_off</span></div>'
    + '<h3>' + esc(title) + '</h3><p>' + esc(sub) + '</p>'
    + '</div>';
}

function errorHTML(title, detail) {
  return '<div class="pf-empty-state">'
    + '<div class="pf-empty-state__icon"><span class="material-symbols-outlined">warning</span></div>'
    + '<h3>' + esc(title) + '</h3>'
    + '<p class="pf-error-detail">' + esc(detail) + '</p>'
    + '<p class="pf-error-help">Ensure backend is running: <code>npm run dev</code></p>'
    + '</div>';
}

/* ─── Auth ─────────────────────────────────────────────────────── */

async function initAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!area) return;

  if (!token) {
    guestNav(area);
    renderComposer();
    return;
  }
  area.innerHTML = '<div class="pf-spinner" style="width:20px;height:20px;margin:5px"></div>';

  try {
    const r = await fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (!d.success) {
      guestNav(area);
      renderComposer();
      return;
    }

    currentUser = d.data;
    const plan = (currentUser.plan || 'free').toLowerCase();
    const name = displayName(currentUser);
    const wallet = currentUser.wallet?.balance ?? currentUser.walletBalance;

    const walletChip = wallet == null ? '' : (
      '<a href="profile.html" class="pf-wallet-chip" title="Wallet balance">'
      + '<span class="material-symbols-outlined pf-wallet-chip__icon">toll</span>'
      + '<span>' + esc(String(wallet)) + '</span>'
      + '</a>'
    );

    area.innerHTML = walletChip
      + '<a href="profile.html" class="pf-user-chip" title="Profile">'
      + '<span class="pf-avatar" id="user-avatar">' + esc(initials(name)) + '</span>'
      + '<span class="pf-user-chip__body">'
      + '<span class="pf-user-chip__name">' + esc(name) + '</span>'
      + '<span class="pf-user-chip__plan">' + esc(plan) + '</span>'
      + '</span></a>'
      + '<button id="btn-logout" class="pf-btn pf-btn--ghost" style="font-size:12px;padding:4px 10px">Logout</button>';

    const avatar = document.getElementById('user-avatar');
    if (avatar && currentUser.avatarUrl) {
      avatar.textContent = '';
      avatar.style.backgroundImage = 'url("' + currentUser.avatarUrl.replace(/"/g, '%22') + '")';
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = 'signin.html';
      });
    }

    if (plan === 'free') showAds();
    renderComposer();
  } catch {
    guestNav(area);
    renderComposer();
  }
}

function guestNav(area) {
  area.innerHTML =
    '<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>'
    + '<a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>';
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

/* ─── Composer ──────────────────────────────────────────────────── */

function renderComposer() {
  const card = document.getElementById('composer-card');
  const gate = document.getElementById('composer-gate');
  if (!card || !gate) return;

  if (currentUser) {
    const av = document.getElementById('composer-avatar');
    if (av) {
      av.textContent = initials(displayName(currentUser));
      if (currentUser.avatarUrl) {
        av.textContent = '';
        av.style.backgroundImage = 'url("' + currentUser.avatarUrl.replace(/"/g, '%22') + '")';
      }
    }
    card.hidden = false;
    gate.hidden = true;
  } else {
    card.hidden = true;
    gate.hidden = false;
  }
}

function composerSetMsg(textOrArray, type) {
  const el = document.getElementById('composer-msg');
  if (!el) return;
  
  if (Array.isArray(textOrArray)) {
    el.innerHTML = '<div>Could not publish prompt:</div><ul>' + 
      textOrArray.map(item => '<li>' + esc(item) + '</li>').join('') + 
      '</ul>';
  } else {
    el.textContent = textOrArray;
  }
  
  el.className = 'pf-composer__msg' + (type ? ' pf-composer__msg--' + type : '');
}

function composerClearMsg() {
  const el = document.getElementById('composer-msg');
  if (!el) return;
  el.textContent = '';
  el.className = 'pf-composer__msg';
}

function composerClearForm() {
  ['composer-title', 'composer-content', 'composer-description', 'composer-tags',
   'composer-image-url', 'composer-resource-url'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const cat = document.getElementById('composer-category');
  if (cat) cat.selectedIndex = 0;
  // Close attachment panel
  const panel = document.getElementById('composer-attach-panel');
  if (panel) panel.classList.remove('open');
}

function handleAttachToggle(panel) {
  const attachPanel = document.getElementById('composer-attach-panel');
  if (!attachPanel) return;
  const focusId = panel === 'image' ? 'composer-image-url' : 'composer-resource-url';
  const isOpen = attachPanel.classList.contains('open');
  // If panel is closed, open it and focus relevant input
  if (!isOpen) {
    attachPanel.classList.add('open');
    document.getElementById(focusId)?.focus();
  } else {
    // If already open, check if both inputs are empty — then close, else just focus
    const imgVal = document.getElementById('composer-image-url')?.value.trim() || '';
    const resVal = document.getElementById('composer-resource-url')?.value.trim() || '';
    if (!imgVal && !resVal) {
      attachPanel.classList.remove('open');
    } else {
      document.getElementById(focusId)?.focus();
    }
  }
}

function composerSetSubmitting(on) {
  const btn = document.getElementById('composer-submit');
  if (!btn) return;
  btn.disabled = on;
  // The button's last child is the text node after the icon span
  const textNode = btn.lastChild;
  if (textNode && textNode.nodeType === Node.TEXT_NODE) {
    textNode.textContent = on ? ' Publishing\u2026' : ' Publish';
  } else {
    btn.childNodes[btn.childNodes.length - 1].textContent = on ? ' Publishing\u2026' : ' Publish';
  }
}

function cleanTags(value) {
  return value.split(',').map(t => t.trim()).filter(Boolean).join(',');
}

async function readComposerError(res) {
  try {
    const data = await res.json();
    if (data.error && Array.isArray(data.error.details) && data.error.details.length) {
      return data.error.details.map(d => d.message);
    }
    if (data.message) return data.message;
    if (data.error && data.error.message) return data.error.message;
  } catch { /* ignore */ }
  return 'Unable to publish prompt.';
}

async function handleComposerSubmit(event) {
  event.preventDefault();
  composerClearMsg();

  if (!token || !currentUser) {
    composerSetMsg('Sign in to publish a prompt.', 'error');
    return;
  }

  const titleEl = document.getElementById('composer-title');
  const contentEl = document.getElementById('composer-content');
  const descEl = document.getElementById('composer-description');
  const tagsEl = document.getElementById('composer-tags');
  const catEl = document.getElementById('composer-category');

  const title = titleEl ? titleEl.value.trim() : '';
  const content = contentEl ? contentEl.value.trim() : '';
  const description = descEl ? descEl.value.trim() : '';
  const tags = cleanTags(tagsEl ? tagsEl.value : '');
  const category = catEl ? catEl.value : '';

  if (!title) {
    composerSetMsg('Title is required.', 'error');
    if (titleEl) titleEl.focus();
    return;
  }
  if (!content) {
    composerSetMsg('Prompt content is required.', 'error');
    if (contentEl) contentEl.focus();
    return;
  }
  if (!tags) {
    composerSetMsg('At least one tag is required (comma-separated).', 'error');
    if (tagsEl) tagsEl.focus();
    return;
  }

  const imageUrl = (document.getElementById('composer-image-url')?.value.trim()) || '';
  const resourceUrl = (document.getElementById('composer-resource-url')?.value.trim()) || '';

  const payload = {
    title,
    description,
    content,
    tags,
    price: 0
  };
  if (category) payload.category = category;
  if (imageUrl) payload.imageUrl = imageUrl;
  if (resourceUrl) payload.resourceUrl = resourceUrl;

  composerSetSubmitting(true);

  try {
    const res = await fetch(API + '/api/prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      composerSetMsg(await readComposerError(res), 'error');
      composerSetSubmitting(false);
      return;
    }

    const data = await res.json();
    if (!data.success) {
      composerSetMsg(data.message || (data.error && data.error.message) || 'Unable to publish prompt.', 'error');
      composerSetSubmitting(false);
      return;
    }

    composerClearForm();
    composerSetSubmitting(false);
    composerSetMsg('Prompt published!', 'success');
    setTimeout(composerClearMsg, 3000);

    // Prepend to feed or reload
    if (currentTab !== 'skills') {
      const newPrompt = data.data;
      const feedEl = document.getElementById('feed-container');
      if (feedEl) {
        if (newPrompt) {
          const empty = feedEl.querySelector('.pf-empty-state');
          if (empty) empty.remove();
          feedEl.insertAdjacentHTML('afterbegin', topicRow(newPrompt));
        } else {
          loadFeed();
        }
      }
    }
  } catch {
    composerSetMsg('Network error. Ensure backend is running.', 'error');
    composerSetSubmitting(false);
  }
}

/* ─── Sidebar ────────────────────────────────────────────────────── */

const CATS = [
  { name: 'Prompt Engineering', dotClass: 'pf-sidebar-link__dot--prompt', tag: 'prompt-engineering' },
  { name: 'AI Agents', dotClass: 'pf-sidebar-link__dot--agents', tag: 'agents' },
  { name: 'Coding', dotClass: 'pf-sidebar-link__dot--coding', tag: 'coding' },
  { name: 'Marketing', dotClass: 'pf-sidebar-link__dot--marketing', tag: 'marketing' },
  { name: 'Research', dotClass: 'pf-sidebar-link__dot--research', tag: 'research' },
  { name: 'Security', dotClass: 'pf-sidebar-link__dot--security', tag: 'security' },
  { name: 'Automation', dotClass: 'pf-sidebar-link__dot--automation', tag: 'automation' },
  { name: 'Data', dotClass: 'pf-sidebar-link__dot--data', tag: 'data' },
];
const TAGS = ['gpt-4o', 'claude', 'agents', 'rag', 'sql', 'automation', 'security'];

function renderSidebar() {
  document.getElementById('sidebar-cats').innerHTML = CATS.map(c =>
    '<button class="pf-sidebar-link" data-action="filterByTag" data-tag="' + esc(c.tag) + '">'
    + '<span class="pf-sidebar-link__dot ' + esc(c.dotClass) + '"></span>' + esc(c.name)
    + '</button>').join('');
  document.getElementById('sidebar-tags').innerHTML = TAGS.map(t =>
    '<button class="pf-sidebar-link" data-action="filterByTag" data-tag="' + esc(t) + '">'
    + '<span class="pf-sidebar-link__hash">#</span>' + esc(t)
    + '</button>').join('');
}

function filterByTag(tag) {
  activeTag = activeTag === tag ? null : tag;
  loadFeed();
}

/* ─── Feed rows ──────────────────────────────────────────────────── */

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

function buildMediaHtml(p) {
  let html = '';
  const validImg = isValidImageUrl(p.imageUrl);
  if (validImg) {
    html += '<img class="pf-topic-row__img-thumb" src="' + esc(p.imageUrl) + '" alt="Prompt image" loading="lazy"/>';
  }
  if (p.resourceUrl) {
    html += '<a class="pf-topic-row__resource-link" href="' + esc(p.resourceUrl) + '" target="_blank" rel="noopener noreferrer">'
      + '<span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>'
      + esc(p.resourceUrl)
      + '</a>';
  }
  return html ? '<div class="pf-topic-row__media">' + html + '</div>' : '';
}

function topicRow(p) {
  const score = p.score != null ? p.score : (p.upvotes != null ? p.upvotes : 0);
  const hasUpvoted = p.userVote === 1;
  const author = (p.user && p.user.username) || p.authorHandle || 'unknown';
  const tags = Array.isArray(p.tags) ? p.tags.slice(0, 3) : [];
  const cmts = p.commentCount != null ? p.commentCount : (p._count && p._count.comments != null ? p._count.comments : 0);
  const isSaved = Boolean(p.isSaved);

  const tagSpans = tags.map(t =>
    '<span class="pf-tag" data-action="filterByTag" data-tag="' + esc(t) + '">' + esc(t) + '</span>'
  ).join('');

  return '<div class="pf-topic-row">'
    + '<div class="pf-topic-row__vote">'
    + '<button class="pf-vote-btn' + (hasUpvoted ? ' pf-vote-btn--active' : '') + '" title="Upvote"'
    + ' data-action="upvote" data-id="' + esc(p.id) + '" data-dir="1">\u25b2</button>'
    + '<span class="pf-vote-count" id="score-' + esc(p.id) + '">' + fmtN(Math.max(0, score)) + '</span>'
    + '</div>'
    + '<div class="pf-topic-row__body">'
    + '<a class="pf-topic-row__title" href="prompt-detail.html?id=' + esc(p.id) + '#id=' + esc(p.id) + '">' + esc(p.title) + '</a>'
    + '<div class="pf-topic-row__meta">'
    + '<span class="pf-topic-row__author">by <strong>' + esc(author) + '</strong></span>'
    + '<span class="pf-topic-row__sep">\u00b7</span>'
    + '<span class="pf-topic-row__author">' + ago(p.createdAt) + '</span>'
    + tagSpans
    + '</div>'
    + buildMediaHtml(p)
    + '</div>'
    + '<div class="pf-topic-row__stats">'
    + '<span class="pf-stat"><span class="material-symbols-outlined pf-topic-row__stat-icon">chat_bubble</span><span>' + cmts + '</span></span>'
    + '<button class="pf-btn pf-btn--ghost pf-topic-row__bookmark"'
    + ' title="' + (isSaved ? 'Unsave this prompt' : 'Save this prompt') + '"'
    + ' data-action="save" data-id="' + esc(p.id) + '" data-saved="' + (isSaved ? 'true' : 'false') + '">'
    + '<span class="material-symbols-outlined pf-topic-row__bookmark-icon">' + (isSaved ? 'bookmark_added' : 'bookmark') + '</span>'
    + '</button>'
    + '</div>'
    + '</div>';
}

function skillRow(s, i) {
  const username = (s.user && s.user.username) || 'unknown';
  const slugTag = s.slug ? '<span class="pf-tag">' + esc(s.slug) + '</span>' : '';
  return '<div class="pf-topic-row pf-topic-row--clickable" data-action="gotoSkill" data-id="' + esc(s.id) + '">'
    + '<div class="pf-topic-row__vote"><span class="pf-vote-count">' + (i + 1) + '</span></div>'
    + '<div class="pf-topic-row__body">'
    + '<span class="pf-topic-row__title">' + esc(s.name) + '</span>'
    + '<div class="pf-topic-row__meta">'
    + '<span class="pf-topic-row__author">by <strong>' + esc(username) + '</strong></span>'
    + slugTag
    + '</div>'
    + '</div>'
    + '<div class="pf-topic-row__stats">'
    + '<span class="pf-stat"><span>' + (s.downloads != null ? s.downloads : 0) + '</span> dl</span>'
    + '<span class="pf-stat"><span>' + (s.stars != null ? s.stars : 0) + '</span> stars</span>'
    + '</div>'
    + '</div>';
}

/* ─── Feed loader ────────────────────────────────────────────────── */

async function loadFeed(query) {
  const el = document.getElementById('feed-container');
  el.innerHTML = '<div class="pf-loading"><div class="pf-spinner"></div></div>';

  if (currentTab === 'skills') {
    try {
      const r = await fetch(API + '/api/skills?limit=25');
      const d = await r.json();
      const items = d.data || [];
      el.innerHTML = items.length
        ? items.map(skillRow).join('')
        : emptyHTML('No skills yet', 'Be the first to publish a skill!');
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

    const items = d.data && d.data.prompts ? d.data.prompts : (d.data || []);
    el.innerHTML = items.length
      ? items.map(topicRow).join('')
      : emptyHTML('No prompts found', activeTag ? 'Try removing the tag filter.' : 'Be the first to share a prompt!');
  } catch (e) {
    el.innerHTML = errorHTML('Feed unavailable', e.message);
  }
}

/* ─── Vote ───────────────────────────────────────────────────────── */

async function handleVote(promptId, e) {
  e.stopPropagation();
  if (!requireAuth('vote on prompts')) return;
  const btn = e.target.closest('.pf-vote-btn');
  const isActive = btn && btn.classList.contains('pf-vote-btn--active');
  try {
    const r = await fetch(API + '/api/prompts/' + promptId + '/upvote', {
      method: isActive ? 'DELETE' : 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    const d = await r.json();
    if (d.success) {
      const scoreEl = document.getElementById('score-' + promptId);
      if (scoreEl) {
        const newScore = (d.data && d.data.score != null) ? d.data.score
          : (d.data && d.data.newScore != null ? d.data.newScore : 0);
        scoreEl.textContent = fmtN(Math.max(0, newScore));
      }
      if (btn) btn.classList.toggle('pf-vote-btn--active');
    } else {
      toast(d.message || 'Vote failed');
    }
  } catch {
    toast('Connection error');
  }
}

/* ─── Save ───────────────────────────────────────────────────────── */

async function handleSave(promptId, e, button) {
  e.stopPropagation();
  if (!requireAuth('save prompts')) return;
  const isSaved = button && button.dataset.saved === 'true';
  try {
    const r = await fetch(API + '/api/prompts/' + promptId + '/save', {
      method: isSaved ? 'DELETE' : 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    const d = await r.json();
    if (d.success) {
      const nextSaved = !isSaved;
      if (button) {
        button.dataset.saved = nextSaved ? 'true' : 'false';
        button.title = nextSaved ? 'Unsave this prompt' : 'Save this prompt';
        const icon = button.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = nextSaved ? 'bookmark_added' : 'bookmark';
      }
      toast(nextSaved ? 'Saved' : 'Removed from saved prompts');
    } else {
      toast(d.message || (d.error && d.error.message) || 'Failed');
    }
  } catch {
    toast('Connection error');
  }
}

/* ─── Right rail ─────────────────────────────────────────────────── */

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
      '<div class="pf-rail-row pf-rail-row--clickable" data-action="gotoSkill" data-id="' + esc(s.id) + '">'
      + '<span class="pf-rail-row__rank">' + (i + 1) + '</span>'
      + '<div class="pf-rail-row__body">'
      + '<div class="pf-rail-row__title">' + esc(s.name) + '</div>'
      + '<div class="pf-rail-row__sub">' + (s.downloads != null ? s.downloads : 0) + ' downloads</div>'
      + '</div>'
      + '</div>'
    ).join('');
  } catch {
    el.innerHTML = '<p class="pf-muted-note">API unavailable</p>';
  }
}

/* ─── Tab switching ──────────────────────────────────────────────── */

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

/* ─── Init ───────────────────────────────────────────────────────── */

(async function init() {
  await initAuth();
  renderSidebar();
  loadFeed();
  loadRailSkills();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('compose') === '1') {
    setTimeout(() => {
      const section = document.getElementById('composer-section');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
      if (token) {
        document.getElementById('composer-title')?.focus();
      }
    }, 100);
  }
}());

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-close-gate')?.addEventListener('click', closeGate);
  document.getElementById('btn-goto-signin')?.addEventListener('click', gotoSignin);

  document.getElementById('composer-form')?.addEventListener('submit', handleComposerSubmit);

  document.addEventListener('click', e => {
    if (e.target.id === 'pf-gate') {
      closeGate();
      return;
    }

    const attachBtn = e.target.closest('[data-action="toggleAttach"]');
    if (attachBtn) {
      e.stopPropagation();
      handleAttachToggle(attachBtn.dataset.panel);
      return;
    }

    const filterBtn = e.target.closest('[data-action="filterByTag"]');
    if (filterBtn) {
      e.stopPropagation();
      filterByTag(filterBtn.dataset.tag);
      return;
    }

    const voteBtn = e.target.closest('[data-action="upvote"]');
    if (voteBtn) {
      e.stopPropagation();
      handleVote(voteBtn.dataset.id, e);
      return;
    }

    const saveBtn = e.target.closest('[data-action="save"]');
    if (saveBtn) {
      e.stopPropagation();
      handleSave(saveBtn.dataset.id, e, saveBtn);
      return;
    }

    const skill = e.target.closest('[data-action="gotoSkill"]');
    if (skill) {
      window.location.href = 'skill-detail.html?id=' + skill.dataset.id;
    }
  });
});
