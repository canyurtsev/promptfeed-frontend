let promptData = {
  "id": "6b6c8247-c6d6-4d08-b560-e3e23fc6545a",
  "userId": "2bf22d75-ccd1-498c-a0bf-5c1ba85bdee3",
  "title": "test promt",
  "description": "deneme",
  "content": "hello word",
  "category": null,
  "tags": "coding",
  "isPremium": true,
  "price": "1",
  "viewsCount": 0,
  "score": 0,
  "bookmarksCount": 0,
  "createdAt": "2026-05-04T12:23:11.352Z",
  "updatedAt": "2026-05-04T12:23:11.352Z",
  "useCases": null,
  "exampleOutput": null,
  "user": {
    "id": "2bf22d75-ccd1-498c-a0bf-5c1ba85bdee3",
    "username": "ibrahimcanyurtsev"
  },
  "product": null
};

let currentUser = {
  id: "2bf22d75-ccd1-498c-a0bf-5c1ba85bdee3",
  plan: "pro"
};

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function fmtPrice(p){
  if(!p || p==='0' || p==='0.00') return 'Free';
  const n = parseFloat(p);
  return isNaN(n) ? String(p) : '$'+n.toFixed(2);
}

function timeAgo(d){ return 'just now'; }

function renderPage(){
  const p = promptData;
  const isPaid = p.isPremium || p.isPaid || false;
  const isFree = !isPaid;
  const isOwned = p.isOwned || p.isOwner;
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
  const isSaved = Boolean(p.isSaved);

  let metricsHtml = '';

  let actionHtml = '';
  if(isOwned){
    actionHtml = "Owned";
  } else if(isPaid){
    const priceStr = p.product?.price ? fmtPrice(p.product.price) : fmtPrice(p.price);
    actionHtml = "Buy";
  }

  let html = `
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
        ${!showContent ? `Locked` : ''}
      </div>
    </main>

    <aside class="pd-sidebar">
      <div class="pd-panel" style="margin-bottom:24px">
        <div class="pd-price-row">
          <div class="pd-badge ${isFree?'pd-badge--free':'pd-badge--premium'}">${isFree?'Free':'Premium'}</div>
          <div style="font-size:24px;font-weight:800;color:var(--pf-text-primary);font-family:var(--pf-font-mono)">
            ${isPaid ? (p.product?.price ? fmtPrice(p.product.price) : fmtPrice(p.price)) : 'Free'}
          </div>
        </div>
        
        <div class="pd-actions">
          ${actionHtml}
          <div class="pd-action-row">
            ${isFree || isOwned ? `Run Prompt` : ''}
          </div>
        </div>
      </div>
    </aside>
  `;
  return html;
}

try {
  let res = renderPage();
  console.log("Success! Length:", res.length);
} catch (e) {
  console.log("Error caught:", e.message);
  console.log(e.stack);
}
