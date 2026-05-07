/* ================================================================
   marketplace.html — Page Controller
   Uses GET /api/prompts/marketplace
   ================================================================ */
const API   = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let searchTimer = null;

/* ── State ── */
let currentPage = 1;
let currentLimit = 12;
let currentSort = 'trending';
let currentTag = '';
let currentSearch = '';
let currentPriceFilter = '';


/* ── Helpers ── */
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function toast(msg,ok){
  const t=document.createElement('div');
  t.className='pf-toast';
  t.textContent=msg;
  if(!ok) t.style.borderColor='var(--pf-danger)';
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}
function fmtPrice(p){
  if(!p||p==='0'||p==='0.00') return 'Free';
  const n=parseFloat(p);
  return isNaN(n)?String(p):'$'+Number(p).toFixed(2);
}

/* ── Auth ── */
async function initAuth(){
  const area=document.getElementById('nav-auth-area');
  if(!token){
    area.innerHTML=`<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
      <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
    showAds(); return;
  }
  try{
    const r=await fetch(API+'/api/users/me',{headers:{Authorization:'Bearer '+token}});
    const d=await r.json();
    if(d.success&&d.data){
      currentUser=d.data;
      const plan=(currentUser.plan||'free').toLowerCase();
      area.innerHTML=`
        <div class="pf-wallet-chip" title="Wallet balance">
          <span class="material-symbols-outlined pf-wallet-chip__icon">toll</span>
          <span id="wallet-bal">${esc(String(currentUser.walletBalance??'—'))}</span>
        </div>
        <div class="pf-avatar" id="user-avatar" title="Profile"
          style="${currentUser.avatarUrl?'background-image:url('+esc(currentUser.avatarUrl)+')':''}"
          id="user-avatar-btn"></div>
        <button id="btn-logout" class="pf-btn pf-btn--ghost" style="font-size:12px;padding:4px 10px">Logout</button>`;
      if(plan==='free') showAds();
      const logoutBtn = document.getElementById('btn-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = 'signin.html';
        });
      }
    } else { guestNav(area); showAds(); }
  } catch { guestNav(area); showAds(); }
}
function guestNav(a){
  a.innerHTML=`<a href="signin.html" class="pf-btn pf-btn--ghost">Sign In</a>
    <a href="signin.html?mode=register" class="pf-btn pf-btn--primary">Sign Up</a>`;
}
function showAds(){
  ['top-ad-banner','right-ad-slot','pro-box'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.remove('pf-ad-banner--hidden');
  });
}

/* ── Gate ── */
function requireAuth(label){
  if(token&&currentUser) return true;
  document.getElementById('gate-desc').textContent='Sign in to '+label+'.';
  document.getElementById('pf-gate').classList.add('open');
  return false;
}
function closeGate(){ document.getElementById('pf-gate').classList.remove('open'); }
function gotoSignin(){ window.location.href='signin.html?returnUrl='+encodeURIComponent(location.href); }

/* ── Render Card ── */
function renderCard(p){
  const priceStr=fmtPrice(p.price);
  const author=p.user?.username||'unknown';
  const score=p.score||0;

  return `
  <div class="mk-card" data-action="gotoDetail" data-id="${esc(p.id)}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
      <div class="mk-card__title">${esc(p.title||'Untitled')}</div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        <span class="mk-badge mk-badge--premium">Premium</span>
      </div>
    </div>
    <div class="mk-card__desc">${esc(p.description||'')}</div>
    <div class="mk-card__meta">
      <span>by <strong style="color:var(--pf-text-secondary)">${esc(author)}</strong></span>
      <span>• ▲ ${score}</span>
      ${p.category?`<span>• ${esc(p.category)}</span>`:''}
    </div>
    <div class="mk-card__footer" data-action="stopProp">
      <div class="mk-card__price">${esc(priceStr)}</div>
      <div style="display:flex;gap:8px">
        <button class="pf-btn pf-btn--ghost" style="font-size:12px;padding:5px 12px"
          data-action="gotoDetail" data-id="${esc(p.id)}">Details</button>
        <button class="pf-btn pf-btn--primary" style="font-size:12px;padding:5px 12px"
          data-action="buy" data-id="${esc(p.id)}" data-title="${esc(p.title||'')}" data-price="${esc(String(p.price||'0'))}">Buy</button>
      </div>
    </div>
  </div>`;
}

/* ── Load Products ── */
async function loadProducts(){
  const el=document.getElementById('products-container');
  const cnt=document.getElementById('product-count');
  const pag=document.getElementById('pagination-controls');
  if(!el) return;
  el.innerHTML='<div class="pf-loading" style="grid-column:1/-1"><div class="pf-spinner"></div></div>';
  if(cnt) cnt.textContent='';
  if(pag) pag.innerHTML='';

   try{
     const p=new URLSearchParams();
     p.set('page', currentPage);
     p.set('limit', currentLimit);
     p.set('sort', currentSort);
     if(currentTag) p.set('tag', currentTag);
     if(currentSearch) p.set('search', currentSearch);
     if(currentPriceFilter) p.set('priceFilter', currentPriceFilter);

     const headers={};
     if(token) headers['Authorization']='Bearer '+token;

     const r=await fetch(API+'/api/prompts/marketplace?'+p,{headers});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const d=await r.json();
    if(!d.success) throw new Error(d.message||'API error');

    const items=d.data?.prompts||[];
    const meta=d.data?.pagination||{};

    if(cnt) {
      if (meta.total !== undefined) {
        cnt.textContent = `${meta.total} listing${meta.total!==1?'s':''}`;
      } else {
        cnt.textContent = items.length+' listing'+(items.length!==1?'s':'');
      }
    }

    if(!items.length){
      el.innerHTML=`<div class="pf-empty-state" style="grid-column:1/-1">
        <div class="pf-empty-state__icon">🔍</div>
        <h3>No marketplace products found</h3>
        <p>Try adjusting your filters or search terms.</p>
      </div>`;
      return;
    }
    el.innerHTML=items.map(renderCard).join('');
    
    // Pagination
    if(pag && meta.totalPages > 1) {
      pag.innerHTML = `
        <button class="pf-pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
          <span class="material-symbols-outlined" style="font-size:18px">chevron_left</span> Previous
        </button>
        <div class="pf-pagination-info">Page ${currentPage} of ${meta.totalPages}</div>
        <button class="pf-pagination-btn" ${currentPage >= meta.totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
          Next <span class="material-symbols-outlined" style="font-size:18px">chevron_right</span>
        </button>
      `;
    }
  } catch(e){
    el.innerHTML=`<div class="pf-empty-state" style="grid-column:1/-1">
      <div class="pf-empty-state__icon">⚠️</div>
      <h3>Could not load marketplace</h3>
      <p style="color:var(--pf-danger);font-size:12px">${esc(e.message)}</p>
    </div>`;
    if(cnt) cnt.textContent='';
  }
}

/* ── Buy Handler ── */
async function handleBuy(btn){
  if(!requireAuth('purchase prompts')) return;
  if (!btn) return;
  const { id: productId, title, price } = btn.dataset;
  const origText=btn.textContent;
  btn.textContent='Buying...'; btn.disabled=true;
  try{
    const r=await fetch(API+'/api/marketplace/purchase',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({productId})
    });
    const d=await r.json();
    const rid=d.requestId?` [${d.requestId}]`:'';
    if(d.success){
      toast('✅ Purchase successful! "'+title+'" is now yours.');
      await refreshWallet();
    } else {
      toast('⚠ Purchase failed: '+(d.message||'Unknown error')+rid, false);
    }
  } catch(e){
    toast('⚠ Connection error: '+e.message, false);
  }
  btn.textContent=origText; btn.disabled=false;
}

async function refreshWallet(){
  try{
    const u=await fetch(API+'/api/users/me',{headers:{Authorization:'Bearer '+token}});
    const ud=await u.json();
    if(ud.success&&ud.data){
      currentUser=ud.data;
      const wb=document.getElementById('wallet-bal');
      if(wb) wb.textContent=String(ud.data.walletBalance??'—');
    }
  } catch(e){
    console.error('Wallet refresh failed', e);
  }
}

/* ── Init ── */
(async function(){
  await initAuth();
  loadProducts();
})();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-close-gate')?.addEventListener('click', closeGate);
  document.getElementById('btn-goto-signin')?.addEventListener('click', gotoSignin);
  
  const searchInput = document.getElementById('search-input');
  if(searchInput) {
      searchInput.addEventListener('input', () => {
        currentSearch = searchInput.value.trim();
        currentPage = 1;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => loadProducts(), 420);
      });
  }

  const sortSelect = document.getElementById('sort-select');
  if(sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      currentPage = 1;
      loadProducts();
    });
  }


  document.addEventListener('click', e => {
    if (e.target.id === 'pf-gate') { closeGate(); return; }

    if (e.target.closest('#user-avatar') || e.target.closest('#user-avatar-btn')) {
      window.location.href = 'signin.html';
      return;
    }

    const filterBtn = e.target.closest('[data-action="setCategory"]');
    if (filterBtn) {
      document.querySelectorAll('[data-action="setCategory"]').forEach(b => b.classList.remove('active'));
      filterBtn.classList.add('active');
      currentTag = filterBtn.dataset.val;
      currentPage = 1;
      loadProducts();
      return;
    }

    const priceFilterBtn = e.target.closest('[data-action="setPrice"]');
    if (priceFilterBtn) {
      document.querySelectorAll('[data-action="setPrice"]').forEach(b => b.classList.remove('active'));
      priceFilterBtn.classList.add('active');
      currentPriceFilter = priceFilterBtn.dataset.val;
      currentPage = 1;
      loadProducts();
      return;
    }

    const pagBtn = e.target.closest('.pf-pagination-btn');
    if (pagBtn) {
      currentPage = parseInt(pagBtn.dataset.page);
      loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const buyBtn = e.target.closest('[data-action="buy"]');
    if (buyBtn) {
      e.stopPropagation();
      handleBuy(buyBtn);
      return;
    }

    const detailBtn = e.target.closest('[data-action="gotoDetail"]');
    if (detailBtn) {
      window.location.href = 'prompt-detail.html?id=' + detailBtn.dataset.id;
      return;
    }
    
    const stopProp = e.target.closest('[data-action="stopProp"]');
    if (stopProp) {
      e.stopPropagation();
    }
  });
});
