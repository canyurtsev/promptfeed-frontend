/**
 * Marketplace Page Controller
 * Fetches paid prompts from GET /api/prompts/marketplace
 */
const API = 'http://localhost:5000';
lucide.createIcons();

async function loadMarket() {
    const grid = document.getElementById('market-grid');
    if (!grid) return;

    try {
        const res = await fetch(`${API}/api/prompts/marketplace?limit=24`);
        if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
        const body = await res.json();
        const prompts = body.data?.prompts || [];

        if (Array.isArray(prompts) && prompts.length > 0) {
            grid.innerHTML = '';
            prompts.forEach(p => grid.appendChild(buildProductCard(p)));
            lucide.createIcons();
        } else {
            grid.innerHTML = '<div class="market-empty">No paid prompts listed yet.</div>';
        }
    } catch (err) {
        console.error('[Marketplace] Load error:', err);
        renderErrorState();
    }
}

function renderErrorState() {
    const grid = document.getElementById('market-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="market-error">Could not connect to server. Please try again later.</div>';
}

function buildProductCard(p) {
    const el = document.createElement('article');
    el.className = 'market-card';
    el.setAttribute('data-prompt-id', p.id);

    const priceDisplay = p.price != null ? `$${parseFloat(p.price).toFixed(2)}` : 'Free';
    const authorInitial = (p.user?.username || 'A')[0].toUpperCase();
    const authorName = p.user?.username || 'unknown';
    const score = p.score || 0;
    const desc = p.description || '';

    el.innerHTML = `
        <div class="market-card__header">
            <div class="market-card__icon">
                <i data-lucide="shield-check"></i>
            </div>
            <div class="market-card__price">${priceDisplay}</div>
        </div>
        <div class="market-card__body">
            <h3 class="market-card__title">${escapeHtml(p.title)}</h3>
            <p class="market-card__desc">${escapeHtml(desc)}</p>
        </div>
        <div class="market-card__footer">
            <div class="market-card__author">
                <span class="market-card__avatar">${authorInitial}</span>
                <span class="market-card__username">@${escapeHtml(authorName)}</span>
            </div>
            <div class="market-card__votes">
                <i data-lucide="arrow-up"></i>
                <span>${score}</span>
            </div>
        </div>
    `;

    el.addEventListener('click', () => {
        window.location.href = `prompt-detail.html?id=${p.id}`;
    });

    return el;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    UI.injectNavigation('marketplace.html');
    loadMarket();
});
