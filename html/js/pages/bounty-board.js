/* ================================================================
   bounty-board.html — Controller
   ================================================================ */
const API = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let activeFilters = { category: '', status: '', search: '' };
let searchTimer = null;

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function timeAgo(d){
  if(!d) return '';
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if(s < 60) return 'just now';
  if(s < 3600) return Math.floor(s/60)+'m ago';
  if(s < 86400) return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
}

function formatDate(d){
  if(!d) return '';
  return new Date(d).toLocaleDateString();
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
          <span>${esc(String(currentUser.walletBalance??'—'))}</span>
        </div>
        <div class="pf-avatar" id="user-avatar" title="Profile"
          style="${currentUser.avatarUrl ? 'background-image:url('+esc(currentUser.avatarUrl)+')' : ''}"
          id="user-avatar-btn"></div>`;
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
  activeFilters[type] = val;
  
  const labels = Array.from(document.querySelectorAll('.pf-sidebar-label'));
  let headerIndex = -1;
  let searchStr = type === 'category' ? 'Categories' : 'Status';

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
        if(val !== '') {
          // Add active if text matches or if it's the exact status
          if(type === 'category' && nextNode.textContent.includes(val)) nextNode.classList.add('active');
          if(type === 'status' && nextNode.textContent.toLowerCase().includes(val.toLowerCase())) nextNode.classList.add('active');
        } else if(val === '' && nextNode.textContent.includes('All Bounties')) {
          nextNode.classList.add('active');
        }
      }
      nextNode = nextNode.nextElementSibling;
    }
  }

  loadBounties();
}


document.getElementById('search-input').addEventListener('input', e => {
  activeFilters.search = e.target.value.trim();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadBounties(), 400);
});

/* ── Actions ── */
function handleSubmit(id){
  if(!requireAuth('submit a solution')) return;
  // Route to submission form or modal, stubbed for now
  window.location.href = 'bounty-submit.html?id=' + encodeURIComponent(id);
}


/* ── Render ── */
function getStatusClass(status){
  const s = (status || 'open').toLowerCase();
  if(s === 'review' || s === 'in review') return 'bb-status--review';
  if(s === 'completed' || s === 'closed') return 'bb-status--completed';
  return 'bb-status--open';
}

function renderRow(b){
  const title = b.title || 'Untitled Bounty';
  const desc = b.description || 'No description provided.';
  const author = b.user?.username || b.creatorName || 'unknown';
  const reward = String(b.reward ?? b.escrowAmount ?? '0');
  const status = b.status || 'open';
  const category = b.category || 'Task';
  const tags = Array.isArray(b.tags) ? b.tags : [];
  const subs = b.submissionsCount || b._count?.submissions || 0;
  const deadline = b.deadline ? formatDate(b.deadline) : 'No deadline';

  return `
  <div class="bb-card">
    <div class="bb-header">
      <div>
        <div class="bb-title">${esc(title)}</div>
        <div class="bb-meta-row">
          <span>by <strong>${esc(author)}</strong></span>
          <span>•</span>
          <span>${timeAgo(b.createdAt)}</span>
          <span>•</span>
          <span class="bb-status ${getStatusClass(status)}">${esc(status)}</span>
        </div>
      </div>
      <div class="bb-reward">
        <span class="material-symbols-outlined" style="font-size:18px">toll</span>
        ${esc(reward)}
      </div>
    </div>
    
    <div class="bb-desc">${esc(desc)}</div>
    
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <span class="pf-tag" style="background:var(--pf-surface)">${esc(category)}</span>
      ${tags.map(t=>`<span class="pf-tag">#${esc(t)}</span>`).join('')}
    </div>
    
    <div class="bb-footer">
      <div class="bb-stats">
        <div class="bb-stat">
          <span class="material-symbols-outlined" style="font-size:14px">assignment_turned_in</span>
          ${subs} Submissions
        </div>
        <div class="bb-stat">
          <span class="material-symbols-outlined" style="font-size:14px">schedule</span>
          ${esc(deadline)}
        </div>
      </div>
      <div class="bb-actions">
        <button class="pf-btn pf-btn--ghost" style="font-size:12px;padding:6px 12px" title="Coming soon" disabled>
          View Details
        </button>
        <button class="pf-btn pf-btn--primary" style="font-size:12px;padding:6px 12px" data-action="submitSolution" data-id="${esc(b.id)}">
          Submit Solution
        </button>
      </div>
    </div>
  </div>`;
}

async function loadBounties(){
  const el = document.getElementById('bounties-container');
  el.innerHTML = '<div class="pf-loading"><div class="pf-spinner"></div></div>';
  
  try {
    const params = new URLSearchParams();
    if(activeFilters.category) params.set('category', activeFilters.category);
    if(activeFilters.status) params.set('status', activeFilters.status);
    if(activeFilters.search) params.set('search', activeFilters.search);
    
    const headers = {};
    if(token) headers['Authorization'] = 'Bearer '+token;

    const res = await fetch(API + '/api/bounties?' + params.toString(), { headers });
    const data = await res.json();
    
    if(!data.success) throw new Error(data.message || data.error?.message || "Failed to load bounties");
    
    const items = Array.isArray(data.data) ? data.data : (data.data?.bounties || []);
    
    if(!items.length){
      el.innerHTML = `
        <div class="pf-empty-state" style="margin-top:20px;padding:40px">
          <div class="pf-empty-state__icon">🎯</div>
          <h3>No bounties available yet.</h3>
          <p>Check back later or become a Creator to post the first bounty.</p>
        </div>
      `;
      return;
    }
    
    el.innerHTML = items.map(renderRow).join('');
    
  } catch(err) {
    el.innerHTML = `
      <div class="pf-empty-state" style="margin-top:20px;padding:40px">
        <div class="pf-empty-state__icon">⚠️</div>
        <h3>Could not load bounties</h3>
        <p style="color:var(--pf-danger);font-size:13px">${esc(err.message)}</p>
        <p style="margin-top:12px;font-size:12px;color:var(--pf-text-muted)">Ensure backend is running: <code>npm run dev</code></p>
      </div>
    `;
  }
}

/* ── Init ── */
(async function(){
  await initAuth();
  loadBounties();
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

    const submitBtn = e.target.closest('[data-action="submitSolution"]');
    if (submitBtn) {
      handleSubmit(submitBtn.dataset.id);
      return;
    }
  });
});

