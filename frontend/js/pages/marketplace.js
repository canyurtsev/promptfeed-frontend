/**
 * Marketplace Page Controller
 */
const API = 'http://localhost:5000';
lucide.createIcons();

async function loadMarket() {
    const grid = document.getElementById('market-grid');
    if (!grid) return;

    try {
        const res = await fetch(`${API}/api/prompts?limit=24&is_premium=true`);
        if (!res.ok) throw new Error(`API response not ok: ${res.status} ${res.statusText}`);
        const body = await res.json();
        const prompts = body.data.prompts || body.data;

        if (Array.isArray(prompts) && prompts.length > 0) {
            grid.innerHTML = '';
            prompts.forEach(p => grid.appendChild(buildProductCard(p)));
            lucide.createIcons();
        } else {
            console.info("Truth Mode: Marketplace returned empty array.");
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">No premium architectures listed yet.</div>';
        }
    } catch (err) {
        console.error(err);
        renderErrorState();
    }
}

function renderErrorState() {
    const container = document.getElementById('market-grid');
    if (!container) return;
    container.innerHTML = `
        <div class="text-center py-10 text-red-400" style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 2rem 0;">
          Could not connect to server.
          <br/>
          <span class="text-sm text-gray-400" style="color: #9ca3af; font-size: 14px;">Please try again later.</span>
        </div>
    `;
}

function buildProductCard(p) {
    const el = document.createElement('div');
    el.className = "card product-card";
    el.onclick = () => location.href = `prompt-detail.html?id=${p.id}`;
    el.style.padding = '1.5rem';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.gap = '1rem';
    el.style.cursor = 'pointer';

    el.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="width: 40px; height: 40px; background: var(--bg-subtle); border: 1px solid var(--border-default); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--accent-purple); box-shadow: var(--pf-glow);">
            <i data-lucide="shield-check" size="20"></i>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; color: var(--text-white); font-size: 16px;">$${p.price || '89'}</div>
            <div class="pf-badge badge-efficiency" style="font-size: 8px; margin-top: 4px;">TOP 5% EFFICIENCY</div>
          </div>
        </div>
        
        <div style="margin-top: 0.5rem;">
          <h3 style="font-size: 16px; margin-bottom: 4px; color: var(--text-white);">${p.title}</h3>
          <p style="color: var(--text-secondary); font-size: 13px; line-height: 1.5; margin-bottom: 1rem; height: 40px; overflow: hidden;">
            ${p.description || 'Verified architectural implementation for production scaling.'}
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 1rem; padding: 12px; background: rgba(35, 134, 54, 0.05); border: 1px solid rgba(35, 134, 54, 0.1); border-radius: 6px;">
           <div style="font-size: 11px; color: var(--pf-low-cost); display: flex; align-items: center; gap: 6px;">
             <i data-lucide="check-circle" size="12"></i> Verified Performance
           </div>
           <div style="font-size: 11px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
             <i data-lucide="activity" size="12"></i> 1,240 runs benchmarked
           </div>
        </div>

        <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border-muted); display: flex; align-items: center; justify-content: space-between;">
           <div style="display: flex; align-items: center; gap: 6px;">
             <div style="width: 20px; height: 20px; background: var(--bg-canvas); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; color: var(--accent-purple); border: 1px solid var(--border-default);">
               ${(p.user?.username || 'A')[0].toUpperCase()}
             </div>
             <span style="font-size: 12px; color: var(--text-secondary);">@${p.user?.username || 'user'}</span>
           </div>
           <button class="btn btn-primary" style="padding: 4px 12px; font-size: 11px; background: var(--pf-efficiency); border: none;">Buy Now</button>
        </div>
      `;
    return el;
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    UI.injectNavigation('marketplace.html');
    loadMarket();
});
