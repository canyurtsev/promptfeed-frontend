/* ================================================================
   benchmarks.html — Controller
   Fallback logic: GET /api/benchmarks -> GET /api/prompts?sort=efficiency
   ================================================================ */
const API = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let activeFilters = { metric: 'efficiency', model: '', category: '', search: '' };
let searchTimer = null;

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function toast(msg, ok=true){
  const t = document.createElement('div');
  t.className = 'pf-toast';
  t.textContent = msg;
  if(!ok) t.style.borderColor = 'var(--pf-danger)';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ── Auth ── */
async function initAuth(){
  const area = document.getElementById('nav-auth-area');
  if(!token){
    area.innerHTML = `<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
      <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
    showAds(); return;
  }
  try {
    const r = await fetch(API+'/api/users/me', {headers:{Authorization:'Bearer '+token}});
    const d = await r.json();
    if(d.success && d.data){
      currentUser = d.data;
      const plan = (currentUser.plan || 'free').toLowerCase();
      area.innerHTML = `
        <div class="pf-wallet-chip" title="Wallet balance">
          <span class="material-symbols-outlined pf-wallet-chip__icon">toll</span>
          <span>${esc(String(currentUser.wallet?.balance ?? currentUser.walletBalance ?? '—'))}</span>
        </div>
        <div class="pf-avatar" id="user-avatar" title="Profile"
          style="${currentUser.avatarUrl ? 'background-image:url('+esc(currentUser.avatarUrl)+')' : ''}"
          id="user-avatar-btn">${currentUser.avatarUrl ? '' : esc(String(currentUser.username || currentUser.fullName || currentUser.email || 'A')[0].toUpperCase())}</div>`;
      if(plan === 'free') showAds();
    } else { guestNav(area); showAds(); }
  } catch { guestNav(area); showAds(); }
}
function guestNav(a){
  a.innerHTML = `<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
    <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
}
function showAds(){
  ['top-ad-banner','right-ad-slot','pro-box'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.classList.remove('pf-ad-banner--hidden');
  });
}

function requireAuth(label){
  if(token && currentUser) return true;
  document.getElementById('gate-desc').textContent = 'Sign in to ' + label + '.';
  document.getElementById('pf-gate').classList.add('open');
  return false;
}
function closeGate(){ document.getElementById('pf-gate').classList.remove('open'); }
function gotoSignin(){ window.location.href = 'signin.html?returnUrl='+encodeURIComponent(location.href); }



/* ── Filter ── */
function setFilter(type, val){
  // If clicking an element, we don't have it explicitly as first arg, so we find it by text.
  // Actually, we modified the inline onclick to setFilter(type, val). 
  // Let's just update active styling broadly.
  activeFilters[type] = val;
  
  const labels = Array.from(document.querySelectorAll('.pf-sidebar-label'));
  let headerIndex = -1;
  let searchStr = '';
  if(type === 'metric') searchStr = 'Metrics';
  if(type === 'model') searchStr = 'Models';
  if(type === 'category') searchStr = 'Categories';

  for(let i=0; i<labels.length; i++){
    if(labels[i].textContent.trim().toLowerCase() === searchStr.toLowerCase()){
      headerIndex = i;
      break;
    }
  }

  if(headerIndex !== -1){
    let nextNode = labels[headerIndex].nextElementSibling;
    while(nextNode && !nextNode.classList.contains('pf-sidebar-label') && !nextNode.classList.contains('pf-sidebar-divider')){
      if(nextNode.classList.contains('pf-sidebar-link')){
        nextNode.classList.remove('active');
        // Match logic
        if(type === 'metric' || type === 'category') {
          // simple includes check
          if(val !== '' && nextNode.textContent.includes(val)) nextNode.classList.add('active');
          else if(val === '' && nextNode.textContent.includes('All')) nextNode.classList.add('active');
        } else if(type === 'model') {
           if(val !== '' && nextNode.textContent.includes(val)) nextNode.classList.add('active');
           else if(val === '' && nextNode.textContent.includes('All Models')) nextNode.classList.add('active');
        }
      }
      nextNode = nextNode.nextElementSibling;
    }
  }

  loadBenchmarks();
}


document.getElementById('search-input').addEventListener('input', e => {
  activeFilters.search = e.target.value.trim();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadBenchmarks(), 400);
});

