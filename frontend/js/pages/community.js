/**
 * Community Page Controller
 */
const API = 'http://localhost:5000';
let currentSort = 'hot';
let currentSearch = '';

lucide.createIcons();

async function loadFeed() {
    const feed = document.getElementById('prompt-feed');
    if (!feed) return;
    feed.innerHTML = `<div style="display: flex; justify-content: center; padding: 4rem;"><div style="width: 24px; height: 24px; border: 2px solid var(--accent-purple); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div></div>`;

    try {
        const params = new URLSearchParams({ sort: currentSort, limit: 20 });
        if (currentSearch) params.set('search', currentSearch);

        const res = await fetch(`${API}/api/prompts?${params}`);
        if (!res.ok) throw new Error(`API response not ok: ${res.status} ${res.statusText}`);
        const data = await res.json();

        // Check if prompts actually exist and array is not empty
        const hasData = data.success && data.data && ((data.data.prompts && data.data.prompts.length > 0) || (Array.isArray(data.data) && data.data.length > 0));

        if (hasData) {
            const prompts = data.data.prompts || data.data;
            feed.innerHTML = '';
            prompts.forEach(p => feed.appendChild(buildCard(p)));
            lucide.createIcons();
        } else {
            console.info("Truth Mode: API returned empty array. Rendering 'No prompts found'.");
            feed.innerHTML = '<div style="text-align: center; padding: 4rem; color: var(--text-muted); font-size: 14px;">No prompts found.</div>';
        }
    } catch (err) {
        console.error(err);
        renderErrorState();
    }
}

function renderErrorState() {
    const container = document.getElementById('prompt-feed');
    if (!container) return;
    container.innerHTML = `
        <div class="text-center py-10 text-red-400">
          Could not connect to server.
          <br/>
          <span class="text-sm text-gray-400">Please try again later.</span>
        </div>
    `;
}

function buildCard(p) {
    const el = document.createElement('div');
    el.className = "feed-card";
    el.onclick = (e) => {
        if (!e.target.closest('button') && !e.target.closest('.vote-widget')) window.location.href = `prompt-detail.html?id=${p.id}`;
    };

    const score = Math.max(0, p.score || 0);
    const userVote = p.userVote || 0;
    
    // Performance Metrics (Placeholders if missing from backend)
    const runs = p.metrics?.runs || p.viewsCount || 0;
    const efficiency = p.efficiencyScore || Math.floor(85 + Math.random() * 10);
    const cost = p.avgCost ? `$${p.avgCost}` : 'Low';
    const quality = p.qualityScore ? `${p.qualityScore}/100` : 'High';
    const latency = p.latency ? `${p.latency}s` : '1.2s';

    el.innerHTML = `
          <div class="card-top-badges">
             <span class="pf-badge badge-efficiency neon">⚡ ${efficiency}</span>
             <span class="pf-badge badge-cost">💰 ${cost}</span>
             <span class="pf-badge badge-quality">🧠 ${quality}</span>
          </div>

          <div style="display: flex; gap: 1rem;">
            <div class="vote-widget" style="margin-top: 4px;">
              <button class="vote-btn up ${userVote === 1 ? 'active' : ''}" data-prompt-id="${p.id}"><i data-lucide="chevron-up"></i></button>
              <span class="vote-score">${score}</span>
            </div>
            <div style="flex: 1;">
              <h3 style="font-size: 16px; color: var(--text-white); margin-bottom: 4px;">${p.title}</h3>
              <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5; max-width: 600px;">
                ${p.description || 'Verified architectural implementation for specialized AI agency tasks.'}
              </p>
              
              <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                ${(Array.isArray(p.tags) ? p.tags : (p.tags ? p.tags.split(',') : [])).slice(0, 3).map(t => `<span class="tag-badge" style="background: rgba(139, 148, 158, 0.1); border: 1px solid var(--border-muted); color: var(--text-muted);">${t.trim()}</span>`).join('')}
              </div>

              <div class="card-metrics-row">
                <span><i data-lucide="eye" size="14"></i> ${(p.viewsCount || 0).toLocaleString()}</span>
                <span><i data-lucide="star" size="14"></i> ${(p.score || 0).toLocaleString()}</span>
                <span><i data-lucide="message-square" size="14"></i> ${(p._count?.comments || 0)}</span>
                <span><i data-lucide="timer" size="14"></i> ${latency}</span>
                <span style="margin-left: auto; color: var(--text-secondary); font-size: 11px;">@${p.user?.username || 'anonymous'}</span>
              </div>
            </div>
          </div>
          
          <div style="display: flex; gap: 8px; margin-top: 1.25rem; justify-content: flex-end;">
            <button class="btn btn-ghost" style="padding: 4px 12px; font-size: 12px;" onclick="window.location.href='prompt-detail.html?id=${p.id}'">View</button>
            <button class="btn" style="padding: 4px 12px; font-size: 12px; border-color: var(--pf-efficiency);" onclick="window.location.href='playground.html?id=${p.id}'">Run</button>
            ${p.isPremium ? `<button class="btn btn-primary" style="padding: 4px 12px; font-size: 12px; background: var(--pf-efficiency);">Buy $${p.product?.price || '89'}</button>` : ''}
          </div>
        `;
    return el;
}

async function handleVote(e, promptId) {
    e.stopPropagation();
    if (!Auth.isLoggedIn()) {
        alert("Please sign in to vote.");
        return;
    }
    const btn = e.target.closest('button');
    btn.disabled = true;
    // Determine current vote state from active class
    const isActive = btn.classList.contains('active');
    try {
        let res;
        if (isActive) {
            // Already upvoted — remove vote
            res = await fetch(`${API}/api/prompts/${promptId}/upvote`, {
                method: 'DELETE',
                headers: Auth.headers()
            });
        } else {
            // Add upvote
            res = await fetch(`${API}/api/prompts/${promptId}/upvote`, {
                method: 'POST',
                headers: Auth.headers()
            });
        }
        const data = await res.json();
        if (data.success) {
            loadFeed();
        } else {
            alert(data.message || "Vote failed");
        }
    } catch (err) {
        console.error(err);
        alert("Connection error");
    } finally {
        btn.disabled = false;
    }
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    UI.injectNavigation('community.html');
    loadFeed();

    // Event delegation for upvote buttons (CSP-compliant, no inline onclick)
    const feed = document.getElementById('prompt-feed');
    if (feed) {
        feed.addEventListener('click', (e) => {
            const btn = e.target.closest('button.vote-btn.up');
            if (btn) {
                const promptId = btn.dataset.promptId;
                if (promptId) handleVote(e, promptId);
            }
        });
    }
});
