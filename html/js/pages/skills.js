/* ================================================================
   skills.html — Controller
   ================================================================ */
const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://promptfeed-backend.onrender.com";
const API = API_BASE_URL;
const token = localStorage.getItem('accessToken');
let currentUser = null;
let activeCategory = '';
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
function setCategory(cat){
  activeCategory = cat;
  const links = document.querySelectorAll('.pf-sidebar-left .pf-sidebar-link');
  links.forEach(l => l.classList.remove('active'));
  // Find link to make active based on text
  for(const l of links){
    if(cat === ''){
      if(l.textContent.includes('All Skills')) { l.classList.add('active'); break; }
    } else {
      if(l.textContent.includes(cat)) { l.classList.add('active'); break; }
    }
  }
  loadSkills();
}


document.getElementById('search-input').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadSkills(), 400);
});

/* ── Actions ── */
async function handleCopy(skillId, e){
  e.stopPropagation();
  // Fetch skill detail to copy content
  try {
    const res = await fetch(API+'/api/skills/'+skillId);
    const data = await res.json();
    if(data.success && data.data?.content){
      await navigator.clipboard.writeText(data.data.content);
      toast('✅ Skill content copied to clipboard!');
    } else {
      toast('⚠ Could not fetch content to copy.', false);
    }
  } catch(err) {
    toast('⚠ Network error.', false);
  }
}


function handleDownload(skillId, name, e){
  e.stopPropagation();
  toast('📥 Downloading ' + name + '...', true);
  // Implementation for download could fetch content and trigger blob download.
  // Stubbed for now.
}


/* ── Render ── */
function renderSkill(s){
  const author = s.user?.username || s.authorHandle || 'unknown';
  const dl = s.downloads || 0;
  const ver = s.version || 'v1.0';
  const compat = s.compatibility || 'Generic';
  const tags = Array.isArray(s.tags) ? s.tags : [];
  
  return `
  <div class="sk-card" data-action="gotoDetail" data-id="${esc(s.id)}" style="cursor:pointer">
    <div class="sk-card__header">
      <div>
        <div class="sk-card__title">${esc(s.name || s.title)}</div>
        <div class="sk-card__author">by <strong>${esc(author)}</strong></div>
      </div>
      <div class="sk-card__badge">
        <span class="material-symbols-outlined" style="font-size:14px">psychology</span>
        ${esc(s.category || 'Skill')}
      </div>
    </div>
    <div class="sk-card__desc">${esc(s.description || 'No description provided.')}</div>
    
    <div class="sk-card__meta">
      <span><span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle">download</span> ${dl} downloads</span>
      <span>•</span>
      <span>Version ${esc(ver)}</span>
      <span>•</span>
      <span>Compat: ${esc(compat)}</span>
    </div>
    
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${tags.map(t=>`<span class="pf-tag">#${esc(t)}</span>`).join('')}
    </div>
    
    <div class="sk-card__actions" data-action="stopProp">
      <button class="pf-btn pf-btn--primary" style="font-size:12px;padding:5px 12px" data-action="gotoDetail" data-id="${esc(s.id)}">View Details</button>
      <button class="pf-btn pf-btn--ghost" style="font-size:12px;padding:5px 12px" data-action="copy" data-id="${esc(s.id)}">Copy content</button>
      <button class="pf-btn pf-btn--ghost" style="font-size:12px;padding:5px 12px" data-action="download" data-id="${esc(s.id)}" data-title="${esc(s.name||s.title)}">Download .md</button>
    </div>
  </div>`;
}

async function loadSkills(){
  const el = document.getElementById('skills-container');
  const cnt = document.getElementById('skill-count');
  el.innerHTML = '<div class="pf-loading"><div class="pf-spinner"></div></div>';
  cnt.textContent = '';
  
  try {
    const q = document.getElementById('search-input').value.trim();
    const params = new URLSearchParams();
    if(activeCategory) params.set('category', activeCategory);
    if(q) params.set('search', q);
    
    const res = await fetch(API+'/api/skills?'+params.toString());
    const data = await res.json();
    
    if(!data.success) throw new Error(data.message || data.error?.message || "Failed to load skills");
    
    let skills = Array.isArray(data.data) ? data.data : (data.data?.skills || []);
    
    // Client-side filtering fallback
    if(activeCategory){
      skills = skills.filter(s => s.category === activeCategory);
    }
    if(q){
      const ql = q.toLowerCase();
      skills = skills.filter(s => (s.name||s.title||'').toLowerCase().includes(ql) || (s.description||'').toLowerCase().includes(ql));
    }

    if(!skills.length){
      el.innerHTML = `
        <div class="pf-empty-state" style="margin-top:20px">
          <div class="pf-empty-state__icon">🔍</div>
          <h3>No skills found yet</h3>
          <p>Be the first to publish a skill module.</p>
        </div>
      `;
      cnt.textContent = '0 skills';
      return;
    }
    
    cnt.textContent = skills.length + ' skill' + (skills.length!==1?'s':'');
    el.innerHTML = skills.map(renderSkill).join('');
    
  } catch(err) {
    el.innerHTML = `
      <div class="pf-empty-state" style="margin-top:20px">
        <div class="pf-empty-state__icon">⚠️</div>
        <h3>Could not load skills.</h3>
        <p style="color:var(--pf-danger);font-size:12px">${esc(err.message)}</p>
        <p style="margin-top:8px;font-size:12px;color:var(--pf-text-muted)">Ensure backend is running: <code>npm run dev</code></p>
      </div>
    `;
    cnt.textContent = '';
  }
}

/* ── Init ── */
(async function(){
  await initAuth();
  loadSkills();
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

    const stopProp = e.target.closest('[data-action="stopProp"]');
    if (stopProp) {
      // If we clicked inside actions but NOT on a button (like padding), stop here.
      if (!e.target.closest('button')) {
          e.stopPropagation();
          return;
      }
    }

    const setCatBtn = e.target.closest('[data-action="setCategory"]');
    if (setCatBtn) {
      setCategory(setCatBtn.dataset.val);
      return;
    }

    const copyBtn = e.target.closest('[data-action="copy"]');
    if (copyBtn) {
      e.stopPropagation();
      handleCopy(copyBtn.dataset.id, e);
      return;
    }

    const downloadBtn = e.target.closest('[data-action="download"]');
    if (downloadBtn) {
      e.stopPropagation();
      handleDownload(downloadBtn.dataset.id, downloadBtn.dataset.title, e);
      return;
    }

    const detailBtn = e.target.closest('[data-action="gotoDetail"]');
    if (detailBtn) {
      window.location.href = 'skill-detail.html?id=' + detailBtn.dataset.id;
      return;
    }
  });
});


