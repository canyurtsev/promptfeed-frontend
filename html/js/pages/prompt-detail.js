/* ================================================================
   prompt-detail.html — Controller
   Direct API interactions for Buy, Bookmark, Run
   ================================================================ */
const API = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let promptData = null;

const urlParams = new URLSearchParams(window.location.search);
const promptId = urlParams.get('id');

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function toast(msg, ok=true){
  const t = document.createElement('div');
  t.className = 'pf-toast';
  t.textContent = msg;
  if(!ok) t.style.borderColor = 'var(--pf-danger)';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
function fmtPrice(p){
  if(!p || p==='0' || p==='0.00') return 'Free';
  const n = parseFloat(p);
  return isNaN(n) ? String(p) : '$'+n.toFixed(2);
}
function timeAgo(d){
  if(!d) return '';
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if(s < 60) return 'just now';
  if(s < 3600) return Math.floor(s/60)+'m ago';
  if(s < 86400) return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
}

/* ── Auth ── */
async function initAuth(){
  const area = document.getElementById('nav-auth-area');
  if(!token){
    area.innerHTML = `<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
      <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
    return;
  }
  try {
    const r = await fetch(API+'/api/users/me', {headers:{Authorization:'Bearer '+token}});
    const d = await r.json();
    if(d.success && d.data){
      currentUser = d.data;
      area.innerHTML = `
        <div class="pf-wallet-chip" title="Wallet balance">
          <span class="material-symbols-outlined pf-wallet-chip__icon">toll</span>
          <span id="wallet-bal">${esc(String(currentUser.walletBalance??'—'))}</span>
        </div>
        <div class="pf-avatar" id="user-avatar" title="Profile"
          style="${currentUser.avatarUrl ? 'background-image:url('+esc(currentUser.avatarUrl)+')' : ''}"
          id="user-avatar-btn"></div>`;
    } else {
      guestNav(area);
    }
  } catch { guestNav(area); }
}
function guestNav(a){
  a.innerHTML = `<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
    <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
}

function requireAuth(label){
  if(token && currentUser) return true;
  document.getElementById('gate-desc').textContent = 'Sign in to ' + label + '.';
  document.getElementById('pf-gate').classList.add('open');
  return false;
}
function closeGate(){ document.getElementById('pf-gate').classList.remove('open'); }
function gotoSignin(){ window.location.href = 'signin.html?returnUrl='+encodeURIComponent(location.href); }



/* ── Load Prompt ── */
async function loadPrompt(){
  const container = document.getElementById('page-content');
  if(!promptId){
    renderError("No Prompt ID provided.");
    return;
  }
  try {
    const headers = {};
    if(token) headers['Authorization'] = 'Bearer '+token;

    const res = await fetch(API+'/api/prompts/'+promptId, { headers });
    const data = await res.json();
    
    if(!data.success) throw new Error(data.message || data.error?.message || "Failed to load prompt");
    promptData = data.data;
    renderPage();
  } catch(err) {
    renderError(err.message);
  }
}

function renderError(msg){
  document.getElementById('page-content').innerHTML = `
    <div class="pf-empty-state" style="grid-column: 1/-1; margin-top:40px;">
      <div class="pf-empty-state__icon">⚠️</div>
      <h3>Could not load prompt</h3>
      <p style="color:var(--pf-danger);font-size:13px">${esc(msg)}</p>
      <p style="margin-top:12px;font-size:12px;color:var(--pf-text-muted)">Ensure backend is running: <code>npm run dev</code></p>
      <a href="community.html" class="pf-btn pf-btn--ghost" style="margin-top:16px">Back to Community</a>
    </div>
  `;
}

function renderPage(){
  const p = promptData;
  const isFree = (p.price === '0' || p.price === '0.00' || !p.price);
  const isOwned = p.isOwned || p.isOwner; // based on API response
  const author = p.user?.username || p.authorHandle || 'unknown';
  const tags = Array.isArray(p.tags) ? p.tags : [];
  const effScore = p.efficiencyScore || p.benchmark?.efficiencyScore;
  const avgTok = p.avgTokens || p.benchmark?.avgTokens;
  const avgCost = p.avgCost || p.benchmark?.avgCost;
  const avgLat = p.avgLatency || p.benchmark?.avgLatency;
  const qScore = p.qualityScore || p.benchmark?.qualityScore;
  const sRate = p.successRate || p.benchmark?.successRate;
  
  const contentPreview = p.content || (isOwned || isFree ? '' : 'This premium prompt content is hidden. Purchase to unlock.');
  const showContent = isFree || isOwned;

  const plan = currentUser ? (currentUser.plan || 'free').toLowerCase() : 'guest';
  const showAd = (plan === 'free' || plan === 'guest');

  let metricsHtml = '';
  if(effScore || avgTok || avgCost || avgLat || qScore || sRate){
    metricsHtml = `
      <div class="pd-stat-grid">
        <div class="pd-stat"><span class="pd-stat__label">Efficiency</span><span class="pd-stat__val">${effScore?Number(effScore).toFixed(1):'—'}</span></div>
        <div class="pd-stat"><span class="pd-stat__label">Quality</span><span class="pd-stat__val">${qScore?Number(qScore).toFixed(1):'—'}</span></div>
        <div class="pd-stat"><span class="pd-stat__label">Avg Tokens</span><span class="pd-stat__val">${avgTok||'—'}</span></div>
        <div class="pd-stat"><span class="pd-stat__label">Avg Cost</span><span class="pd-stat__val">${avgCost?('$'+avgCost):'—'}</span></div>
        <div class="pd-stat"><span class="pd-stat__label">Latency</span><span class="pd-stat__val">${avgLat?Math.round(avgLat)+'ms':'—'}</span></div>
        <div class="pd-stat"><span class="pd-stat__label">Success</span><span class="pd-stat__val">${sRate?Number(sRate).toFixed(1)+'%':'—'}</span></div>
      </div>
    `;
  } else {
    metricsHtml = `<div style="font-size:13px;color:var(--pf-text-muted);text-align:center;padding:12px 0">Not benchmarked yet.</div>`;
  }

  let actionHtml = '';
  if(isOwned){
    actionHtml = `
      <div style="background:#3fb95015;border:1px solid #3fb95030;color:var(--pf-success);padding:10px;border-radius:6px;font-size:13px;font-weight:600;text-align:center;margin-bottom:10px">
        ✓ Owned
      </div>
    `;
  } else if(!isFree){
    actionHtml = `
      <button class="pf-btn pf-btn--primary" style="width:100%;margin-bottom:10px;font-size:14px" id="buy-btn">
        Buy Prompt
      </button>
    `;
  }

  document.getElementById('page-content').innerHTML = `
    <main class="pd-main">
      <article class="pd-header">
        <div class="pd-title">${esc(p.title)}</div>
        <div class="pd-meta">
          <span style="color:var(--pf-text-primary)">by <strong>${esc(author)}</strong></span>
          <span>•</span>
          <span>${timeAgo(p.createdAt)}</span>
          ${p.category ? `<span>•</span><span class="pf-tag">${esc(p.category)}</span>` : ''}
          ${tags.map(t=>`<span class="pf-tag">#${esc(t)}</span>`).join('')}
        </div>
        <div class="pd-desc">${esc(p.description)}</div>
      </article>

      <div style="position:relative">
        <h3 style="font-size:14px;font-weight:700;color:var(--pf-text-primary);margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">Prompt Content</h3>
        <div class="pd-content-box ${!showContent ? 'pd-content-box--locked' : ''}">
          ${esc(contentPreview)}
        </div>
        ${!showContent ? `
        <div class="pd-locked-overlay">
          <span class="material-symbols-outlined" style="font-size:32px;color:var(--pf-pro);margin-bottom:12px">lock</span>
          <div style="font-weight:600;color:var(--pf-text-primary)">Premium Content Locked</div>
          <div style="font-size:13px;color:var(--pf-text-muted);margin-top:4px">Purchase to unlock this prompt.</div>
        </div>` : ''}
      </div>

      <div class="pd-panel">
        <div class="pd-panel__header">
          <span class="material-symbols-outlined" style="font-size:18px">forum</span>
          Community Discussion
        </div>
        <div style="text-align:center;padding:32px;color:var(--pf-text-muted);font-size:13px">
          <span class="material-symbols-outlined" style="font-size:32px;opacity:0.5;margin-bottom:12px">chat_bubble</span>
          <div>Discussion coming soon.</div>
        </div>
      </div>
    </main>

    <aside class="pd-sidebar">
      <div class="pd-panel" style="margin-bottom:24px">
        <div class="pd-price-row">
          <div class="pd-badge ${isFree?'pd-badge--free':'pd-badge--premium'}">${isFree?'Free':'Premium'}</div>
          <div style="font-size:24px;font-weight:800;color:var(--pf-text-primary);font-family:var(--pf-font-mono)">
            ${fmtPrice(p.price)}
          </div>
        </div>
        
        <div class="pd-actions">
          ${actionHtml}
          <div class="pd-action-row">
            <button class="pf-btn pf-btn--ghost" id="run-btn" style="display:flex;align-items:center;justify-content:center;gap:6px">
              <span class="material-symbols-outlined" style="font-size:16px">play_arrow</span> Run Prompt
            </button>
            <button class="pf-btn pf-btn--ghost" id="bookmark-btn" style="display:flex;align-items:center;justify-content:center;gap:6px">
              <span class="material-symbols-outlined" style="font-size:16px">bookmark</span> Save
            </button>
          </div>
        </div>
      </div>

      <div class="pd-panel" style="margin-bottom:24px">
        <div class="pd-panel__header">
          <span class="material-symbols-outlined" style="font-size:18px">speed</span>
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
async function handleBuy(){
  if(!requireAuth('purchase this prompt')) return;
  const btn = document.getElementById('buy-btn');
  if(!btn) return;
  btn.textContent = 'Purchasing...';
  btn.disabled = true;

  try {
    const res = await fetch(API+'/api/marketplace/purchase', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+token },
      body: JSON.stringify({ productId: promptId }) // assuming purchase endpoint takes productId which maps to prompt
    });
    const data = await res.json();
    const reqIdStr = data.error?.requestId ? ` [Req: ${data.error.requestId}]` : '';

    if(data.success){
      toast('✅ Purchase successful!');
      // refresh user and prompt
      await initAuth();
      await loadPrompt();
    } else {
      toast('⚠ Purchase failed: ' + (data.message || data.error?.message || 'Unknown error') + reqIdStr, false);
      btn.textContent = 'Buy Prompt';
      btn.disabled = false;
    }
  } catch(err) {
    toast('⚠ Network error. Please try again.', false);
    btn.textContent = 'Buy Prompt';
    btn.disabled = false;
  }
}

function handleRun(){
  if(!requireAuth('run this prompt')) return;
  window.location.href = `playground.html?promptId=${promptId}`;
}

async function handleBookmark(){
  if(!requireAuth('bookmark this prompt')) return;
  try {
    const res = await fetch(API+`/api/prompts/${promptId}/bookmark`, {
      method: 'POST',
      headers: { 'Authorization':'Bearer '+token }
    });
    const data = await res.json();
    if(data.success){
      toast('🔖 Bookmark updated!');
    } else {
      toast('⚠ Failed to bookmark.', false);
    }
  } catch(err) {
    toast('⚠ Network error.', false);
  }
}

/* ── Init ── */
(async function init(){
  await initAuth();
  await loadPrompt();
})();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-close-gate')?.addEventListener('click', closeGate);
  document.getElementById('btn-goto-signin')?.addEventListener('click', gotoSignin);

  document.addEventListener('click', e => {
    if (e.target.id === 'pf-gate') { closeGate(); return; }

    if (e.target.closest('#user-avatar') || e.target.closest('#user-avatar-btn')) {
      window.location.href = 'signin.html';
      return;
    }

    if (e.target.closest('#buy-btn')) {
      handleBuy();
      return;
    }

    if (e.target.closest('#run-btn')) {
      handleRun();
      return;
    }

    if (e.target.closest('#bookmark-btn')) {
      handleBookmark();
      return;
    }
  });
});