/* ── Render ── */
function renderRow(p, index){
  // Handle data format either from /api/benchmarks or /api/prompts
  const title = p.title || p.prompt?.title || 'Untitled Prompt';
  const author = p.user?.username || p.authorHandle || p.prompt?.user?.username || 'unknown';
  const promptId = p.id || p.promptId || p.prompt?.id;

  // Extracted metrics
  const effScore = p.efficiencyScore || p.benchmark?.efficiencyScore;
  const avgTok = p.avgTokens || p.benchmark?.avgTokens;
  const avgCost = p.avgCost || p.benchmark?.avgCost;
  const avgLat = p.avgLatency || p.benchmark?.avgLatency;
  const qScore = p.qualityScore || p.benchmark?.qualityScore;
  const sRate = p.successRate || p.benchmark?.successRate;
  const bestM = p.bestModel || p.benchmark?.bestModel || 'Multiple';
  const vRuns = p.verifiedRuns || p.benchmark?.verifiedRuns || 0;

  const hasMetrics = (effScore || avgTok || avgCost || avgLat || qScore || sRate);

  let statsHtml = '';
  if(hasMetrics){
    statsHtml = `
      <div class="bm-stat"><span class="bm-stat__label">Efficiency</span><span class="bm-stat__val bm-stat__val--eff">${effScore ? Number(effScore).toFixed(1) : '—'}</span></div>
      <div class="bm-stat"><span class="bm-stat__label">Quality</span><span class="bm-stat__val">${qScore ? Number(qScore).toFixed(1) : '—'}</span></div>
      <div class="bm-stat"><span class="bm-stat__label">Avg Tokens</span><span class="bm-stat__val">${avgTok || '—'}</span></div>
      <div class="bm-stat"><span class="bm-stat__label">Avg Cost</span><span class="bm-stat__val bm-stat__val--cost">${avgCost ? ('$'+Number(avgCost).toFixed(4)) : '—'}</span></div>
      <div class="bm-stat"><span class="bm-stat__label">Latency</span><span class="bm-stat__val">${avgLat ? Math.round(avgLat)+'ms' : '—'}</span></div>
      <div class="bm-stat"><span class="bm-stat__label">Success Rate</span><span class="bm-stat__val">${sRate ? Number(sRate).toFixed(1)+'%' : '—'}</span></div>
    `;
  } else {
    statsHtml = `<div style="font-size:12px;color:var(--pf-text-muted);font-weight:600">Not benchmarked yet.</div>`;
  }

  return `
  <div class="bm-row">
    <div class="bm-rank">#${index + 1}</div>
    <div class="bm-info">
      <div class="bm-title" title="${esc(title)}">${esc(title)}</div>
      <div class="bm-author">
        by <strong style="color:var(--pf-text-primary)">${esc(author)}</strong> 
        <span style="color:var(--pf-text-muted);margin:0 6px">•</span> 
        <span style="color:var(--pf-text-secondary);font-size:11px">Model: ${esc(bestM)} (${vRuns} runs)</span>
      </div>
      <div class="bm-stats-grid">
        ${statsHtml}
      </div>
    </div>
    <div class="bm-action">
      <button class="pf-btn pf-btn--ghost" data-action="gotoDetail" data-id="${esc(promptId)}">View Prompt</button>
    </div>
  </div>`;
}

async function loadBenchmarks(){
  const el = document.getElementById('benchmarks-container');
  el.innerHTML = '<div class="pf-loading"><div class="pf-spinner"></div></div>';
  
  try {
    const params = new URLSearchParams();
    if(activeFilters.metric) params.set('sort', activeFilters.metric);
    if(activeFilters.model) params.set('model', activeFilters.model);
    if(activeFilters.category) params.set('category', activeFilters.category);
    if(activeFilters.search) params.set('search', activeFilters.search);
    
    const headers = {};
    if(token) headers['Authorization'] = 'Bearer '+token;

    let res, data;
    let endpoint = '/api/benchmarks';

    try {
      res = await fetch(API + endpoint + '?' + params.toString(), { headers });
      if(!res.ok && res.status === 404) throw new Error('Endpoint not found');
      data = await res.json();
    } catch(err) {
      // Fallback
      endpoint = '/api/prompts';
      // Force sort by efficiency on fallback if metric sorting is applied
      if(activeFilters.metric === 'efficiency') params.set('sort', 'efficiency');
      res = await fetch(API + endpoint + '?' + params.toString(), { headers });
      data = await res.json();
    }
    
    if(!data.success) throw new Error(data.message || data.error?.message || "Failed to load benchmarks");
    
    // Support varying response structures gracefully
    const items = Array.isArray(data.data) ? data.data : (data.data?.benchmarks || data.data?.prompts || []);
    
    if(!items.length){
      el.innerHTML = `
        <div class="pf-empty-state" style="margin-top:20px;padding:40px">
          <div class="pf-empty-state__icon">📊</div>
          <h3>No benchmark data available yet.</h3>
          <p>Run prompts to start building the leaderboard.</p>
          ${endpoint === '/api/prompts' ? `
            <div style="margin-top:16px;background:var(--pf-surface);border:1px solid var(--pf-border);padding:12px;border-radius:var(--pf-radius);text-align:left;font-size:12px">
              <strong style="color:var(--pf-warning)">Backend Notice:</strong><br>
              Currently using fallback <code>/api/prompts</code>.<br>
              Required endpoint: <code>GET /api/benchmarks</code>
            </div>
          ` : ''}
        </div>
      `;
      return;
    }
    
    el.innerHTML = items.map((p, index) => renderRow(p, index)).join('');
    
  } catch(err) {
    el.innerHTML = `
      <div class="pf-empty-state" style="margin-top:20px;padding:40px">
        <div class="pf-empty-state__icon">⚠️</div>
        <h3>Could not load benchmarks</h3>
        <p style="color:var(--pf-danger);font-size:13px">${esc(err.message)}</p>
        <p style="margin-top:12px;font-size:12px;color:var(--pf-text-muted)">Ensure backend is running: <code>npm run dev</code></p>
      </div>
    `;
  }
}

/* ── Init ── */
(async function(){
  await initAuth();
  loadBenchmarks();
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

    const setFilterBtn = e.target.closest('[data-action="setFilter"]');
    if (setFilterBtn) {
      setFilter(setFilterBtn.dataset.type, setFilterBtn.dataset.val);
      return;
    }

    const detailBtn = e.target.closest('[data-action="gotoDetail"]');
    if (detailBtn) {
      window.location.href = 'prompt-detail.html?id=' + detailBtn.dataset.id;
      return;
    }
  });
});

