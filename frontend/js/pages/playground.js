/**
 * Playground Page Controller
 */
const API = 'http://localhost:5000';
lucide.createIcons();

// Run Logic
const runBtn = document.getElementById('run-btn');
if (runBtn) {
    runBtn.onclick = async () => {
        const prompt = document.getElementById('prompt-editor').value.trim();
        const input = document.getElementById('user-input').value.trim();
        const model = document.getElementById('model-select').value;
        if (!prompt) return;

        const out = document.getElementById('output-stream');
        out.innerHTML = `<span style="color: var(--accent-blue);">[RUNNING] Executing unit on ${model}...</span>`;

        try {
            const res = await fetch(`${API}/api/playground/run`, {
                method: 'POST',
                headers: Auth.headers(),
                body: JSON.stringify({ prompt, userInput: input, model })
            });
            const body = await res.json();
            if (body.success) {
                out.innerHTML = body.data.response || body.data.output || "// Done.";
            } else throw new Error(body.message);
        } catch (err) {
            out.innerHTML = `<span style="color: #ef4444;">[ERROR] ${err.message}</span>`;
        }
    };
}

// Save/Publish (Truth Mode applied)
const publishBtn = document.getElementById('publish-btn');
if (publishBtn) {
    publishBtn.onclick = () => {
        alert("Publish API endpoint not yet integrated. Action halted to prevent silent mock success.");
    };
}

// Auto-fill logic for Task 3: Apply Skill -> Playground UX
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'import_skill') {
        const content = localStorage.getItem('pf_skill_content');
        if (content) {
            const editor = document.getElementById('prompt-editor');
            if (editor) {
                editor.value = content;
                // Add a small UX polish indicating successful import
                const out = document.getElementById('output-stream');
                if (out) out.innerHTML = '<span style="color: var(--accent-green); font-weight: 600;">[SYSTEM] Skill imported successfully from Agent Registry. Ready for execution.</span>';

                // Add a glowing effect to the editor to guide user's eye
                editor.style.boxShadow = 'inset 0 0 10px rgba(162, 201, 255, 0.2)';
                setTimeout(() => editor.style.boxShadow = 'none', 1500);
            }
        }
    }
});
