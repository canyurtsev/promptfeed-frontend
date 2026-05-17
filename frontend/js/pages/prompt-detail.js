/**
 * Prompt Detail Page Controller
 */
const API = 'http://localhost:5000';
const params = new URLSearchParams(window.location.search);
const promptId = params.get('id');

lucide.createIcons();

let currentUserVote = 0;

async function loadDetail() {
    if (!promptId) return;
    try {
        const res = await fetch(`${API}/api/prompts/${promptId}`);
        const data = await res.json();

        if (data.success) {
            const p = data.data;
            document.getElementById('repo-title').textContent = p.title;
            document.getElementById('prompt-desc').textContent = p.description || 'No description provided.';
            document.getElementById('prompt-content').textContent = p.content;
            document.getElementById('author-name').textContent = p.user?.username || 'architect';
            document.getElementById('vote-score').textContent = Math.max(0, p.score || 0);
            document.getElementById('stat-forks').textContent = p.bookmarksCount || 0;
            document.title = `${p.title} · PromptFeed Architecture`;

            currentUserVote = p.userVote || 0;
            document.getElementById('vote-up').classList.toggle('active', currentUserVote === 1);

            // Time Ago in header
            const timeAgoHeader = document.getElementById('time-ago-header');
            if (timeAgoHeader) timeAgoHeader.textContent = timeAgo(p.createdAt);

            // Performance Profile
            if (p.metrics) {
                document.getElementById('perf-tokens').textContent = p.metrics.avgTokens || '--';
                document.getElementById('perf-success').textContent = p.metrics.successRate ? `${p.metrics.successRate}%` : '--';
            }

            // Handle Run / Buy button based on isPaid (isPremium) flag
            const runBtn = document.getElementById('btn-run');
            const buyBtn = document.getElementById('btn-buy');
            const isPaid = p.isPremium || false;

            if (isPaid) {
                // Show Buy Prompt button
                if (runBtn) runBtn.style.display = 'none';
                if (buyBtn) {
                    const priceLabel = p.product?.price
                        ? ` — $${parseFloat(p.product.price).toFixed(2)}`
                        : (p.price ? ` — $${parseFloat(p.price).toFixed(2)}` : '');
                    buyBtn.textContent = `Buy Prompt${priceLabel}`;
                    buyBtn.style.display = '';
                    if (p.product) {
                        buyBtn.addEventListener('click', () => handlePurchase(p.product.id));
                        updatePurchaseUI(p.product.id);
                    }
                }
            } else {
                // Show Run Prompt button
                if (buyBtn) buyBtn.style.display = 'none';
                if (runBtn) {
                    runBtn.style.display = '';
                    runBtn.addEventListener('click', () => {
                        window.location.href = `playground.html?id=${promptId}`;
                    });
                }
            }
        } else {
            throw new Error("Prompt not found");
        }
    } catch (err) {
        console.error('Failed to load detail:', err);
        renderErrorState();
    }
}

function renderErrorState() {
    const container = document.querySelector('.file-container');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-10 text-red-400" style="text-align: center; padding: 4rem; color: #ef4444;">
              Could not connect to server or prompt not found.
              <br/>
              <span class="text-sm text-gray-400" style="color: #9ca3af; font-size: 14px;">Please try again later.</span>
            </div>
          `;
    }
}

async function handleDetailVote() {
    if (!Auth.isLoggedIn()) {
        alert("Please sign in to vote.");
        return;
    }
    const btn = document.getElementById('vote-up');
    btn.disabled = true;
    try {
        let res;
        if (currentUserVote === 1) {
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
            await loadDetail();
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

async function handlePurchase(productId) {
    if (!Auth.isLoggedIn()) {
        alert("Please sign in to purchase.");
        return;
    }

    const btn = document.getElementById('btn-buy');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
        const res = await fetch(`${API}/api/marketplace/purchase`, {
            method: 'POST',
            headers: Auth.headers(),
            body: JSON.stringify({ productId })
        });
        const data = await res.json();

        if (data.success) {
            alert("Purchase successful!");
            console.log('[Purchase] Success:', data.data);
            // BACKEND-FIRST SYNC: Refresh state from server
            await State.sync();
            updatePurchaseUI(productId);
        } else {
            alert(data.message || "Purchase failed.");
        }
    } catch (err) {
        console.error('[Purchase] Error:', err);
        alert("Connection error.");
    } finally {
        btn.disabled = false;
        btn.textContent = 'Buy Now';
    }
}

function updatePurchaseUI(productId) {
    const buyBtn = document.getElementById('btn-buy');
    const ownedBadge = document.getElementById('owned-badge');

    if (State.isOwned(productId)) {
        buyBtn.style.display = 'none';
        ownedBadge.style.display = 'block';
    } else {
        buyBtn.style.display = 'block';
        ownedBadge.style.display = 'none';
    }
}

function timeAgo(date) {
    if (!date) return 'unknown';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (isNaN(seconds)) return 'some time ago';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    UI.injectNavigation('prompt-detail.html');
    loadDetail();

    // Upvote button click handler
    document.getElementById('vote-up').addEventListener('click', handleDetailVote);

    window.addEventListener('appstate:updated', () => {
        // Find existing product UI if any
        const buyBtn = document.getElementById('btn-buy');
        if (buyBtn && buyBtn.dataset.productId) {
            updatePurchaseUI(buyBtn.dataset.productId);
        } else {
            // Re-check after a short delay since we might still be loading the initial detail
            setTimeout(() => {
                const buyBtn = document.getElementById('btn-buy');
                // Note: We'd need to store the productId somewhere on the btn or a global.
                // For now, loadDetail sets it.
            }, 100);
        }
    });
});
