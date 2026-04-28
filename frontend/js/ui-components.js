/**
 * UI Components Utility
 * Injects common Sidebar and Navbar into the DOM
 */

const UI = {
    injectNavigation(currentPage) {
        this.injectNavbar(currentPage);
        this.injectSidebar(currentPage);
        lucide.createIcons();
    },

    injectNavbar(currentPage) {
        const header = document.querySelector('.pf-header');
        if (!header) return;

        header.innerHTML = `
            <div class="pf-header__left">
              <a href="index.html" class="pf-logo">
                <i data-lucide="terminal" style="color: var(--accent-purple)"></i>
                <span>PromptFeed</span>
              </a>
              <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
                <span class="pf-badge badge-quality" style="font-size: 9px;">PROD READY</span>
                <span class="pf-badge badge-efficiency" style="font-size: 9px;">PHASE 6 VERIFIED</span>
              </div>
            </div>
            <div class="pf-header__right">
              <div class="pf-search">
                <i data-lucide="search" size="14" style="color: var(--text-muted)"></i>
                <input placeholder="Search prompts, skills, workflows..." type="text" />
              </div>
              <div id="auth-section" style="display: flex; gap: 0.5rem; align-items: center;">
                <!-- Auth status injected by auth.js -->
              </div>
              <button onclick="location.href='skill-editor.html'" class="btn btn-primary" style="padding: 4px 12px; font-size: 12px;">Publish</button>
            </div>
        `;
    },

    injectSidebar(currentPage) {
        const body = document.body;
        const main = document.querySelector('.pf-main');
        if (!main) return;

        // Check if sidebar already exists
        if (document.querySelector('.pf-sidebar')) return;

        const sidebar = document.createElement('aside');
        sidebar.className = 'pf-sidebar';

        const navGroups = [
            {
                label: 'Explore',
                items: [
                    { icon: 'rss', label: 'Feed', href: 'community.html' },
                    { icon: 'messages-square', label: 'Discussions', href: '#' },
                    { icon: 'file-text', label: 'Articles', href: '#' },
                    { icon: 'help-circle', label: 'Questions', href: '#' }
                ]
            },
            {
                label: 'Build',
                items: [
                    { icon: 'code-2', label: 'Prompts', href: 'community.html' },
                    { icon: 'library', label: 'Skills Library', href: 'skill-library.html' },
                    { icon: 'workflow', label: 'Workflows', href: '#' },
                    { icon: 'bar-chart-3', label: 'Benchmarks', href: 'benchmarks.html' }
                ]
            },
            {
                label: 'Earn',
                items: [
                    { icon: 'shopping-cart', label: 'Marketplace', href: 'marketplace.html' },
                    { icon: 'target', label: 'Bounties', href: 'bounty-board.html' }
                ]
            },
            {
                label: 'Account',
                items: [
                    { icon: 'user', label: 'Profile', href: '#' },
                    { icon: 'line-chart', label: 'Analytics', href: '#' },
                    { icon: 'settings', label: 'Settings', href: '#' }
                ]
            }
        ];

        let html = '';
        navGroups.forEach(group => {
            html += `<div class="sidebar-group">
                <div class="sidebar-label">${group.label}</div>`;
            group.items.forEach(item => {
                const isActive = currentPage === item.href || (item.label === 'Prompts' && currentPage === 'community.html');
                html += `
                    <a href="${item.href}" class="sidebar-item ${isActive ? 'active' : ''}">
                        <i data-lucide="${item.icon}" size="16"></i>
                        <span>${item.label}</span>
                    </a>
                `;
            });
            html += `</div>`;
        });

        sidebar.innerHTML = html;
        main.insertBefore(sidebar, main.firstChild);

        // Wrap existing content in pf-content if not already
        const existingContent = main.querySelectorAll(':scope > *:not(.pf-sidebar)');
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'pf-content';
        existingContent.forEach(node => contentWrapper.appendChild(node));
        main.appendChild(contentWrapper);
    }
};

// Export to window
window.UI = UI;
