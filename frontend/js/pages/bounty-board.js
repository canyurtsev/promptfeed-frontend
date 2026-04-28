/**
 * Bounty Board Page Controller
 */
const API = 'http://localhost:5000';
lucide.createIcons();

async function loadBounties() {
    const grid = document.getElementById('bounty-grid');
    if (!grid) return;

    try {
        const res = await fetch(`${API}/api/bounties`);
        const body = await res.json();
        const items = body.data || [];

        if (items.length) {
            grid.innerHTML = '';
            items.forEach(b => grid.appendChild(buildBountyRow(b)));
            lucide.createIcons();
        } else {
            console.info("Truth Mode: API returned empty bounty array.");
            grid.innerHTML = '<div style="text-align: center; padding: 4rem; color: var(--text-muted); font-size: 13px;">Zero active bounties matching the filter.</div>';
        }
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<div style="text-align: center; padding: 4rem; color: #ef4444; font-size: 13px;">Sync error: Could not reach bounty stream.</div>';
    }
}

function buildBountyRow(b) {
    const el = document.createElement('div');
    el.className = "bounty-row";

    el.innerHTML = `
        <i data-lucide="circle-dot" size="16" style="color: var(--accent-green); margin-top: 2px;"></i>
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <h3 style="font-size: 15px; color: var(--text-white);">${b.title}</h3>
            <span class="status-badge open">Active</span>
          </div>
          <div style="font-size: 11px; color: var(--text-secondary);">
            #${b.id} opened ${timeAgo(b.createdAt || new Date())} by <span style="font-weight: 600;">@architect</span>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 600; color: var(--text-white); font-size: 15px;">$${b.reward || '100'}</div>
          <div style="font-size: 11px; color: var(--accent-blue); margin-top: 4px;">Submit solution »</div>
        </div>
      `;
    return el;
}

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return `just now`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    loadBounties();
});
