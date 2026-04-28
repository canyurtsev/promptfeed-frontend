/**
 * Taxonomy Page Controller
 */
const API = 'http://localhost:5000';

async function loadTags() {
    const grid = document.getElementById('tags-grid');
    if (!grid) return;

    try {
        const res = await fetch(`${API}/api/prompts?limit=100`);
        const body = await res.json();
        const prompts = body.data.prompts || body.data;

        const tagMap = {};
        prompts.forEach(p => {
            (p.tags || '').split(',').forEach(t => {
                const clean = t.trim().toLowerCase();
                if (clean) tagMap[clean] = (tagMap[clean] || 0) + 1;
            });
        });

        grid.innerHTML = '';
        Object.entries(tagMap).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
            const el = document.createElement('a');
            el.href = `community.html?search=${tag}`;
            el.className = "bg-[#1a1c1e] p-3 rounded border border-outline-variant/10 hover:border-primary/20 transition-all flex flex-col items-center justify-center text-center group";
            el.innerHTML = `
            <span class="text-[11px] font-bold text-on-surface mb-1 group-hover:text-primary transition-colors text-ellipsis overflow-hidden w-full px-1">#${tag}</span>
            <span class="text-[8px] font-black text-on-surface-variant/30 uppercase tracking-widest">${count} UNITS</span>
         `;
            grid.appendChild(el);
        });

        if (!Object.keys(tagMap).length) {
            console.info("Truth Mode: No tags found in taxonomy.");
            grid.innerHTML = '<div class="col-span-full py-20 text-center text-[10px] uppercase font-black opacity-20 tracking-widest">Taxonomy Empty</div>';
        }
    } catch (err) {
        console.error(err);
    }
}

// Search Filtering (Added for UX)
const searchInput = document.getElementById('tag-search');
if (searchInput) {
    searchInput.oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('#tags-grid a');
        cards.forEach(card => {
            const tag = card.textContent.toLowerCase();
            card.style.display = tag.includes(q) ? 'flex' : 'none';
        });
    };
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    loadTags();
});
