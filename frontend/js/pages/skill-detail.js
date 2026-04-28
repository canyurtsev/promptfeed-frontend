/**
 * Skill Detail Page Controller
 */
const API_BASE = 'http://localhost:5000';
const params = new URLSearchParams(window.location.search);
const skillId = params.get('id');

// SAFE MODE ONLY: Fallback Data Setup
const fallbackSkill = {
    title: "SQL Analyzer (Fallback)",
    description: "Sample fallback skill loaded because the backend connection timed out or is inaccessible.",
    category: "DATABASE",
    readme: "> The connection to the registry failed. This is a cached representation of the skill to prevent workflow interruption.\n\n### Usage\nThis agent is designed to inspect SQL queries.",
    system_prompt: "You are an SQL analyzer. Provide explanations for SQL query performance."
};

function init() {
    if (!skillId) {
        showError("Invalid skill ID. No target identified.");
        return;
    }
    loadSkill();
}

function showError(msg) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    const errorEl = document.getElementById('error');
    if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.innerText = msg;
    }
    console.error(msg);
}

async function loadSkill() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const content = document.getElementById('content');

    console.log("Fetching skill:", skillId);

    try {
        const res = await fetch(`${API_BASE}/api/skills/${skillId}`);

        if (!res.ok) {
            throw new Error("Failed to fetch skill - Server returned " + res.status);
        }

        const resBody = await res.json();
        const data = resBody.data || resBody;

        renderSkill(data, { isFallback: false });

        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';

        loadRelated();

    } catch (err) {
        console.warn("API down, using fallback");
        console.error(err);

        if (loading) loading.style.display = 'none';
        if (error) {
            error.style.display = 'block';
            error.innerText = "Connection lost. Using safety fallback data.";
        }
        if (content) content.style.display = 'block';

        renderSkill(fallbackSkill, { isFallback: true });
    }
}

function renderSkill(skill, options = { isFallback: false }) {
    document.title = `${skill.title || skill.name || 'Agent'} — PromptFeed`;

    const titleEl = document.getElementById('title');
    const descEl = document.getElementById('description');
    const catEl = document.getElementById('skill-category');
    const badgeEl = document.getElementById('demo-badge');

    if (titleEl) titleEl.innerText = skill.title || skill.name || "Untitled Module";
    if (descEl) descEl.innerText = skill.description || "No description provided.";
    if (catEl) catEl.innerText = skill.category || "GENERAL";

    if (badgeEl) {
        badgeEl.style.display = options.isFallback ? 'inline-block' : 'none';
    }

    const readmeBox = document.getElementById('skill-readme');
    if (readmeBox && typeof marked !== 'undefined') {
        readmeBox.innerHTML = marked.parse(skill.readme || skill.instructions || '// No detailed documentation provided.');
    }

    const deployBtn = document.getElementById('deploy-skill-btn');
    if (deployBtn) {
        deployBtn.onclick = () => {
            const logicContent = skill.system_prompt || skill.prompt_logic || skill.instructions || skill.readme || '// No logic block found';
            localStorage.setItem('pf_skill_content', logicContent);
            location.href = 'playground.html?action=import_skill';
        };
    }
}

async function loadRelated() {
    const cont = document.getElementById('related-prompts');
    if (!cont) return;
    try {
        const res = await fetch(`${API_BASE}/api/prompts?limit=3`);
        const body = await res.json();
        const items = body.data.prompts || body.data || [];
        if (items.length) {
            cont.innerHTML = items.map(p => `
              <div class="p-3 bg-[#111417] border border-outline-variant/5 rounded group cursor-pointer hover:border-primary/20 transition-all" onclick="location.href='prompt-detail.html?id=${encodeURIComponent(p.id)}'">
                 <h5 class="text-[11px] font-bold text-on-surface mb-1 group-hover:text-primary transition-colors truncate">${p.title}</h5>
                 <div class="flex justify-between text-[9px] text-on-surface-variant/40 font-bold">
                    <span>${p.reputation || 0} REPUTATION</span>
                    <span>@${p.user?.username || 'anon'}</span>
                 </div>
              </div>
           `).join('');
        }
    } catch (err) {
        console.error('Related prompts load failed', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});
