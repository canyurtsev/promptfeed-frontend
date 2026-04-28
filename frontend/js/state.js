/**
 * PromptFeed State Module
 * window.appState is a UI cache only. Backend is the source of truth.
 */
window.appState = {
    user: null,
    wallet: {
        balance: 0,
        totalEarnings: 0,
        totalSpent: 0
    },
    library: [], // Array of productIds
    isLoaded: false
};

const State = {
    /**
     * Sync all state from backend
     */
    async sync() {
        if (!Auth.isLoggedIn()) return;

        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                headers: Auth.headers()
            });
            const data = await res.json();

            if (data.success) {
                const u = data.data;
                window.appState.user = {
                    id: u.id,
                    username: u.username,
                    email: u.email,
                    role: u.role
                };
                // Decimal objects from Prisma serialize to strings, convert to Number for UI balance if needed
                window.appState.wallet = {
                    balance: parseFloat(u.wallet?.balance || 0),
                    totalEarnings: parseFloat(u.wallet?.totalEarnings || 0),
                    totalSpent: parseFloat(u.wallet?.totalSpent || 0)
                };
                window.appState.library = (u.ownerships || []).map(o => o.productId);
                window.appState.isLoaded = true;

                // Broadcast update
                window.dispatchEvent(new CustomEvent('appstate:updated', { detail: window.appState }));
                console.log('[State] UI cache synchronized from backend.');

                // Auto-update common elements
                this.updateHeader();
            }
        } catch (err) {
            console.error('[State] Failed to sync state:', err);
        }
    },

    /**
     * Update header wallet balance & profile
     */
    updateHeader() {
        const authSection = document.getElementById('auth-section');

        if (Auth.isLoggedIn() && window.appState.isLoaded) {
            if (authSection) {
                authSection.innerHTML = `
                  <div style="display: flex; align-items: center; gap: 12px; margin-right: 8px;">
                    <div style="display: flex; flex-direction: column; align-items: flex-end;">
                      <span style="font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Balance</span>
                      <span id="header-balance" style="font-size: 13px; color: var(--accent-green); font-weight: 700;">$${window.appState.wallet.balance.toFixed(2)}</span>
                    </div>
                    <div style="width: 32px; height: 32px; border-radius: 6px; background: var(--bg-surface); border: 1px solid var(--border-default); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer;" onclick="Auth.logout()" title="Click to Logout">
                      ${(window.appState.user.username || 'U')[0].toUpperCase()}
                    </div>
                  </div>
                `;
            }
        }
    },

    /**
     * Check if current user owns a product
     */
    isOwned(productId) {
        return window.appState.library.includes(productId);
    }
};

// Auto-sync on load if logged in
if (Auth.isLoggedIn()) {
    State.sync();
}
