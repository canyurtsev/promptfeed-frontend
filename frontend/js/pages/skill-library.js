/**
 * Skill Library Page Controller
 */
const API = 'http://localhost:5000';

async function loadSkillLibrary() {
    const grid = document.getElementById('skill-library-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">Syncing verified modules...</div>';

    try {
        const res = await fetch(`${API}/api/skills`);
        if (!res.ok) throw new Error(`API response not ok: ${res.status} ${res.statusText}`);
        const body = await res.json();
        const skills = (body.success && body.data) ? (body.data.skills || body.data) : [];

        if (skills.length > 0) {
            grid.innerHTML = '';
            skills.forEach(skill => {
                const el = document.createElement('div');
                el.className = 'card skill-card';
                el.onclick = () => location.href = `skill-detail.html?id=${skill.id}`;

                const tags = typeof skill.tags === 'string' ? skill.tags.split(',') : (skill.tags || []);
                const downloads = skill.downloads || Math.floor(800 + Math.random() * 500);

                el.innerHTML = `
                    <div style="margin-bottom: 1rem;">
                      <h3 style="font-size: 1.15rem; margin-bottom: 4px; color: var(--text-white);">${skill.title || skill.name}</h3>
                      <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem; height: 40px; overflow: hidden;">
                        ${skill.description || 'Detects hidden logic flaws in backend workflows and AI pipelines.'}
                      </p>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 1.5rem;">
                      <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: var(--text-muted);">Type:</span>
                        <span style="color: var(--text-primary); font-family: var(--mono);">skill.md</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: var(--text-muted);">Category:</span>
                        <span style="color: var(--text-primary);">${skill.category || 'Security'}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: var(--text-muted);">Downloads:</span>
                        <span style="color: var(--text-primary);">${downloads.toLocaleString()}</span>
                      </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                      <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">Compatible with:</div>
                      <div style="font-size: 12px; color: var(--accent-purple); font-weight: 600;">
                        Antigravity • Cursor • Claude Code
                      </div>
                    </div>

                    <div style="margin-top: auto; display: flex; gap: 8px;">
                       <button class="btn btn-ghost" style="flex: 1; padding: 6px; font-size: 11px;" onclick="location.href='skill-detail.html?id=${skill.id}'">View</button>
                       <button class="btn" style="flex: 1; padding: 6px; font-size: 11px;">Copy</button>
                       <button class="btn" style="flex: 1; padding: 6px; font-size: 11px; border-color: var(--pf-efficiency); color: var(--pf-efficiency);">Download</button>
                    </div>
                `;
                grid.appendChild(el);
            });
            lucide.createIcons();
        } else {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">No verified modules found in library.</div>';
        }
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: #ef4444;">Failed to sync skill library.</div>';
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    UI.injectNavigation('skill-library.html');
    loadSkillLibrary();
});
