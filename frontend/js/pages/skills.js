/**
 * Skills Page Controller
 */
const API = 'http://localhost:5000';
lucide.createIcons();

async function loadSkills() {
    const grid = document.getElementById('registry-items');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align: center; padding: 4rem; color: var(--text-muted);">Loading verified architectural units...</div>';

    try {
        const res = await fetch(`${API}/api/skills`);
        if (!res.ok) throw new Error(`API response not ok: ${res.status} ${res.statusText}`);
        const body = await res.json();
        const items = (body.success && body.data) ? (body.data.skills || body.data) : [];

        if (items.length > 0) {
            renderSkills(items);
        } else {
            console.info("Truth Mode: API returned empty skills array.");
            grid.innerHTML = '<div style="text-align: center; padding: 4rem; color: var(--text-muted); font-size: 14px;">No agents found in registry.</div>';
        }
    } catch (err) {
        console.error(err);
        renderErrorState();
    }
}

function renderErrorState() {
    const container = document.getElementById('registry-items');
    if (!container) return;
    container.innerHTML = `
        <div class="text-center py-10 text-red-400" style="padding: 2.5rem 0; text-align: center; color: #ef4444;">
          Could not connect to server.
          <br/>
          <span class="text-sm text-gray-400" style="color: #9ca3af; font-size: 14px;">Please try again later.</span>
        </div>
    `;
}

function renderSkills(items) {
    const grid = document.getElementById('registry-items');
    if (!grid) return;
    grid.innerHTML = '';
    let count = 0;

    items.forEach(skill => {
        const id = encodeURIComponent(skill.id);
        const tagsStr = typeof skill.tags === 'string' ? skill.tags.split(',').join(' ') : (skill.tags || []).join(" ");
        const el = document.createElement('div');
        el.className = 'registry-item';
        el.dataset.tags = tagsStr;

        const name = skill.name || skill.title || "Agent";
        const desc = skill.description || "";
        const status = 'ONLINE';
        const statusClass = 'status--stable';
        const statusColor = 'var(--accent-green)';
        const iconColor = skill.iconColor || 'var(--accent-purple)';

        el.innerHTML = `
            <i data-lucide="${skill.icon || 'bot'}" size="20" style="color: ${iconColor}; margin-top: 4px;"></i>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <a href="skill-detail.html?id=${id}" style="font-size: 15px; font-weight: 600; color: var(--accent-blue);">${name}</a>
                <span style="font-size: 10px; padding: 1px 6px; border: 1px solid var(--border-default); border-radius: 10px; color: var(--text-muted);">${skill.version || 'Verified'}</span>
              </div>
              <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">${desc}</p>
              <div style="display: flex; gap: 1rem; align-items: center;">
                <div style="display:flex; gap: 5px;">
                  ${skill.tagRenders || '<span class="tag-badge">agent</span>'}
                </div>
                <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
                  <i data-lucide="star" size="12"></i> ${skill.stars || '0'}
                  <span style="margin: 0 4px;">•</span>
                  Updated recently
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; font-size: 11px; font-weight: 600; color: ${statusColor}; margin-bottom: 8px;">
                <span class="status-dot ${statusClass}"></span> ${status}
              </div>
              <button onclick="location.href='skill-detail.html?id=${id}'" class="btn" style="padding: 2px 10px; font-size: 11px;">Inspect Logic</button>
            </div>
           `;
        grid.appendChild(el);
        count++;
    });

    lucide.createIcons();
    const countEl = document.getElementById('result-count');
    if (countEl) countEl.textContent = count;

    // Reprocess active filter
    const activeTab = document.querySelector('.tab-item.active');
    if (activeTab) filterRegistry(activeTab.dataset.cat);
}

function filterRegistry(category) {
    const items = document.querySelectorAll('.registry-item');
    let count = 0;
    items.forEach(item => {
        const tags = item.dataset.tags;
        if (category === 'all' || tags.includes(category)) {
            item.style.display = 'flex';
            count++;
        } else {
            item.style.display = 'none';
        }
    });
    const countEl = document.getElementById('result-count');
    if (countEl) countEl.textContent = count;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    UI.injectNavigation('skills.html');
    loadSkills();

    // Tab Filtering
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const cat = tab.dataset.cat;
            filterRegistry(cat);
        };
    });

    // Search Filtering
    const searchInput = document.getElementById('agent-search');
    if (searchInput) {
        searchInput.oninput = (e) => {
            const q = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.registry-item');
            let count = 0;
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(q)) {
                    item.style.display = 'flex';
                    count++;
                } else {
                    item.style.display = 'none';
                }
            });
            const countEl = document.getElementById('result-count');
            if (countEl) countEl.textContent = count;
        };
    }
});
