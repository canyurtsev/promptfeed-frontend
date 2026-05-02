/* ================================================================
   marketplace.html — Page Controller
   No shared backend or payment client.
   Uses GET /api/marketplace/products + POST /api/marketplace/purchase
   Decimal string prices safe. requestId in error messages.
   ================================================================ */
const API   = 'http://localhost:5000';
const token = localStorage.getItem('accessToken');
let currentUser = null;
let activeTab   = 'featured';
let activeCategory = '';
let activePriceFilter = '';
let searchTimer = null;

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
          id="user-avatar-btn"></div>`;
      if(plan==='free') showAds();
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



/* ── Filter Controls ── */
function setCategory(el, cat){
  activeCategory=cat;
  document.querySelectorAll('[data-cat]').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  activePriceFilter='';
  document.querySelectorAll('[data-price]').forEach(b=>b.classList.remove('active'));
  loadProducts();
}
function setPrice(el, pf){
  activePriceFilter=(activePriceFilter===pf)?'':pf;
  document.querySelectorAll('[data-price]').forEach(b=>b.classList.remove('active'));
  if(activePriceFilter) el.classList.add('active');
  loadProducts();
}


/* ── Render Card ── */
function renderCard(p){
  const isFree=(p.price==='0'||p.price==='0.00'||!p.price);
  const priceStr=fmtPrice(p.price);
  const author=p.seller?.username||p.sellerName||p.user?.username||'unknown';
  const rating=p.avgRating||p.rating;
  const sales=p.salesCount||p.downloads||0;
  const effScore=p.efficiencyScore??p.prompt?.efficiencyScore;
  const avgTok=p.avgTokens??p.prompt?.avgTokens;
  const avgCost=p.avgCost??p.prompt?.avgCost;

  const metricHtml = (effScore||avgTok||avgCost)
    ? `<div class="mk-metrics">
        ${effScore?`<span class="mk-metric">⚡ <span>${Number(effScore).toFixed(1)}</span> eff</span>`:''}
        ${avgTok?`<span class="mk-metric">🪙 <span>${avgTok}</span> tok</span>`:''}
        ${avgCost?`<span class="mk-metric">💲 <span>$${avgCost}</span></span>`:''}
      </div>`
    : `<span style="font-size:11px;color:var(--pf-text-muted)">Not benchmarked yet</span>`;

  return `
  <div class="mk-card" data-action="gotoDetail" data-id="${esc(p.promptId||p.id)}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
      <div class="mk-card__title">${esc(p.title||p.prompt?.title||'Untitled')}</div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        <span class="mk-badge ${isFree?'mk-badge--free':'mk-badge--premium'}">${isFree?'Free':'Premium'}</span>
        ${p.featured||p.isFeatured?'<span class="mk-badge mk-badge--featured">Featured</span>':''}
      </div>
    </div>
    <div class="mk-card__desc">${esc(p.description||p.prompt?.description||'')}</div>
    <div class="mk-card__meta">
      <span>by <strong style="color:var(--pf-text-secondary)">${esc(author)}</strong></span>
      ${rating?`<span>• ⭐ ${Number(rating).toFixed(1)}</span>`:''}
      ${sales?`<span>• ${sales} sold</span>`:''}
      ${p.category?`<span>• ${esc(p.category)}</span>`:''}
    </div>
    ${metricHtml}
    <div class="mk-card__footer" data-action="stopProp">
      <div class="mk-card__price">${esc(priceStr)}</div>
      <div style="display:flex;gap:8px">
        <button class="pf-btn pf-btn--ghost" style="font-size:12px;padding:5px 12px"
          data-action="gotoDetail" data-id="${esc(p.promptId||p.id)}">Details</button>
        ${!isFree?`<button class="pf-btn pf-btn--primary" style="font-size:12px;padding:5px 12px"
          data-action="buy" data-id="${esc(p.id)}" data-title="${esc(p.title||'')}" data-price="${esc(String(p.price||'0'))}">Buy</button>`
          :`<button class="pf-btn pf-btn--ghost" style="font-size:12px;padding:5px 12px;color:var(--pf-success);border-color:var(--pf-success)"
          data-action="gotoDetail" data-id="${esc(p.promptId||p.id)}">Get Free</button>`}
      </div>
    </div>
  </div>`;
}

/* ── Load Products ── */
async function loadProducts(){
  const el=document.getElementById('products-container');
  const cnt=document.getElementById('product-count');
  el.innerHTML='<div class="pf-loading" style="grid-column:1/-1"><div class="pf-spinner"></div></div>';
  cnt.textContent='';

  try{
    const p=new URLSearchParams();
    if(activeCategory) p.set('category',activeCategory);
    if(activePriceFilter==='free') p.set('free','true');
    if(activePriceFilter==='premium') p.set('premium','true');
    const tab=activeTab;
    if(tab==='latest') p.set('sort','newest');
    else if(tab==='popular') p.set('sort','popular');
    const q=document.getElementById('search-input').value.trim();
    if(q) p.set('search',q);
    const sort=document.getElementById('sort-select').value;
    if(sort&&sort!=='popular') p.set('sort',sort);

    const headers={};
    if(token) headers['Authorization']='Bearer '+token;

    const r=await fetch(API+'/api/marketplace/products?'+p,{headers});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const d=await r.json();
    if(!d.success) throw new Error(d.message||'API error');

    let items=d.data?.products||d.data||[];

    // Client-side tab filtering
    if(tab==='prompts') items=items.filter(i=>(i.type||'prompt')==='prompt');
    else if(tab==='skills') items=items.filter(i=>i.type==='skill');
    else if(tab==='workflows') items=items.filter(i=>i.type==='workflow');
    else if(tab==='featured') items=items.filter(i=>i.featured||i.isFeatured).concat(items.filter(i=>!i.featured&&!i.isFeatured)).slice(0,20);

    cnt.textContent=items.length+' listing'+(items.length!==1?'s':'');

    if(!items.length){
      el.innerHTML=`<div class="pf-empty-state" style="grid-column:1/-1">
        <div class="pf-empty-state__icon">🔍</div>
        <h3>No marketplace products found</h3>
        <p>Try adjusting your filters or check back later.</p>
      </div>`;
      return;
    }
    el.innerHTML=items.map(renderCard).join('');
  } catch(e){
    el.innerHTML=`<div class="pf-empty-state" style="grid-column:1/-1">
      <div class="pf-empty-state__icon">⚠️</div>
      <h3>Could not load marketplace</h3>
      <p style="color:var(--pf-danger);font-size:12px">${esc(e.message)}</p>
      <p style="margin-top:8px;font-size:12px;color:var(--pf-text-muted)">Ensure backend is running: <code>npm run dev</code></p>
    </div>`;
    cnt.textContent='';
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
      // Refresh wallet balance
      try{
        const u=await fetch(API+'/api/users/me',{headers:{Authorization:'Bearer '+token}});
        const ud=await u.json();
        if(ud.success&&ud.data){
          currentUser=ud.data;
          const wb=document.getElementById('wallet-bal');
          if(wb) wb.textContent=String(ud.data.walletBalance??'—');
        }
      } catch{}
    } else {
      toast('⚠ Purchase failed: '+(d.message||'Unknown error')+rid, false);
    }
  } catch(e){
    toast('⚠ Connection error: '+e.message, false);
  }
  btn.textContent=origText; btn.disabled=false;
}


/* ── Tabs ── */
document.querySelectorAll('.pf-feed-tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.pf-feed-tab').forEach(b=>{
      b.classList.remove('active'); b.setAttribute('aria-selected','false');
    });
    btn.classList.add('active'); btn.setAttribute('aria-selected','true');
    activeTab=btn.dataset.tab;
    loadProducts();
  });
});

/* ── Search ── */
document.getElementById('search-input').addEventListener('input',e=>{
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>loadProducts(),420);
});

/* ── Init ── */
(async function(){
  await initAuth();
  loadProducts();
})();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-close-gate')?.addEventListener('click', closeGate);
  document.getElementById('btn-goto-signin')?.addEventListener('click', gotoSignin);
  
  const sortSelect = document.getElementById('sort-select');
  if(sortSelect) sortSelect.addEventListener('change', loadProducts);

  document.addEventListener('click', e => {
    if (e.target.id === 'pf-gate') { closeGate(); return; }

    if (e.target.closest('#user-avatar') || e.target.closest('#user-avatar-btn')) {
      window.location.href = 'signin.html';
      return;
    }

    const setCatBtn = e.target.closest('[data-action="setCategory"]');
    if (setCatBtn) {
      setCategory(setCatBtn, setCatBtn.dataset.val);
      return;
    }

    const setPriceBtn = e.target.closest('[data-action="setPrice"]');
    if (setPriceBtn) {
      setPrice(setPriceBtn, setPriceBtn.dataset.val);
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
      // Let the click die here so the card isn't clicked
    }
  });
});


